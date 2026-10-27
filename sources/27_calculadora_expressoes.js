/**
 * ============================================================
 * CodeNomad Academy  |  Sources JavaScript  |  27. Calculadora de expressões matemáticas
 * ------------------------------------------------------------
 * O que faz: Lê uma expressão em texto com + - * / ^, parênteses e números
 *            com casas decimais, respeita a precedência (algoritmo
 *            shunting-yard), mostra a notação posfixa gerada e dá erros
 *            claros para expressão mal formada e divisão por zero.
 * Como usar: node sources/27_calculadora_expressoes.js "2 + 3 * (4 - 1) ^ 2"
 *            node sources/27_calculadora_expressoes.js --demo
 * O que você aprende: análise léxica com regex sticky (/y), pilhas, tabela
 *            de precedência e associatividade, menos unário, classe de erro
 *            própria com extends Error, notação posfixa (RPN), toPrecision.
 * Requisitos: Node.js 18+, só biblioteca padrão
 * Licença MIT. Um projeto da CodeNomad Academy (codenomad.org)
 * ============================================================
 */
'use strict';

// Uma classe de erro própria permite distinguir "expressão errada" (culpa
// da entrada) de um defeito no programa, e ainda carregar a posição.
class ErroDeExpressao extends Error {
  constructor(mensagem, posicao) {
    super(posicao === undefined ? mensagem : `${mensagem} (posição ${posicao})`);
    this.name = 'ErroDeExpressao';
    this.posicao = posicao;
  }
}

// Precedência maior liga mais forte. A potência é associativa à direita
// (2 ^ 3 ^ 2 = 2 ^ 9). "neg" é o menos unário: -2 ^ 2 vale -(2 ^ 2) = -4.
const OPERADORES = {
  '+': { precedencia: 1, direita: false, aridade: 2, calcular: (a, b) => a + b },
  '-': { precedencia: 1, direita: false, aridade: 2, calcular: (a, b) => a - b },
  '*': { precedencia: 2, direita: false, aridade: 2, calcular: (a, b) => a * b },
  '/': { precedencia: 2, direita: false, aridade: 2, calcular: dividir },
  neg: { precedencia: 3, direita: true, aridade: 1, calcular: (a) => -a },
  '^': { precedencia: 4, direita: true, aridade: 2, calcular: (a, b) => a ** b },
};

function dividir(a, b) {
  if (b === 0) throw new ErroDeExpressao(`divisão por zero (${a} / 0)`);
  return a / b;
}

// Análise léxica: transforma o texto em uma lista de tokens. A regex com a
// flag y (sticky) só casa exatamente em lastIndex, o que permite "morder" o
// texto pedaço a pedaço. Aceita vírgula ou ponto nas casas decimais.
const REGEX_NUMERO = /\d+(?:[.,]\d+)?|[.,]\d+/y;

function tokenizar(texto) {
  const tokens = [];
  let i = 0;
  while (i < texto.length) {
    const simbolo = texto[i];
    if (simbolo === ' ' || simbolo === '\t') {
      i += 1;
      continue;
    }
    REGEX_NUMERO.lastIndex = i;
    const numero = REGEX_NUMERO.exec(texto);
    if (numero) {
      tokens.push({ tipo: 'numero', valor: Number(numero[0].replace(',', '.')), texto: numero[0], posicao: i });
      i += numero[0].length;
      continue;
    }
    if (simbolo === '(' || simbolo === ')') {
      tokens.push({ tipo: simbolo, texto: simbolo, posicao: i });
    } else if (simbolo in OPERADORES) {
      // O "-" é unário quando não tem um valor antes dele: no começo, depois
      // de outro operador ou depois de "(". Nesse caso vira "neg".
      const anterior = tokens[tokens.length - 1];
      const unario = simbolo === '-' && (!anterior || anterior.tipo === 'operador' || anterior.tipo === '(');
      tokens.push({ tipo: 'operador', valor: unario ? 'neg' : simbolo, texto: simbolo, posicao: i });
    } else {
      throw new ErroDeExpressao(`símbolo inesperado "${simbolo}"`, i);
    }
    i += 1;
  }
  if (tokens.length === 0) throw new ErroDeExpressao('expressão vazia');
  return tokens;
}

