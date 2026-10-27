/**
 * ============================================================
 * CodeNomad Academy  |  Sources JavaScript  |  10. Calculadora de geometria
 * ------------------------------------------------------------
 * O que faz: Calcula área e perímetro de quadrado, retângulo, triângulo (com
 *            validação de existência), círculo e trapézio, e volume e área
 *            total de cubo, esfera e cilindro, a partir das medidas informadas.
 * Como usar: node 10_calculadora_geometria.js triangulo 3 4 5
 *            node 10_calculadora_geometria.js cilindro 2 10
 *            node 10_calculadora_geometria.js --formas
 *            node 10_calculadora_geometria.js --demo
 * O que você aprende: objeto de formas como tabela de despacho, funções
 *            guardadas em propriedades, desestruturação de arrays nos
 *            parâmetros, Math.PI, Math.sqrt, o operador ** e validação
 *            geométrica (desigualdade triangular) antes de calcular.
 * Requisitos: Node.js 18+, só biblioteca padrão
 * Licença MIT. Um projeto da CodeNomad Academy (codenomad.org)
 * ============================================================
 */
'use strict';

const path = require('path');

const NOME_DO_PROGRAMA = path.basename(process.argv[1] || '10_calculadora_geometria.js');

// Pequenas fábricas de resultado: cada uma sabe o nome e a potência da unidade (u, u², u³).
function area(valor) {
  return { nome: 'Área', valor, potencia: 2 };
}
function perimetro(valor) {
  return { nome: 'Perímetro', valor, potencia: 1 };
}
function volume(valor) {
  return { nome: 'Volume', valor, potencia: 3 };
}
function areaTotal(valor) {
  return { nome: 'Área total', valor, potencia: 2 };
}

/**
 * Tabela de despacho: o nome da forma leva direto às medidas que ela exige e
 * à função que calcula. Cada "calcular" recebe o array de medidas já validado
 * e o desestrutura nos parâmetros ([lado], [base, altura]...).
 */
const FORMAS = {
  quadrado: {
    nome: 'Quadrado',
    medidas: ['lado'],
    calcular: ([lado]) => [area(lado ** 2), perimetro(4 * lado)],
  },
  retangulo: {
    nome: 'Retângulo',
    medidas: ['base', 'altura'],
    calcular: ([base, altura]) => [area(base * altura), perimetro(2 * (base + altura))],
  },
  triangulo: {
    nome: 'Triângulo',
    medidas: ['lado a', 'lado b', 'lado c'],
    calcular: ([a, b, c]) => {
      // Desigualdade triangular: cada lado precisa ser menor que a soma dos outros dois.
      if (a >= b + c || b >= a + c || c >= a + b) {
        throw new Error('esses lados não formam um triângulo: cada lado precisa ser menor que a soma dos outros dois.');
      }
      const s = (a + b + c) / 2;
      // Fórmula de Heron: a área sai só dos três lados, sem precisar da altura.
      return [area(Math.sqrt(s * (s - a) * (s - b) * (s - c))), perimetro(a + b + c)];
    },
  },
  circulo: {
    nome: 'Círculo',
    medidas: ['raio'],
    calcular: ([raio]) => [area(Math.PI * raio ** 2), perimetro(2 * Math.PI * raio)],
  },
  trapezio: {
    nome: 'Trapézio',
    medidas: ['base maior', 'base menor', 'altura', 'lado 1', 'lado 2'],
    calcular: ([baseMaior, baseMenor, altura, lado1, lado2]) => {
      if (lado1 < altura || lado2 < altura) {
        throw new Error('em um trapézio, cada lado inclinado precisa medir pelo menos a altura.');
      }
      return [area(((baseMaior + baseMenor) / 2) * altura), perimetro(baseMaior + baseMenor + lado1 + lado2)];
    },
  },
  cubo: {
    nome: 'Cubo',
    medidas: ['aresta'],
    calcular: ([aresta]) => [volume(aresta ** 3), areaTotal(6 * aresta ** 2)],
  },
  esfera: {
    nome: 'Esfera',
    medidas: ['raio'],
    calcular: ([raio]) => [volume((4 / 3) * Math.PI * raio ** 3), areaTotal(4 * Math.PI * raio ** 2)],
  },
  cilindro: {
    nome: 'Cilindro',
    medidas: ['raio', 'altura'],
    calcular: ([raio, altura]) => [volume(Math.PI * raio ** 2 * altura), areaTotal(2 * Math.PI * raio * (raio + altura))],
  },
};

const EXPOENTES = { 1: '', 2: '²', 3: '³' };

function formatarNumero(valor) {
  return Number(valor.toPrecision(10)).toLocaleString('pt-BR', { maximumFractionDigits: 3 });
}

function formatarResultado(resultado) {
  return `${resultado.nome}: ${formatarNumero(resultado.valor)} u${EXPOENTES[resultado.potencia]}`;
}

// Tira acentos e caixa alta: "Círculo" e "circulo" chegam à mesma chave da tabela.
function normalizarNome(texto) {
  return String(texto).trim().toLowerCase().normalize('NFD').replace(/\p{Mn}/gu, '');
}

