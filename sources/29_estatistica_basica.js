/**
 * ============================================================
 * CodeNomad Academy  |  Sources JavaScript  |  29. Estatística descritiva
 * ------------------------------------------------------------
 * O que faz: Calcula média, mediana, moda, variância, desvio padrão, mínimo,
 *            máximo, amplitude e quartis de uma lista de números vinda dos
 *            argumentos ou de um arquivo, e desenha um histograma em texto.
 * Como usar: node sources/29_estatistica_basica.js 7 8 5 9 10 6 8 7
 *            node sources/29_estatistica_basica.js --arquivo notas.txt
 *            node sources/29_estatistica_basica.js --demo
 * O que você aprende: reduce, sort com comparador numérico, Map para contar
 *            frequências, Math.min e Math.max com spread, fs.promises com
 *            async/await, os.tmpdir(), repeat para gráficos em texto.
 * Requisitos: Node.js 18+, só biblioteca padrão
 * Licença MIT. Um projeto da CodeNomad Academy (codenomad.org)
 * ============================================================
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

function media(valores) {
  return valores.reduce((soma, v) => soma + v, 0) / valores.length;
}

// Mediana: o valor do meio da lista ordenada. Com quantidade par de
// valores, é a média dos dois do meio.
function mediana(ordenados) {
  const meio = Math.floor(ordenados.length / 2);
  return ordenados.length % 2 === 0 ? (ordenados[meio - 1] + ordenados[meio]) / 2 : ordenados[meio];
}

// Moda: o valor (ou valores) que mais se repete. Se nada se repete, não há moda.
function moda(valores) {
  const contagem = new Map();
  for (const v of valores) contagem.set(v, (contagem.get(v) || 0) + 1);
  const maior = Math.max(...contagem.values());
  if (maior === 1) return [];
  return [...contagem].filter(([, vezes]) => vezes === maior).map(([valor]) => valor).sort((a, b) => a - b);
}

// Variância amostral (divide por n - 1): a escolha certa quando os dados são
// uma amostra de algo maior, que é o caso mais comum. Para a população
// inteira, passe amostral = false e a divisão é por n.
function variancia(valores, amostral = true) {
  const m = media(valores);
  const somaDosQuadrados = valores.reduce((soma, v) => soma + (v - m) ** 2, 0);
  return somaDosQuadrados / (valores.length - (amostral ? 1 : 0));
}

function desvioPadrao(valores, amostral = true) {
  return Math.sqrt(variancia(valores, amostral));
}

// Quartis pelo método das metades: Q2 é a mediana; Q1 é a mediana da metade
// de baixo e Q3 a da metade de cima (sem a mediana, quando n é ímpar).
function quartis(ordenados) {
  const meio = Math.floor(ordenados.length / 2);
  const metadeDeBaixo = ordenados.slice(0, meio);
  const metadeDeCima = ordenados.slice(ordenados.length % 2 === 0 ? meio : meio + 1);
  return { q1: mediana(metadeDeBaixo), q2: mediana(ordenados), q3: mediana(metadeDeCima) };
}

function formatar(valor) {
  return Number.isInteger(valor) ? String(valor) : valor.toFixed(2);
}

// Histograma: divide o intervalo [mínimo, máximo] em faixas iguais, conta
// quantos valores caem em cada uma e desenha uma barra proporcional.
function histograma(valores, faixas = 8, larguraMaxima = 40) {
  const minimo = Math.min(...valores);
  const maximo = Math.max(...valores);
  const passo = (maximo - minimo) / faixas || 1; // || 1 evita passo zero quando todos são iguais
  const contagens = new Array(faixas).fill(0);
  for (const v of valores) {
    const indice = Math.min(Math.floor((v - minimo) / passo), faixas - 1); // o máximo cai na última faixa
    contagens[indice] += 1;
  }
  const maior = Math.max(...contagens);
  return contagens.map((quantidade, i) => {
    const inicio = minimo + i * passo;
    const barra = '#'.repeat(Math.round((quantidade / maior) * larguraMaxima));
    return `${formatar(inicio).padStart(7)} a ${formatar(inicio + passo).padStart(7)} | ${barra} ${quantidade}`;
  });
}

function resumir(valores) {
  const ordenados = [...valores].sort((a, b) => a - b); // sem comparador, sort ordena como texto
  const { q1, q2, q3 } = quartis(ordenados);
  return {
    quantidade: valores.length,
    media: media(valores),
    mediana: q2,
    moda: moda(valores),
    variancia: variancia(valores),
    desvioPadrao: desvioPadrao(valores),
    minimo: ordenados[0],
    maximo: ordenados[ordenados.length - 1],
    amplitude: ordenados[ordenados.length - 1] - ordenados[0],
    q1,
    q3,
    ordenados,
  };
}

function imprimirResumo(r) {
  const linha = (rotulo, valor) => console.log(`${rotulo.padEnd(26)} ${valor}`);
  linha('Quantidade de valores', r.quantidade);
  linha('Média', formatar(r.media));
  linha('Mediana', formatar(r.mediana));
  linha('Moda', r.moda.length === 0 ? 'nenhuma (nada se repete)' : r.moda.join(', '));
  linha('Variância (amostral)', formatar(r.variancia));
  linha('Desvio padrão (amostral)', formatar(r.desvioPadrao));
  linha('Mínimo / máximo', `${formatar(r.minimo)} / ${formatar(r.maximo)}`);
  linha('Amplitude', formatar(r.amplitude));
  linha('Quartis Q1 / Q2 / Q3', `${formatar(r.q1)} / ${formatar(r.mediana)} / ${formatar(r.q3)}`);
  linha('Intervalo interquartil', formatar(r.q3 - r.q1));
  console.log('\nHistograma:');
  histograma(r.ordenados).forEach((l) => console.log(l));
}

function converterNumeros(tokens) {
  return tokens.map((token) => {
    const n = Number(token);
    if (token.trim() === '' || Number.isNaN(n)) throw new Error(`"${token}" não é um número`);
    return n;
  });
}

// Lê um arquivo de texto com números separados por espaço, vírgula, ponto e
// vírgula ou quebra de linha. fs.promises + await evita bloquear o programa.
async function lerArquivo(caminho) {
  let conteudo;
  try {
    conteudo = await fs.promises.readFile(caminho, 'utf8');
  } catch (erro) {
    if (erro.code === 'ENOENT') throw new Error(`não encontrei o arquivo "${caminho}"`);
    throw erro;
  }
  const tokens = conteudo.split(/[\s,;]+/).filter((t) => t !== '');
  if (tokens.length === 0) throw new Error(`o arquivo "${caminho}" está vazio`);
  return converterNumeros(tokens);
}

async function demo() {
  // Notas de uma turma fictícia de 40 alunos, de 0 a 100.
  const notas = [72, 85, 91, 64, 78, 88, 95, 70, 82, 77, 69, 84, 90, 58, 73, 86, 79, 92, 66, 81,
    75, 88, 83, 61, 97, 74, 80, 87, 68, 76, 89, 71, 93, 65, 84, 78, 82, 60, 86, 79];
  console.log(`=== Amostra: ${notas.length} notas de uma turma ===`);
  console.log(notas.join(' '));
  console.log('\n=== Resumo calculado direto da lista ===');
  imprimirResumo(resumir(notas));

  // Mostra o caminho do arquivo: grava a amostra em um arquivo temporário,
  // lê de volta com lerArquivo() e confere que a média bate.
  const arquivo = path.join(os.tmpdir(), `codenomad_notas_${process.pid}.txt`);
  try {
    await fs.promises.writeFile(arquivo, notas.join('\n'), 'utf8');
    const lidas = await lerArquivo(arquivo);
    console.log(`\n=== Lendo de arquivo: ${arquivo} ===`);
    console.log(`${lidas.length} valores lidos; média ${formatar(media(lidas))}, igual à da lista: ${media(lidas) === media(notas)}`);
  } finally {
    await fs.promises.rm(arquivo, { force: true }); // apaga mesmo se algo falhar
  }
}

function mostrarUso() {
  console.log('Uso: node 29_estatistica_basica.js <números...>');
  console.log('     node 29_estatistica_basica.js --arquivo <caminho>   (números separados por espaço, vírgula ou linha)');
  console.log('     node 29_estatistica_basica.js --demo');
}

async function lerValores(args) {
  const indice = args.indexOf('--arquivo');
  if (indice !== -1) {
    const caminho = args[indice + 1];
    if (!caminho) throw new Error('--arquivo precisa do caminho logo depois');
    return lerArquivo(caminho);
  }
  return converterNumeros(args);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--demo')) return demo();
  try {
    if (args.length === 0) throw new Error('nenhum número informado');
    const valores = await lerValores(args);
    if (valores.length < 2) throw new Error('informe pelo menos 2 números');
    imprimirResumo(resumir(valores));
  } catch (erro) {
    console.error(`Erro: ${erro.message}`);
    mostrarUso();
    process.exitCode = 1;
  }
}

main();

/*
 * Para ir além:
 * 1. Adicione a opção --populacional para a variância dividir por n.
 * 2. Detecte valores discrepantes (outliers) com a regra 1,5 x intervalo
 *    interquartil e liste quais notas ficaram fora.
 * 3. Aceite --faixas N para o histograma e teste com 4, 8 e 16 faixas.
 */
