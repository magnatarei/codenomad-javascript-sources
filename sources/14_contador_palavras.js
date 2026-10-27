/**
 * ============================================================
 * CodeNomad Academy  |  Sources JavaScript  |  14. Contador de palavras e frequência
 * ------------------------------------------------------------
 * O que faz: Lê um texto (argumento ou arquivo) e conta símbolos, palavras,
 *            linhas, frases e parágrafos; estima o tempo de leitura e lista
 *            as N palavras mais frequentes, ignorando acentos e uma lista
 *            de palavras vazias do português (de, a, que, para...).
 * Como usar: node 14_contador_palavras.js --arquivo redacao.txt --top 15
 *            node 14_contador_palavras.js --texto "Uma frase. Outra frase!"
 *            node 14_contador_palavras.js --demo
 * O que você aprende: fs.promises com async/await, normalize('NFD') para
 *            tirar acentos, expressões regulares Unicode com \p{L}, Map
 *            para contagem, sort com comparador e Set para consulta rápida.
 * Requisitos: Node.js 18+, só biblioteca padrão
 * Licença MIT. Um projeto da CodeNomad Academy (codenomad.org)
 * ============================================================
 */
'use strict';

const fs = require('fs');

/** "ação" vira "acao": o NFD separa a letra do acento e a troca apaga só o acento. */
function semAcentos(texto) {
  return texto.normalize('NFD').replace(/\p{Mn}/gu, '');
}

// Palavras tão comuns que não dizem nada sobre o assunto do texto.
const PALAVRAS_VAZIAS = new Set((
  'a o as os e de do da dos das em no na nos nas um uma uns umas que com por para se ao aos à às ' +
  'é não mais como mas ou seu sua seus suas ele ela eles elas isso esse essa este esta isto foi são ' +
  'ser tem já também até quando muito muita muitos pelo pela sem sobre entre há era ter nem só ainda ' +
  'depois mesmo você eu nós lhe me te quem onde cada toda todo todos todas outro outra outros outras ' +
  'vai está estão sempre bem aqui ali então porque daqui esse alguém qualquer'
).split(' ').map(semAcentos));