// Shunting-yard (Dijkstra): números vão direto para a saída; operadores
// esperam em uma pilha até aparecer um de precedência menor ou um ")".
// O resultado é a notação posfixa, em que a ordem já embute a precedência.
function paraPosfixa(tokens) {
  const saida = [];
  const pilha = [];
  for (const token of tokens) {
    if (token.tipo === 'numero') {
      saida.push(token);
    } else if (token.tipo === '(') {
      pilha.push(token);
    } else if (token.tipo === ')') {
      while (pilha.length > 0 && pilha[pilha.length - 1].tipo !== '(') saida.push(pilha.pop());
      if (pilha.length === 0) throw new ErroDeExpressao('parêntese fechado sem abrir', token.posicao);
      pilha.pop(); // descarta o "(" correspondente
    } else {
      const op = OPERADORES[token.valor];
      while (pilha.length > 0) {
        const topo = pilha[pilha.length - 1];
        if (topo.tipo !== 'operador') break;
        const opTopo = OPERADORES[topo.valor];
        const topoSai = opTopo.precedencia > op.precedencia || (opTopo.precedencia === op.precedencia && !op.direita);
        if (!topoSai) break;
        saida.push(pilha.pop());
      }
      pilha.push(token);
    }
  }
  while (pilha.length > 0) {
    const token = pilha.pop();
    if (token.tipo === '(') throw new ErroDeExpressao('parêntese aberto sem fechar', token.posicao);
    saida.push(token);
  }
  return saida;
}

// Avaliar a posfixa é simples: número empilha; operador tira os operandos
// de que precisa, calcula e empilha o resultado. No fim sobra um valor só.
function avaliarPosfixa(posfixa) {
  const pilha = [];
  for (const token of posfixa) {
    if (token.tipo === 'numero') {
      pilha.push(token.valor);
      continue;
    }
    const op = OPERADORES[token.valor];
    if (pilha.length < op.aridade) throw new ErroDeExpressao(`operador "${token.texto}" sem operando`, token.posicao);
    const operandos = pilha.splice(-op.aridade); // remove e devolve os últimos "aridade" valores
    pilha.push(op.calcular(...operandos));
  }
  if (pilha.length !== 1) throw new ErroDeExpressao('faltou operador entre dois valores');
  return pilha[0];
}

function posfixaComoTexto(posfixa) {
  return posfixa.map((t) => (t.valor === 'neg' ? 'neg' : t.texto)).join(' ');
}

// Ponto flutuante binário não representa 0.1 com exatidão, por isso
// 0.1 + 0.2 dá 0.30000000000000004. Arredondar para 12 dígitos
// significativos esconde esse ruído sem alterar resultados normais.
function formatarNumero(valor) {
  if (!Number.isFinite(valor)) return String(valor);
  return String(Number(valor.toPrecision(12)));
}

function calcular(texto) {
  const posfixa = paraPosfixa(tokenizar(texto));
  return { posfixa: posfixaComoTexto(posfixa), resultado: avaliarPosfixa(posfixa) };
}

function demo() {
  console.log('=== Cinco expressões, com a notação posfixa gerada ===');
  const exemplos = ['2 + 3 * 4', '(2 + 3) * 4', '2 ^ 3 ^ 2', '-3 + 10 / 4', '0,1 + 0,2'];
  for (const texto of exemplos) {
    const { posfixa, resultado } = calcular(texto);
    console.log(`${texto.padEnd(14)} posfixa: ${posfixa.padEnd(16)} = ${formatarNumero(resultado)}`);
  }
  console.log('Repare em "2 ^ 3 ^ 2": a potência resolve da direita para a esquerda, 2 ^ 9 = 512.');
  console.log(`Sem arredondar, 0,1 + 0,2 dá ${0.1 + 0.2}: é o ponto flutuante binário, não um defeito.`);

  console.log('\n=== Erros tratados ===');
  for (const texto of ['2 + * 3', '10 / (5 - 5)', '(2 + 3', '2 $ 3']) {
    try {
      calcular(texto);
    } catch (erro) {
      if (!(erro instanceof ErroDeExpressao)) throw erro; // outro erro é defeito: deixa subir
      console.log(`${texto.padEnd(14)} erro: ${erro.message}`);
    }
  }
}

function mostrarUso() {
  console.log('Uso: node 27_calculadora_expressoes.js "<expressão>"');
  console.log('     operadores: + - * / ^ e parênteses; exemplo: "2 + 3 * (4 - 1) ^ 2"');
  console.log('     node 27_calculadora_expressoes.js --demo');
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--demo')) return demo();
  const texto = args.join(' ').trim();
  try {
    if (texto === '') throw new ErroDeExpressao('nenhuma expressão informada');
    const { posfixa, resultado } = calcular(texto);
    console.log(`Expressão: ${texto}`);
    console.log(`Posfixa:   ${posfixa}`);
    console.log(`Resultado: ${formatarNumero(resultado)}`);
  } catch (erro) {
    if (!(erro instanceof ErroDeExpressao)) throw erro;
    console.error(`Erro: ${erro.message}`);
    mostrarUso();
    process.exitCode = 1;
  }
}

main();

/*
 * Para ir além:
 * 1. Adicione o operador % (resto) e funções como raiz(x) e abs(x): o
 *    tokenizador precisa reconhecer nomes e a tabela, a aridade 1.
 * 2. Mostre a posição do erro com uma seta "^" embaixo da expressão.
 * 3. Aceite variáveis (x = 3; x * 2) guardando os valores em um Map.
 */
