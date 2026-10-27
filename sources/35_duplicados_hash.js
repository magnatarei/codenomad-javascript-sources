/**
 * ============================================================
 * CodeNomad Academy  |  Sources JavaScript  |  35. Detector de arquivos duplicados
 * ------------------------------------------------------------
 * O que faz: Percorre uma pasta (e as subpastas), agrupa os arquivos por
 *            tamanho e depois por SHA-256, lista os grupos de duplicados e
 *            calcula quanto espaço seria liberado. Pode gravar um relatório.
 *            Não apaga nada: a decisão é sua.
 * Como usar: node 35_duplicados_hash.js ./Downloads
 *            node 35_duplicados_hash.js ./Fotos --min 1024 --relatorio duplicados.txt
 *            node 35_duplicados_hash.js --demo
 * O que você aprende: fs.promises com async/await, percurso recursivo de
 *            pastas, crypto.createHash com streams (hash de arquivos grandes
 *            sem carregar tudo na memória), Map para agrupar e Promise.all.
 * Requisitos: Node.js 18+, só biblioteca padrão
 * Licença MIT. Um projeto da CodeNomad Academy (codenomad.org)
 * ============================================================
 */
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

// ---------- Percorrer e medir ----------

async function percorrer(pasta) {
  // Recursão com async/await: cada subpasta devolve a própria lista e juntamos tudo.
  const itens = await fs.promises.readdir(pasta, { withFileTypes: true });
  const arquivos = [];
  for (const item of itens) {
    const caminho = path.join(pasta, item.name);
    if (item.isDirectory()) arquivos.push(...await percorrer(caminho));
    else if (item.isFile()) {
      const { size } = await fs.promises.stat(caminho);
      arquivos.push({ caminho, tamanho: size });
    }
  }
  return arquivos;
}

function sha256(caminho) {
  // O stream lê o arquivo em pedaços e alimenta o hash; serve para arquivos de gigabytes.
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    fs.createReadStream(caminho)
      .on('data', (pedaco) => hash.update(pedaco))
      .on('error', reject)
      .on('end', () => resolve(hash.digest('hex')));
  });
}

function agrupar(lista, chaveDe) {
  const grupos = new Map();
  for (const item of lista) {
    const chave = chaveDe(item);
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave).push(item);
  }
  return [...grupos.values()];
}

async function encontrarDuplicados(pasta, minimo) {
  const todos = (await percorrer(pasta)).filter((a) => a.tamanho >= minimo);
  // Primeiro filtro, barato: só arquivos com o mesmo tamanho podem ser iguais.
  const candidatos = agrupar(todos, (a) => a.tamanho).filter((grupo) => grupo.length > 1).flat();
  // Segundo filtro, caro: calcula o hash só dos candidatos, em paralelo.
  await Promise.all(candidatos.map(async (a) => { a.hash = await sha256(a.caminho); }));
  const duplicados = agrupar(candidatos, (a) => a.hash)
    .filter((grupo) => grupo.length > 1)
    .sort((a, b) => b[0].tamanho * (b.length - 1) - a[0].tamanho * (a.length - 1));
  return { analisados: todos.length, comHash: candidatos.length, duplicados };
}

// ---------- Relatório ----------

function formatarBytes(bytes) {
  const unidades = ['B', 'KB', 'MB', 'GB'];
  let valor = bytes;
  let i = 0;
  while (valor >= 1024 && i < unidades.length - 1) { valor /= 1024; i++; }
  return `${valor.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${unidades[i]}`;
}

function montarRelatorio(pasta, resultado) {
  const { analisados, comHash, duplicados } = resultado;
  const linhas = [`Duplicados em ${pasta}`, `Arquivos analisados: ${analisados} (hash calculado em ${comHash})`, ''];
  let liberavel = 0;
  duplicados.forEach((grupo, i) => {
    const { tamanho, hash } = grupo[0];
    // Mantendo uma cópia, as outras (length - 1) podem sair.
    const sobra = tamanho * (grupo.length - 1);
    liberavel += sobra;
    linhas.push(`Grupo ${i + 1}: ${grupo.length} arquivos de ${formatarBytes(tamanho)} (sha256 ${hash.slice(0, 12)}...)`);
    for (const a of grupo) linhas.push(`  ${path.relative(pasta, a.caminho) || a.caminho}`);
    linhas.push(`  liberável: ${formatarBytes(sobra)}`);
  });
  if (duplicados.length === 0) linhas.push('Nenhum arquivo duplicado encontrado.');
  linhas.push('', `Total de grupos: ${duplicados.length}`, `Espaço que pode ser liberado: ${formatarBytes(liberavel)}`);
  return linhas.join('\n');
}

