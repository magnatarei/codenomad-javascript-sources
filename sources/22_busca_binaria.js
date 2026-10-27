/**
 * ============================================================
 * CodeNomad Academy  |  Sources JavaScript  |  22. Busca binária e busca linear
 * ------------------------------------------------------------
 * O que faz: Implementa busca linear e busca binária (iterativa e recursiva)
 *            do zero, contando passos, e mostra por que a binária exige vetor
 *            ordenado e como o número de passos cresce com o tamanho do vetor.
 * Como usar: node sources/22_busca_binaria.js 42 7 1 42 9 15 3
 *            (o primeiro número é o alvo; os demais formam o vetor)
 *            node sources/22_busca_binaria.js --demo
 * O que você aprende: laço while com dois ponteiros, recursão com índices,
 *            Math.floor e Math.log2, objeto como retorno de vários valores,
 *            Array.from para gerar vetores grandes, tabelas com padStart.
 * Requisitos: Node.js 18+, só biblioteca padrão
 * Licença MIT. Um projeto da CodeNomad Academy (codenomad.org)
 * ============================================================
 */
'use strict';

// Busca linear: olha um por um, do começo ao fim. Funciona em qualquer vetor,
// ordenado ou não, mas no pior caso visita todos os elementos.
function buscaLinear(vetor, alvo) {
  let passos = 0;
  for (let i = 0; i < vetor.length; i += 1) {
    passos += 1;
    if (vetor[i] === alvo) return { indice: i, passos };
  }
  return { indice: -1, passos };
}

// Busca binária: olha o elemento do meio e descarta metade do vetor a cada
// passo. Só funciona com o vetor ordenado, porque "descartar a metade"
// pressupõe que tudo à esquerda é menor e tudo à direita é maior.
function buscaBinaria(vetor, alvo) {
  let inicio = 0;
  let fim = vetor.length - 1;
  let passos = 0;
  const trilha = []; // intervalos visitados, para mostrar o raciocínio depois
  while (inicio <= fim) {
    passos += 1;
    const meio = Math.floor((inicio + fim) / 2);
    trilha.push({ inicio, meio, fim, valor: vetor[meio] });
    if (vetor[meio] === alvo) return { indice: meio, passos, trilha };
    if (vetor[meio] < alvo) inicio = meio + 1; // o alvo só pode estar à direita
    else fim = meio - 1; // o alvo só pode estar à esquerda
  }
  return { indice: -1, passos, trilha };
}

// A mesma ideia escrita com recursão: cada chamada cuida de um intervalo menor.
// Os parâmetros com valor padrão permitem chamar só com (vetor, alvo).
function buscaBinariaRecursiva(vetor, alvo, inicio = 0, fim = vetor.length - 1, passos = 0) {
  if (inicio > fim) return { indice: -1, passos };
  const meio = Math.floor((inicio + fim) / 2);
  if (vetor[meio] === alvo) return { indice: meio, passos: passos + 1 };
  if (vetor[meio] < alvo) return buscaBinariaRecursiva(vetor, alvo, meio + 1, fim, passos + 1);
  return buscaBinariaRecursiva(vetor, alvo, inicio, meio - 1, passos + 1);
}

function estaOrdenado(vetor) {
  for (let i = 1; i < vetor.length; i += 1) {
    if (vetor[i] < vetor[i - 1]) return false;
  }
  return true;
}

// Vetor ordenado de números pares (0, 2, 4, ...). Assim qualquer ímpar serve
// de exemplo de valor ausente.
function gerarVetorOrdenado(tamanho) {
  return Array.from({ length: tamanho }, (_, i) => i * 2);
}

// Quantos passos a busca binária precisa, no máximo, para n elementos:
// cada passo divide o intervalo por 2, então é o log na base 2, arredondado.
function passosMaximosBinaria(n) {
  return Math.floor(Math.log2(n)) + 1;
}

function descreverIndice(indice) {
  return indice === -1 ? 'não encontrado' : `encontrado no índice ${indice}`;
}

function imprimirTrilha(trilha) {
  trilha.forEach((p, n) => {
    console.log(`    passo ${n + 1}: intervalo [${p.inicio}..${p.fim}], meio = ${p.meio}, valor ${p.valor}`);
  });
}

function compararBuscas(vetor, alvo, mostrarTrilha) {
  const linear = buscaLinear(vetor, alvo);
  const binaria = buscaBinaria(vetor, alvo);
  const recursiva = buscaBinariaRecursiva(vetor, alvo);
  console.log(`  Linear:    ${descreverIndice(linear.indice)} em ${linear.passos} passo(s)`);
  console.log(`  Binária:   ${descreverIndice(binaria.indice)} em ${binaria.passos} passo(s)`);
  console.log(`  Recursiva: ${descreverIndice(recursiva.indice)} em ${recursiva.passos} passo(s)`);
  if (mostrarTrilha) imprimirTrilha(binaria.trilha);
}

