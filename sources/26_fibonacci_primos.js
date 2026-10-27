/**
 * ============================================================
 * CodeNomad Academy  |  Sources JavaScript  |  26. Fibonacci, fatorial e primos
 * ------------------------------------------------------------
 * O que faz: Calcula Fibonacci de três jeitos (recursivo puro, com memória e
 *            iterativo) comparando passos e tempos, fatorial exato com BigInt,
 *            teste de primalidade e crivo de Eratóstenes até N.
 * Como usar: node sources/26_fibonacci_primos.js fib 30
 *            node sources/26_fibonacci_primos.js fatorial 25
 *            node sources/26_fibonacci_primos.js primo 7919
 *            node sources/26_fibonacci_primos.js primos 100
 *            node sources/26_fibonacci_primos.js --demo
 * O que você aprende: recursão e por que ela explode sem memória, Map como
 *            cache (memoização), BigInt para inteiros gigantes, Uint8Array,
 *            performance.now() e toLocaleString para números legíveis.
 * Requisitos: Node.js 18+, só biblioteca padrão
 * Licença MIT. Um projeto da CodeNomad Academy (codenomad.org)
 * ============================================================
 */
'use strict';

// Contador global de passos: chamadas nas versões recursivas, voltas do laço
// na iterativa. Serve para mostrar o tamanho do trabalho de cada versão.
let passos = 0;

// Fibonacci recursivo puro: fib(n) = fib(n-1) + fib(n-2). Elegante e
// terrível: cada chamada gera outras duas, e os mesmos valores são
// recalculados milhões de vezes. As chamadas crescem como 1,618 elevado a n.
function fibRecursivo(n) {
  passos += 1;
  if (n < 2) return n;
  return fibRecursivo(n - 1) + fibRecursivo(n - 2);
}

// Com memória (memoização): guarda cada resultado em um Map e nunca
// recalcula. A mesma recursão passa a custar uma chamada por valor de n.
function fibMemo(n, memo = new Map()) {
  passos += 1;
  if (n < 2) return n;
  if (memo.has(n)) return memo.get(n);
  const valor = fibMemo(n - 1, memo) + fibMemo(n - 2, memo);
  memo.set(n, valor);
  return valor;
}

// Iterativo com BigInt: dois acumuladores e um laço. Sem recursão não há
// limite de pilha, e o BigInt (sufixo n) mantém o resultado exato para
// qualquer n, enquanto Number perde precisão acima de 2 elevado a 53.
function fibIterativo(n) {
  let anterior = 0n;
  let atual = 1n;
  for (let i = 0; i < n; i += 1) {
    passos += 1;
    [anterior, atual] = [atual, anterior + atual];
  }
  return anterior;
}

function fatorial(n) {
  let resultado = 1n;
  for (let i = 2n; i <= BigInt(n); i += 1n) resultado *= i;
  return resultado;
}

// Primalidade por divisões até a raiz quadrada: se n tivesse um divisor
// maior que a raiz, o par dele seria menor que a raiz e já teria aparecido.
// Depois de tratar 2 e 3, basta testar os números da forma 6k - 1 e 6k + 1.
function ehPrimo(n) {
  if (n < 2) return false;
  if (n < 4) return true;
  if (n % 2 === 0 || n % 3 === 0) return false;
  for (let i = 5; i * i <= n; i += 6) {
    if (n % i === 0 || n % (i + 2) === 0) return false;
  }
  return true;
}

// Crivo de Eratóstenes: marca os múltiplos de cada primo como compostos.
// Uint8Array ocupa 1 byte por posição, bem menos que um array comum.
function crivo(limite) {
  const composto = new Uint8Array(limite + 1);
  const primos = [];
  for (let i = 2; i <= limite; i += 1) {
    if (composto[i]) continue;
    primos.push(i);
    for (let multiplo = i * i; multiplo <= limite; multiplo += i) composto[multiplo] = 1;
  }
  return primos;
}

function cronometrar(acao) {
  passos = 0;
  const inicio = performance.now();
  const valor = acao();
  return { valor, ms: performance.now() - inicio, passos };
}

const LIMITE_RECURSIVO = 35; // acima disso o recursivo puro leva minutos
const LIMITE_MEMO = 5000; // acima disso a recursão com memória estoura a pilha de chamadas

function compararFibonacci(n) {
  const versoes = [['Iterativo', () => fibIterativo(n)]];
  if (n <= LIMITE_MEMO) versoes.unshift(['Com memória', () => fibMemo(n)]);
  else console.log(`(com memória pulado: ${n} chamadas aninhadas estourariam a pilha de chamadas)`);
  if (n <= LIMITE_RECURSIVO) versoes.unshift(['Recursivo puro', () => fibRecursivo(n)]);
  else console.log(`(recursivo puro pulado: para n = ${n} levaria tempo demais)`);
  console.log(`${'Versão'.padEnd(16)}${'Passos'.padStart(12)}${'Tempo (ms)'.padStart(12)}  Resultado`);
  for (const [nome, acao] of versoes) {
    const r = cronometrar(acao);
    // As versões com Number passam de 1,8 x 10^308 em fib(1477) e viram Infinity; só o BigInt segue exato.
    const valor = r.valor === Infinity ? 'Infinity (passou do limite do Number; veja o iterativo)' : r.valor;
    console.log(`${nome.padEnd(16)}${r.passos.toLocaleString('pt-BR').padStart(12)}${r.ms.toFixed(3).padStart(12)}  ${valor}`);
  }
}