function lerMedida(texto, nome) {
  const normalizado = String(texto).trim().replace(',', '.');
  const valor = Number(normalizado);
  if (normalizado === '' || Number.isNaN(valor)) {
    throw new Error(`a medida "${nome}" precisa ser um número, recebi "${texto}".`);
  }
  if (valor <= 0) {
    throw new Error(`a medida "${nome}" precisa ser maior que zero, recebi ${texto}.`);
  }
  return valor;
}

function calcularForma(nomeDaForma, textos) {
  const chave = normalizarNome(nomeDaForma);
  const forma = FORMAS[chave];
  if (!forma) {
    throw new Error(`forma desconhecida: "${nomeDaForma}". As formas são ${Object.keys(FORMAS).join(', ')}.`);
  }
  if (textos.length !== forma.medidas.length) {
    const quantas = forma.medidas.length === 1 ? '1 medida' : `${forma.medidas.length} medidas`;
    throw new Error(`${forma.nome} precisa de ${quantas}: ${forma.medidas.join(', ')}. Recebi ${textos.length}.`);
  }
  const medidas = textos.map((texto, indice) => lerMedida(texto, forma.medidas[indice]));
  const descricao = forma.medidas.map((rotulo, indice) => `${rotulo} = ${formatarNumero(medidas[indice])}`).join(', ');
  return { chave, nome: forma.nome, descricao, resultados: forma.calcular(medidas) };
}

function imprimirForma(nomeDaForma, textos) {
  const { nome, descricao, resultados } = calcularForma(nomeDaForma, textos);
  console.log(`${nome} (${descricao})`);
  for (const resultado of resultados) {
    console.log(`  ${formatarResultado(resultado)}`);
  }
}

function listarFormas() {
  console.log('Formas disponíveis (como digitar) e as medidas que cada uma pede, nesta ordem:');
  for (const [chave, forma] of Object.entries(FORMAS)) {
    console.log(`  ${chave.padEnd(10)} ${forma.nome.padEnd(10)} ${forma.medidas.join(', ')}`);
  }
  console.log('As medidas são adimensionais: use sempre a mesma unidade (cm, m...) e leia u, u² e u³ nela.');
}

function mostrarUso() {
  console.log(`Uso: node ${NOME_DO_PROGRAMA} <forma> <medidas...>`);
  console.log(`     node ${NOME_DO_PROGRAMA} --formas`);
  console.log(`     node ${NOME_DO_PROGRAMA} --demo`);
  console.log('');
  console.log(`Exemplos: node ${NOME_DO_PROGRAMA} triangulo 3 4 5`);
  console.log(`          node ${NOME_DO_PROGRAMA} círculo 2,5`);
  console.log(`          node ${NOME_DO_PROGRAMA} trapezio 8 4 3 3.5 3.5`);
  console.log('');
  listarFormas();
}

function demo() {
  console.log('=== Demonstração: todas as formas com medidas de exemplo ===');
  const exemplos = [
    ['quadrado', ['4']], ['retangulo', ['3', '5']], ['triangulo', ['3', '4', '5']], ['circulo', ['2']],
    ['trapezio', ['8', '4', '3', '3.5', '3.5']], ['cubo', ['3']], ['esfera', ['2']], ['cilindro', ['2', '5']],
  ];
  const cabecalho = `${'Forma'.padEnd(10)} ${'Medidas (como digitar)'.padEnd(24)} ${'Resultado 1'.padEnd(26)} Resultado 2`;
  console.log(cabecalho);
  console.log('-'.repeat(cabecalho.length + 8));
  for (const [chaveDigitada, textos] of exemplos) {
    const { nome, resultados } = calcularForma(chaveDigitada, textos);
    const [primeiro, segundo] = resultados.map(formatarResultado);
    console.log(`${nome.padEnd(10)} ${textos.join(' ').padEnd(24)} ${primeiro.padEnd(26)} ${segundo}`);
  }
  console.log('');
  console.log(`Ordem das medidas: rode node ${NOME_DO_PROGRAMA} --formas para ver o que cada forma pede.`);
  console.log('');
  console.log('Validação em ação: tentando um triângulo de lados 1, 2 e 10...');
  try {
    calcularForma('triangulo', ['1', '2', '10']);
  } catch (erro) {
    console.log(`  Recusado: ${erro.message}`);
  }
}

function main(argumentos) {
  if (argumentos.includes('--demo')) {
    demo();
    return;
  }
  if (argumentos.includes('--formas')) {
    listarFormas();
    return;
  }
  if (argumentos.length === 0 || argumentos.includes('--ajuda') || argumentos.includes('-h')) {
    mostrarUso();
    return;
  }
  const [forma, ...medidas] = argumentos;
  imprimirForma(forma, medidas);
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
 *  1. Acrescente losango, hexágono regular e cone seguindo o mesmo formato da tabela FORMAS.
 *  2. Aceite uma unidade opcional (--unidade cm) e imprima cm, cm² e cm³ no lugar de u.
 *  3. Dada a área desejada de um círculo, calcule o raio necessário (o caminho inverso).
 */
