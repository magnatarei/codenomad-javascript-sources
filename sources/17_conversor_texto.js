/**
 * ============================================================
 * CodeNomad Academy  |  Sources JavaScript  |  17. Conversor de formatos de texto
 * ------------------------------------------------------------
 * O que faz: Converte qualquer frase ou identificador entre snake_case,
 *            camelCase, PascalCase, kebab-case, CONSTANT_CASE e Title Case;
 *            gera slug para URL; remove acentos; inverte o texto e aplica
 *            a capitalização de frase.
 * Como usar: node 17_conversor_texto.js camel "Relatório de Vendas do Mês"
 *            node 17_conversor_texto.js todos "configuração_do_usuário"
 *            node 17_conversor_texto.js --demo
 * O que você aprende: normalize('NFD'), expressões regulares com classes
 *            Unicode (\p{Lu}, \p{Ll}), grupos de captura com $1 e $2,
 *            split e filter, objetos de funções e spread de strings.
 * Requisitos: Node.js 18+, só biblioteca padrão
 * Licença MIT. Um projeto da CodeNomad Academy (codenomad.org)
 * ============================================================
 */
'use strict';

/** "ação" vira "acao": o NFD separa a letra do acento e a troca apaga só o acento. */
function removerAcentos(texto) {
  return String(texto).normalize('NFD').replace(/\p{Mn}/gu, '');
}

/**
 * Quebra qualquer formato em uma lista de palavras minúsculas:
 * "relatórioDeVendas", "relatorio_de_vendas" e "Relatório de Vendas"
 * viram a mesma lista. Os acentos só ficam quando pedido.
 */
function separarPalavras(texto, manterAcentos = false) {
  const base = manterAcentos ? String(texto) : removerAcentos(texto);
  return base
    .replace(/(\p{Ll}|\d)(\p{Lu})/gu, '$1 $2') // camelCase: minúscula seguida de maiúscula
    .replace(/(\p{Lu}+)(\p{Lu}\p{Ll})/gu, '$1 $2') // siglas: "HTMLParser" vira "HTML Parser"
    .split(/[^\p{L}\p{N}]+/u)
    .filter((palavra) => palavra.length > 0)
    .map((palavra) => palavra.toLowerCase());
}

const primeiraMaiuscula = (palavra) => palavra.charAt(0).toUpperCase() + palavra.slice(1);

// Em títulos em português, conectores curtos ficam em minúscula (menos no início).
const CONECTORES = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'as', 'os', 'em', 'no', 'na', 'com', 'para', 'por', 'um', 'uma']);

function titleCase(texto) {
  return separarPalavras(texto, true)
    .map((palavra, i) => (i > 0 && CONECTORES.has(palavra) ? palavra : primeiraMaiuscula(palavra)))
    .join(' ');
}

/**
 * Slug: palavras sem acento unidas por hífen, limitadas a um tamanho que
 * cabe bem em uma URL. Parece o kebab-case, mas o corte respeita a palavra.
 */
function slug(texto, maximo = 80) {
  const resultado = separarPalavras(texto).join('-');
  if (resultado.length <= maximo) return resultado;
  const corte = resultado.lastIndexOf('-', maximo); // corta no hífen, nunca no meio da palavra
  return corte > 0 ? resultado.slice(0, corte) : resultado.slice(0, maximo);
}

/** Espalhar a string em array evita partir letras compostas por dois códigos. */
function inverter(texto) {
  return [...String(texto)].reverse().join('');
}

/** Capitalização de frase: só a primeira letra maiúscula, o resto minúsculo. */
function capitalizar(texto) {
  const limpo = String(texto).trim().toLowerCase();
  return limpo.charAt(0).toUpperCase() + limpo.slice(1);
}

// Cada operação recebe o texto original e devolve o resultado. Um objeto de
// funções substitui um switch enorme e permite listar as opções sozinho.
const OPERACOES = {
  snake: (texto) => separarPalavras(texto).join('_'),
  camel: (texto) => separarPalavras(texto).map((palavra, i) => (i === 0 ? palavra : primeiraMaiuscula(palavra))).join(''),
  pascal: (texto) => separarPalavras(texto).map(primeiraMaiuscula).join(''),
  kebab: (texto) => separarPalavras(texto).join('-'),
  constant: (texto) => separarPalavras(texto).join('_').toUpperCase(),
  title: titleCase,
  slug,
  'sem-acentos': removerAcentos,
  inverter,
  capitalizar,
};

function mostrarTodas(texto) {
  console.log(`Texto: "${texto}"`);
  for (const [nome, operacao] of Object.entries(OPERACOES)) {
    console.log(`  ${nome.padEnd(12)} ${operacao(texto)}`);
  }
}

function demo() {
  console.log('=== Conversor de formatos de texto: demonstração ===\n');
  const frases = ['Relatório de Vendas do Mês', 'configuração_do_usuário', 'açãoRápidaNoBotão'];
  frases.forEach((frase, i) => {
    mostrarTodas(frase);
    if (i < frases.length - 1) console.log('');
  });
  console.log('\nRepare: a lista de palavras é a mesma, não importa o formato de entrada.');
}

function uso() {
  console.log(`Uso:
  node 17_conversor_texto.js <formato> "<texto>"
  node 17_conversor_texto.js --demo

Formatos: ${Object.keys(OPERACOES).join(', ')}, todos

Exemplos:
  node 17_conversor_texto.js camel "Relatório de Vendas do Mês"
  node 17_conversor_texto.js slug "Promoção de Verão 2026!"`);
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
  const [formato, ...partes] = args;
  const texto = partes.join(' ');
  if (texto.trim().length === 0) {
    console.error('Erro: faltou o texto a converter; coloque-o entre aspas depois do formato.');
    return 1;
  }
  if (formato === 'todos') {
    mostrarTodas(texto);
    return 0;
  }
  const operacao = OPERACOES[formato];
  if (!operacao) {
    console.error(`Erro: formato desconhecido "${formato}". Use um destes: ${Object.keys(OPERACOES).join(', ')}, todos.`);
    return 1;
  }
  console.log(operacao(texto));
  return 0;
}

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}

module.exports = { separarPalavras, removerAcentos, slug, inverter, capitalizar, titleCase, OPERACOES };

/* ------------------------------------------------------------
 * Para ir além
 *  1. Detecte o formato de entrada (snake, camel, kebab...) e imprima
 *     "entrada: camelCase" antes do resultado.
 *  2. Converta um arquivo inteiro: leia um .js, troque os identificadores
 *     snake_case por camelCase e grave em outro arquivo.
 *  3. Acrescente a operação "alternar", que troca a caixa de cada letra
 *     (aLtErNaDo), e uma que conta vogais e consoantes.
 * ------------------------------------------------------------ */
