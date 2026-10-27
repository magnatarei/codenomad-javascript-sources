/**
 * ============================================================
 * CodeNomad Academy  |  Sources JavaScript  |  40. Backup de pasta com data
 * ------------------------------------------------------------
 * O que faz: Copia uma pasta inteira para um destino com carimbo de data e
 *            hora (nome_AAAA-MM-DD_HH-MM-SS), ignorando padrões como *.log.
 *            Grava um manifesto com o SHA-256 de cada arquivo e, se houver
 *            backup anterior, lista o que foi adicionado, removido ou alterado.
 * Como usar: node 40_backup_pasta.js ./projeto ./backups
 *            node 40_backup_pasta.js ./projeto D:/backups --ignorar "*.log,node_modules,.git"
 *            node 40_backup_pasta.js --demo
 * O que você aprende: cópia recursiva com fs.promises (readdir, mkdir,
 *            copyFile), hash SHA-256 com crypto e streams, carimbo de data
 *            com padStart, curingas convertidos em expressão regular e
 *            comparação de dois manifestos com Set.
 * Requisitos: Node.js 18+, só biblioteca padrão
 * Licença MIT. Um projeto da CodeNomad Academy (codenomad.org)
 * ============================================================
 */
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const MANIFESTO = 'manifesto.json';

// ---------- Utilidades ----------

function carimbo(data = new Date()) {
  const dois = (n) => String(n).padStart(2, '0');
  const dia = `${data.getFullYear()}-${dois(data.getMonth() + 1)}-${dois(data.getDate())}`;
  return `${dia}_${dois(data.getHours())}-${dois(data.getMinutes())}-${dois(data.getSeconds())}`;
}

function compilarPadroes(texto) {
  // "*.log,node_modules" vira uma lista de expressões regulares: "*" casa
  // qualquer trecho e "?" uma letra; o resto é escapado para valer ao pé da letra.
  return texto.split(',').map((p) => p.trim()).filter(Boolean).map((padrao) => {
    const escapado = padrao.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.');
    return new RegExp(`^${escapado}$`, 'i');
  });
}

function sha256(caminho) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    fs.createReadStream(caminho)
      .on('data', (pedaco) => hash.update(pedaco))
      .on('error', reject)
      .on('end', () => resolve(hash.digest('hex')));
  });
}

function formatarBytes(bytes) {
  const unidades = ['B', 'KB', 'MB', 'GB'];
  let valor = bytes;
  let i = 0;
  while (valor >= 1024 && i < unidades.length - 1) { valor /= 1024; i++; }
  return `${valor.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${unidades[i]}`;
}

// ---------- Cópia e manifesto ----------

async function copiarPasta(origem, destino, padroes, relativo = '', arquivos = {}) {
  await fs.promises.mkdir(destino, { recursive: true });
  const itens = await fs.promises.readdir(origem, { withFileTypes: true });
  for (const item of itens.sort((a, b) => a.name.localeCompare(b.name))) {
    // No manifesto o caminho usa sempre "/", para ser igual em qualquer sistema.
    const caminhoRelativo = relativo ? `${relativo}/${item.name}` : item.name;
    if (padroes.some((rx) => rx.test(item.name))) { console.log(`  ignorado  ${caminhoRelativo}`); continue; }
    const de = path.join(origem, item.name);
    const para = path.join(destino, item.name);
    if (item.isDirectory()) {
      await copiarPasta(de, para, padroes, caminhoRelativo, arquivos);
    } else if (item.isFile()) {
      await fs.promises.copyFile(de, para);
      const { size } = await fs.promises.stat(de);
      arquivos[caminhoRelativo] = { tamanho: size, sha256: await sha256(de) };
      console.log(`  copiado   ${caminhoRelativo} (${formatarBytes(size)})`);
    }
  }
  return arquivos;
}

async function backupAnterior(destino, prefixo, atual) {
  // Entre as pastas "prefixo_*" do destino, escolhe a de manifesto mais recente.
  let melhor = null;
  for (const nome of await fs.promises.readdir(destino)) {
    const caminho = path.join(destino, nome, MANIFESTO);
    if (nome === atual || !nome.startsWith(`${prefixo}_`) || !fs.existsSync(caminho)) continue;
    const manifesto = JSON.parse(await fs.promises.readFile(caminho, 'utf8'));
    if (!melhor || manifesto.criadoEm > melhor.manifesto.criadoEm) melhor = { nome, manifesto };
  }
  return melhor;
}

function comparar(antes, agora) {
  const caminhosAntes = new Set(Object.keys(antes));
  const caminhosAgora = new Set(Object.keys(agora));
  return {
    adicionados: [...caminhosAgora].filter((c) => !caminhosAntes.has(c)),
    removidos: [...caminhosAntes].filter((c) => !caminhosAgora.has(c)),
    alterados: [...caminhosAgora].filter((c) => caminhosAntes.has(c) && antes[c].sha256 !== agora[c].sha256),
  };
}

