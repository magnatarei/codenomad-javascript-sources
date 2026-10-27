/**
 * ============================================================
 * CodeNomad Academy  |  Sources JavaScript  |  20. Gerador de texto de preenchimento
 * ------------------------------------------------------------
 * O que faz: Gera parágrafos, frases ou palavras de texto de preenchimento
 *            em latim clássico (lorem ipsum) e também em português, com
 *            quantidade à escolha e uma semente opcional para repetir
 *            exatamente o mesmo resultado em outra execução.
 * Como usar: node 20_gerador_lorem.js --paragrafos 3
 *            node 20_gerador_lorem.js --frases 5 --idioma portugues --semente 42
 *            node 20_gerador_lorem.js --palavras 12 --largura 0
 *            node 20_gerador_lorem.js --demo
 * O que você aprende: gerador pseudoaleatório com semente (mulberry32),
 *            closures, operadores bit a bit e Math.imul, Array.from, flat
 *            e Set, montagem de frases por molde e quebra de linha manual.
 * Requisitos: Node.js 18+, só biblioteca padrão
 * Licença MIT. Um projeto da CodeNomad Academy (codenomad.org)
 * ============================================================
 */
'use strict';

const LATIM = (
  'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et ' +
  'dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea ' +
  'commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum fugiat nulla pariatur ' +
  'excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum'
).split(' ');
const ABERTURA_CLASSICA = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.';

// Em português as frases seguem um molde (sujeito, verbo, complemento), o
// que deixa o texto legível mesmo sem dizer nada de útil.
const PORTUGUES = {
  sujeitos: ['o aluno', 'a professora', 'a turma', 'o projeto', 'a função', 'o programa', 'a lista', 'o teste',
    'a equipe', 'o computador', 'a biblioteca', 'o caderno'],
  verbos: ['organiza', 'repete', 'aprende', 'revisa', 'descreve', 'calcula', 'guarda', 'imprime', 'compara',
    'ordena', 'explica', 'corrige', 'desenha', 'percorre'],
  complementos: ['cada passo com calma', 'o resultado na tela', 'a lógica do problema', 'os dados do arquivo',
    'as etapas do caminho', 'um exemplo por vez', 'a dúvida mais comum', 'a resposta certa', 'o número da página',
    'a média da turma', 'o código do exercício', 'a memória do sistema', 'o padrão do texto', 'a sequência inteira'],
  conectores: ['e', 'mas', 'enquanto', 'porque', 'então', 'embora', 'quando', 'depois'],
};
// flat achata a lista de listas; o Set tira repetições; o filter descarta artigos.
const PALAVRAS_PT = [...new Set(Object.values(PORTUGUES).flat().join(' ').split(' '))].filter((p) => p.length > 2);

/**
 * mulberry32: um gerador pseudoaleatório pequeno e bom o bastante para
 * texto de preenchimento. A closure guarda o estado; a mesma semente produz
 * sempre a mesma sequência, coisa que Math.random não permite.
 */
function criarSorteador(semente) {
  let estado = semente >>> 0; // força um inteiro sem sinal de 32 bits
  return function proximo() {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296; // de 0 (inclusive) a 1 (exclusive)
  };
}

const escolher = (lista, sortear) => lista[Math.floor(sortear() * lista.length)];
const inteiroEntre = (de, ate, sortear) => de + Math.floor(sortear() * (ate - de + 1));
const primeiraMaiuscula = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1);

function fraseLatim(sortear) {
  const quantidade = inteiroEntre(6, 14, sortear);
  const palavras = Array.from({ length: quantidade }, () => escolher(LATIM, sortear));
  // Uma vírgula no meio, de vez em quando, deixa o ritmo mais natural.
  if (quantidade > 8 && sortear() < 0.6) palavras[Math.floor(quantidade / 2)] += ',';
  return `${primeiraMaiuscula(palavras.join(' '))}.`;
}

function oracaoPortugues(sortear) {
  return `${escolher(PORTUGUES.sujeitos, sortear)} ${escolher(PORTUGUES.verbos, sortear)} ${escolher(PORTUGUES.complementos, sortear)}`;
}

function frasePortugues(sortear) {
  let frase = oracaoPortugues(sortear);
  if (sortear() < 0.5) frase += `, ${escolher(PORTUGUES.conectores, sortear)} ${oracaoPortugues(sortear)}`;
  return `${primeiraMaiuscula(frase)}.`;
}

const IDIOMAS = {
  latim: { frase: fraseLatim, palavras: LATIM },
  portugues: { frase: frasePortugues, palavras: PALAVRAS_PT },
};

function gerarFrases(quantidade, idioma, sortear) {
  return Array.from({ length: quantidade }, () => IDIOMAS[idioma].frase(sortear));
}

function gerarParagrafos(quantidade, idioma, sortear) {
  const paragrafos = Array.from({ length: quantidade }, () => gerarFrases(inteiroEntre(3, 6, sortear), idioma, sortear).join(' '));
  // Por tradição, o texto em latim começa pela frase que todo mundo reconhece.
  if (idioma === 'latim' && paragrafos.length > 0) paragrafos[0] = `${ABERTURA_CLASSICA} ${paragrafos[0]}`;
  return paragrafos;
}

function gerarPalavras(quantidade, idioma, sortear) {
  return Array.from({ length: quantidade }, () => escolher(IDIOMAS[idioma].palavras, sortear));
}