function demo() {
  console.log('=== Fibonacci de 30, três jeitos ===');
  compararFibonacci(30);
  console.log('Só existem 31 valores de n entre 0 e 30: todo o resto do recursivo puro é retrabalho.');
  console.log('Cada n a mais quase dobra as chamadas; com n = 50 seriam mais de 40 bilhões.');

  console.log('\n=== Números grandes: BigInt contra Number ===');
  const fib100 = fibIterativo(100);
  console.log(`fib(100) exato (BigInt): ${fib100}`);
  console.log(`fib(100) em Number:      ${Number(fib100)} (arredondado: só 15 ou 16 dígitos confiáveis)`);
  console.log(`20! = ${fatorial(20)}`);
  console.log(`25! = ${fatorial(25)} (BigInt)`);
  console.log(`25! = ${Number(fatorial(25))} (Number, perdeu os dígitos finais)`);

  console.log('\n=== Primos ===');
  const ate100 = crivo(100);
  console.log(`Crivo até 100 (${ate100.length} primos): ${ate100.join(' ')}`);
  for (const n of [97, 100, 7919, 1000003]) {
    console.log(`ehPrimo(${n.toLocaleString('pt-BR')}) = ${ehPrimo(n)}`);
  }
  const r = cronometrar(() => crivo(1000000));
  console.log(`Crivo até 1.000.000: ${r.valor.length.toLocaleString('pt-BR')} primos em ${r.ms.toFixed(1)} ms; o maior é ${r.valor[r.valor.length - 1]}`);
}

function lerInteiro(texto, minimo, maximo) {
  const n = Number(texto);
  if (texto === undefined || texto.trim() === '' || !Number.isInteger(n)) throw new Error(`"${texto}" não é um inteiro`);
  if (n < minimo || n > maximo) throw new Error(`${n} fora do intervalo de ${minimo} a ${maximo.toLocaleString('pt-BR')}`);
  return n;
}

function mostrarUso() {
  console.log('Uso: node 26_fibonacci_primos.js fib <n>          (compara as três versões)');
  console.log('     node 26_fibonacci_primos.js fatorial <n>     (exato, com BigInt)');
  console.log('     node 26_fibonacci_primos.js primo <n>        (testa um número)');
  console.log('     node 26_fibonacci_primos.js primos <limite>  (crivo até o limite)');
  console.log('     node 26_fibonacci_primos.js --demo');
}

function rodarComArgumentos([comando, valor]) {
  if (comando === 'fib') {
    compararFibonacci(lerInteiro(valor, 0, 10000));
  } else if (comando === 'fatorial') {
    const n = lerInteiro(valor, 0, 3000);
    console.log(`${n}! = ${fatorial(n)}`);
  } else if (comando === 'primo') {
    const n = lerInteiro(valor, 0, Number.MAX_SAFE_INTEGER);
    console.log(`${n.toLocaleString('pt-BR')} ${ehPrimo(n) ? 'é primo' : 'não é primo'}`);
  } else if (comando === 'primos') {
    const limite = lerInteiro(valor, 2, 50000000);
    const r = cronometrar(() => crivo(limite));
    const lista = r.valor.length > 50 ? `${r.valor.slice(0, 25).join(' ')} ... ${r.valor.slice(-25).join(' ')}` : r.valor.join(' ');
    console.log(`${r.valor.length.toLocaleString('pt-BR')} primos até ${limite.toLocaleString('pt-BR')} em ${r.ms.toFixed(1)} ms:`);
    console.log(lista);
  } else {
    throw new Error(`comando desconhecido "${comando}"`);
  }
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--demo')) return demo();
  try {
    if (args.length === 0) throw new Error('nenhum comando informado');
    rodarComArgumentos(args);
  } catch (erro) {
    console.error(`Erro: ${erro.message}`);
    mostrarUso();
    process.exitCode = 1;
  }
}

main();

/*
 * Para ir além:
 * 1. Escreva o fatorial recursivo e descubra a partir de que n ele estoura a
 *    pilha de chamadas (o erro se chama "Maximum call stack size exceeded").
 * 2. Faça a memoização funcionar com BigInt para fib(1000) continuar exato.
 * 3. Decomponha um número em fatores primos (360 = 2 x 2 x 2 x 3 x 3 x 5)
 *    reaproveitando a lista do crivo.
 */