/** Extrai as palavras em minúsculas; \p{L} casa qualquer letra, com ou sem acento. */
function extrairPalavras(texto) {
  return texto.toLowerCase().match(/\p{L}[\p{L}\p{N}'-]*/gu) || [];
}

function analisar(texto) {
  const palavras = extrairPalavras(texto);
  const totalLetras = palavras.reduce((soma, palavra) => soma + palavra.length, 0);
  // A quebra de linha no fim do arquivo encerra a última linha; não abre outra.
  const semQuebraFinal = texto.replace(/\r?\n$/, '');
  return {
    // Espalhar em array conta símbolos de verdade; length contaria unidades UTF-16.
    simbolos: [...texto].length,
    simbolosSemEspaco: [...texto.replace(/\s/g, '')].length,
    palavras: palavras.length,
    palavrasDiferentes: new Set(palavras.map(semAcentos)).size,
    linhas: semQuebraFinal.length === 0 ? 0 : semQuebraFinal.split(/\r?\n/).length,
    frases: texto.split(/[.!?]+(?:\s|$)/).filter((frase) => frase.trim().length > 0).length,
    paragrafos: texto.split(/\r?\n\s*\r?\n/).filter((paragrafo) => paragrafo.trim().length > 0).length,
    tamanhoMedio: palavras.length > 0 ? totalLetras / palavras.length : 0,
    maiorPalavra: palavras.reduce((maior, palavra) => (palavra.length > maior.length ? palavra : maior), ''),
    minutosLeitura: palavras.length / 200, // leitura típica de um adulto: 200 palavras por minuto
  };
}

/**
 * Conta cada palavra pela forma sem acento (assim a grafia acentuada e a
 * sem acento somam juntas), guarda a primeira grafia vista para exibir e
 * devolve as N mais frequentes, desempatando em ordem alfabética.
 */
function maisFrequentes(palavras, quantidade) {
  const contagem = new Map();
  for (const palavra of palavras) {
    const chave = semAcentos(palavra);
    if (chave.length < 2 || PALAVRAS_VAZIAS.has(chave)) continue;
    const item = contagem.get(chave) || { palavra, vezes: 0 };
    item.vezes++;
    contagem.set(chave, item);
  }
  return [...contagem.values()]
    .sort((a, b) => b.vezes - a.vezes || a.palavra.localeCompare(b.palavra))
    .slice(0, quantidade);
}

function formatarTempo(minutos) {
  if (minutos < 1) return `${Math.max(1, Math.round(minutos * 60))} segundos`;
  return `${Math.round(minutos)} min ${Math.round((minutos % 1) * 60)} s`;
}

function mostrarRelatorio(texto, top) {
  const dados = analisar(texto);
  const linhas = [
    ['Símbolos (com espaços)', dados.simbolos],
    ['Símbolos (sem espaços)', dados.simbolosSemEspaco],
    ['Palavras', dados.palavras],
    ['Palavras diferentes', dados.palavrasDiferentes],
    ['Frases', dados.frases],
    ['Linhas', dados.linhas],
    ['Parágrafos', dados.paragrafos],
    ['Tamanho médio da palavra', `${dados.tamanhoMedio.toFixed(1)} letras`],
    ['Maior palavra', dados.maiorPalavra || '(nenhuma)'],
    ['Tempo de leitura', formatarTempo(dados.minutosLeitura)],
  ];
  console.log('Estatísticas do texto');
  for (const [rotulo, valor] of linhas) console.log(`  ${rotulo.padEnd(26, '.')} ${valor}`);

  const ranking = maisFrequentes(extrairPalavras(texto), top);
  console.log(`\nTop ${ranking.length} palavras (sem as palavras vazias)`);
  const maior = ranking.length > 0 ? ranking[0].vezes : 1;
  ranking.forEach((item, i) => {
    const barra = '#'.repeat(Math.max(1, Math.round((item.vezes / maior) * 20)));
    console.log(`  ${String(i + 1).padStart(2)}. ${item.palavra.padEnd(16)} ${String(item.vezes).padStart(3)}  ${barra}`);
  });
}

const TEXTO_DEMO = `Aprender a programar se parece com aprender um instrumento. No começo, cada nota sai torta e a mão não obedece. Com o tempo, os dedos decoram o caminho e a música aparece sem esforço.

O segredo não é talento, é repetição com atenção. Quem escreve um programa pequeno por dia aprende mais do que quem lê dez livros e não escreve nada. O erro faz parte do método: cada mensagem de erro é uma pista sobre o que o computador entendeu.

Um bom projeto começa pequeno. Primeiro a versão que funciona, depois a versão bonita, por fim a versão rápida. Pular etapas costuma custar caro, porque um programa que ninguém entende é um programa que ninguém consegue consertar.

Por isso, escreva o código pensando em quem vai ler depois, mesmo que esse alguém seja você daqui a três meses. Nomes claros, funções curtas e comentários nos pontos difíceis valem mais do que qualquer truque esperto.`;

function demo() {
  console.log('=== Contador de palavras e frequência: demonstração ===\n');
  console.log('Texto analisado (4 parágrafos sobre aprender a programar):');
  console.log(`  "${TEXTO_DEMO.slice(0, 70)}..."\n`);
  mostrarRelatorio(TEXTO_DEMO, 10);
}

function uso() {
  console.log(`Uso:
  node 14_contador_palavras.js --arquivo <caminho> [--top N]
  node 14_contador_palavras.js --texto "<texto>" [--top N]
  node 14_contador_palavras.js --demo

Exemplo:
  node 14_contador_palavras.js --arquivo redacao.txt --top 15`);
}

function lerOpcoes(args) {
  const opcoes = { top: 10, demo: false };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--demo') {
      opcoes.demo = true;
    } else if (arg === '--arquivo' || arg === '--texto' || arg === '--top') {
      const valor = args[i + 1];
      if (valor === undefined) throw new Error(`${arg} precisa de um valor logo depois`);
      opcoes[arg.slice(2)] = valor;
      i++;
    } else {
      throw new Error(`argumento desconhecido: "${arg}"`);
    }
  }
  opcoes.top = Number(opcoes.top);
  if (!Number.isInteger(opcoes.top) || opcoes.top < 1 || opcoes.top > 100) {
    throw new Error('--top precisa ser um inteiro de 1 a 100');
  }
  return opcoes;
}

// Ler arquivo é I/O: a versão com promises deixa o código linear com await.
async function main(args) {
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
  let texto = opcoes.texto ?? '';
  if (opcoes.arquivo) {
    try {
      texto = await fs.promises.readFile(opcoes.arquivo, 'utf8');
    } catch (err) {
      console.error(`Erro: não consegui ler "${opcoes.arquivo}" (${err.code || err.message}).`);
      return 1;
    }
  }
  if (texto.trim().length === 0) {
    console.error('Erro: o texto está vazio; passe --texto ou --arquivo com conteúdo.');
    return 1;
  }
  mostrarRelatorio(texto, opcoes.top);
  return 0;
}

if (require.main === module) {
  main(process.argv.slice(2)).then((codigo) => {
    process.exitCode = codigo;
  });
}

module.exports = { analisar, maisFrequentes, extrairPalavras, semAcentos };

/* ------------------------------------------------------------
 * Para ir além
 *  1. Aceite vários arquivos de uma vez e mostre uma tabela comparando as
 *     estatísticas de cada um lado a lado.
 *  2. Conte também os pares de palavras seguidas (bigramas) mais comuns,
 *     que revelam expressões como "mensagem de erro".
 *  3. Leia o texto da entrada padrão (process.stdin) quando não houver
 *     --texto nem --arquivo, para encadear com outros comandos.
 * ------------------------------------------------------------ */
