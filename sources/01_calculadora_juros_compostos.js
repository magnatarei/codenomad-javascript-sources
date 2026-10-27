/**
 * ============================================================
 * CodeNomad Academy  |  Sources JavaScript  |  01. Calculadora de juros compostos
 * ------------------------------------------------------------
 * O que faz: Recebe o capital inicial, a taxa mensal, o prazo em meses e um
 *            aporte mensal opcional. Mostra o montante final, os juros ganhos
 *            e uma tabela mês a mês com saldo inicial, juros, aporte e saldo final.
 * Como usar: node 01_calculadora_juros_compostos.js 1000 0.8 24 200
 *            node 01_calculadora_juros_compostos.js --demo
 * O que você aprende: laço for com acumulador, funções puras que devolvem
 *            objetos, formatação de moeda com Intl.NumberFormat, alinhamento
 *            de colunas com padStart e tratamento de erro com try/catch.
 * Requisitos: Node.js 18+, só biblioteca padrão
 * Licença MIT. Um projeto da CodeNomad Academy (codenomad.org)
 * ============================================================
 */
'use strict';

const path = require('path');

const NOME_DO_PROGRAMA = path.basename(process.argv[1] || '01_calculadora_juros_compostos.js');
const PRAZO_MAXIMO_EM_MESES = 600;

// O Intl.NumberFormat cuida de milhar, vírgula e símbolo. Crie uma vez, reutilize sempre.
const formatoMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function moeda(valor) {
  return formatoMoeda.format(valor);
}

/**
 * Converte o texto digitado pelo usuário em número, aceitando vírgula ("0,8").
 * Lança um erro com mensagem clara quando o valor não serve. Quem chama decide
 * o que fazer com o erro: aqui, o bloco try/catch do fim do arquivo.
 */
function lerNumero(texto, nome, { min, max, inteiro = false } = {}) {
  const normalizado = String(texto).trim().replace(',', '.');
  const valor = Number(normalizado);
  if (normalizado === '' || Number.isNaN(valor)) {
    throw new Error(`${nome} precisa ser um número, recebi "${texto}".`);
  }
  if (inteiro && !Number.isInteger(valor)) {
    throw new Error(`${nome} precisa ser um número inteiro, recebi ${texto}.`);
  }
  if (min !== undefined && valor < min) {
    throw new Error(`${nome} não pode ser menor que ${min}, recebi ${texto}.`);
  }
  if (max !== undefined && valor > max) {
    throw new Error(`${nome} não pode ser maior que ${max}, recebi ${texto}.`);
  }
  return valor;
}

/**
 * Simula os juros compostos mês a mês. É uma função pura: recebe números,
 * devolve um objeto e não imprime nada. Assim ela pode ser testada e reusada.
 * O aporte entra no fim de cada mês, depois dos juros daquele mês.
 */
function simular(capital, taxaPercentual, meses, aporte) {
  const taxa = taxaPercentual / 100;
  const linhas = [];
  let saldo = capital;
  for (let numeroDoMes = 1; numeroDoMes <= meses; numeroDoMes++) {
    const saldoInicial = saldo;
    const juros = saldoInicial * taxa;
    saldo = saldoInicial + juros + aporte;
    linhas.push({ mes: numeroDoMes, saldoInicial, juros, aporte, saldoFinal: saldo });
  }
  const totalInvestido = capital + aporte * meses;
  return { montante: saldo, totalInvestido, jurosGanhos: saldo - totalInvestido, linhas };
}

function imprimirTabela(linhas) {
  // Cada coluna tem um título e uma largura fixa; padStart alinha pela direita.
  const colunas = [['Mês', 4], ['Saldo inicial', 16], ['Juros', 13], ['Aporte', 13], ['Saldo final', 16]];
  const cabecalho = colunas.map(([titulo, largura]) => titulo.padStart(largura)).join('  ');
  console.log(cabecalho);
  console.log('-'.repeat(cabecalho.length));
  for (const linha of linhas) {
    const celulas = [
      String(linha.mes).padStart(4),
      moeda(linha.saldoInicial).padStart(16),
      moeda(linha.juros).padStart(13),
      moeda(linha.aporte).padStart(13),
      moeda(linha.saldoFinal).padStart(16),
    ];
    console.log(celulas.join('  '));
  }
}

