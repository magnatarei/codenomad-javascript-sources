/**
 * ============================================================
 * CodeNomad Academy  |  Sources JavaScript  |  04. Conversor de unidades
 * ------------------------------------------------------------
 * O que faz: Converte comprimento, massa, temperatura, volume e velocidade
 *            entre quaisquer duas unidades da mesma categoria, a partir de uma
 *            tabela de fatores. Também lista todas as unidades disponíveis.
 * Como usar: node 04_conversor_unidades.js 10 km mi
 *            node 04_conversor_unidades.js 100 celsius fahrenheit
 *            node 04_conversor_unidades.js --listar
 *            node 04_conversor_unidades.js --demo
 * O que você aprende: objetos como tabelas de consulta, funções que devolvem
 *            funções, Object.entries, normalização de texto com normalize('NFD')
 *            e por que temperatura não se converte só multiplicando.
 * Requisitos: Node.js 18+, só biblioteca padrão
 * Licença MIT. Um projeto da CodeNomad Academy (codenomad.org)
 * ============================================================
 */
'use strict';

const path = require('path');

const NOME_DO_PROGRAMA = path.basename(process.argv[1] || '04_conversor_unidades.js');
const ZERO_ABSOLUTO_EM_CELSIUS = -273.15;

// Transforma um fator fixo em um par de funções: ir para a unidade base e voltar.
// Assim, toda unidade (linear ou não) é tratada do mesmo jeito pelo conversor.
function linear(fator) {
  return { paraBase: (valor) => valor * fator, daBase: (valor) => valor / fator };
}

const CATEGORIAS = {
  comprimento: {
    base: 'm',
    unidades: {
      mm: linear(0.001), cm: linear(0.01), m: linear(1), km: linear(1000),
      in: linear(0.0254), ft: linear(0.3048), yd: linear(0.9144), mi: linear(1609.344),
    },
  },
  massa: {
    base: 'kg',
    unidades: {
      mg: linear(0.000001), g: linear(0.001), kg: linear(1), t: linear(1000),
      oz: linear(0.028349523125), lb: linear(0.45359237),
    },
  },
  temperatura: {
    base: 'c',
    // Temperatura tem deslocamento, não só escala: 0 °C não é 0 °F. Por isso
    // cada unidade carrega suas próprias funções em vez de um fator.
    unidades: {
      c: { paraBase: (valor) => valor, daBase: (valor) => valor },
      f: { paraBase: (valor) => ((valor - 32) * 5) / 9, daBase: (valor) => (valor * 9) / 5 + 32 },
      k: { paraBase: (valor) => valor + ZERO_ABSOLUTO_EM_CELSIUS, daBase: (valor) => valor - ZERO_ABSOLUTO_EM_CELSIUS },
    },
  },
  volume: {
    base: 'l',
    unidades: {
      ml: linear(0.001), l: linear(1), m3: linear(1000),
      gal: linear(3.785411784), floz: linear(0.0295735295625), xic: linear(0.24),
    },
  },
  velocidade: {
    base: 'm/s',
    unidades: { 'm/s': linear(1), 'km/h': linear(1 / 3.6), mph: linear(0.44704), kn: linear(0.514444) },
  },
};

// Nomes por extenso que o usuário pode digitar no lugar do símbolo.
const APELIDOS = {
  metro: 'm', metros: 'm', quilometro: 'km', centimetro: 'cm', milimetro: 'mm',
  polegada: 'in', polegadas: 'in', pe: 'ft', pes: 'ft', jarda: 'yd', milha: 'mi', milhas: 'mi',
  grama: 'g', gramas: 'g', quilo: 'kg', quilos: 'kg', tonelada: 't', libra: 'lb', libras: 'lb', onca: 'oz',
  celsius: 'c', fahrenheit: 'f', kelvin: 'k',
  litro: 'l', litros: 'l', mililitro: 'ml', galao: 'gal', xicara: 'xic',
  kmh: 'km/h', ms: 'm/s', no: 'kn', nos: 'kn',
};

const ROTULOS = { c: '°C', f: '°F', k: 'K', xic: 'xícara(s)', floz: 'fl oz', m3: 'm³' };

function rotulo(simbolo) {
  return ROTULOS[simbolo] || simbolo;
}

// normalize('NFD') separa a letra do acento; a expressão regular apaga os acentos.
// "Xícara" vira "xicara", e o aluno pode digitar com ou sem acento.
function normalizarNome(texto) {
  const semAcento = String(texto).trim().toLowerCase().normalize('NFD').replace(/\p{Mn}/gu, '');
  return APELIDOS[semAcento] || semAcento;
}

