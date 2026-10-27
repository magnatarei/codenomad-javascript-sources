/**
 * ============================================================
 * CodeNomad Academy  |  Sources JavaScript  |  08. Calculadora de notas e média ponderada
 * ------------------------------------------------------------
 * O que faz: Recebe notas com pesos, calcula a média ponderada, diz a situação
 *            (aprovado, recuperação ou reprovado) e quanto o aluno precisa tirar
 *            na próxima prova para alcançar a média de aprovação.
 * Como usar: node 08_calculadora_notas.js 7.5:2 8:3 6:5
 *            node 08_calculadora_notas.js 5:2 6.5:3 --aprovacao 7 --recuperacao 5 --peso-prova 2
 *            node 08_calculadora_notas.js --demo
 * O que você aprende: leitura de argumentos com flags opcionais, split com
 *            valor padrão na desestruturação, reduce com um objeto como
 *            acumulador, Math.ceil para arredondar a favor do aluno e um pouco
 *            de álgebra transformada em código.
 * Requisitos: Node.js 18+, só biblioteca padrão
 * Licença MIT. Um projeto da CodeNomad Academy (codenomad.org)
 * ============================================================
 */
'use strict';

const path = require('path');

const NOME_DO_PROGRAMA = path.basename(process.argv[1] || '08_calculadora_notas.js');
const NOTA_MAXIMA = 10;
const CRITERIOS_PADRAO = { media: 7, recuperacao: 5, pesoProxima: 1 };
const FLAGS = { '--aprovacao': 'media', '--recuperacao': 'recuperacao', '--peso-prova': 'pesoProxima' };

function formatarNota(valor) {
  return valor.toFixed(1).replace('.', ',');
}

// Interpreta "nota:peso". O peso é opcional: "8" vale o mesmo que "8:1".
function interpretarNota(texto, posicao) {
  const [notaBruta, pesoBruto = '1'] = String(texto).trim().split(':');
  const nota = Number(notaBruta.replace(',', '.'));
  const peso = Number(pesoBruto.replace(',', '.'));
  if (notaBruta === '' || Number.isNaN(nota) || nota < 0 || nota > NOTA_MAXIMA) {
    throw new Error(`a nota ${posicao} precisa ser um número entre 0 e ${NOTA_MAXIMA}, recebi "${texto}".`);
  }
  if (pesoBruto === '' || Number.isNaN(peso) || peso <= 0) {
    throw new Error(`o peso da nota ${posicao} precisa ser maior que zero, recebi "${texto}".`);
  }
  return { nota, peso };
}

// Um único reduce com objeto como acumulador soma duas coisas de uma vez.
function somar(notas) {
  return notas.reduce(
    (acumulado, item) => ({
      ponderada: acumulado.ponderada + item.nota * item.peso,
      pesos: acumulado.pesos + item.peso,
    }),
    { ponderada: 0, pesos: 0 },
  );
}

function classificar(media, criterios) {
  if (media >= criterios.media) {
    return 'Aprovado';
  }
  if (media >= criterios.recuperacao) {
    return 'Recuperação';
  }
  return 'Reprovado';
}

/**
 * Quanto tirar na próxima prova (peso p) para a média chegar a M:
 *   (ponderada + x * p) / (pesos + p) = M
 *   x = (M * (pesos + p) - ponderada) / p
 * Math.ceil arredonda para cima na primeira casa: tirar menos não serviria.
 */
function avaliar(notas, criterios) {
  const { ponderada, pesos } = somar(notas);
  const media = ponderada / pesos;
  const p = criterios.pesoProxima;
  const necessaria = Math.ceil(((criterios.media * (pesos + p) - ponderada) / p) * 10) / 10;
  let proximaProva;
  if (media >= criterios.media) {
    const minima = Math.max(0, necessaria);
    proximaProva = `já alcançou a média; para mantê-la, basta tirar ${formatarNota(minima)} na próxima prova (peso ${p})`;
  } else if (necessaria > NOTA_MAXIMA) {
    proximaProva = `não alcança ${formatarNota(criterios.media)} na próxima prova de peso ${p}: seria preciso tirar ${formatarNota(necessaria)}`;
  } else {
    proximaProva = `precisa tirar pelo menos ${formatarNota(necessaria)} na próxima prova (peso ${p})`;
  }
  return { media, situacao: classificar(media, criterios), proximaProva };
}

