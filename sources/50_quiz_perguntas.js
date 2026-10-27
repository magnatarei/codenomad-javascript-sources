/**
 * ============================================================
 * CodeNomad Academy  |  Sources JavaScript  |  50. Quiz de perguntas e respostas
 * ------------------------------------------------------------
 * O que faz: Quiz de múltipla escolha no terminal. Usa um banco embutido de
 *            perguntas sobre programação ou lê as suas de um arquivo de texto
 *            simples, embaralha perguntas e alternativas (com semente, se você
 *            quiser repetir a ordem), pontua e revisa as erradas no fim.
 * Como usar: node sources/50_quiz_perguntas.js --n 5
 *            node sources/50_quiz_perguntas.js --arquivo minhas.txt --semente 7
 *            node sources/50_quiz_perguntas.js --exportar modelo.txt   (grava o banco para editar)
 *            node sources/50_quiz_perguntas.js --demo
 * O que você aprende: leitura e escrita de arquivo texto, um parser de formato
 *            simples com mensagens de erro úteis, embaralhamento Fisher-Yates
 *            com semente, entries e destructuring, readline com await.
 * Requisitos: Node.js 18+, só biblioteca padrão
 * Licença MIT. Um projeto da CodeNomad Academy (codenomad.org)
 * ============================================================
 */
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

const LETRAS = 'ABCDEF';
// Cada pergunta: p (enunciado), a (alternativas) e r (índice da certa, começando em 0).
const BANCO = [
  { p: 'Qual palavra-chave cria uma constante em JavaScript?', a: ['var', 'let', 'const', 'static'], r: 2 },
  { p: 'O que a expressão typeof null devolve?', a: ['"null"', '"object"', '"undefined"', '"boolean"'], r: 1 },
  { p: 'Qual operador compara valor e tipo ao mesmo tempo?', a: ['==', '===', '=', '!='], r: 1 },
  { p: 'Qual método acrescenta um item ao fim de um array?', a: ['push', 'pop', 'shift', 'slice'], r: 0 },
  { p: 'O que JSON.stringify devolve?', a: ['um objeto', 'uma string', 'um array', 'um número'], r: 1 },
  { p: 'Qual destes valores conta como falso numa condição?', a: ['"0"', '[]', '0', '{}'], r: 2 },
  { p: 'Qual motor executa o JavaScript dentro do Node.js?', a: ['SpiderMonkey', 'V8', 'JavaScriptCore', 'Chakra'], r: 1 },
  { p: 'O que Array.prototype.map devolve?', a: ['o mesmo array, alterado', 'um novo array', 'undefined', 'o primeiro item'], r: 1 },
  { p: 'Para que serve a linha "use strict"?', a: ['acelera o programa', 'ativa regras mais rígidas e erros mais claros', 'importa módulos', 'desliga os avisos'], r: 1 },
  { p: 'Onde o await pode ser usado?', a: ['em qualquer função', 'só em funções async (ou no topo de módulos ES)', 'só em callbacks', 'só dentro de laços'], r: 1 },
  { p: 'Qual função do Node lê um arquivo inteiro de forma síncrona?', a: ['fs.readFileSync', 'fs.readFile', 'fs.open', 'fs.watch'], r: 0 },
  { p: 'Qual é o resultado de [1, 2, 3].length?', a: ['2', '3', '4', 'undefined'], r: 1 },
];

/**
 * Formato do arquivo de perguntas: blocos separados por uma linha em branco.
 *   # linhas com # são comentários
 *   P: enunciado
 *   A) alternativa          (de duas a seis, com letras em ordem)
 *   R: letra da alternativa certa
 */
function formatarPerguntas(perguntas) {
  const blocos = perguntas.map((q) => [`P: ${q.p}`, ...q.a.map((alt, i) => `${LETRAS[i]}) ${alt}`), `R: ${LETRAS[q.r]}`].join('\n'));
  return `# Perguntas do quiz. Um bloco por pergunta, separados por linha em branco.\n\n${blocos.join('\n\n')}\n`;
}

