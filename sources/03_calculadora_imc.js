/**
 * ============================================================
 * CodeNomad Academy  |  Sources JavaScript  |  03. Calculadora de IMC
 * ------------------------------------------------------------
 * O que faz: Recebe peso (kg) e altura (em metros ou centímetros), valida os
 *            dois e devolve o IMC, a classificação oficial e a faixa de peso
 *            saudável para aquela altura, dizendo quanto falta para entrar nela.
 * Como usar: node 03_calculadora_imc.js 82 1.75
 *            node 03_calculadora_imc.js --demo
 * O que você aprende: arrays de objetos como tabela de consulta, Array.find,
 *            desestruturação de objetos, toFixed, operador ternário e
 *            validação de entrada com mensagens que ajudam o usuário.
 * Requisitos: Node.js 18+, só biblioteca padrão
 * Licença MIT. Um projeto da CodeNomad Academy (codenomad.org)
 * ============================================================
 */
'use strict';

const path = require('path');

const NOME_DO_PROGRAMA = path.basename(process.argv[1] || '03_calculadora_imc.js');

// Limites da faixa considerada saudável pela classificação oficial do IMC.
const IMC_SAUDAVEL_MINIMO = 18.5;
const IMC_SAUDAVEL_MAXIMO = 24.9;

// Cada faixa vale enquanto o IMC for menor que "limite". A ordem importa:
// Array.find devolve a primeira faixa que satisfaz a condição.
const CLASSIFICACOES = [
  { limite: 18.5, nome: 'Abaixo do peso' },
  { limite: 25, nome: 'Peso normal' },
  { limite: 30, nome: 'Sobrepeso' },
  { limite: 35, nome: 'Obesidade grau I' },
  { limite: 40, nome: 'Obesidade grau II' },
  { limite: Infinity, nome: 'Obesidade grau III' },
];

function lerNumero(texto, nome) {
  const normalizado = String(texto).trim().replace(',', '.');
  const valor = Number(normalizado);
  if (normalizado === '' || Number.isNaN(valor)) {
    throw new Error(`${nome} precisa ser um número, recebi "${texto}".`);
  }
  return valor;
}

function lerPeso(texto) {
  const peso = lerNumero(texto, 'O peso');
  if (peso < 2 || peso > 500) {
    throw new Error(`O peso precisa estar entre 2 e 500 kg, recebi ${texto}.`);
  }
  return peso;
}

/**
 * Aceita a altura em metros (1.75) ou em centímetros (175). Se o valor passar
 * de 3, ninguém tem 3 metros, então o programa entende que veio em centímetros.
 */
function lerAltura(texto) {
  let altura = lerNumero(texto, 'A altura');
  if (altura > 3) {
    altura = altura / 100;
  }
  if (altura < 0.5 || altura > 2.72) {
    throw new Error(`A altura precisa estar entre 0,50 m e 2,72 m, recebi ${texto}.`);
  }
  return altura;
}

function calcularImc(peso, altura) {
  return peso / (altura * altura);
}

function classificar(imc) {
  return CLASSIFICACOES.find((faixa) => imc < faixa.limite).nome;
}

function faixaSaudavel(altura) {
  return {
    pesoMinimo: IMC_SAUDAVEL_MINIMO * altura * altura,
    pesoMaximo: IMC_SAUDAVEL_MAXIMO * altura * altura,
  };
}

// Junta tudo em um objeto só, para quem imprime não precisar refazer contas.
function avaliar(peso, altura) {
  // Arredonda para uma casa ANTES de classificar: assim o valor mostrado na tela
  // e a faixa escolhida sempre concordam (29,98 viraria "30,0" mas cairia em Sobrepeso).
  const imc = Math.round(calcularImc(peso, altura) * 10) / 10;
  const { pesoMinimo, pesoMaximo } = faixaSaudavel(altura);
  let orientacao;
  if (peso < pesoMinimo) {
    orientacao = `faltam ${kg(pesoMinimo - peso)} para entrar na faixa saudável`;
  } else if (peso > pesoMaximo) {
    orientacao = `${kg(peso - pesoMaximo)} acima da faixa saudável`;
  } else {
    orientacao = 'dentro da faixa saudável';
  }
  return { peso, altura, imc, classificacao: classificar(imc), pesoMinimo, pesoMaximo, orientacao };
}

