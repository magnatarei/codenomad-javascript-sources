/**
 * ============================================================
 * CodeNomad Academy  |  Sources JavaScript  |  05. Conversor de moedas com tabela de taxas
 * ------------------------------------------------------------
 * O que faz: Converte um valor entre duas moedas usando uma tabela de taxas
 *            embutida no código (USD, EUR, GBP, JPY, ARS, BRL e outras), mostra
 *            a taxa cruzada usada e lista a tabela inteira com --taxas.
 *            Para atualizar as taxas, edite MOEDAS e DATA_DA_TABELA logo abaixo.
 * Como usar: node 05_conversor_moedas.js 100 USD BRL
 *            node 05_conversor_moedas.js --taxas
 *            node 05_conversor_moedas.js --demo
 * O que você aprende: objetos aninhados como tabela de dados, o operador in,
 *            Object.entries com desestruturação, Intl.NumberFormat com o código
 *            de cada moeda e o truque de converter sempre passando por uma base.
 * Requisitos: Node.js 18+, só biblioteca padrão
 * Licença MIT. Um projeto da CodeNomad Academy (codenomad.org)
 * ============================================================
 */
'use strict';

const path = require('path');

const NOME_DO_PROGRAMA = path.basename(process.argv[1] || '05_conversor_moedas.js');

/**
 * Data de referência das taxas. Troque junto com os valores quando atualizar.
 * Os números abaixo dizem quantas unidades de cada moeda compram 1 dólar
 * americano (USD). São aproximados e servem para estudo: consulte a cotação do
 * dia em uma fonte pública antes de usar em qualquer conta de verdade.
 * Como tudo é relativo ao USD, basta uma linha por moeda, e qualquer par
 * pode ser convertido passando pelo dólar.
 */
const DATA_DA_TABELA = '2026-10-01';
const MOEDAS = {
  USD: { nome: 'Dólar americano', porUsd: 1 },
  BRL: { nome: 'Real brasileiro', porUsd: 5.35 },
  EUR: { nome: 'Euro', porUsd: 0.92 },
  GBP: { nome: 'Libra esterlina', porUsd: 0.78 },
  JPY: { nome: 'Iene japonês', porUsd: 149.5 },
  ARS: { nome: 'Peso argentino', porUsd: 1050 },
  CLP: { nome: 'Peso chileno', porUsd: 930 },
  MXN: { nome: 'Peso mexicano', porUsd: 18.2 },
  CAD: { nome: 'Dólar canadense', porUsd: 1.36 },
  AUD: { nome: 'Dólar australiano', porUsd: 1.52 },
  CHF: { nome: 'Franco suíço', porUsd: 0.88 },
  CNY: { nome: 'Yuan chinês', porUsd: 7.15 },
};

// O Intl sabe quantas casas cada moeda usa: iene e peso chileno não têm centavos.
function formatar(valor, codigo) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: codigo }).format(valor);
}

function formatarTaxa(taxa) {
  return taxa.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 6 });
}

function lerValor(texto) {
  const normalizado = String(texto).trim().replace(',', '.');
  const valor = Number(normalizado);
  if (normalizado === '' || Number.isNaN(valor)) {
    throw new Error(`o valor precisa ser um número, recebi "${texto}".`);
  }
  if (valor < 0) {
    throw new Error(`o valor não pode ser negativo, recebi ${texto}.`);
  }
  return valor;
}

// O operador in confere se a chave existe no objeto, sem precisar de um array de códigos.
function lerMoeda(texto) {
  const codigo = String(texto).trim().toUpperCase();
  if (!(codigo in MOEDAS)) {
    throw new Error(`moeda desconhecida: "${texto}". Rode com --taxas para ver as disponíveis.`);
  }
  return codigo;
}

/**
 * Converte passando pela base: primeiro descobre quantos dólares o valor vale,
 * depois quantas unidades da moeda de destino esses dólares compram.
 * A taxa cruzada (quanto vale 1 unidade de "de" em "para") sai da mesma conta.
 */