function imprimirRelatorio(capital, taxaPercentual, meses, aporte) {
  const resultado = simular(capital, taxaPercentual, meses, aporte);
  console.log('');
  console.log(`Capital inicial: ${moeda(capital)}`);
  console.log(`Taxa mensal:     ${taxaPercentual.toLocaleString('pt-BR')}% ao mês`);
  console.log(`Prazo:           ${meses} ${meses === 1 ? 'mês' : 'meses'}`);
  console.log(`Aporte mensal:   ${moeda(aporte)}`);
  console.log('');
  imprimirTabela(resultado.linhas);
  console.log('');
  console.log(`Total investido (capital + aportes): ${moeda(resultado.totalInvestido)}`);
  console.log(`Juros ganhos no período:             ${moeda(resultado.jurosGanhos)}`);
  console.log(`Montante final:                      ${moeda(resultado.montante)}`);
  const rendimento = resultado.totalInvestido > 0 ? (resultado.jurosGanhos / resultado.totalInvestido) * 100 : 0;
  console.log(`Rendimento sobre o investido:        ${rendimento.toFixed(2).replace('.', ',')}%`);
}

function mostrarUso() {
  console.log(`Uso: node ${NOME_DO_PROGRAMA} <capital> <taxa_mensal_%> <meses> [aporte_mensal]`);
  console.log(`     node ${NOME_DO_PROGRAMA} --demo`);
  console.log('');
  console.log('  capital ........ valor inicial investido, em reais');
  console.log('  taxa_mensal_% .. juros ao mês, em porcentagem (0.8 significa 0,8%)');
  console.log(`  meses .......... prazo inteiro, de 1 a ${PRAZO_MAXIMO_EM_MESES}`);
  console.log('  aporte_mensal .. quanto você deposita por mês (opcional, padrão 0)');
  console.log('');
  console.log(`Exemplo: node ${NOME_DO_PROGRAMA} 1000 0.8 24 200`);
}

function demo() {
  console.log('=== Demonstração: R$ 1.000 a 0,8% ao mês por 24 meses, com aporte de R$ 200 ===');
  imprimirRelatorio(1000, 0.8, 24, 200);
  console.log('');
  console.log('Dica: rode com seus próprios números. Exemplo:');
  console.log(`  node ${NOME_DO_PROGRAMA} 5000 1.2 36 300`);
}

function main(argumentos) {
  if (argumentos.includes('--demo')) {
    demo();
    return;
  }
  if (argumentos.length === 0 || argumentos.includes('--ajuda') || argumentos.includes('-h')) {
    mostrarUso();
    return;
  }
  if (argumentos.length < 3) {
    throw new Error('faltam argumentos. Informe capital, taxa mensal e meses (o aporte é opcional).');
  }
  const capital = lerNumero(argumentos[0], 'O capital', { min: 0 });
  const taxa = lerNumero(argumentos[1], 'A taxa mensal', { min: 0, max: 100 });
  const meses = lerNumero(argumentos[2], 'O prazo em meses', { min: 1, max: PRAZO_MAXIMO_EM_MESES, inteiro: true });
  const aporte = argumentos[3] === undefined ? 0 : lerNumero(argumentos[3], 'O aporte mensal', { min: 0 });
  imprimirRelatorio(capital, taxa, meses, aporte);
}

// Um único try/catch na borda do programa: qualquer erro de validação chega aqui
// com uma mensagem amigável, e o processo termina com código 1 para avisar o shell.
try {
  main(process.argv.slice(2));
} catch (erro) {
  console.error(`Erro: ${erro.message}`);
  console.error(`Rode "node ${NOME_DO_PROGRAMA}" sem argumentos para ver o uso.`);
  process.exitCode = 1;
}

/*
 * Para ir além:
 *  1. Aceite uma taxa anual (ex.: 12% a.a.) e converta para mensal com (1 + anual) ** (1 / 12) - 1.
 *  2. Receba uma meta de montante e descubra em quantos meses ela é alcançada.
 *  3. Grave a tabela em um arquivo CSV com fs.writeFileSync e abra em uma planilha.
 */