function kg(valor) {
  return `${valor.toFixed(1).replace('.', ',')} kg`;
}

function imprimirAvaliacao(nome, resultado) {
  console.log(`${nome}: ${kg(resultado.peso)}, ${resultado.altura.toFixed(2).replace('.', ',')} m`);
  console.log(`  IMC: ${resultado.imc.toFixed(1).replace('.', ',')} (${resultado.classificacao})`);
  console.log(`  Faixa de peso saudável para essa altura: ${kg(resultado.pesoMinimo)} a ${kg(resultado.pesoMaximo)}`);
  console.log(`  Situação: ${resultado.orientacao}`);
}

function imprimirTabela(pessoas) {
  const cabecalho = ['Nome'.padEnd(8), 'Peso'.padStart(9), 'Altura'.padStart(8), 'IMC'.padStart(6), '  Classificação'.padEnd(21), 'Faixa saudável'].join(' ');
  console.log(cabecalho);
  console.log('-'.repeat(cabecalho.length + 6));
  for (const { nome, resultado } of pessoas) {
    console.log([
      nome.padEnd(8),
      kg(resultado.peso).padStart(9),
      `${resultado.altura.toFixed(2).replace('.', ',')} m`.padStart(8),
      resultado.imc.toFixed(1).replace('.', ',').padStart(6),
      `  ${resultado.classificacao}`.padEnd(21),
      `${kg(resultado.pesoMinimo)} a ${kg(resultado.pesoMaximo)}`,
    ].join(' '));
  }
}

function mostrarUso() {
  console.log(`Uso: node ${NOME_DO_PROGRAMA} <peso_kg> <altura>`);
  console.log(`     node ${NOME_DO_PROGRAMA} --demo`);
  console.log('');
  console.log('  peso_kg .. peso em quilos (82 ou 82,5)');
  console.log('  altura ... em metros (1.75) ou em centímetros (175)');
  console.log('');
  console.log(`Exemplo: node ${NOME_DO_PROGRAMA} 82 1.75`);
}

function demo() {
  console.log('=== Demonstração: IMC de três pessoas fictícias ===');
  console.log('');
  const pessoas = [
    { nome: 'Ana', resultado: avaliar(55, 1.62) },
    { nome: 'Bruno', resultado: avaliar(97, 1.78) },
    { nome: 'Carla', resultado: avaliar(48, 1.7) },
  ];
  imprimirTabela(pessoas);
  console.log('');
  for (const { nome, resultado } of pessoas) {
    imprimirAvaliacao(nome, resultado);
    console.log('');
  }
  console.log('Tabela de classificação usada:');
  let inicio = 0;
  for (const faixa of CLASSIFICACOES) {
    const fim = faixa.limite === Infinity ? 'ou mais' : `a ${(faixa.limite - 0.1).toFixed(1).replace('.', ',')}`;
    console.log(`  ${String(inicio).replace('.', ',').padStart(4)} ${fim.padEnd(8)} ${faixa.nome}`);
    inicio = faixa.limite;
  }
  console.log('');
  console.log('O IMC é uma triagem simples: não substitui a avaliação de um profissional de saúde.');
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
    throw new Error('faltam argumentos. Informe o peso em kg e a altura.');
  }
  const peso = lerPeso(argumentos[0]);
  const altura = lerAltura(argumentos[1]);
  imprimirAvaliacao('Você', avaliar(peso, altura));
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
 *  1. Leia várias pessoas de um arquivo CSV (nome,peso,altura) e imprima a tabela.
 *  2. Acrescente a classificação para crianças, que depende da idade e do sexo.
 *  3. Mostre quantos quilos a pessoa precisa ganhar ou perder para mudar de faixa.
 */
