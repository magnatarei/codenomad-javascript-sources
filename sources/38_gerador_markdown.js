/**
 * ============================================================
 * CodeNomad Academy  |  Sources JavaScript  |  38. Gerador de relatório em Markdown
 * ------------------------------------------------------------
 * O que faz: Monta um documento Markdown (títulos, parágrafos, listas,
 *            tabela alinhada e blocos de código) a partir de uma estrutura
 *            em JSON, e também converte qualquer CSV em tabela Markdown com
 *            colunas alinhadas e números encostados à direita.
 * Como usar: node 38_gerador_markdown.js documento estrutura.json --gravar relatorio.md
 *            node 38_gerador_markdown.js tabela dados.csv
 *            node 38_gerador_markdown.js --demo
 * O que você aprende: funções pequenas que devolvem texto e se combinam,
 *            padEnd e padStart para alinhar colunas, expressão regular para
 *            reconhecer números, map e join para montar linhas, o formato
 *            Markdown por dentro e validação de uma estrutura vinda de JSON.
 * Requisitos: Node.js 18+, só biblioteca padrão
 * Licença MIT. Um projeto da CodeNomad Academy (codenomad.org)
 * ============================================================
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

// Reconhece "12", "-3.5", "18,90" e "45%": colunas só com isso ficam alinhadas à direita.
const NUMERO = /^-?\d+([.,]\d+)?%?$/;

// ---------- Blocos de Markdown ----------

function titulo(texto, nivel = 1) {
  if (!Number.isInteger(nivel) || nivel < 1 || nivel > 6) throw new Error(`Nível de título inválido: ${nivel} (use 1 a 6).`);
  return `${'#'.repeat(nivel)} ${String(texto).trim()}`;
}

function paragrafo(texto) {
  return String(texto).trim();
}

function lista(itens, ordenada = false) {
  if (!Array.isArray(itens) || itens.length === 0) throw new Error('A lista precisa de ao menos um item.');
  return itens.map((item, i) => `${ordenada ? `${i + 1}.` : '-'} ${item}`).join('\n');
}

function blocoCodigo(codigo, linguagem = '') {
  // Três crases abrem e fecham o bloco; a linguagem logo após as crases liga o destaque de sintaxe.
  const cerca = '```';
  return `${cerca}${linguagem}\n${String(codigo).replace(/\n$/, '')}\n${cerca}`;
}

function tabela(cabecalho, linhas) {
  if (!Array.isArray(cabecalho) || cabecalho.length === 0) throw new Error('A tabela precisa de um cabeçalho com ao menos uma coluna.');
  if (!Array.isArray(linhas)) throw new Error('As linhas da tabela precisam ser uma lista de listas.');
  // Cada célula vira texto; a barra vertical é escapada para não quebrar a tabela.
  const celulas = linhas.map((linha) => cabecalho.map((_, c) => String(linha[c] ?? '').replace(/\|/g, '\\|')));
  const numerica = cabecalho.map((_, c) => celulas.length > 0 && celulas.every((linha) => linha[c] === '' || NUMERO.test(linha[c])));
  const largura = cabecalho.map((nome, c) => Math.max(String(nome).length, 3, ...celulas.map((linha) => linha[c].length)));
  const alinhar = (texto, c) => (numerica[c] ? texto.padStart(largura[c]) : texto.padEnd(largura[c]));
  const montar = (campos) => `| ${campos.map((campo, c) => alinhar(String(campo), c)).join(' | ')} |`;
  // Na linha separadora, ":" no fim significa "alinhe à direita"; no começo, "à esquerda".
  const separador = largura.map((l, c) => (numerica[c] ? `${'-'.repeat(l - 1)}:` : `:${'-'.repeat(l - 1)}`));
  return [montar(cabecalho), `| ${separador.join(' | ')} |`, ...celulas.map(montar)].join('\n');
}

// ---------- Montagem do documento ----------

function documento(estrutura) {
  if (!estrutura || typeof estrutura !== 'object' || !estrutura.titulo) {
    throw new Error('A estrutura precisa de "titulo" e de uma lista "secoes" (veja o --demo).');
  }
  const blocos = [titulo(estrutura.titulo)];
  if (estrutura.descricao) blocos.push(paragrafo(estrutura.descricao));
  (estrutura.secoes || []).forEach((secao, i) => {
    if (typeof secao !== 'object' || secao === null) throw new Error(`A seção ${i + 1} precisa ser um objeto.`);
    if (secao.titulo) blocos.push(titulo(secao.titulo, 2));
    if (secao.texto) blocos.push(paragrafo(secao.texto));
    if (secao.lista) blocos.push(lista(secao.lista, Boolean(secao.ordenada)));
    if (secao.tabela) blocos.push(tabela(secao.tabela.cabecalho, secao.tabela.linhas));
    if (secao.codigo) blocos.push(blocoCodigo(secao.codigo.conteudo, secao.codigo.linguagem));
  });
  blocos.push(`_Documento montado em ${new Date().toLocaleString('pt-BR')}._`);
  // Blocos separados por linha em branco: é assim que o Markdown entende parágrafos.
  return blocos.join('\n\n') + '\n';
}

function lerLinhaCsv(linha) {
  const campos = [];
  let atual = '';
  let entreAspas = false;
  for (const c of linha) {
    if (c === '"') entreAspas = !entreAspas;
    else if (c === ',' && !entreAspas) { campos.push(atual); atual = ''; }
    else atual += c;
  }
  campos.push(atual);
  return campos.map((campo) => campo.trim());
}

function tabelaDeCsv(texto) {
  const [cabecalho, ...linhas] = texto.split(/\r?\n/).filter((l) => l.trim() !== '').map(lerLinhaCsv);
  if (!cabecalho) throw new Error('O CSV está vazio.');
  return tabela(cabecalho, linhas) + '\n';
}

// ---------- Linha de comando ----------

function executar(argv) {
  const [comando, arquivo] = argv.filter((a) => !a.startsWith('--'));
  const posicaoGravar = argv.indexOf('--gravar');
  const gravarEm = posicaoGravar === -1 ? undefined : argv[posicaoGravar + 1];
  if (posicaoGravar !== -1 && !gravarEm) throw new Error('--gravar precisa do nome do arquivo de destino.');
  if (!['documento', 'tabela'].includes(comando)) throw new Error(`Comando desconhecido: "${comando}". Use documento ou tabela.`);
  if (!arquivo) throw new Error(`Informe o arquivo de entrada: node 38_gerador_markdown.js ${comando} <arquivo>`);
  if (!fs.existsSync(arquivo)) throw new Error(`Arquivo não encontrado: ${arquivo}`);
  const texto = fs.readFileSync(arquivo, 'utf8');
  let markdown;
  if (comando === 'tabela') markdown = tabelaDeCsv(texto);
  else {
    let estrutura;
    try { estrutura = JSON.parse(texto); } catch (erro) { throw new Error(`${arquivo} não é um JSON válido: ${erro.message}`); }
    markdown = documento(estrutura);
  }
  if (!gravarEm) { process.stdout.write(markdown); return; }
  fs.writeFileSync(gravarEm, markdown, 'utf8');
  console.log(`Markdown gravado em ${gravarEm} (${markdown.split('\n').length - 1} linhas).`);
}

function mostrarUso() {
  console.log(`Uso: node 38_gerador_markdown.js <comando> <arquivo> [--gravar saida.md]

  documento <estrutura.json>   monta o documento a partir de um JSON com:
                               { "titulo", "descricao", "secoes": [ { "titulo", "texto",
                                 "lista", "ordenada", "tabela": { "cabecalho", "linhas" },
                                 "codigo": { "linguagem", "conteudo" } } ] }
  tabela <dados.csv>           converte o CSV numa tabela Markdown alinhada
  --gravar <arquivo.md>        grava em vez de imprimir
  --demo                       gera um relatório de exemplo e imprime o Markdown`);
}

// ---------- Demonstração ----------

const EXEMPLO = {
  titulo: 'Relatório da turma JS-1',
  descricao: 'Resumo do primeiro módulo do curso de JavaScript, com notas e próximos passos.',
  secoes: [
    { titulo: 'Notas por aluno', tabela: {
      cabecalho: ['Aluno', 'Exercícios', 'Prova', 'Situação'],
      linhas: [['Ana Ribeiro', 10, '8,5', 'Aprovada'], ['Bruno Castro', 7, '6,0', 'Recuperação'], ['Carla Souza', 9, '9,5', 'Aprovada']],
    } },
    { titulo: 'O que foi visto', lista: ['Variáveis, tipos e operadores', 'Funções e escopo', 'Arrays e objetos', 'Leitura de arquivos com fs'] },
    { titulo: 'Próximos passos', ordenada: true, lista: ['Revisar closures', 'Fazer o projeto da agenda', 'Entregar o exercício 4'] },
    { titulo: 'Exemplo de código da aula', texto: 'A função abaixo calcula a média de uma lista de notas:',
      codigo: { linguagem: 'javascript', conteudo: 'function calcularMedia(notas) {\n  const soma = notas.reduce((total, n) => total + n, 0);\n  return soma / notas.length;\n}' } },
  ],
};

const CSV_EXEMPLO = 'produto,quantidade,preço,situação\nCaderno pautado,12,"18,90",em estoque\nCaneta azul,140,"3,50",em estoque\nMochila escolar,3,"149,90",últimas unidades\n';

function demo() {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'codenomad-markdown-'));
  const estrutura = path.join(pasta, 'estrutura.json');
  const csv = path.join(pasta, 'produtos.csv');
  const semTitulo = path.join(pasta, 'sem-titulo.json');
  fs.writeFileSync(estrutura, JSON.stringify(EXEMPLO, null, 2), 'utf8');
  fs.writeFileSync(csv, CSV_EXEMPLO, 'utf8');
  fs.writeFileSync(semTitulo, '{"secoes": []}', 'utf8');
  console.log('=== Gerador de Markdown: demonstração ===');
  console.log(`Arquivos temporários em ${pasta}\n`);
  const cenas = [
    ['documento estrutura.json', ['documento', estrutura]],
    ['tabela produtos.csv', ['tabela', csv]],
    ['documento estrutura.json --gravar relatorio.md', ['documento', estrutura, '--gravar', path.join(pasta, 'relatorio.md')]],
    ['documento sem-titulo.json', ['documento', semTitulo]],
  ];
  for (const [rotulo, argv] of cenas) {
    console.log(`$ node 38_gerador_markdown.js ${rotulo}\n`);
    try {
      executar(argv);
    } catch (erro) {
      console.log(`Erro tratado: ${erro.message}`);
    }
    console.log('');
  }
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
 * 1. Adicione um bloco "imagem" ({ "legenda", "caminho" }) que vira ![legenda](caminho).
 * 2. Gere um sumário automático no topo, com links para cada seção (#titulo-da-secao).
 * 3. Faça o caminho inverso: leia uma tabela Markdown e grave um CSV.
 */
