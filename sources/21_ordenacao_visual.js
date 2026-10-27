/**
 * ============================================================
 * CodeNomad Academy  |  Sources JavaScript  |  21. Algoritmos de ordenação com passos
 * ------------------------------------------------------------
 * O que faz: Implementa bubble sort, insertion sort, merge sort e quick sort
 *            do zero, contando comparações e trocas. Pode mostrar o vetor a
 *            cada passo e fecha com uma tabela comparando os quatro.
 * Como usar: node sources/21_ordenacao_visual.js 29 10 14 37 13 5 --passos
 *            node sources/21_ordenacao_visual.js --demo
 * O que você aprende: recursão (merge e quick), funções que recebem funções,
 *            troca de valores com desestruturação, cópia de vetor com spread,
 *            medição de tempo com performance.now() e tabelas com padStart.
 * Requisitos: Node.js 18+, só biblioteca padrão
 * Licença MIT. Um projeto da CodeNomad Academy (codenomad.org)
 * ============================================================
 */
'use strict';

// Cada algoritmo recebe um "painel" que conta comparações e trocas. Quando o
// registro de passos está ligado, ele também guarda uma foto do vetor a cada
// troca, para você ver o algoritmo trabalhando.
function criarPainel(registrarPassos) {
  return { comparacoes: 0, trocas: 0, passos: [], registrarPassos };
}

// Toda comparação passa por aqui, para o contador nunca ficar de fora.
// Devolve negativo quando "a" vem antes de "b", positivo quando vem depois.
function comparar(painel, a, b) {
  painel.comparacoes += 1;
  return a - b;
}

function registrarPasso(painel, vetor, descricao) {
  if (painel.registrarPassos) painel.passos.push(`${descricao.padEnd(26)} [${vetor.join(', ')}]`);
}

function trocar(painel, vetor, i, j) {
  painel.trocas += 1;
  const descricao = `troca ${vetor[i]} <-> ${vetor[j]}`;
  // Desestruturação: troca dois valores sem variável auxiliar.
  [vetor[i], vetor[j]] = [vetor[j], vetor[i]];
  registrarPasso(painel, vetor, descricao);
}

// Bubble sort: compara vizinhos e "borbulha" o maior para o fim a cada volta.
function bubbleSort(entrada, painel) {
  const v = [...entrada]; // cópia: ordenar não deve alterar o vetor original
  for (let fim = v.length - 1; fim > 0; fim -= 1) {
    let houveTroca = false;
    for (let i = 0; i < fim; i += 1) {
      if (comparar(painel, v[i], v[i + 1]) > 0) {
        trocar(painel, v, i, i + 1);
        houveTroca = true;
      }
    }
    if (!houveTroca) break; // nenhuma troca na volta: já está ordenado
  }
  return v;
}

// Insertion sort: pega um elemento por vez e o insere no lugar certo entre
// os que já estão ordenados, como quem organiza cartas na mão.
function insertionSort(entrada, painel) {
  const v = [...entrada];
  for (let i = 1; i < v.length; i += 1) {
    const atual = v[i];
    let j = i - 1;
    // Empurra para a direita todo mundo maior que "atual". Cada empurrão
    // escreve no vetor, por isso conta como uma troca.
    while (j >= 0 && comparar(painel, v[j], atual) > 0) {
      v[j + 1] = v[j];
      painel.trocas += 1;
      j -= 1;
    }
    v[j + 1] = atual;
    registrarPasso(painel, v, `insere ${atual} na posição ${j + 1}`);
  }
  return v;
}

// Merge sort: divide o vetor ao meio até sobrar um elemento (que já está
// ordenado por definição) e depois intercala as metades em ordem.
function mergeSort(entrada, painel) {
  if (entrada.length <= 1) return [...entrada];
  const meio = Math.floor(entrada.length / 2);
  const esquerda = mergeSort(entrada.slice(0, meio), painel);
  const direita = mergeSort(entrada.slice(meio), painel);
  return intercalar(esquerda, direita, painel);
}

function intercalar(esq, dir, painel) {
  const resultado = [];
  let i = 0;
  let j = 0;
  while (i < esq.length && j < dir.length) {
    if (comparar(painel, esq[i], dir[j]) <= 0) {
      resultado.push(esq[i]);
      i += 1;
    } else {
      resultado.push(dir[j]);
      j += 1;
    }
  }
  // Um dos lados acabou: o que sobrou do outro já está em ordem.
  while (i < esq.length) resultado.push(esq[i++]);
  while (j < dir.length) resultado.push(dir[j++]);
  painel.trocas += resultado.length; // cada elemento copiado é um movimento
  registrarPasso(painel, resultado, `intercala [${esq}] e [${dir}]`);
  return resultado;
}

// Quick sort: escolhe um pivô, joga os menores para a esquerda dele e os
// maiores para a direita, e repete em cada lado. Partição de Lomuto.
function quickSort(entrada, painel) {
  const v = [...entrada];
  ordenarTrecho(v, 0, v.length - 1, painel);
  return v;
}

function ordenarTrecho(v, inicio, fim, painel) {
  if (inicio >= fim) return; // zero ou um elemento: nada a fazer
  const pivo = v[fim];
  let fronteira = inicio - 1; // última posição ocupada por alguém menor que o pivô
  for (let i = inicio; i < fim; i += 1) {
    if (comparar(painel, v[i], pivo) < 0) {
      fronteira += 1;
      if (fronteira !== i) trocar(painel, v, fronteira, i);
    }
  }
  if (fronteira + 1 !== fim) trocar(painel, v, fronteira + 1, fim); // pivô no lugar definitivo
  ordenarTrecho(v, inicio, fronteira, painel);
  ordenarTrecho(v, fronteira + 2, fim, painel);
}