function imprimirTabelaCrescimento(tamanhos) {
  const cabecalho = `${'Tamanho'.padStart(9)}${'Linear (pior)'.padStart(15)}${'Binária'.padStart(10)}${'Máximo teórico'.padStart(16)}`;
  console.log(cabecalho);
  console.log('-'.repeat(cabecalho.length));
  for (const n of tamanhos) {
    const vetor = gerarVetorOrdenado(n);
    const alvo = vetor[n - 1]; // o último elemento é o pior caso da linear
    const linear = buscaLinear(vetor, alvo);
    const binaria = buscaBinaria(vetor, alvo);
    console.log(`${String(n).padStart(9)}${String(linear.passos).padStart(15)}${String(binaria.passos).padStart(10)}${String(passosMaximosBinaria(n)).padStart(16)}`);
  }
}

function demo() {
  const pequeno = [3, 8, 15, 21, 42, 57, 63, 70, 88, 91];
  console.log(`=== Vetor ordenado de 10 posições: [${pequeno.join(', ')}] ===`);
  console.log('Procurando 57 (presente):');
  compararBuscas(pequeno, 57, true);
  console.log('Procurando 50 (ausente):');
  compararBuscas(pequeno, 50, true);

  const desordenado = [42, 7, 1, 15, 9, 3];
  console.log(`\n=== Vetor sem ordem: [${desordenado.join(', ')}] ===`);
  console.log('Procurando 15, que está na posição 3:');
  compararBuscas(desordenado, 15, true);
  console.log('  A binária viu 1, depois 9, depois 3, e sempre descartou a esquerda: o 15 ficou para trás.');
  console.log('  Sem ordem, a regra "descartar metade" descarta o lado errado.');

  console.log('\n=== Crescimento dos passos com o tamanho do vetor ===');
  imprimirTabelaCrescimento([10, 1000, 100000]);
  console.log('Dobrar o vetor custa 1 passo a mais na binária e o dobro na linear.');
  console.log(`Em 1 milhão de posições a binária resolve em no máximo ${passosMaximosBinaria(1000000)} passos.`);
}

function lerNumeros(args) {
  return args.map((arg) => {
    const n = Number(arg);
    if (arg.trim() === '' || Number.isNaN(n)) throw new Error(`"${arg}" não é um número`);
    return n;
  });
}

function mostrarUso() {
  console.log('Uso: node 22_busca_binaria.js <alvo> <n1> <n2> <n3> ...');
  console.log('     node 22_busca_binaria.js --demo');
}

function rodarComArgumentos(args) {
  const [alvo, ...vetor] = lerNumeros(args);
  if (vetor.length === 0) throw new Error('informe o alvo e pelo menos um número do vetor');
  console.log(`Alvo: ${alvo}`);
  console.log(`Vetor (${vetor.length} elementos): [${vetor.join(', ')}]`);
  if (estaOrdenado(vetor)) {
    compararBuscas(vetor, alvo, true);
    return;
  }
  // Com o vetor fora de ordem, a binária não é confiável: ordena uma cópia
  // antes e avisa. O índice encontrado vale para a cópia ordenada.
  const ordenado = [...vetor].sort((a, b) => a - b);
  console.log('O vetor não está ordenado: a binária vai usar uma cópia ordenada.');
  console.log(`Cópia ordenada: [${ordenado.join(', ')}]`);
  const linear = buscaLinear(vetor, alvo);
  console.log(`  Linear (vetor original): ${descreverIndice(linear.indice)} em ${linear.passos} passo(s)`);
  const binaria = buscaBinaria(ordenado, alvo);
  console.log(`  Binária (cópia ordenada): ${descreverIndice(binaria.indice)} em ${binaria.passos} passo(s)`);
  imprimirTrilha(binaria.trilha);
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--demo')) return demo();
  try {
    if (args.length === 0) throw new Error('nenhum número informado');
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
 * 1. Faça a binária devolver a posição onde o alvo deveria ser inserido
 *    quando ele não existe (é o que um "inserir ordenado" precisa).
 * 2. Adapte a busca para um vetor de objetos ordenado por nome, comparando
 *    strings com localeCompare em vez de < e ===.
 * 3. Meça o tempo real das duas buscas com performance.now() em um vetor
 *    de 10 milhões de posições e compare com a contagem de passos.
 */
