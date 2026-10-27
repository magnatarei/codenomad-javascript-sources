/**
 * ============================================================
 * CodeNomad Academy  |  Sources JavaScript  |  33. Renomeador de arquivos em lote
 * ------------------------------------------------------------
 * O que faz: Renomeia todos os arquivos de uma pasta combinando regras:
 *            prefixo, sufixo, numeração, troca de texto e minúsculas.
 *            Mostra a prévia primeiro e só aplica com --aplicar.
 *            Nunca sobrescreve um arquivo que já existe.
 * Como usar: node 33_renomeador_lote.js ./fotos --prefixo viagem_ --numerar
 *            node 33_renomeador_lote.js ./fotos --trocar "IMG_=foto_" --minusculas --aplicar
 *            node 33_renomeador_lote.js ./docs --sufixo _v2 --extensao pdf --aplicar
 *            node 33_renomeador_lote.js --demo
 * O que você aprende: path.parse e path.join, leitura de pasta com
 *            fs.readdirSync, fs.renameSync, o padrão "prévia antes de
 *            aplicar" (dry-run), Set para detectar conflitos de nome.
 * Requisitos: Node.js 18+, só biblioteca padrão
 * Licença MIT. Um projeto da CodeNomad Academy (codenomad.org)
 * ============================================================
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const COM_VALOR = new Set(['prefixo', 'sufixo', 'trocar', 'extensao']);
const SEM_VALOR = new Set(['numerar', 'minusculas', 'aplicar']);

// ---------- Regras de renomeação ----------

function novoNome(nomeAtual, regras, indice, total) {
  // path.parse separa "Relatório Final.PDF" em name="Relatório Final" e ext=".PDF".
  const { name, ext } = path.parse(nomeAtual);
  let base = name;
  let extensao = ext;
  if (regras.trocar) {
    const [de, para = ''] = regras.trocar.split('=');
    if (!de) throw new Error('Use --trocar "texto-antigo=texto-novo".');
    base = base.split(de).join(para); // troca todas as ocorrências sem precisar de regex
  }
  if (regras.minusculas) { base = base.toLowerCase(); extensao = extensao.toLowerCase(); }
  if (regras.prefixo) base = regras.prefixo + base;
  if (regras.sufixo) base += regras.sufixo;
  if (regras.numerar) {
    // Zeros à esquerda conforme o total: 9 arquivos viram 01..09, 120 viram 001..120.
    const largura = Math.max(2, String(total).length);
    base = `${String(indice + 1).padStart(largura, '0')}_${base}`;
  }
  return base + extensao;
}

function listarArquivos(pasta, extensao) {
  if (!fs.existsSync(pasta) || !fs.statSync(pasta).isDirectory()) throw new Error(`Pasta não encontrada: ${pasta}`);
  // withFileTypes evita um stat por item: o próprio readdir diz o que é arquivo.
  return fs.readdirSync(pasta, { withFileTypes: true })
    .filter((item) => item.isFile())
    .map((item) => item.name)
    .filter((nome) => !extensao || path.extname(nome).toLowerCase() === `.${extensao.toLowerCase()}`)
    .sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true })); // "img2" antes de "img10"
}

function planejar(pasta, regras) {
  const arquivos = listarArquivos(pasta, regras.extensao);
  // Todos os nomes da pasta (inclusive os que o filtro de extensão deixou de fora).
  const existentes = new Set(fs.readdirSync(pasta));
  const destinos = new Set();
  return arquivos.map((de, i) => {
    const para = novoNome(de, regras, i, arquivos.length);
    let situacao = 'ok';
    if (para === de) situacao = 'sem mudança';
    else if (destinos.has(para)) situacao = 'conflito: outro arquivo teria o mesmo nome';
    else if (existentes.has(para)) situacao = 'conflito: já existe um arquivo com esse nome';
    destinos.add(para);
    return { de, para, situacao };
  });
}

function aplicar(pasta, plano) {
  let feitos = 0;
  for (const item of plano) {
    if (item.situacao !== 'ok') continue;
    const destino = path.join(pasta, item.para);
    // Última defesa contra sobrescrita. No Windows e no macOS, "Foto.JPG" e
    // "foto.jpg" são o mesmo arquivo; essa troca só de maiúsculas é permitida.
    if (fs.existsSync(destino) && item.de.toLowerCase() !== item.para.toLowerCase()) {
      item.situacao = 'pulado: o destino apareceu na hora de aplicar';
      continue;
    }
    fs.renameSync(path.join(pasta, item.de), destino);
    item.situacao = 'renomeado';
    feitos++;
  }
  return feitos;
}

function imprimirPlano(plano, titulo) {
  console.log(titulo);
  if (plano.length === 0) { console.log('  (nenhum arquivo encontrado)'); return; }
  const largura = Math.max(...plano.map((p) => p.de.length));
  for (const p of plano) console.log(`  ${p.de.padEnd(largura)}  ->  ${p.para}  [${p.situacao}]`);
  const prontos = plano.filter((p) => p.situacao === 'ok' || p.situacao === 'renomeado').length;
  console.log(`  ${plano.length} arquivo(s), ${prontos} com renomeação válida, ${plano.length - prontos} sem ação.`);
}

// ---------- Linha de comando ----------

function lerArgumentos(argv) {
  const regras = {};
  let pasta;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) { pasta = arg; continue; }
    const chave = arg.slice(2);
    if (SEM_VALOR.has(chave)) regras[chave] = true;
    else if (COM_VALOR.has(chave)) {
      if (argv[i + 1] === undefined) throw new Error(`A opção --${chave} precisa de um valor.`);
      regras[chave] = argv[++i];
    } else throw new Error(`Opção desconhecida: ${arg}`);
  }
  if (!pasta) throw new Error('Informe a pasta. Exemplo: node 33_renomeador_lote.js ./fotos --prefixo viagem_');
  const temRegra = Object.keys(regras).some((k) => k !== 'aplicar' && k !== 'extensao');
  if (!temRegra) throw new Error('Informe ao menos uma regra: --prefixo, --sufixo, --numerar, --trocar ou --minusculas.');
  return { pasta, regras };
}

function executar(argv) {
  const { pasta, regras } = lerArgumentos(argv);
  const plano = planejar(pasta, regras);
  if (!regras.aplicar) {
    imprimirPlano(plano, `Prévia em ${pasta} (nada foi alterado; use --aplicar para renomear):`);
    return;
  }
  const feitos = aplicar(pasta, plano);
  imprimirPlano(plano, `Resultado em ${pasta}:`);
  console.log(`${feitos} arquivo(s) renomeado(s).`);
}

function mostrarUso() {
  console.log(`Uso: node 33_renomeador_lote.js <pasta> [regras] [--extensao ext] [--aplicar]

Regras (combine quantas quiser; a ordem de aplicação é trocar, minúsculas, prefixo, sufixo, numerar):
  --prefixo <texto>      acrescenta no começo do nome
  --sufixo <texto>       acrescenta no fim do nome, antes da extensão
  --numerar              numera em ordem alfabética: 01_, 02_, ...
  --trocar "de=para"     substitui um trecho do nome
  --minusculas           deixa nome e extensão em minúsculas
Filtros e modo:
  --extensao <ext>       só arquivos com essa extensão (ex.: jpg)
  --aplicar              sem isso o programa só mostra a prévia
  --demo                 demonstração completa numa pasta temporária`);
}

// ---------- Demonstração ----------

function demo() {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'codenomad-renomear-'));
  const iniciais = ['IMG_0001.JPG', 'IMG_0002.JPG', 'IMG_0010.JPG', 'Relatório Final.PDF', 'notas.txt'];
  for (const nome of iniciais) fs.writeFileSync(path.join(pasta, nome), `conteúdo de ${nome}\n`, 'utf8');
  console.log('=== Renomeador em lote: demonstração ===');
  console.log(`Pasta temporária: ${pasta}`);
  console.log(`Arquivos criados: ${iniciais.join(', ')}\n`);

  // A cena 3 cria antes um arquivo com o nome de destino, para provar que
  // o programa recusa sobrescrever (a regra não altera o arquivo intruso).
  const intruso = () => fs.writeFileSync(path.join(pasta, '05_resumo final.pdf'), 'já existia\n', 'utf8');
  const cenarios = [
    { titulo: 'Cena 1: prévia (trocar IMG_ por foto_, minúsculas e numerar)',
      argv: [pasta, '--trocar', 'IMG_=foto_', '--minusculas', '--numerar'] },
    { titulo: 'Cena 2: a mesma regra, agora com --aplicar',
      argv: [pasta, '--trocar', 'IMG_=foto_', '--minusculas', '--numerar', '--aplicar'] },
    { titulo: 'Cena 3: trocar "relatório" por "resumo" nos .pdf, mas o destino já existe',
      argv: [pasta, '--trocar', 'relatório=resumo', '--extensao', 'pdf', '--aplicar'], antes: intruso },
    { titulo: 'Cena 4: argumento inválido', argv: [pasta, '--prefixo'] },
  ];

  for (const { titulo, argv, antes } of cenarios) {
    if (antes) antes();
    console.log(`--- ${titulo}`);
    console.log(`$ node 33_renomeador_lote.js <pasta> ${argv.slice(1).join(' ')}`);
    try {
      executar(argv);
    } catch (erro) {
      console.log(`Erro tratado: ${erro.message}`);
    }
    console.log('');
  }
  console.log('Conteúdo final da pasta:');
  for (const nome of fs.readdirSync(pasta).sort()) console.log(`  ${nome}`);
  fs.rmSync(pasta, { recursive: true, force: true });
  console.log('Pasta temporária removida. Fim da demonstração.');
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--demo')) return demo();
  if (argv.length === 0) return mostrarUso();
  try {
    executar(argv);
  } catch (erro) {
    console.error(`Erro: ${erro.message}`);
    process.exitCode = 1;
  }
}

main();

/*
 * Para ir além:
 * 1. Grave um arquivo "desfazer.json" com os pares de nomes e crie a opção --desfazer.
 * 2. Adicione --data para prefixar cada arquivo com a data de modificação (AAAA-MM-DD).
 * 3. Aceite uma expressão regular em --trocar, com grupos de captura no texto novo ($1).
 */