function interpretarPerguntas(texto) {
  const perguntas = [];
  for (const bloco of texto.replace(/\r\n/g, '\n').split(/\n\s*\n/)) {
    const linhas = bloco.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
    if (linhas.length === 0) continue;
    const numero = perguntas.length + 1;
    const q = { p: '', a: [], r: -1 };
    for (const linha of linhas) {
      if (linha.startsWith('P:')) q.p = linha.slice(2).trim();
      else if (/^[A-F]\)/i.test(linha)) q.a.push(linha.slice(2).trim());
      else if (linha.startsWith('R:')) q.r = LETRAS.indexOf(linha.slice(2).trim().toUpperCase());
      else throw new Error(`pergunta ${numero}: linha não reconhecida: "${linha}"`);
    }
    if (!q.p || q.a.length < 2) throw new Error(`pergunta ${numero}: precisa de enunciado (P:) e pelo menos duas alternativas`);
    if (q.r < 0 || q.r >= q.a.length) throw new Error(`pergunta ${numero}: a resposta (R:) precisa ser uma letra entre A e ${LETRAS[q.a.length - 1]}`);
    perguntas.push(q);
  }
  if (perguntas.length === 0) throw new Error('nenhuma pergunta encontrada');
  return perguntas;
}

/** Gerador pseudoaleatório com semente (mulberry32): a mesma semente repete a mesma ordem. */
function criarAleatorio(semente) {
  let estado = semente >>> 0;
  return () => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates: percorre de trás para a frente trocando cada item com um anterior sorteado. */
function embaralhar(lista, aleatorio) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(aleatorio() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/** Embaralha as alternativas sem perder de vista qual é a certa. */
function embaralharAlternativas(q, aleatorio) {
  const ordem = embaralhar(q.a.map((_, i) => i), aleatorio);
  return { p: q.p, a: ordem.map((i) => q.a[i]), r: ordem.indexOf(q.r) };
}

function prepararQuiz(banco, { n, semente, embaralha }) {
  const aleatorio = criarAleatorio(semente);
  const lista = (embaralha ? embaralhar(banco, aleatorio) : banco).slice(0, n);
  return embaralha ? lista.map((q) => embaralharAlternativas(q, aleatorio)) : lista;
}

/** Roda o quiz. "responder(q, numero)" devolve o índice escolhido, ou null para parar. */
async function rodarQuiz(perguntas, responder) {
  const erradas = [];
  let acertos = 0;
  let respondidas = 0;
  for (const [i, q] of perguntas.entries()) {
    console.log(`\nPergunta ${i + 1} de ${perguntas.length}: ${q.p}`);
    q.a.forEach((alt, j) => console.log(`  ${LETRAS[j]}) ${alt}`));
    const escolha = await responder(q, i + 1);
    if (escolha === null) {
      console.log('\nQuiz interrompido.');
      break;
    }
    respondidas += 1;
    if (escolha === q.r) {
      acertos += 1;
      console.log('Certo!');
    } else {
      erradas.push({ q, escolha });
      console.log(`Errado. A certa é ${LETRAS[q.r]}) ${q.a[q.r]}`);
    }
  }
  if (respondidas === 0) return;
  console.log(`\n== Pontuação: ${acertos} de ${respondidas} (${Math.round((acertos / respondidas) * 100)}%) ==`);
  if (erradas.length === 0) return console.log('Nenhum erro. Parabéns!');
  console.log('Revisão das erradas:');
  for (const { q, escolha } of erradas) {
    console.log(`  - ${q.p}`);
    console.log(`    você marcou ${LETRAS[escolha]}) ${q.a[escolha]}; a certa é ${LETRAS[q.r]}) ${q.a[q.r]}`);
  }
}

function criarLeitor() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const linhas = rl[Symbol.asyncIterator](); // guarda as linhas que chegam antes de alguém pedir
  return {
    async perguntar(texto) {
      rl.setPrompt(texto);
      rl.prompt();
      const { value, done } = await linhas.next();
      return done ? null : value; // null: a entrada acabou (Ctrl+D ou fim do arquivo)
    },
    fechar: () => rl.close(),
  };
}

async function quizInterativo(perguntas) {
  const leitor = criarLeitor();
  const responder = async (q) => {
    for (;;) {
      const resposta = await leitor.perguntar(`Resposta (A a ${LETRAS[q.a.length - 1]}): `);
      if (resposta === null) return null;
      const indice = LETRAS.indexOf(resposta.trim().toUpperCase());
      if (indice >= 0 && indice < q.a.length) return indice;
      console.log(`Digite uma letra de A a ${LETRAS[q.a.length - 1]}.`);
    }
  };
  console.log(`=== Quiz: ${perguntas.length} pergunta(s) ===`);
  await rodarQuiz(perguntas, responder);
  leitor.fechar();
}

async function demonstracao() {
  console.log('=== Demonstração: quiz respondido automaticamente ===');
  // Ida e volta pelo formato de arquivo: grava o banco num arquivo temporário e lê de volta.
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'codenomad-quiz-'));
  const arquivo = path.join(pasta, 'perguntas.txt');
  fs.writeFileSync(arquivo, formatarPerguntas(BANCO), 'utf8');
  const banco = interpretarPerguntas(fs.readFileSync(arquivo, 'utf8'));
  console.log(`Banco gravado e lido de volta de ${arquivo}: ${banco.length} perguntas.`);
  console.log('Semente 42 embaralha sempre na mesma ordem. O jogador automático erra as perguntas 2, 5 e 7 de propósito.');
  const perguntas = prepararQuiz(banco, { n: 8, semente: 42, embaralha: true });
  await rodarQuiz(perguntas, (q, numero) => {
    const escolha = [2, 5, 7].includes(numero) ? (q.r + 1) % q.a.length : q.r;
    console.log(`Resposta automática: ${LETRAS[escolha]}`);
    return escolha;
  });
  fs.rmSync(pasta, { recursive: true, force: true });
}