function imprimirBoletim(nome, notas, criterios) {
  const resultado = avaliar(notas, criterios);
  console.log(nome);
  notas.forEach((item, indice) => {
    console.log(`  Nota ${indice + 1}: ${formatarNota(item.nota).padStart(4)} (peso ${item.peso})`);
  });
  console.log(`  Média ponderada: ${formatarNota(resultado.media)}`);
  console.log(`  Situação: ${resultado.situacao} (aprovação com ${formatarNota(criterios.media)}, recuperação a partir de ${formatarNota(criterios.recuperacao)})`);
  console.log(`  Próxima prova: ${resultado.proximaProva}.`);
}

/**
 * Separa as notas das flags. Uma flag consome o argumento seguinte como valor,
 * por isso o laço pula uma posição (i++) depois de ler uma.
 */
function separarArgumentos(argumentos) {
  const notas = [];
  const criterios = { ...CRITERIOS_PADRAO };
  for (let i = 0; i < argumentos.length; i++) {
    const atual = argumentos[i];
    if (atual in FLAGS) {
      const bruto = argumentos[i + 1];
      const valor = Number(String(bruto === undefined ? '' : bruto).replace(',', '.'));
      if (bruto === undefined || bruto === '' || Number.isNaN(valor)) {
        throw new Error(`informe um número depois de ${atual}.`);
      }
      criterios[FLAGS[atual]] = valor;
      i++;
    } else if (atual.startsWith('--')) {
      throw new Error(`opção desconhecida: ${atual}. As aceitas são ${Object.keys(FLAGS).join(', ')}.`);
    } else {
      notas.push(interpretarNota(atual, notas.length + 1));
    }
  }
  if (notas.length === 0) {
    throw new Error('informe pelo menos uma nota, no formato nota:peso.');
  }
  if (criterios.media <= 0 || criterios.media > NOTA_MAXIMA) {
    throw new Error(`a média de aprovação precisa estar entre 0 e ${NOTA_MAXIMA}.`);
  }
  if (criterios.recuperacao < 0 || criterios.recuperacao > criterios.media) {
    throw new Error('a nota de recuperação precisa estar entre 0 e a média de aprovação.');
  }
  if (criterios.pesoProxima <= 0) {
    throw new Error('o peso da próxima prova precisa ser maior que zero.');
  }
  return { notas, criterios };
}

function mostrarUso() {
  console.log(`Uso: node ${NOME_DO_PROGRAMA} nota:peso [nota:peso ...] [--aprovacao 7] [--recuperacao 5] [--peso-prova 1]`);
  console.log(`     node ${NOME_DO_PROGRAMA} --demo`);
  console.log('');
  console.log('  nota:peso ........ nota de 0 a 10 e o peso dela (8:2). Sem peso, vale 1.');
  console.log('  --aprovacao ...... média para aprovação (padrão 7)');
  console.log('  --recuperacao .... média a partir da qual há recuperação (padrão 5)');
  console.log('  --peso-prova ..... peso da próxima prova, usado no cálculo do que falta (padrão 1)');
  console.log('');
  console.log(`Exemplo: node ${NOME_DO_PROGRAMA} 7.5:2 8:3 6:5`);
}

function demo() {
  console.log('=== Demonstração: três alunos, pesos diferentes, média de aprovação 7 ===');
  console.log('');
  const alunos = [
    { nome: 'Ana', notas: ['9', '8', '7'], criterios: { ...CRITERIOS_PADRAO } },
    { nome: 'Bruno', notas: ['5:2', '6.5:3', '7:5'], criterios: { ...CRITERIOS_PADRAO, pesoProxima: 2 } },
    { nome: 'Carla', notas: ['3:1', '4:2', '5.5:2'], criterios: { ...CRITERIOS_PADRAO } },
  ];
  for (const aluno of alunos) {
    const notas = aluno.notas.map((texto, indice) => interpretarNota(texto, indice + 1));
    imprimirBoletim(aluno.nome, notas, aluno.criterios);
    console.log('');
  }
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
  const { notas, criterios } = separarArgumentos(argumentos);
  imprimirBoletim('Resultado', notas, criterios);
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
 *  1. Leia uma turma inteira de um arquivo CSV (nome,nota1,nota2,...) e imprima um ranking.
 *  2. Aceite um conceito (A, B, C, D) em vez de nota numérica e converta antes de calcular.
 *  3. Calcule a média aritmética simples também e mostre as duas lado a lado.
 */