async function fazerBackup(origem, destino, padroes) {
  if (!fs.existsSync(origem) || !fs.statSync(origem).isDirectory()) throw new Error(`Pasta de origem não encontrada: ${origem}`);
  const absOrigem = path.resolve(origem);
  const absDestino = path.resolve(destino);
  if (absDestino === absOrigem || absDestino.startsWith(absOrigem + path.sep)) {
    throw new Error('O destino não pode ficar dentro da origem: o backup copiaria a si mesmo sem parar.');
  }
  await fs.promises.mkdir(absDestino, { recursive: true });
  const prefixo = path.basename(absOrigem);
  const base = `${prefixo}_${carimbo()}`;
  let nome = base;
  // Dois backups no mesmo segundo ganham sufixo _2, _3... em vez de se misturarem.
  for (let n = 2; fs.existsSync(path.join(absDestino, nome)); n++) nome = `${base}_${n}`;
  const pastaBackup = path.join(absDestino, nome);

  console.log(`Copiando ${absOrigem}\n     para ${pastaBackup}`);
  const arquivos = await copiarPasta(absOrigem, pastaBackup, padroes);
  const manifesto = { origem: absOrigem, criadoEm: new Date().toISOString(), arquivos };
  await fs.promises.writeFile(path.join(pastaBackup, MANIFESTO), JSON.stringify(manifesto, null, 2) + '\n', 'utf8');
  const total = Object.values(arquivos).reduce((soma, a) => soma + a.tamanho, 0);
  console.log(`Backup concluído: ${Object.keys(arquivos).length} arquivo(s), ${formatarBytes(total)}.`);

  const anterior = await backupAnterior(absDestino, prefixo, nome);
  if (!anterior) { console.log('Primeiro backup desta pasta: ainda não há com o que comparar.'); return; }
  const { adicionados, removidos, alterados } = comparar(anterior.manifesto.arquivos, arquivos);
  console.log(`Mudanças desde ${anterior.nome}:`);
  if (adicionados.length + removidos.length + alterados.length === 0) console.log('  nenhuma: os arquivos são idênticos.');
  for (const c of adicionados) console.log(`  + adicionado  ${c}`);
  for (const c of removidos) console.log(`  - removido    ${c}`);
  for (const c of alterados) console.log(`  ~ alterado    ${c}`);
}

// ---------- Linha de comando ----------

function lerArgumentos(argv) {
  const posicionais = [];
  let ignorar = '';
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--ignorar') {
      ignorar = argv[++i];
      if (ignorar === undefined) throw new Error('--ignorar precisa de uma lista, como "*.log,node_modules".');
    } else if (argv[i].startsWith('--')) throw new Error(`Opção desconhecida: ${argv[i]}`);
    else posicionais.push(argv[i]);
  }
  const [origem, destino] = posicionais;
  if (!origem || !destino) throw new Error('Uso: node 40_backup_pasta.js <origem> <destino> [--ignorar "*.log,node_modules"]');
  return { origem, destino, padroes: compilarPadroes(ignorar) };
}

async function executar(argv) {
  const { origem, destino, padroes } = lerArgumentos(argv);
  await fazerBackup(origem, destino, padroes);
}

function mostrarUso() {
  console.log(`Uso: node 40_backup_pasta.js <origem> <destino> [--ignorar "padrão1,padrão2"]

  origem       pasta que será copiada
  destino      pasta onde nasce uma subpasta nome_AAAA-MM-DD_HH-MM-SS com a cópia
  --ignorar    nomes ou curingas separados por vírgula (ex.: "*.log,*.tmp,node_modules,.git")
  --demo       demonstração completa numa pasta temporária, com dois backups e a diferença entre eles

Cada backup guarda um ${MANIFESTO} com tamanho e SHA-256 de cada arquivo.`);
}

// ---------- Demonstração ----------

async function demo() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'codenomad-backup-'));
  const origem = path.join(base, 'projeto');
  const destino = path.join(base, 'backups');
  const arquivos = {
    'README.md': '# Projeto da turma\n',
    'src/app.js': 'console.log("versão 1");\n',
    'src/util.js': 'module.exports = { dobro: (n) => n * 2 };\n',
    'dados/alunos.csv': 'nome,nota\nAna,9\nBruno,7\n',
    'erros.log': 'nenhum erro por enquanto\n',
  };
  for (const [nome, conteudo] of Object.entries(arquivos)) {
    fs.mkdirSync(path.dirname(path.join(origem, nome)), { recursive: true });
    fs.writeFileSync(path.join(origem, nome), conteudo, 'utf8');
  }
  console.log('=== Backup de pasta: demonstração ===');
  console.log(`Pasta temporária: ${base}\n`);
  console.log('$ node 40_backup_pasta.js projeto backups --ignorar "*.log"');
  await executar([origem, destino, '--ignorar', '*.log']);

  console.log('\nMexendo no projeto: app.js muda, config.json nasce e util.js é apagado.');
  fs.writeFileSync(path.join(origem, 'src/app.js'), 'console.log("versão 2");\n', 'utf8');
  fs.writeFileSync(path.join(origem, 'config.json'), '{ "tema": "escuro" }\n', 'utf8');
  fs.unlinkSync(path.join(origem, 'src/util.js'));
  console.log('\n$ node 40_backup_pasta.js projeto backups --ignorar "*.log"');
  await executar([origem, destino, '--ignorar', '*.log']);

  console.log('\nPastas criadas em backups/:');
  for (const nome of fs.readdirSync(destino)) console.log(`  ${nome}/`);
  console.log('\n$ node 40_backup_pasta.js projeto projeto/copia  (destino dentro da origem)');
  try {
    await executar([origem, path.join(origem, 'copia')]);
  } catch (erro) {
    console.log(`Erro tratado: ${erro.message}`);
  }
  fs.rmSync(base, { recursive: true, force: true });
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
 * 1. Crie --manter N, que apaga os backups mais antigos e deixa só os N mais recentes.
 * 2. Faça um backup incremental: copie só os arquivos cujo SHA-256 mudou desde o anterior.
 * 3. Adicione --restaurar <pasta-do-backup> para copiar tudo de volta para a origem, com confirmação.
 */
