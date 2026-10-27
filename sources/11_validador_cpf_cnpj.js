/**
 * ============================================================
 * CodeNomad Academy  |  Sources JavaScript  |  11. Validador de CPF e CNPJ
 * ------------------------------------------------------------
 * O que faz: Valida os dígitos verificadores de CPF e CNPJ, aceitando o
 *            número com ou sem pontuação. Rejeita sequências repetidas como
 *            111.111.111-11, formata o número e gera números válidos para
 *            usar em testes.
 * Como usar: node 11_validador_cpf_cnpj.js 529.982.247-25 11222333000181
 *            node 11_validador_cpf_cnpj.js --gerar cnpj 3
 *            node 11_validador_cpf_cnpj.js --demo
 * O que você aprende: expressões regulares, cálculo do módulo 11 com
 *            reduce, arrays de pesos, funções que devolvem objetos,
 *            do...while, crypto.randomInt, process.argv e module.exports.
 * Requisitos: Node.js 18+, só biblioteca padrão
 * Licença MIT. Um projeto da CodeNomad Academy (codenomad.org)
 * ============================================================
 */
'use strict';

const crypto = require('crypto');

// Pesos de cada posição no cálculo dos dois dígitos verificadores (DV).
const PESOS_CPF_1 = [10, 9, 8, 7, 6, 5, 4, 3, 2];
const PESOS_CPF_2 = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2];
const PESOS_CNPJ_1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const PESOS_CNPJ_2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

/** Mantém só os dígitos: "529.982.247-25" vira "52998224725". */
function somenteDigitos(texto) {
  return String(texto).replace(/\D/g, '');
}

/**
 * Calcula um dígito verificador pelo módulo 11: multiplica cada dígito pelo
 * peso da posição, soma tudo e olha o resto da divisão por 11.
 * Resto menor que 2 vira 0; qualquer outro resto vira 11 menos o resto.
 */