function localizarUnidade(nome) {
  const simbolo = normalizarNome(nome);
  for (const [categoria, dados] of Object.entries(CATEGORIAS)) {
    if (simbolo in dados.unidades) {
      return { categoria, simbolo, conversor: dados.unidades[simbolo] };
    }
  }
  throw new Error(`unidade desconhecida: "${nome}". Rode com --listar para ver as disponíveis.`);
}

function converter(valor, de, para) {
  const origem = localizarUnidade(de);
  const destino = localizarUnidade(para);
  if (origem.categoria !== destino.categoria) {
    throw new Error(`não dá para converter ${origem.simbolo} (${origem.categoria}) em ${destino.simbolo} (${destino.categoria}).`);
  }
  const naBase = origem.conversor.paraBase(valor);
  if (origem.categoria === 'temperatura' && naBase < ZERO_ABSOLUTO_EM_CELSIUS) {
    throw new Error(`${valor} ${rotulo(origem.simbolo)} fica abaixo do zero absoluto (-273,15 °C).`);
  }
  return { resultado: destino.conversor.daBase(naBase), origem, destino };
}

function lerNumero(texto) {
  const normalizado = String(texto).trim().replace(',', '.');
  const valor = Number(normalizado);
  if (normalizado === '' || Number.isNaN(valor)) {
    throw new Error(`o valor precisa ser um número, recebi "${texto}".`);
  }
  return valor;
}

function formatarNumero(valor) {
  // toPrecision corta o lixo do ponto flutuante (0.30000000000000004) e Number tira os zeros sobrando.
  const limpo = Number(valor.toPrecision(10));
  return limpo.toLocaleString('pt-BR', { maximumFractionDigits: 6 });
}

function imprimirConversao(valor, de, para) {
  const { resultado, origem, destino } = converter(valor, de, para);
  const esquerda = `${formatarNumero(valor)} ${rotulo(origem.simbolo)}`;
  const direita = `${formatarNumero(resultado)} ${rotulo(destino.simbolo)}`;
  console.log(`${esquerda.padStart(14)} = ${direita.padEnd(22)} (${origem.categoria})`);
}

function listarUnidades() {
  console.log('Unidades disponíveis (a conversão só funciona dentro da mesma categoria):');
  for (const [categoria, dados] of Object.entries(CATEGORIAS)) {
    console.log(`  ${categoria.padEnd(12)} ${Object.keys(dados.unidades).join(', ')}   (base: ${dados.base})`);
  }
  console.log('Nomes por extenso também valem: metro, polegada, milha, quilo, libra, celsius, litro, galão, nó.');
}

function mostrarUso() {
  console.log(`Uso: node ${NOME_DO_PROGRAMA} <valor> <de> <para>`);
  console.log(`     node ${NOME_DO_PROGRAMA} --listar`);
  console.log(`     node ${NOME_DO_PROGRAMA} --demo`);
  console.log('');
  console.log(`Exemplos: node ${NOME_DO_PROGRAMA} 10 km mi`);
  console.log(`          node ${NOME_DO_PROGRAMA} 100 celsius fahrenheit`);
  console.log(`          node ${NOME_DO_PROGRAMA} 2,5 litros galao`);
}

function demo() {
  console.log('=== Demonstração: 13 conversões variadas ===');
  const exemplos = [
    [10, 'km', 'mi'], [1, 'milha', 'm'], [180, 'cm', 'ft'], [12, 'in', 'cm'],
    [70, 'kg', 'lb'], [500, 'g', 'oz'], [100, 'c', 'f'], [32, 'f', 'c'],
    [300, 'k', 'c'], [2, 'l', 'gal'], [1, 'gal', 'ml'], [100, 'km/h', 'mph'], [10, 'm/s', 'km/h'],
  ];
  for (const [valor, de, para] of exemplos) {
    imprimirConversao(valor, de, para);
  }
  console.log('');
  listarUnidades();
}

function main(argumentos) {
  if (argumentos.includes('--demo')) {
    demo();
    return;
  }
  if (argumentos.includes('--listar')) {
    listarUnidades();
    return;
  }
  if (argumentos.length === 0 || argumentos.includes('--ajuda') || argumentos.includes('-h')) {
    mostrarUso();
    return;
  }
  if (argumentos.length < 3) {
    throw new Error('faltam argumentos. Informe o valor, a unidade de origem e a unidade de destino.');
  }
  const [textoValor, de, para] = argumentos;
  imprimirConversao(lerNumero(textoValor), de, para);
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
 *  1. Acrescente a categoria "área" (m², km², hectare, acre) usando só a função linear.
 *  2. Aceite "10km" colado, separando o número da unidade com uma expressão regular.
 *  3. Imprima uma tabela com o valor convertido para todas as unidades da categoria.
 */
