/**
 * ============================================================
 * CodeNomad Academy  |  Sources JavaScript  |  02. Simulador de financiamento (Price e SAC)
 * ------------------------------------------------------------
 * O que faz: Recebe o valor financiado, a taxa de juros mensal e o prazo em
 *            meses. Gera a tabela de parcelas no sistema Price (parcelas fixas)
 *            e no SAC (amortização fixa) e compara o total pago em cada um.
 * Como usar: node 02_simulador_financiamento.js 50000 1 12
 *            node 02_simulador_financiamento.js --demo
 * O que você aprende: operador de potência (**), arrays de objetos, reduce
 *            para somar uma coluna, desestruturação em laços for...of e
 *            formatação de tabelas com padStart e padEnd.
 * Requisitos: Node.js 18+, só biblioteca padrão
 * Licença MIT. Um projeto da CodeNomad Academy (codenomad.org)
 * ============================================================
 */
'use strict';

const path = require('path');

const NOME_DO_PROGRAMA = path.basename(process.argv[1] || '02_simulador_financiamento.js');
const PRAZO_MAXIMO_EM_MESES = 600;
const formatoMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function moeda(valor) {
  return formatoMoeda.format(valor);
}

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
 * Sistema Price: todas as parcelas têm o mesmo valor. A fórmula nasce da soma
 * de uma progressão geométrica: parcela = valor * i / (1 - (1 + i) ** -n).
 * Com taxa zero ela dividiria por zero, então esse caso é tratado à parte.
 */
function calcularPrice(valor, taxaPercentual, meses) {
  const i = taxaPercentual / 100;
  const parcela = i === 0 ? valor / meses : (valor * i) / (1 - (1 + i) ** -meses);
  const parcelas = [];
  let saldo = valor;
  for (let numero = 1; numero <= meses; numero++) {
    const juros = saldo * i;
    const amortizacao = parcela - juros;
    // Math.max evita um saldo de "-0,00" por arredondamento na última parcela.
    saldo = Math.max(0, saldo - amortizacao);
    parcelas.push({ numero, parcela, juros, amortizacao, saldo });
  }
  return resumir('Price', parcelas);
}

/**
 * Sistema SAC: a amortização é fixa (valor / meses) e os juros caem todo mês,
 * porque incidem sobre um saldo cada vez menor. As parcelas começam mais altas
 * que no Price e terminam mais baixas.
 */
function calcularSac(valor, taxaPercentual, meses) {
  const i = taxaPercentual / 100;
  const amortizacao = valor / meses;
  const parcelas = [];
  let saldo = valor;
  for (let numero = 1; numero <= meses; numero++) {
    const juros = saldo * i;
    saldo = Math.max(0, saldo - amortizacao);
    parcelas.push({ numero, parcela: amortizacao + juros, juros, amortizacao, saldo });
  }
  return resumir('SAC', parcelas);
}

// reduce percorre o array acumulando um único valor: aqui, a soma de uma coluna.
function somarColuna(parcelas, campo) {
  return parcelas.reduce((total, item) => total + item[campo], 0);
}

function resumir(sistema, parcelas) {
  return {
    sistema,
    parcelas,
    totalPago: somarColuna(parcelas, 'parcela'),
    totalJuros: somarColuna(parcelas, 'juros'),
    primeiraParcela: parcelas[0].parcela,
    ultimaParcela: parcelas[parcelas.length - 1].parcela,
  };
}

function imprimirTabela(resultado) {
  console.log(`--- Sistema ${resultado.sistema} ---`);
  const colunas = [['Nº', 4], ['Parcela', 14], ['Juros', 14], ['Amortização', 14], ['Saldo devedor', 16]];
  const cabecalho = colunas.map(([titulo, largura]) => titulo.padStart(largura)).join('  ');
  console.log(cabecalho);
  console.log('-'.repeat(cabecalho.length));
  // Desestruturar direto no for...of deixa claro quais campos a linha usa.
  for (const { numero, parcela, juros, amortizacao, saldo } of resultado.parcelas) {
    console.log([
      String(numero).padStart(4),
      moeda(parcela).padStart(14),
      moeda(juros).padStart(14),
      moeda(amortizacao).padStart(14),
      moeda(saldo).padStart(16),
    ].join('  '));
  }
  console.log(`Total pago: ${moeda(resultado.totalPago)}  (juros: ${moeda(resultado.totalJuros)})`);
  console.log('');
}