// ---------- Linha de comando ----------

function lerArgumentos(argv) {
  const opcoes = { min: 1 };
  let pasta;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) { pasta = arg; continue; }
    const valor = argv[++i];
    if (valor === undefined) throw new Error(`A opção ${arg} precisa de um valor.`);
    if (arg === '--min') {
      opcoes.min = Number(valor);
      if (!Number.isInteger(opcoes.min) || opcoes.min < 0) throw new Error(`--min precisa de um número de bytes, não "${valor}".`);
    } else if (arg === '--relatorio') opcoes.relatorio = valor;
    else throw new Error(`Opção desconhecida: ${arg}. Use --min <bytes> ou --relatorio <arquivo>.`);
  }
  if (!pasta) throw new Error('Informe a pasta. Exemplo: node 35_duplicados_hash.js ./Downloads');
  if (!fs.existsSync(pasta) || !fs.statSync(pasta).isDirectory()) throw new Error(`Pasta não encontrada: ${pasta}`);
  return { pasta, opcoes };
}

async function executar(argv) {
  const { pasta, opcoes } = lerArgumentos(argv);
  const inicio = Date.now();
  const resultado = await encontrarDuplicados(pasta, opcoes.min);
  const texto = montarRelatorio(pasta, resultado);
  console.log(texto);
  console.log(`Tempo: ${Date.now() - inicio} ms`);
  if (opcoes.relatorio) {
    await fs.promises.writeFile(opcoes.relatorio, texto + '\n', 'utf8');
    console.log(`Relatório gravado em ${opcoes.relatorio}`);
  }
}

function mostrarUso() {
  console.log(`Uso: node 35_duplicados_hash.js <pasta> [--min <bytes>] [--relatorio <arquivo.txt>]

  --min <bytes>        ignora arquivos menores que isso (padrão: 1, ou seja, ignora só os vazios)
  --relatorio <arquivo>   grava o mesmo relatório da tela num arquivo de texto
  --demo                  demonstração completa numa pasta temporária

O programa só lista; apagar as cópias é decisão sua.`);
}

// ---------- Demonstração ----------

async function demo() {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'codenomad-duplicados-'));
  const foto = 'bytes de uma foto de exemplo '.repeat(400);
  const apostila = 'texto da apostila de JavaScript '.repeat(300);
  const arquivos = {
    'ferias.jpg': foto,
    'copia de ferias.jpg': foto,
    'backup/ferias (1).jpg': foto,
    'apostila.pdf': apostila,
    'backup/apostila.pdf': apostila,
    'mesmo tamanho, outro conteúdo.pdf': apostila.toUpperCase(),
    'notas.txt': 'arquivo único\n',
    'vazio.txt': '',
  };
  for (const [nome, conteudo] of Object.entries(arquivos)) {
    const caminho = path.join(pasta, nome);
    fs.mkdirSync(path.dirname(caminho), { recursive: true });
    fs.writeFileSync(caminho, conteudo, 'utf8');
  }
  const relatorio = path.join(pasta, 'relatorio.txt');
  console.log('=== Detector de duplicados: demonstração ===');
  console.log(`Pasta temporária: ${pasta}`);
  console.log(`Arquivos criados: ${Object.keys(arquivos).length}, sendo 3 cópias de uma foto, 2 de uma apostila,`);
  console.log('um arquivo do mesmo tamanho da apostila com outro conteúdo, um único e um vazio.\n');
  console.log(`$ node 35_duplicados_hash.js <pasta> --relatorio relatorio.txt`);
  await executar([pasta, '--relatorio', relatorio]);
  console.log('\n$ node 35_duplicados_hash.js <pasta> --min 10000  (ignora a apostila, menor que isso)');
  await executar([pasta, '--min', '10000']);
  console.log('\n$ node 35_duplicados_hash.js <pasta> --min muitos');
  try {
    await executar([pasta, '--min', 'muitos']);
  } catch (erro) {
    console.log(`Erro tratado: ${erro.message}`);
  }
  fs.rmSync(pasta, { recursive: true, force: true });
  console.log('\nPasta temporária removida. Fim da demonstração.');
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--demo')) return demo();
  if (argv.length === 0) return mostrarUso();
  try {
    await executar(argv);
  } catch (erro) {
    console.error(`Erro: ${erro.message}`);
    process.exitCode = 1;
  }
}

main();

/*
 * Para ir além:
 * 1. Adicione --apagar, que remove as cópias de cada grupo e mantém a mais antiga (confirme antes).
 * 2. Compare só os primeiros 4 KB antes do hash completo: um terceiro filtro, ainda mais barato.
 * 3. Grave o relatório em CSV (hash, tamanho, caminho) para abrir numa planilha.
 */