const ALGORITMOS = {
  bubble: { nome: 'Bubble sort', ordenar: bubbleSort },
  insertion: { nome: 'Insertion sort', ordenar: insertionSort },
  merge: { nome: 'Merge sort', ordenar: mergeSort },
  quick: { nome: 'Quick sort', ordenar: quickSort },
};

function executar(chave, vetor, registrarPassos) {
  const painel = criarPainel(registrarPassos);
  const inicio = performance.now();
  const ordenado = ALGORITMOS[chave].ordenar(vetor, painel);
  const ms = performance.now() - inicio;
  return { nome: ALGORITMOS[chave].nome, ordenado, ms, ...painel };
}

function executarTodos(vetor, registrarPassos) {
  return Object.keys(ALGORITMOS).map((chave) => executar(chave, vetor, registrarPassos));
}

function imprimirTabela(resultados) {
  const cabecalho = `${'Algoritmo'.padEnd(16)}${'Comparações'.padStart(13)}${'Trocas'.padStart(10)}${'Tempo (ms)'.padStart(12)}`;
  console.log(cabecalho);
  console.log('-'.repeat(cabecalho.length));
  for (const r of resultados) {
    console.log(`${r.nome.padEnd(16)}${String(r.comparacoes).padStart(13)}${String(r.trocas).padStart(10)}${r.ms.toFixed(3).padStart(12)}`);
  }
}

// Gerador com semente: a mesma semente produz sempre a mesma sequência, então
// o --demo é reproduzível. Math.random() não permite escolher a semente.
function criarGerador(semente) {
  let estado = semente;
  return () => {
    estado = (estado * 1103515245 + 12345) % 2147483648;
    return Math.floor(estado / 65536); // os bits altos são mais bem distribuídos
  };
}

function gerarPseudoaleatorio(quantidade, semente) {
  const proximo = criarGerador(semente);
  return Array.from({ length: quantidade }, () => proximo() % 1000);
}

function lerArgumentos(args) {
  const opcoes = { numeros: [], passos: false };
  for (const arg of args) {
    if (arg === '--passos') {
      opcoes.passos = true;
      continue;
    }
    const n = Number(arg);
    if (arg.trim() === '' || Number.isNaN(n)) throw new Error(`"${arg}" não é um número`);
    opcoes.numeros.push(n);
  }
  if (opcoes.numeros.length === 0) throw new Error('informe os números a ordenar');
  return opcoes;
}

function mostrarUso() {
  console.log('Uso: node 21_ordenacao_visual.js <números...> [--passos]');
  console.log('     node 21_ordenacao_visual.js --demo');
}

function rodarComOpcoes(opcoes) {
  const vetor = opcoes.numeros;
  console.log(`Entrada (${vetor.length} elementos): [${vetor.join(', ')}]\n`);
  const resultados = executarTodos(vetor, opcoes.passos);
  for (const r of resultados) {
    if (!opcoes.passos) continue;
    console.log(`=== Passos: ${r.nome} ===`);
    r.passos.slice(0, 60).forEach((p, i) => console.log(`${String(i + 1).padStart(3)}. ${p}`));
    if (r.passos.length > 60) console.log(`    ... mais ${r.passos.length - 60} passos omitidos`);
    console.log(`Resultado: [${r.ordenado.join(', ')}]\n`);
  }
  imprimirTabela(resultados);
}

function demo() {
  const vetor = [29, 10, 14, 37, 13, 5, 42, 1];
  console.log(`=== Vetor de entrada: [${vetor.join(', ')}] ===\n`);

  console.log('=== Passos do bubble sort (uma linha por troca) ===');
  const bubble = executar('bubble', vetor, true);
  bubble.passos.forEach((p, i) => console.log(`${String(i + 1).padStart(2)}. ${p}`));
  console.log(`Resultado: [${bubble.ordenado.join(', ')}]\n`);

  console.log('=== Os quatro algoritmos no mesmo vetor ===');
  imprimirTabela(executarTodos(vetor, false));

  console.log('\n=== Com 2.000 números pseudoaleatórios (semente fixa) ===');
  const grande = gerarPseudoaleatorio(2000, 42);
  const resultados = executarTodos(grande, false);
  imprimirTabela(resultados);

  // O sort() nativo sem comparador ordena como texto ("10" antes de "9").
  // Com o comparador numérico ele serve de gabarito para conferir os quatro.
  const gabarito = JSON.stringify([...grande].sort((a, b) => a - b));
  const todosIguais = resultados.every((r) => JSON.stringify(r.ordenado) === gabarito);
  console.log(`\nOs quatro resultados batem com o sort() nativo: ${todosIguais ? 'sim' : 'NÃO'}`);
  console.log('Repare: bubble e insertion crescem com n ao quadrado; merge e quick, com n log n.');
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--demo')) return demo();
  try {
    if (args.length === 0) throw new Error('nenhum número informado');
    rodarComOpcoes(lerArgumentos(args));
  } catch (erro) {
    console.error(`Erro: ${erro.message}`);
    mostrarUso();
    process.exitCode = 1;
  }
}

main();

/*
 * Para ir além:
 * 1. Implemente o selection sort com o mesmo painel e inclua na tabela.
 * 2. Troque o pivô do quick sort pelo elemento do meio e compare as trocas
 *    em um vetor que já está ordenado (o pior caso da versão atual).
 * 3. Crie a opção --aleatorio N que gera N números com gerarPseudoaleatorio()
 *    e mede o tempo dos quatro; depois tente N = 20000 e veja a diferença.
 */
