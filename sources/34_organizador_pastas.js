/**
 * ============================================================
 * CodeNomad Academy  |  Sources JavaScript  |  34. Organizador de pasta por tipo
 * ------------------------------------------------------------
 * O que faz: Move os arquivos soltos de uma pasta para subpastas por
 *            categoria (Imagens, Documentos, Planilhas, Áudio, Vídeo,
 *            Código, Outros) olhando a extensão. Mostra a prévia, aplica
 *            com --aplicar, imprime um relatório e desfaz com --desfazer.
 * Como usar: node 34_organizador_pastas.js ./Downloads
 *            node 34_organizador_pastas.js ./Downloads --aplicar
 *            node 34_organizador_pastas.js ./Downloads --desfazer
 *            node 34_organizador_pastas.js --demo
 * O que você aprende: mapear extensões para categorias com Array.find,
 *            fs.renameSync para mover, mkdirSync recursivo, um "registro de
 *            desfazer" em JSON, Map para somar por grupo e formatação de bytes.
 * Requisitos: Node.js 18+, só biblioteca padrão
 * Licença MIT. Um projeto da CodeNomad Academy (codenomad.org)
 * ============================================================
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const CATEGORIAS = [
  { pasta: 'Imagens', extensoes: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'] },
  { pasta: 'Documentos', extensoes: ['pdf', 'doc', 'docx', 'txt', 'md', 'odt', 'rtf'] },
  { pasta: 'Planilhas', extensoes: ['xls', 'xlsx', 'csv', 'ods'] },
  { pasta: 'Áudio', extensoes: ['mp3', 'wav', 'ogg', 'flac', 'm4a'] },
  { pasta: 'Vídeo', extensoes: ['mp4', 'mkv', 'avi', 'mov', 'webm'] },
  { pasta: 'Código', extensoes: ['js', 'ts', 'py', 'java', 'go', 'rs', 'c', 'cpp', 'cs', 'html', 'css', 'json', 'sh'] },
];
const OUTROS = 'Outros';
const REGISTRO = '.organizador.json'; // guarda os movimentos para o --desfazer

// ---------- Classificação ----------

function categoriaDe(nome) {
  // path.extname devolve ".JPG"; tiramos o ponto e deixamos minúsculo.
  const extensao = path.extname(nome).slice(1).toLowerCase();
  const categoria = CATEGORIAS.find((c) => c.extensoes.includes(extensao));
  return categoria ? categoria.pasta : OUTROS;
}

function formatarBytes(bytes) {
  const unidades = ['B', 'KB', 'MB', 'GB'];
  let valor = bytes;
  let i = 0;
  while (valor >= 1024 && i < unidades.length - 1) { valor /= 1024; i++; }
  return `${valor.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${unidades[i]}`;
}

function planejar(pasta) {
  if (!fs.existsSync(pasta) || !fs.statSync(pasta).isDirectory()) throw new Error(`Pasta não encontrada: ${pasta}`);
  // Só arquivos soltos no primeiro nível; subpastas e arquivos ocultos ficam onde estão.
  return fs.readdirSync(pasta, { withFileTypes: true })
    .filter((item) => item.isFile() && !item.name.startsWith('.'))
    .map((item) => {
      const categoria = categoriaDe(item.name);
      const tamanho = fs.statSync(path.join(pasta, item.name)).size;
      return { nome: item.name, categoria, tamanho, destino: path.join(categoria, item.name) };
    })
    .sort((a, b) => a.categoria.localeCompare(b.categoria, 'pt-BR') || a.nome.localeCompare(b.nome, 'pt-BR'));
}

// ---------- Aplicar e desfazer ----------

function aplicar(pasta, plano) {
  const movimentos = [];
  for (const item of plano) {
    const destino = path.join(pasta, item.destino);
    if (fs.existsSync(destino)) { item.situacao = 'pulado: já existe no destino'; continue; }
    fs.mkdirSync(path.dirname(destino), { recursive: true }); // recursive: não reclama se já existe
    fs.renameSync(path.join(pasta, item.nome), destino);
    item.situacao = 'movido';
    movimentos.push({ de: item.nome, para: item.destino });
  }
  const registro = { criadoEm: new Date().toISOString(), movimentos };
  fs.writeFileSync(path.join(pasta, REGISTRO), JSON.stringify(registro, null, 2) + '\n', 'utf8');
  return movimentos.length;
}

function desfazer(pasta) {
  const caminhoRegistro = path.join(pasta, REGISTRO);
  if (!fs.existsSync(caminhoRegistro)) throw new Error(`Não há registro de organização em ${pasta} (${REGISTRO}).`);
  const { movimentos } = JSON.parse(fs.readFileSync(caminhoRegistro, 'utf8'));
  let devolvidos = 0;
  for (const { de, para } of movimentos) {
    const atual = path.join(pasta, para);
    const original = path.join(pasta, de);
    if (!fs.existsSync(atual) || fs.existsSync(original)) continue; // sumiu ou alguém ocupou o lugar
    fs.renameSync(atual, original);
    devolvidos++;
  }
  // Remove as subpastas que ficaram vazias; rmdirSync falha se houver algo dentro, e tudo bem.
  for (const nome of [...CATEGORIAS.map((c) => c.pasta), OUTROS]) {
    try { fs.rmdirSync(path.join(pasta, nome)); } catch (erro) { /* não estava vazia ou não existia */ }
  }
  fs.unlinkSync(caminhoRegistro);
  return { devolvidos, total: movimentos.length };
}

// ---------- Relatório ----------