function lerArgumentos(lista) {
  const opcoes = {};
  for (let i = 0; i < lista.length; i++) {
    if (!lista[i].startsWith('--')) throw new Error(`argumento inesperado: "${lista[i]}"`);
    const temValor = lista[i + 1] !== undefined && !lista[i + 1].startsWith('--');
    opcoes[lista[i].slice(2)] = temValor ? lista[++i] : true;
  }
  return opcoes;
}

function uso() {
  console.log('Uso: node 50_quiz_perguntas.js [--arquivo perguntas.txt] [--n 5] [--semente 42] [--sem-embaralhar]');
  console.log('     node 50_quiz_perguntas.js --exportar modelo.txt    (grava o banco embutido para você editar)');
  console.log('     node 50_quiz_perguntas.js --demo');
}

async function principal() {
  let opcoes;
  try {
    opcoes = lerArgumentos(process.argv.slice(2));
    if (opcoes.demo) return await demonstracao();
    if (opcoes.ajuda) return uso();
    if (opcoes.exportar !== undefined) {
      const destino = path.resolve(String(opcoes.exportar));
      if (fs.existsSync(destino)) throw new Error(`"${destino}" já existe; escolha outro nome para não apagar o seu arquivo`);
      fs.writeFileSync(destino, formatarPerguntas(BANCO), 'utf8');
      return console.log(`Banco com ${BANCO.length} perguntas gravado em ${destino}. Edite e rode com --arquivo.`);
    }
    let banco = BANCO;
    if (opcoes.arquivo !== undefined) {
      const caminho = path.resolve(String(opcoes.arquivo));
      if (!fs.existsSync(caminho)) throw new Error(`não achei o arquivo "${caminho}"`);
      banco = interpretarPerguntas(fs.readFileSync(caminho, 'utf8'));
    }
    const n = Number(opcoes.n ?? banco.length);
    if (!Number.isInteger(n) || n < 1 || n > banco.length) throw new Error(`--n precisa ser um inteiro de 1 a ${banco.length} (recebi "${opcoes.n}")`);
    const semente = Number(opcoes.semente ?? Date.now() % 2147483647);
    if (!Number.isInteger(semente)) throw new Error(`--semente precisa ser um inteiro (recebi "${opcoes.semente}")`);
    await quizInterativo(prepararQuiz(banco, { n, semente, embaralha: !opcoes['sem-embaralhar'] }));
  } catch (erro) {
    console.error(`Erro: ${erro.message}`);
    process.exitCode = 1;
  }
}

principal();

/*
 * Para ir além:
 *   1. Dê um tempo limite por pergunta com setTimeout e conte como errada quando ele estourar.
 *   2. Guarde o histórico de pontuações em JSON e mostre a evolução nas últimas cinco partidas.
 *   3. Aceite perguntas com mais de uma resposta certa (R: A,C) e exija que o jogador marque todas.
 */