function converter(valor, de, para) {
  const emUsd = valor / MOEDAS[de].porUsd;
  const resultado = emUsd * MOEDAS[para].porUsd;
  const taxa = MOEDAS[para].porUsd / MOEDAS[de].porUsd;
  return { resultado, taxa };
}

function imprimirConversao(valor, de, para) {
  const { resultado, taxa } = converter(valor, de, para);
  const esquerda = formatar(valor, de).padStart(16);
  const direita = formatar(resultado, para).padEnd(18);
  console.log(`${esquerda} = ${direita} (1 ${de} = ${formatarTaxa(taxa)} ${para})`);
}

function imprimirTabela() {
  console.log(`Tabela de taxas, referência ${DATA_DA_TABELA}, tudo relativo ao USD:`);
  const cabecalho = ['Código', 'Moeda'.padEnd(18), 'Por 1 USD'.padStart(12), '1 unidade em BRL'.padStart(18)].join('  ');
  console.log(cabecalho);
  console.log('-'.repeat(cabecalho.length));
  for (const [codigo, { nome, porUsd }] of Object.entries(MOEDAS)) {
    // Aqui o Intl de moeda arredondaria o iene para "R$ 0,04"; quatro casas mostram melhor.
    const emBrl = MOEDAS.BRL.porUsd / porUsd;
    const emBrlTexto = `R$ ${emBrl.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
    console.log([codigo.padEnd(6), nome.padEnd(18), formatarTaxa(porUsd).padStart(12), emBrlTexto.padStart(18)].join('  '));
  }
  console.log('Para atualizar: edite as constantes MOEDAS e DATA_DA_TABELA no topo do arquivo.');
}

function mostrarUso() {
  console.log(`Uso: node ${NOME_DO_PROGRAMA} <valor> <de> <para>`);
  console.log(`     node ${NOME_DO_PROGRAMA} --taxas`);
  console.log(`     node ${NOME_DO_PROGRAMA} --demo`);
  console.log('');
  console.log(`Moedas: ${Object.keys(MOEDAS).join(', ')}`);
  console.log(`Exemplo: node ${NOME_DO_PROGRAMA} 100 USD BRL`);
}

function demo() {
  console.log('=== Demonstração: 100 unidades em seis pares de moedas ===');
  const pares = [['USD', 'BRL'], ['EUR', 'BRL'], ['BRL', 'USD'], ['GBP', 'EUR'], ['JPY', 'BRL'], ['ARS', 'USD']];
  for (const [de, para] of pares) {
    imprimirConversao(100, de, para);
  }
  console.log('');
  imprimirTabela();
}

function main(argumentos) {
  if (argumentos.includes('--demo')) {
    demo();
    return;
  }
  if (argumentos.includes('--taxas')) {
    imprimirTabela();
    return;
  }
  if (argumentos.length === 0 || argumentos.includes('--ajuda') || argumentos.includes('-h')) {
    mostrarUso();
    return;
  }
  if (argumentos.length < 3) {
    throw new Error('faltam argumentos. Informe o valor, a moeda de origem e a moeda de destino.');
  }
  const valor = lerValor(argumentos[0]);
  const de = lerMoeda(argumentos[1]);
  const para = lerMoeda(argumentos[2]);
  imprimirConversao(valor, de, para);
}

try {
  main(process.argv.slice(2));
} catch (erro) {
  console.error(`Erro: ${erro.message}`);
  console.error(`Rode "node ${NOME_DO_PROGRAMA}" sem argumentos para ver o uso.`);
  process.exitCode = 1;
}

/*
 * Para ir além:
 *  1. Leia a tabela de um arquivo JSON com fs.readFileSync, em vez de deixá-la no código.
 *  2. Aceite vários valores de uma vez (100 200 300 USD BRL) e imprima uma tabela.
 *  3. Avise quando DATA_DA_TABELA tiver mais de 30 dias, comparando com new Date().
 */