/** Quebra o texto em linhas de até N colunas sem partir palavras. */
function quebrarLinhas(texto, largura) {
  if (largura <= 0) return [texto];
  const linhas = [];
  let atual = '';
  for (const palavra of texto.split(' ')) {
    if (atual.length > 0 && atual.length + 1 + palavra.length > largura) {
      linhas.push(atual);
      atual = palavra;
    } else {
      atual = atual.length > 0 ? `${atual} ${palavra}` : palavra;
    }
  }
  if (atual.length > 0) linhas.push(atual);
  return linhas;
}

function imprimirBloco(texto, largura = 76) {
  quebrarLinhas(texto, largura).forEach((linha) => console.log(`  ${linha}`));
  console.log('');
}

function demo() {
  console.log('=== Gerador de texto de preenchimento: demonstração ===\n');
  const semente = 2026;
  const sortear = criarSorteador(semente);
  console.log(`Semente fixa ${semente}: rode de novo e o texto sai idêntico.\n`);
  console.log('Dois parágrafos em latim:');
  gerarParagrafos(2, 'latim', sortear).forEach((paragrafo) => imprimirBloco(paragrafo));
  console.log('Dois parágrafos em português:');
  gerarParagrafos(2, 'portugues', sortear).forEach((paragrafo) => imprimirBloco(paragrafo));
  console.log('Doze palavras soltas em cada idioma:');
  imprimirBloco(gerarPalavras(12, 'latim', sortear).join(', '));
  imprimirBloco(gerarPalavras(12, 'portugues', sortear).join(', '));
}

function uso() {
  console.log(`Uso:
  node 20_gerador_lorem.js [--paragrafos N] [--frases N] [--palavras N]
                           [--idioma latim|portugues] [--semente N] [--largura N]
  node 20_gerador_lorem.js --demo

Exemplos:
  node 20_gerador_lorem.js --paragrafos 3
  node 20_gerador_lorem.js --frases 5 --idioma portugues --semente 42
  node 20_gerador_lorem.js --palavras 12 --largura 0   (largura 0 = sem quebra de linha)`);
}

function lerOpcoes(args) {
  const opcoes = { paragrafos: 0, frases: 0, palavras: 0, idioma: 'latim', semente: null, largura: 76, demo: false };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--demo') {
      opcoes.demo = true;
      continue;
    }
    const nome = arg.slice(2);
    if (!arg.startsWith('--') || !(nome in opcoes)) throw new Error(`argumento desconhecido: "${arg}"`);
    const valor = args[i + 1];
    if (valor === undefined) throw new Error(`${arg} precisa de um valor logo depois`);
    i++;
    if (nome === 'idioma') {
      if (!(valor in IDIOMAS)) throw new Error(`idioma desconhecido "${valor}"; use latim ou portugues`);
      opcoes.idioma = valor;
    } else {
      const numero = Number(valor);
      if (!Number.isInteger(numero) || numero < 0 || numero > 100000) throw new Error(`${arg} precisa de um inteiro de 0 a 100000, não "${valor}"`);
      opcoes[nome] = numero;
    }
  }
  if (!opcoes.demo && opcoes.paragrafos + opcoes.frases + opcoes.palavras === 0) {
    throw new Error('diga quanto gerar: --paragrafos N, --frases N ou --palavras N');
  }
  return opcoes;
}

function main(args) {
  if (args.length === 0) {
    uso();
    return 0;
  }
  let opcoes;
  try {
    opcoes = lerOpcoes(args);
  } catch (err) {
    console.error(`Erro: ${err.message}. Rode sem argumentos para ver o uso.`);
    return 1;
  }
  if (opcoes.demo) {
    demo();
    return 0;
  }
  const semente = opcoes.semente ?? Math.floor(Math.random() * 2 ** 32);
  const sortear = criarSorteador(semente);
  const blocos = [];
  if (opcoes.paragrafos > 0) blocos.push(...gerarParagrafos(opcoes.paragrafos, opcoes.idioma, sortear));
  if (opcoes.frases > 0) blocos.push(gerarFrases(opcoes.frases, opcoes.idioma, sortear).join(' '));
  if (opcoes.palavras > 0) blocos.push(gerarPalavras(opcoes.palavras, opcoes.idioma, sortear).join(' '));
  console.log(blocos.map((bloco) => quebrarLinhas(bloco, opcoes.largura).join('\n')).join('\n\n'));
  // A dica vai para stderr: assim o texto puro pode ser redirecionado para um arquivo.
  console.error(`(semente ${semente}; repita com --semente ${semente} para obter o mesmo texto)`);
  return 0;
}

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}

module.exports = { criarSorteador, gerarFrases, gerarParagrafos, gerarPalavras, quebrarLinhas };

/* ------------------------------------------------------------
 * Para ir além
 *  1. Crie a opção --html, que envolve cada parágrafo em <p> e gera um
 *     título <h1> com 3 a 6 palavras em Title Case.
 *  2. Adicione um terceiro idioma com o seu próprio molde de frases e
 *     compare o tamanho médio das frases entre os três.
 *  3. Sorteie 100 mil números com criarSorteador e desenhe um histograma
 *     de 10 faixas no terminal para ver se a distribuição é uniforme.
 * ------------------------------------------------------------ */
