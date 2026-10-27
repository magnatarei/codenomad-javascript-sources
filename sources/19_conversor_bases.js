/**
 * ============================================================
 * CodeNomad Academy  |  Sources JavaScript  |  19. Conversor de bases numéricas
 * ------------------------------------------------------------
 * O que faz: Converte números entre qualquer base de 2 a 36 (binário,
 *            octal, base 10, hexadecimal...), explica o cálculo passo a
 *            passo nos dois sentidos e converte texto para binário (um
 *            byte por grupo de 8 bits) e de volta.
 * Como usar: node 19_conversor_bases.js 255 10 2
 *            node 19_conversor_bases.js FF 16 10 --passos
 *            node 19_conversor_bases.js --texto "Olá"
 *            node 19_conversor_bases.js --bits "01001111 01101001"
 *            node 19_conversor_bases.js --demo
 * O que você aprende: BigInt para números enormes, indexOf em uma tabela
 *            de dígitos, divisões sucessivas, potências com **, Buffer e
 *            UTF-8, padStart e os atalhos nativos parseInt e toString(base).
 * Requisitos: Node.js 18+, só biblioteca padrão
 * Licença MIT. Um projeto da CodeNomad Academy (codenomad.org)
 * ============================================================
 */
'use strict';

// A posição de cada símbolo nesta string é o seu valor: 'A' está na posição 10.
const DIGITOS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const NOMES = { 2: 'binário', 8: 'octal', 10: 'base 10', 16: 'hexadecimal' };

function validarBase(base) {
  if (!Number.isInteger(base) || base < 2 || base > 36) {
    throw new Error(`base inválida "${base}": use um inteiro de 2 a 36`);
  }
}

/**
 * Lê um número escrito em qualquer base e devolve o valor como BigInt.
 * Com Number o limite seria 2^53; com BigInt o único limite é a memória.
 */
function paraBase10(valor, base) {
  validarBase(base);
  const texto = String(valor).trim().toUpperCase();
  if (texto.length === 0) throw new Error('valor vazio');
  let total = 0n;
  for (const simbolo of texto) {
    const digito = DIGITOS.indexOf(simbolo);
    if (digito < 0 || digito >= base) throw new Error(`o dígito "${simbolo}" não existe na base ${base}`);
    total = total * BigInt(base) + BigInt(digito); // mesmo truque de ler um número dígito a dígito
  }
  return total;
}

/** Divisões sucessivas: o resto de cada divisão é um dígito, lido de trás para a frente. */
function deBase10(numero, base) {
  validarBase(base);
  let n = BigInt(numero);
  if (n < 0n) throw new Error('só converto números não negativos');
  if (n === 0n) return '0';
  let resultado = '';
  while (n > 0n) {
    resultado = DIGITOS[Number(n % BigInt(base))] + resultado;
    n /= BigInt(base);
  }
  return resultado;
}

function converter(valor, baseOrigem, baseDestino) {
  return deBase10(paraBase10(valor, baseOrigem), baseDestino);
}

/** Explica a leitura: cada dígito vale dígito x base^posição, da direita para a esquerda. */
function explicarParaBase10(valor, base) {
  paraBase10(valor, base); // valida antes de explicar
  const texto = String(valor).trim().toUpperCase();
  const linhas = [`${texto} (${NOMES[base] || `base ${base}`}) para base 10:`];
  let total = 0n;
  [...texto].reverse().forEach((simbolo, posicao) => {
    const digito = DIGITOS.indexOf(simbolo);
    const potencia = BigInt(base) ** BigInt(posicao);
    const parcela = BigInt(digito) * potencia;
    linhas.push(`  ${simbolo} x ${base}^${posicao} = ${digito} x ${potencia} = ${parcela}`);
    total += parcela;
  });
  linhas.push(`  soma = ${total}`);
  return linhas;
}

/** Explica a escrita: divide pela base até zerar e junta os restos de baixo para cima. */
function explicarDeBase10(numero, base) {
  validarBase(base);
  let n = BigInt(numero);
  const linhas = [`${n} (base 10) para ${NOMES[base] || `base ${base}`}, dividindo até zerar:`];
  const restos = [];
  while (n > 0n) {
    const resto = n % BigInt(base);
    linhas.push(`  ${n} / ${base} = ${n / BigInt(base)}, resto ${resto} (${DIGITOS[Number(resto)]})`);
    restos.push(DIGITOS[Number(resto)]);
    n /= BigInt(base);
  }
  linhas.push(`  lendo os restos de baixo para cima: ${restos.reverse().join('') || '0'}`);
  return linhas;
}

