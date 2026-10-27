/**
 * ============================================================
 * CodeNomad Academy  |  Sources JavaScript  |  28. Operações com matrizes
 * ------------------------------------------------------------
 * O que faz: Soma, subtração, multiplicação, transposta, determinante
 *            (recursivo, por expansão de Laplace) e identidade, com validação
 *            de dimensões e impressão alinhada em colunas.
 * Como usar: node sources/28_matriz_operacoes.js somar "1 2; 3 4" "5 6; 7 8"
 *            node sources/28_matriz_operacoes.js multiplicar "1 2 3; 4 5 6" "7 8; 9 10; 11 12"
 *            node sources/28_matriz_operacoes.js determinante "1 2 3; 4 5 6; 7 8 10"
 *            node sources/28_matriz_operacoes.js transpor "1 2 3; 4 5 6"
 *            node sources/28_matriz_operacoes.js identidade 3
 *            node sources/28_matriz_operacoes.js --demo
 * O que você aprende: arrays de arrays, map aninhado, Array.from com função
 *            geradora, reduce para produto escalar, recursão (determinante),
 *            validação que lança Error, split e regex para ler texto.
 * Requisitos: Node.js 18+, só biblioteca padrão
 * Licença MIT. Um projeto da CodeNomad Academy (codenomad.org)
 * ============================================================
 */
'use strict';

// Uma matriz é um array de linhas; cada linha é um array de números.
// Todas as funções devolvem uma matriz nova e nunca alteram as de entrada.

function dimensoes(m) {
  return `${m.length}x${m[0].length}`;
}

function validar(m, nome = 'matriz') {
  if (!Array.isArray(m) || m.length === 0 || !Array.isArray(m[0]) || m[0].length === 0) {
    throw new Error(`${nome} precisa ter pelo menos uma linha e uma coluna`);
  }
  const colunas = m[0].length;
  m.forEach((linha, i) => {
    if (!Array.isArray(linha) || linha.length !== colunas) {
      throw new Error(`${nome}: a linha ${i + 1} tem ${linha.length} colunas, as outras têm ${colunas}`);
    }
    linha.forEach((valor, j) => {
      if (typeof valor !== 'number' || Number.isNaN(valor)) throw new Error(`${nome}: a posição (${i + 1}, ${j + 1}) não é um número`);
    });
  });
  return m;
}

// Cria uma matriz chamando gerar(i, j) para cada posição. Array.from com
// função de mapeamento evita o laço duplo escrito à mão.
function criar(linhas, colunas, gerar = () => 0) {
  return Array.from({ length: linhas }, (_, i) => Array.from({ length: colunas }, (_, j) => gerar(i, j)));
}

function identidade(n) {
  return criar(n, n, (i, j) => (i === j ? 1 : 0));
}

// Soma e subtração são a mesma operação elemento a elemento: só muda a conta.
function combinar(a, b, operacao, nome) {
  if (a.length !== b.length || a[0].length !== b[0].length) {
    throw new Error(`não dá para ${nome} ${dimensoes(a)} com ${dimensoes(b)}: as dimensões precisam ser iguais`);
  }
  return a.map((linha, i) => linha.map((valor, j) => operacao(valor, b[i][j])));
}

function somar(a, b) {
  return combinar(a, b, (x, y) => x + y, 'somar');
}

function subtrair(a, b) {
  return combinar(a, b, (x, y) => x - y, 'subtrair');
}

// O elemento (i, j) do produto é a linha i de A "vezes" a coluna j de B:
// multiplica par a par e soma. Exige colunas de A iguais às linhas de B.
function multiplicar(a, b) {
  if (a[0].length !== b.length) {
    throw new Error(`não dá para multiplicar ${dimensoes(a)} por ${dimensoes(b)}: colunas de A (${a[0].length}) diferentes das linhas de B (${b.length})`);
  }
  return criar(a.length, b[0].length, (i, j) => a[i].reduce((soma, valor, k) => soma + valor * b[k][j], 0));
}

function transpor(m) {
  return criar(m[0].length, m.length, (i, j) => m[j][i]); // linhas viram colunas
}

// Determinante por expansão de Laplace na primeira linha: cada elemento
// multiplica o determinante da submatriz sem a linha e a coluna dele, com o
// sinal alternando. A recursão para em 2x2, que tem fórmula direta.
function determinante(m) {
  if (m.length !== m[0].length) throw new Error(`determinante só existe para matriz quadrada; esta é ${dimensoes(m)}`);
  const n = m.length;
  if (n === 1) return m[0][0];
  if (n === 2) return m[0][0] * m[1][1] - m[0][1] * m[1][0];
  let total = 0;
  for (let j = 0; j < n; j += 1) {
    const submatriz = m.slice(1).map((linha) => linha.filter((_, coluna) => coluna !== j));
    const sinal = j % 2 === 0 ? 1 : -1;
    total += sinal * m[0][j] * determinante(submatriz);
  }
  return total;
}

