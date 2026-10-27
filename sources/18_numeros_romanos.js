/**
 * ============================================================
 * CodeNomad Academy  |  Sources JavaScript  |  18. Conversor de números romanos
 * ------------------------------------------------------------
 * O que faz: Converte inteiros de 1 a 3999 para algarismos romanos e
 *            romanos de volta para inteiros, mostra a decomposição passo a
 *            passo, rejeita romanos mal formados (IIII, VX, MMMM) e imprime
 *            uma tabela de referência.
 * Como usar: node 18_numeros_romanos.js 1994 MCMXCIV 2026
 *            node 18_numeros_romanos.js --tabela
 *            node 18_numeros_romanos.js --demo
 * O que você aprende: arrays de pares [valor, símbolo], laço while com
 *            subtração, expressão regular que descreve a gramática dos
 *            romanos, throw e try/catch, e teste de ida e volta.
 * Requisitos: Node.js 18+, só biblioteca padrão
 * Licença MIT. Um projeto da CodeNomad Academy (codenomad.org)
 * ============================================================
 */
'use strict';

// Do maior para o menor, com os casos subtrativos (CM, CD, XC...) no meio:
// assim o laço sempre escolhe o maior símbolo que ainda cabe no resto.
const TABELA = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
  [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
];
const VALORES = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };

// A gramática inteira em uma expressão: milhares, centenas, dezenas e unidades.
const ROMANO_BEM_FORMADO = /^M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/;

function paraRomano(numero) {
  if (!Number.isInteger(numero) || numero < 1 || numero > 3999) {
    throw new Error(`só converto inteiros de 1 a 3999, recebi "${numero}"`);
  }
  let resto = numero;
  let resultado = '';
  for (const [valor, simbolo] of TABELA) {
    while (resto >= valor) {
      resultado += simbolo;
      resto -= valor;
    }
  }
  return resultado;
}

/** Mostra a decomposição: 1994 = 1000 (M) + 900 (CM) + 90 (XC) + 4 (IV). */
function explicar(numero) {
  const partes = [];
  let resto = numero;
  for (const [valor, simbolo] of TABELA) {
    while (resto >= valor) {
      partes.push(`${valor} (${simbolo})`);
      resto -= valor;
    }
  }
  return `${numero} = ${partes.join(' + ')}`;
}

function paraInteiro(romano) {
  const texto = String(romano).trim().toUpperCase();
  if (texto.length === 0) throw new Error('romano vazio');
  if (!ROMANO_BEM_FORMADO.test(texto)) throw new Error(`"${texto}" não é um romano bem formado`);
  let total = 0;
  for (let i = 0; i < texto.length; i++) {
    const atual = VALORES[texto[i]];
    const seguinte = VALORES[texto[i + 1]] || 0;
    // Símbolo menor antes de um maior subtrai: IV é 5 - 1, não 1 + 5.
    total += atual < seguinte ? -atual : atual;
  }
  return total;
}

/** Detecta o sentido pelo conteúdo: só dígitos é inteiro, o resto é romano. */
function converter(entrada) {
  const texto = String(entrada).trim();
  if (/^\d+$/.test(texto)) {
    const numero = Number(texto);
    return { entrada: texto, saida: paraRomano(numero), detalhe: explicar(numero) };
  }
  const numero = paraInteiro(texto);
  return { entrada: texto.toUpperCase(), saida: String(numero), detalhe: explicar(numero) };
}

function mostrarTabela() {
  console.log('Tabela de referência');
  for (const [valor, simbolo] of TABELA) console.log(`  ${simbolo.padEnd(3)} = ${String(valor).padStart(4)}`);
  console.log('  Regras: no máximo três repetições seguidas (III, não IIII);');
  console.log('  I, X e C podem vir antes de um símbolo maior para subtrair (IV, IX, XL, XC, CD, CM).');
}

function demo() {
  console.log('=== Conversor de números romanos: demonstração ===\n');
  console.log('Inteiro para romano, com a decomposição:');
  for (const numero of [1, 4, 9, 14, 40, 90, 400, 1994, 2026, 3999]) {
    console.log(`  ${String(numero).padStart(4)} -> ${paraRomano(numero).padEnd(10)} ${explicar(numero)}`);
  }

  console.log('\nRomano para inteiro:');
  for (const romano of ['III', 'XLII', 'XCIX', 'DCLXVI', 'MCMXCIV', 'mmxxvi']) {
    console.log(`  ${romano.padEnd(8)} -> ${paraInteiro(romano)}`);
  }

  console.log('\nEntradas rejeitadas (cada uma com o motivo):');
  for (const entrada of ['IIII', 'VX', 'MMMM', 'ABC', '0', '4000']) {
    try {
      converter(entrada);
      console.log(`  ${entrada.padEnd(8)} aceita (não deveria)`);
    } catch (err) {
      console.log(`  ${entrada.padEnd(8)} rejeitada: ${err.message}`);
    }
  }

  // Teste de ida e volta: se algo quebrasse, este laço denunciaria na hora.
  let idaEVolta = 0;
  for (let n = 1; n <= 3999; n++) if (paraInteiro(paraRomano(n)) === n) idaEVolta++;
  console.log(`\nIda e volta conferida em ${idaEVolta} de 3999 números.`);
  console.log('');
  mostrarTabela();
}

function uso() {
  console.log(`Uso:
  node 18_numeros_romanos.js <número ou romano> [outro ...]
  node 18_numeros_romanos.js --tabela
  node 18_numeros_romanos.js --demo

Exemplos:
  node 18_numeros_romanos.js 1994 MCMXCIV 2026
  node 18_numeros_romanos.js xlii`);
}

function main(args) {
  if (args.length === 0) {
    uso();
    return 0;
  }
  if (args.includes('--demo')) {
    demo();
    return 0;
  }
  if (args.includes('--tabela')) {
    mostrarTabela();
    return 0;
  }
  let falhas = 0;
  for (const entrada of args) {
    try {
      const resultado = converter(entrada);
      console.log(`${resultado.entrada} = ${resultado.saida}   (${resultado.detalhe})`);
    } catch (err) {
      console.error(`Erro em "${entrada}": ${err.message}`);
      falhas++;
    }
  }
  return falhas === 0 ? 0 : 1;
}

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}

module.exports = { paraRomano, paraInteiro, converter, explicar };

/* ------------------------------------------------------------
 * Para ir além
 *  1. Aceite a notação com traço (vínculo) para milhares acima de 3999:
 *     "IV" com traço em cima vale 4000.
 *  2. Faça um modo "tolerante" que entenda IIII como 4 e VIIII como 9,
 *     avisando que a forma clássica seria IV e IX.
 *  3. Some e subtraia direto em romano: "MCM + XCIV" deve imprimir MCMXCIV,
 *     convertendo para inteiro só por baixo dos panos.
 * ------------------------------------------------------------ */