function imprimirComparacao(price, sac) {
  console.log('--- Comparação ---');
  const linhas = [
    ['Primeira parcela', price.primeiraParcela, sac.primeiraParcela],
    ['Última parcela', price.ultimaParcela, sac.ultimaParcela],
    ['Total de juros', price.totalJuros, sac.totalJuros],
    ['Total pago', price.totalPago, sac.totalPago],
  ];
  console.log(''.padEnd(18) + 'Price'.padStart(16) + 'SAC'.padStart(16));
  for (const [rotulo, valorPrice, valorSac] of linhas) {
    console.log(rotulo.padEnd(18) + moeda(valorPrice).padStart(16) + moeda(valorSac).padStart(16));
  }
  const diferenca = price.totalPago - sac.totalPago;
  if (diferenca > 0.005) {
    console.log(`No SAC você paga ${moeda(diferenca)} a menos no total, mas as primeiras parcelas são mais altas.`);
  } else {
    console.log('Com taxa zero os dois sistemas custam o mesmo: só muda a forma de dividir.');
  }
}

function simularFinanciamento(valor, taxaPercentual, meses) {
  console.log('');
  console.log(`Valor financiado: ${moeda(valor)}`);
  console.log(`Taxa mensal:      ${taxaPercentual.toLocaleString('pt-BR')}% ao mês`);
  console.log(`Prazo:            ${meses} ${meses === 1 ? 'mês' : 'meses'}`);
  console.log('');
  const price = calcularPrice(valor, taxaPercentual, meses);
  const sac = calcularSac(valor, taxaPercentual, meses);
  imprimirTabela(price);
  imprimirTabela(sac);
  imprimirComparacao(price, sac);
}

function mostrarUso() {
  console.log(`Uso: node ${NOME_DO_PROGRAMA} <valor_financiado> <taxa_mensal_%> <meses>`);
  console.log(`     node ${NOME_DO_PROGRAMA} --demo`);
  console.log('');
  console.log('  valor_financiado .. quanto você vai pegar emprestado, em reais');
  console.log('  taxa_mensal_% ..... juros ao mês, em porcentagem (1 significa 1%)');
  console.log(`  meses ............. prazo inteiro, de 1 a ${PRAZO_MAXIMO_EM_MESES}`);
  console.log('');
  console.log(`Exemplo: node ${NOME_DO_PROGRAMA} 50000 1 12`);
}

function demo() {
  console.log('=== Demonstração: R$ 50.000 a 1% ao mês em 12 meses, Price contra SAC ===');
  simularFinanciamento(50000, 1, 12);
  console.log('');
  console.log(`Dica: teste prazos longos, como node ${NOME_DO_PROGRAMA} 200000 0.9 120`);
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
    throw new Error('faltam argumentos. Informe valor financiado, taxa mensal e prazo em meses.');
  }
  const valor = lerNumero(argumentos[0], 'O valor financiado', { min: 0.01 });
  const taxa = lerNumero(argumentos[1], 'A taxa mensal', { min: 0, max: 100 });
  const meses = lerNumero(argumentos[2], 'O prazo em meses', { min: 1, max: PRAZO_MAXIMO_EM_MESES, inteiro: true });
  simularFinanciamento(valor, taxa, meses);
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
 *  1. Acrescente uma entrada (valor pago à vista) e financie só a diferença.
 *  2. Calcule o CET aproximado somando uma taxa fixa de abertura ao valor financiado.
 *  3. Aceite --sistema price ou --sistema sac para imprimir só uma das tabelas.
 */