function formatarNumero(valor) {
  return Number.isInteger(valor) ? String(valor) : String(Number(valor.toFixed(4)));
}

// Impressão alinhada: descobre a célula mais larga e usa padStart em todas.
function formatar(m) {
  const celulas = m.map((linha) => linha.map(formatarNumero));
  const largura = Math.max(...celulas.flat().map((c) => c.length));
  return celulas.map((linha) => `| ${linha.map((c) => c.padStart(largura)).join('  ')} |`).join('\n');
}

function mostrar(titulo, m) {
  console.log(`${titulo} (${dimensoes(m)}):\n${formatar(m)}\n`);
}

// Lê "1 2 3; 4 5 6": ponto e vírgula separa linhas, espaço separa colunas.
function lerMatriz(texto, nome) {
  if (texto === undefined) throw new Error(`faltou a ${nome}`);
  const m = texto.split(';').map((linha, i) => {
    const limpa = linha.trim();
    if (limpa === '') throw new Error(`${nome}: a linha ${i + 1} está vazia`);
    return limpa.split(/[\s,]+/).map((token) => {
      const n = Number(token);
      if (Number.isNaN(n)) throw new Error(`${nome}: "${token}" não é um número`);
      return n;
    });
  });
  return validar(m, nome);
}

function demo() {
  const a = [[1, 2], [3, 4]];
  const b = [[5, 6], [7, 8]];
  const e = [[1, 2, 3], [4, 5, 6]];
  const d = [[1, 2, 3], [4, 5, 6], [7, 8, 10]];
  mostrar('A', a);
  mostrar('B', b);
  mostrar('A + B', somar(a, b));
  mostrar('A - B', subtrair(a, b));
  mostrar('A x B', multiplicar(a, b));
  mostrar('B x A (a ordem importa: multiplicação não é comutativa)', multiplicar(b, a));
  mostrar('E', e);
  mostrar('Transposta de E', transpor(e));
  mostrar('E x transposta de E', multiplicar(e, transpor(e)));
  mostrar('Identidade 3x3', identidade(3));
  mostrar('D', d);
  mostrar('D x identidade (continua D)', multiplicar(d, identidade(3)));
  console.log(`Determinante de A: ${determinante(a)}`);
  console.log(`Determinante de D: ${determinante(d)}`);
  console.log(`Determinante de [[2, 4], [1, 2]]: ${determinante([[2, 4], [1, 2]])} (linhas proporcionais: matriz sem inversa)\n`);
  console.log('=== Erros tratados ===');
  for (const tentativa of [() => somar(a, e), () => multiplicar(a, d), () => determinante(e)]) {
    try {
      tentativa();
    } catch (erro) {
      console.log(`erro: ${erro.message}`);
    }
  }
}

function mostrarUso() {
  console.log('Uso: node 28_matriz_operacoes.js somar|subtrair|multiplicar "<A>" "<B>"');
  console.log('     node 28_matriz_operacoes.js transpor|determinante "<A>"');
  console.log('     node 28_matriz_operacoes.js identidade <n>');
  console.log('     matriz em texto: linhas separadas por ";" e colunas por espaço, ex.: "1 2; 3 4"');
  console.log('     node 28_matriz_operacoes.js --demo');
}

function rodarComArgumentos([operacao, primeiro, segundo]) {
  const binarias = { somar, subtrair, multiplicar };
  if (operacao in binarias) {
    const a = lerMatriz(primeiro, 'matriz A');
    const b = lerMatriz(segundo, 'matriz B');
    mostrar('A', a);
    mostrar('B', b);
    mostrar(`Resultado de ${operacao}`, binarias[operacao](a, b));
  } else if (operacao === 'transpor') {
    const a = lerMatriz(primeiro, 'matriz');
    mostrar('Matriz', a);
    mostrar('Transposta', transpor(a));
  } else if (operacao === 'determinante') {
    const a = lerMatriz(primeiro, 'matriz');
    mostrar('Matriz', a);
    console.log(`Determinante: ${formatarNumero(determinante(a))}`);
  } else if (operacao === 'identidade') {
    const n = Number(primeiro);
    if (!Number.isInteger(n) || n < 1 || n > 20) throw new Error(`identidade precisa de um inteiro de 1 a 20, recebeu "${primeiro}"`);
    mostrar('Identidade', identidade(n));
  } else {
    throw new Error(`operação desconhecida "${operacao}"`);
  }
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--demo')) return demo();
  try {
    if (args.length === 0) throw new Error('nenhuma operação informada');
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
 * 1. Implemente a multiplicação por escalar e a potência A^n (n inteiro)
 *    reaproveitando multiplicar().
 * 2. Calcule a inversa de uma 2x2 (troque a diagonal, inverta o sinal da
 *    outra e divida pelo determinante) e confira que A x inversa dá a identidade.
 * 3. O determinante recursivo faz n! chamadas: meça o tempo de uma 10x10 e
 *    depois pesquise eliminação de Gauss, que resolve em n ao cubo.
 */
