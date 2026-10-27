/**
 * ============================================================
 * CodeNomad Academy  |  Sources JavaScript  |  16. Palíndromos e anagramas
 * ------------------------------------------------------------
 * O que faz: Verifica se uma frase é palíndromo ignorando acentos, espaços
 *            e pontuação; verifica se duas frases são anagramas uma da
 *            outra; e agrupa uma lista de palavras pelos anagramas que
 *            elas formam entre si.
 * Como usar: node 16_palindromo_anagrama.js palindromo "A grama é amarga"
 *            node 16_palindromo_anagrama.js anagrama "amor" "Roma"
 *            node 16_palindromo_anagrama.js agrupar amor roma mora ramo pedra perda
 *            node 16_palindromo_anagrama.js --demo
 * O que você aprende: normalize('NFD') para tirar acentos, expressões
 *            regulares Unicode, spread de strings, reverse e sort, Map
 *            como agrupador e funções puras pequenas que se combinam.
 * Requisitos: Node.js 18+, só biblioteca padrão
 * Licença MIT. Um projeto da CodeNomad Academy (codenomad.org)
 * ============================================================
 */
'use strict';

/** Deixa só letras e números, sem acento e em minúsculas: "Luz azul!" vira "luzazul". */
function normalizar(texto) {
  return String(texto)
    .normalize('NFD') // separa cada letra do seu acento
    .replace(/\p{Mn}/gu, '') // apaga só os acentos
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, ''); // tira espaços, pontuação e símbolos
}

function ehPalindromo(frase) {
  const miolo = normalizar(frase);
  // Espalhar em array respeita letras fora do ASCII; split('') poderia quebrá-las.
  return miolo.length > 0 && miolo === [...miolo].reverse().join('');
}

/** Letras em ordem alfabética: duas palavras com a mesma chave são anagramas. */
function chaveAnagrama(texto) {
  return [...normalizar(texto)].sort().join('');
}

function saoAnagramas(a, b) {
  const chaveA = chaveAnagrama(a);
  return chaveA.length > 0 && chaveA === chaveAnagrama(b);
}

/**
 * Agrupa a lista em um Map de chave para palavras. Devolve só os valores,
 * com os grupos maiores primeiro e, em empate, em ordem alfabética.
 */
function agruparAnagramas(palavras) {
  const grupos = new Map();
  for (const palavra of palavras) {
    const chave = chaveAnagrama(palavra);
    if (chave.length === 0) continue;
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave).push(palavra);
  }
  return [...grupos.values()].sort((a, b) => b.length - a.length || a[0].localeCompare(b[0]));
}

function mostrarPalindromo(frase) {
  const resultado = ehPalindromo(frase);
  console.log(`  ${resultado ? 'SIM' : 'NÃO'}  "${frase}"  (miolo: ${normalizar(frase) || 'vazio'})`);
  return resultado;
}

function mostrarAnagrama(a, b) {
  const resultado = saoAnagramas(a, b);
  console.log(`  ${resultado ? 'SIM' : 'NÃO'}  "${a}" e "${b}"  (letras: ${chaveAnagrama(a)} / ${chaveAnagrama(b)})`);
  return resultado;
}

function mostrarGrupos(palavras) {
  const grupos = agruparAnagramas(palavras);
  grupos.forEach((grupo, i) => {
    const descricao = grupo.length > 1 ? `${grupo.length} anagramas` : 'sozinha';
    console.log(`  grupo ${i + 1} (${descricao}): ${grupo.join(', ')}`);
  });
  return grupos;
}

function demo() {
  console.log('=== Palíndromos e anagramas: demonstração ===\n');
  console.log('É palíndromo?');
  const frases = [
    'Socorram-me, subi no ônibus em Marrocos',
    'A grama é amarga',
    'Anotaram a data da maratona',
    'Luz azul',
    'A base do teto desaba',
    'Programar é divertido',
  ];
  frases.forEach(mostrarPalindromo);

  console.log('\nSão anagramas?');
  const pares = [['amor', 'Roma'], ['pedra', 'perda'], ['alegria', 'alergia'], ['O Brasil', 'Sabor Li'], ['casa', 'saco']];
  pares.forEach(([a, b]) => mostrarAnagrama(a, b));

  console.log('\nAgrupando uma lista por anagrama:');
  mostrarGrupos(['amor', 'roma', 'mora', 'ramo', 'porta', 'tropa', 'parto', 'trapo', 'pedra', 'perda', 'janela', 'escola', 'sacole']);
}

function uso() {
  console.log(`Uso:
  node 16_palindromo_anagrama.js palindromo "<frase>"
  node 16_palindromo_anagrama.js anagrama "<frase 1>" "<frase 2>"
  node 16_palindromo_anagrama.js agrupar <palavra> <palavra> [...]
  node 16_palindromo_anagrama.js --demo

Exemplos:
  node 16_palindromo_anagrama.js palindromo "A grama é amarga"
  node 16_palindromo_anagrama.js anagrama "amor" "Roma"`);
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
  const [comando, ...resto] = args;
  if (comando === 'palindromo') {
    if (resto.length === 0) {
      console.error('Erro: informe a frase a verificar, entre aspas.');
      return 1;
    }
    mostrarPalindromo(resto.join(' '));
    return 0;
  }
  if (comando === 'anagrama') {
    if (resto.length !== 2) {
      console.error(`Erro: anagrama precisa de exatamente duas frases entre aspas, recebi ${resto.length}.`);
      return 1;
    }
    mostrarAnagrama(resto[0], resto[1]);
    return 0;
  }
  if (comando === 'agrupar') {
    if (resto.length < 2) {
      console.error('Erro: informe pelo menos duas palavras para agrupar.');
      return 1;
    }
    mostrarGrupos(resto);
    return 0;
  }
  console.error(`Erro: comando desconhecido "${comando}". Use palindromo, anagrama, agrupar ou --demo.`);
  return 1;
}

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}

module.exports = { normalizar, ehPalindromo, saoAnagramas, agruparAnagramas, chaveAnagrama };

/* ------------------------------------------------------------
 * Para ir além
 *  1. Encontre o maior trecho palíndromo dentro de uma frase qualquer
 *     (em "banana" é "anana"), testando cada centro possível.
 *  2. Leia um dicionário em .txt, uma palavra por linha, e liste os dez
 *     grupos de anagramas mais numerosos da língua.
 *  3. Aceite números: 12321 é palíndromo; descubra o menor número maior
 *     que N que também é.
 * ------------------------------------------------------------ */