function relatorio(plano) {
  // Map mantém a ordem de inserção: as categorias aparecem na ordem do plano.
  const porCategoria = new Map();
  for (const item of plano) {
    const grupo = porCategoria.get(item.categoria) || { arquivos: 0, bytes: 0 };
    grupo.arquivos += 1;
    grupo.bytes += item.tamanho;
    porCategoria.set(item.categoria, grupo);
  }
  const linhas = [];
  for (const [categoria, grupo] of porCategoria) {
    linhas.push(`  ${categoria.padEnd(12)} ${String(grupo.arquivos).padStart(3)} arquivo(s)  ${formatarBytes(grupo.bytes).padStart(9)}`);
  }
  const totalBytes = plano.reduce((soma, item) => soma + item.tamanho, 0);
  linhas.push(`  ${'Total'.padEnd(12)} ${String(plano.length).padStart(3)} arquivo(s)  ${formatarBytes(totalBytes).padStart(9)}`);
  return linhas.join('\n');
}

function imprimirPlano(plano) {
  if (plano.length === 0) { console.log('  (nenhum arquivo solto para organizar)'); return; }
  const largura = Math.max(...plano.map((p) => p.nome.length));
  for (const p of plano) console.log(`  ${p.nome.padEnd(largura)}  ->  ${p.destino}${p.situacao ? `  [${p.situacao}]` : ''}`);
}

// ---------- Linha de comando ----------

function executar(argv) {
  const pasta = argv.find((a) => !a.startsWith('--'));
  const opcoes = argv.filter((a) => a.startsWith('--'));
  const desconhecida = opcoes.find((o) => !['--aplicar', '--desfazer'].includes(o));
  if (desconhecida) throw new Error(`Opção desconhecida: ${desconhecida}. Use --aplicar ou --desfazer.`);
  if (!pasta) throw new Error('Informe a pasta. Exemplo: node 34_organizador_pastas.js ./Downloads');

  if (opcoes.includes('--desfazer')) {
    const { devolvidos, total } = desfazer(pasta);
    console.log(`Desfeito: ${devolvidos} de ${total} arquivo(s) voltaram para ${pasta}.`);
    return;
  }
  const plano = planejar(pasta);
  if (!opcoes.includes('--aplicar')) {
    console.log(`Prévia em ${pasta} (nada foi movido; use --aplicar):`);
    imprimirPlano(plano);
    console.log('Resumo por categoria:');
    console.log(relatorio(plano));
    return;
  }
  const movidos = aplicar(pasta, plano);
  console.log(`Organização aplicada em ${pasta}:`);
  imprimirPlano(plano);
  console.log('Relatório:');
  console.log(relatorio(plano));
  console.log(`${movidos} arquivo(s) movido(s). Para voltar atrás: --desfazer`);
}

function mostrarUso() {
  console.log(`Uso: node 34_organizador_pastas.js <pasta> [--aplicar | --desfazer]

  sem opção     mostra a prévia: para onde cada arquivo iria e o resumo por categoria
  --aplicar     move os arquivos para as subpastas e grava ${REGISTRO} na pasta
  --desfazer    lê o registro, devolve cada arquivo ao lugar e apaga as subpastas vazias
  --demo        demonstração completa numa pasta temporária

Categorias: ${CATEGORIAS.map((c) => c.pasta).join(', ')} e ${OUTROS}.`);
}

// ---------- Demonstração ----------

function demo() {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'codenomad-organizar-'));
  const bagunca = {
    'ferias.JPG': 3000, 'logo.png': 1200, 'apostila.pdf': 8000, 'notas.txt': 300, 'turmas.csv': 900,
    'aula01.mp4': 20000, 'musica.mp3': 5000, 'script.js': 700, 'exercicio.py': 400, 'backup.zip': 2500,
  };
  for (const [nome, tamanho] of Object.entries(bagunca)) fs.writeFileSync(path.join(pasta, nome), 'x'.repeat(tamanho));
  fs.mkdirSync(path.join(pasta, 'subpasta-fica-quieta'));
  console.log('=== Organizador de pasta: demonstração ===');
  console.log(`Pasta temporária: ${pasta}`);
  console.log(`Arquivos soltos criados: ${Object.keys(bagunca).length} (e uma subpasta, que não é tocada)\n`);

  const cenas = [['Prévia', [pasta]], ['Aplicar', [pasta, '--aplicar']], ['Desfazer', [pasta, '--desfazer']],
    ['Desfazer de novo (erro esperado)', [pasta, '--desfazer']]];
  for (const [titulo, argv] of cenas) {
    console.log(`--- ${titulo}: node 34_organizador_pastas.js <pasta> ${argv.slice(1).join(' ')}`);
    try { executar(argv); } catch (erro) { console.log(`Erro tratado: ${erro.message}`); }
    if (titulo === 'Aplicar') {
      console.log('Estrutura depois de aplicar:');
      for (const sub of fs.readdirSync(pasta, { withFileTypes: true }).filter((d) => d.isDirectory())) {
        console.log(`  ${sub.name}/  ${fs.readdirSync(path.join(pasta, sub.name)).join(', ') || '(vazia)'}`);
      }
    }
    console.log('');
  }
  console.log(`Conteúdo final da pasta: ${fs.readdirSync(pasta).sort().join(', ')}`);
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
 * 1. Permita carregar as categorias de um arquivo categorias.json, para o usuário personalizar.
 * 2. Crie a opção --por-data, que organiza em subpastas AAAA-MM pela data de modificação.
 * 3. Ao encontrar um nome repetido no destino, renomeie para "nome (2).ext" em vez de pular.
 */