/** Cada byte UTF-8 vira 8 bits; letras acentuadas ocupam 2 bytes. */
function textoParaBinario(texto) {
  return [...Buffer.from(texto, 'utf8')].map((byte) => byte.toString(2).padStart(8, '0')).join(' ');
}

function binarioParaTexto(bits) {
  const grupos = bits.trim().split(/\s+/);
  const bytes = grupos.map((grupo) => {
    if (!/^[01]{8}$/.test(grupo)) throw new Error(`"${grupo}" não é um byte de 8 bits (só 0 e 1)`);
    return parseInt(grupo, 2); // o atalho nativo de paraBase10 para números pequenos
  });
  return Buffer.from(bytes).toString('utf8');
}

function demo() {
  console.log('=== Conversor de bases numéricas: demonstração ===\n');
  console.log('Conversões entre bases:');
  const casos = [['255', 10, 2], ['255', 10, 16], ['11111111', 2, 10], ['FF', 16, 8], ['777', 8, 2], ['2026', 10, 36], ['Z', 36, 10], ['12345678901234567890', 10, 16]];
  for (const [valor, origem, destino] of casos) {
    console.log(`  ${valor.padStart(20)} (base ${String(origem).padStart(2)}) = ${converter(valor, origem, destino)} (base ${destino})`);
  }

  console.log('\nPasso a passo de 2026 para hexadecimal:');
  explicarDeBase10(2026, 16).forEach((linha) => console.log(`  ${linha}`));
  console.log('\nPasso a passo de 7EA de volta para base 10:');
  explicarParaBase10('7EA', 16).forEach((linha) => console.log(`  ${linha}`));

  console.log('\nTexto em binário (um byte por grupo; "á" ocupa dois bytes em UTF-8):');
  for (const palavra of ['Oi!', 'Olá']) {
    const bits = textoParaBinario(palavra);
    console.log(`  "${palavra}" -> ${bits} -> "${binarioParaTexto(bits)}"`);
  }
  console.log('\nAtalhos nativos: parseInt("FF", 16) lê e (255).toString(2) escreve, mas só até 2^53.');
}

function uso() {
  console.log(`Uso:
  node 19_conversor_bases.js <valor> <base de origem> <base de destino> [--passos]
  node 19_conversor_bases.js --texto "<texto>"
  node 19_conversor_bases.js --bits "<bytes separados por espaço>"
  node 19_conversor_bases.js --demo

Exemplos:
  node 19_conversor_bases.js 255 10 2
  node 19_conversor_bases.js FF 16 10 --passos
  node 19_conversor_bases.js --bits "01001111 01101001"`);
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
  try {
    if (args[0] === '--texto' || args[0] === '--bits') {
      const valor = args.slice(1).join(' ');
      if (valor.trim().length === 0) throw new Error(`${args[0]} precisa de um valor logo depois`);
      console.log(args[0] === '--texto' ? textoParaBinario(valor) : binarioParaTexto(valor));
      return 0;
    }
    const passos = args.includes('--passos');
    const [valor, origemTexto, destinoTexto] = args.filter((arg) => arg !== '--passos');
    if (destinoTexto === undefined) throw new Error('informe valor, base de origem e base de destino');
    const origem = Number(origemTexto);
    const destino = Number(destinoTexto);
    const resultado = converter(valor, origem, destino);
    if (passos) {
      explicarParaBase10(valor, origem).forEach((linha) => console.log(linha));
      explicarDeBase10(paraBase10(valor, origem), destino).forEach((linha) => console.log(linha));
    }
    console.log(`${String(valor).toUpperCase()} (base ${origem}) = ${resultado} (base ${destino})`);
    return 0;
  } catch (err) {
    console.error(`Erro: ${err.message}. Rode sem argumentos para ver o uso.`);
    return 1;
  }
}

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}

module.exports = { paraBase10, deBase10, converter, textoParaBinario, binarioParaTexto };

/* ------------------------------------------------------------
 * Para ir além
 *  1. Aceite números negativos e a parte fracionária (10.5 em base 10 é
 *     1010.1 em binário): multiplique a fração pela base repetidamente.
 *  2. Mostre o complemento de dois de um número negativo em 8, 16 e 32
 *     bits, que é como o processador guarda inteiros com sinal.
 *  3. Converta cores: "#FF8800" vira rgb(255, 136, 0) e vice-versa,
 *     separando a string de dois em dois dígitos.
 * ------------------------------------------------------------ */