function digitoVerificador(digitos, pesos) {
  const soma = pesos.reduce((acumulado, peso, i) => acumulado + Number(digitos[i]) * peso, 0);
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

function formatarCpf(d) {
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function formatarCnpj(d) {
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

/**
 * Valida qualquer um dos dois documentos. Devolve sempre um objeto com
 * quatro campos (se passou, o tipo, o motivo e o número formatado): quem
 * chama decide o que fazer com o motivo, sem precisar de try/catch.
 */
function validarDocumento(entrada, regras) {
  const { tipo, tamanho, pesos1, pesos2, formatar } = regras;
  const digitos = somenteDigitos(entrada);
  if (digitos.length !== tamanho) {
    return { valido: false, tipo, motivo: `${tipo} tem ${tamanho} dígitos, recebi ${digitos.length}` };
  }
  // "111.111.111-11" passa no cálculo do módulo 11; por isso a regra extra.
  if (/^(\d)\1+$/.test(digitos)) {
    return { valido: false, tipo, motivo: 'todos os dígitos são iguais' };
  }
  const base = digitos.slice(0, tamanho - 2);
  const dv1 = digitoVerificador(base, pesos1);
  const dv2 = digitoVerificador(base + dv1, pesos2);
  if (digitos !== base + dv1 + dv2) {
    return { valido: false, tipo, motivo: `os verificadores deveriam ser ${dv1}${dv2}, não ${digitos.slice(-2)}` };
  }
  return { valido: true, tipo, motivo: 'dígitos verificadores conferem', formatado: formatar(digitos) };
}

const REGRAS_CPF = { tipo: 'CPF', tamanho: 11, pesos1: PESOS_CPF_1, pesos2: PESOS_CPF_2, formatar: formatarCpf };
const REGRAS_CNPJ = { tipo: 'CNPJ', tamanho: 14, pesos1: PESOS_CNPJ_1, pesos2: PESOS_CNPJ_2, formatar: formatarCnpj };

const validarCpf = (entrada) => validarDocumento(entrada, REGRAS_CPF);
const validarCnpj = (entrada) => validarDocumento(entrada, REGRAS_CNPJ);

/** Decide pelo tamanho: 11 dígitos é CPF, 14 é CNPJ. */
function validar(entrada) {
  const quantidade = somenteDigitos(entrada).length;
  if (quantidade === 14) return validarCnpj(entrada);
  if (quantidade === 11) return validarCpf(entrada);
  return { valido: false, tipo: '?', motivo: `esperava 11 (CPF) ou 14 (CNPJ) dígitos, recebi ${quantidade}` };
}

/**
 * Sorteia os dígitos da base e calcula os verificadores por cima.
 * crypto.randomInt é o sorteio sem viés da biblioteca padrão.
 */
function gerar(tipo) {
  const regras = tipo === 'cnpj' ? REGRAS_CNPJ : REGRAS_CPF;
  let documento;
  do {
    const quantidade = tipo === 'cnpj' ? 8 : 9;
    const sorteados = Array.from({ length: quantidade }, () => crypto.randomInt(10)).join('');
    // No CNPJ, os quatro dígitos depois da barra identificam a filial: 0001 é a matriz.
    const base = tipo === 'cnpj' ? `${sorteados}0001` : sorteados;
    const dv1 = digitoVerificador(base, regras.pesos1);
    const dv2 = digitoVerificador(base + dv1, regras.pesos2);
    documento = regras.formatar(base + dv1 + dv2);
  } while (!validarDocumento(documento, regras).valido); // descarta o raríssimo 000.000.000-00
  return documento;
}

function mostrar(resultado, entrada) {
  const selo = resultado.valido ? 'VÁLIDO  ' : 'INVÁLIDO';
  const numero = resultado.formatado || String(entrada);
  console.log(`  ${selo}  ${resultado.tipo.padEnd(4)}  ${numero.padEnd(20)}  ${resultado.motivo}`);
}

function demo() {
  console.log('=== Validador de CPF e CNPJ: demonstração ===\n');
  const casos = [
    '529.982.247-25', // CPF válido, com pontuação
    '52998224725', // o mesmo CPF, só dígitos
    '111.111.111-11', // sequência repetida
    '123.456.789-00', // verificadores errados
    '11.222.333/0001-81', // CNPJ válido
    '11222333000180', // CNPJ com o último dígito trocado
    '12345', // tamanho errado
    'abc', // nenhum dígito
  ];
  console.log('Validando uma lista com casos válidos e inválidos:');
  casos.forEach((caso) => mostrar(validar(caso), caso));

  console.log('\nGerando números de teste (sorteados, servem só para testar sistemas):');
  for (const tipo of ['cpf', 'cnpj']) {
    const numero = gerar(tipo);
    console.log(`  ${tipo.toUpperCase().padEnd(4)} ${numero.padEnd(20)} -> ${validar(numero).motivo}`);
  }
  console.log('\nA pontuação é só apresentação: a validação olha apenas os dígitos.');
}

function uso() {
  console.log(`Uso:
  node 11_validador_cpf_cnpj.js <número> [outro número ...]
  node 11_validador_cpf_cnpj.js --gerar cpf|cnpj [quantidade]
  node 11_validador_cpf_cnpj.js --demo

Exemplos:
  node 11_validador_cpf_cnpj.js 529.982.247-25 11.222.333/0001-81
  node 11_validador_cpf_cnpj.js --gerar cnpj 3`);
}

function main(args) {
  if (args.length === 0) {
    uso();
    return 0;
  }
  if (args.includes('--demo')) {
    demo();
    return 0;
  }
  if (args[0] === '--gerar') {
    const tipo = (args[1] || '').toLowerCase();
    if (tipo !== 'cpf' && tipo !== 'cnpj') {
      console.error(`Erro: informe o que gerar, cpf ou cnpj, não "${args[1] || ''}".`);
      return 1;
    }
    const quantidade = Number(args[2] ?? 1);
    if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > 100) {
      console.error(`Erro: a quantidade precisa ser um inteiro de 1 a 100, não "${args[2]}".`);
      return 1;
    }
    for (let i = 0; i < quantidade; i++) console.log(gerar(tipo));
    return 0;
  }
  // Modo normal: valida cada argumento e termina com 1 se algum falhou,
  // o que permite usar o programa dentro de scripts.
  let invalidos = 0;
  for (const entrada of args) {
    const resultado = validar(entrada);
    mostrar(resultado, entrada);
    if (!resultado.valido) invalidos++;
  }
  return invalidos === 0 ? 0 : 1;
}

// Só executa quando chamado direto; assim outro arquivo pode fazer require().
if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}

module.exports = { validarCpf, validarCnpj, validar, gerar, somenteDigitos };

/* ------------------------------------------------------------
 * Para ir além
 *  1. Aceite o CNPJ alfanumérico (cada letra vale o código ASCII menos 48)
 *     e mantenha os casos da demonstração passando.
 *  2. Leia uma lista de documentos de um arquivo .txt, um por linha, e
 *     imprima um resumo: quantos válidos, quantos inválidos e por quê.
 *  3. Escreva testes com o módulo nativo node:test cobrindo cada motivo
 *     de recusa que a função validarDocumento consegue devolver.
 * ------------------------------------------------------------ */
