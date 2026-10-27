/**
 * ============================================================
 * CodeNomad Academy  |  Sources JavaScript  |  06. Calculadora de troco
 * ------------------------------------------------------------
 * O que faz: Recebe o valor da compra e o valor pago, calcula o troco e o
 *            decompõe no menor número de cédulas e moedas do real (algoritmo
 *            guloso). Avisa quando o pagamento não cobre a compra.
 * Como usar: node 06_calculadora_troco.js 37.35 50
 *            node 06_calculadora_troco.js --demo
 * O que você aprende: por que dinheiro se calcula em centavos inteiros,
 *            Math.round e Math.floor, algoritmo guloso com for...of, objetos
 *            de resultado com flag de sucesso e concordância de plural no texto.
 * Requisitos: Node.js 18+, só biblioteca padrão
 * Licença MIT. Um projeto da CodeNomad Academy (codenomad.org)
 * ============================================================
 */
'use strict';

const path = require('path');

const NOME_DO_PROGRAMA = path.basename(process.argv[1] || '06_calculadora_troco.js');
const formatoMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

// Cédulas e moedas em circulação, da maior para a menor. A ordem é o coração do
// algoritmo guloso: ele sempre tenta a peça mais valiosa que ainda cabe no troco.
const PECAS = [
  { centavos: 20000, tipo: 'cédula', rotulo: 'R$ 200' },
  { centavos: 10000, tipo: 'cédula', rotulo: 'R$ 100' },
  { centavos: 5000, tipo: 'cédula', rotulo: 'R$ 50' },
  { centavos: 2000, tipo: 'cédula', rotulo: 'R$ 20' },
  { centavos: 1000, tipo: 'cédula', rotulo: 'R$ 10' },
  { centavos: 500, tipo: 'cédula', rotulo: 'R$ 5' },
  { centavos: 200, tipo: 'cédula', rotulo: 'R$ 2' },
  { centavos: 100, tipo: 'moeda', rotulo: 'R$ 1' },
  { centavos: 50, tipo: 'moeda', rotulo: '50 centavos' },
  { centavos: 25, tipo: 'moeda', rotulo: '25 centavos' },
  { centavos: 10, tipo: 'moeda', rotulo: '10 centavos' },
  { centavos: 5, tipo: 'moeda', rotulo: '5 centavos' },
  { centavos: 1, tipo: 'moeda', rotulo: '1 centavo' },
];

function moeda(centavos) {
  return formatoMoeda.format(centavos / 100);
}

/**
 * Lê um valor em reais e devolve CENTAVOS inteiros. Em ponto flutuante,
 * 0.1 + 0.2 dá 0.30000000000000004; com inteiros, 10 + 20 dá 30, sempre.
 * O Math.round conserta o resto que a multiplicação por 100 deixa
 * (37.35 * 100 dá 3734.9999999999995, e queremos 3735).
 */
function lerCentavos(texto, nome) {
  const normalizado = String(texto).trim().replace(',', '.');
  const valor = Number(normalizado);
  if (normalizado === '' || Number.isNaN(valor)) {
    throw new Error(`${nome} precisa ser um número, recebi "${texto}".`);
  }
  if (valor < 0) {
    throw new Error(`${nome} não pode ser negativo, recebi ${texto}.`);
  }
  return Math.round(valor * 100);
}

// Algoritmo guloso: para cada peça, da maior para a menor, pega o máximo que cabe.
// Para o sistema de cédulas e moedas do real, isso sempre dá o menor total de peças.
function decompor(centavos) {
  const pecas = [];
  let restante = centavos;
  for (const peca of PECAS) {
    const quantidade = Math.floor(restante / peca.centavos);
    if (quantidade > 0) {
      // O spread (...) copia a peça e acrescenta a quantidade, sem alterar a tabela PECAS.
      pecas.push({ ...peca, quantidade });
      restante -= quantidade * peca.centavos;
    }
  }
  return pecas;
}

// Devolve sempre um objeto com a flag "suficiente": quem imprime decide o que mostrar.
function calcularTroco(compraCentavos, pagoCentavos) {
  if (pagoCentavos < compraCentavos) {
    return { suficiente: false, faltam: compraCentavos - pagoCentavos };
  }
  const troco = pagoCentavos - compraCentavos;
  return { suficiente: true, troco, pecas: decompor(troco) };
}

function descrever(peca) {
  const plural = peca.quantidade > 1 ? 's' : '';
  return `${peca.quantidade} ${peca.tipo}${plural} de ${peca.rotulo}`;
}

/**
 * Imprime o resultado de uma compra e devolve true quando o pagamento cobriu
 * a compra, para o modo normal poder sair com código de erro se não cobriu.
 */
function imprimirTroco(compraCentavos, pagoCentavos) {
  const resultado = calcularTroco(compraCentavos, pagoCentavos);
  console.log(`Compra de ${moeda(compraCentavos)}, pagamento de ${moeda(pagoCentavos)}`);
  if (!resultado.suficiente) {
    console.log(`  Pagamento insuficiente: faltam ${moeda(resultado.faltam)}.`);
    return false;
  }
  if (resultado.troco === 0) {
    console.log('  Pagamento exato, sem troco.');
    return true;
  }
  const totalDePecas = resultado.pecas.reduce((soma, peca) => soma + peca.quantidade, 0);
  console.log(`  Troco: ${moeda(resultado.troco)} em ${totalDePecas} ${totalDePecas === 1 ? 'peça' : 'peças'}:`);
  for (const peca of resultado.pecas) {
    console.log(`    ${descrever(peca)}`);
  }
  return true;
}

function mostrarUso() {
  console.log(`Uso: node ${NOME_DO_PROGRAMA} <valor_da_compra> <valor_pago>`);
  console.log(`     node ${NOME_DO_PROGRAMA} --demo`);
  console.log('');
  console.log('  Os valores são em reais e aceitam vírgula ou ponto: 37,35 ou 37.35.');
  console.log(`Exemplo: node ${NOME_DO_PROGRAMA} 37.35 50`);
}

function demo() {
  console.log('=== Demonstração: troco de quatro compras e um pagamento insuficiente ===');
  console.log('');
  const compras = [[37.35, 50], [12.9, 20], [99.99, 100], [6.2, 100], [80, 50]];
  for (const [compra, pago] of compras) {
    imprimirTroco(lerCentavos(compra, 'A compra'), lerCentavos(pago, 'O pagamento'));
    console.log('');
  }
  console.log('Peças consideradas: ' + PECAS.map((peca) => peca.rotulo).join(', ') + '.');
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
  if (argumentos.length < 2) {
    throw new Error('faltam argumentos. Informe o valor da compra e o valor pago.');
  }
  const compra = lerCentavos(argumentos[0], 'O valor da compra');
  const pago = lerCentavos(argumentos[1], 'O valor pago');
  const cobriu = imprimirTroco(compra, pago);
  if (!cobriu) {
    process.exitCode = 1;
  }
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
 *  1. Aceite vários pagamentos (duas cédulas de R$ 20 e uma de R$ 10) e some antes de calcular.
 *  2. Permita informar quais peças o caixa tem disponíveis e avise quando o troco não fechar.
 *  3. Mostre um sistema de moedas em que o guloso falha (peças de 1, 3 e 4 para um troco de 6).
 */
