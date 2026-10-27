/**
 * ============================================================
 * CodeNomad Academy  |  Sources JavaScript  |  07. Calculadora de orçamento mensal
 * ------------------------------------------------------------
 * O que faz: Recebe receitas e despesas por categoria, pelos argumentos ou por
 *            um arquivo de texto, e mostra totais, saldo, o percentual de cada
 *            categoria sobre a receita, barras de texto e um alerta para a
 *            categoria que mais pesa no mês.
 * Como usar: node 07_calculadora_orcamento.js receita:Salário:5000 despesa:Aluguel:1500 despesa:Mercado:900
 *            node 07_calculadora_orcamento.js --arquivo orcamento.txt
 *            node 07_calculadora_orcamento.js --demo
 * O que você aprende: split e desestruturação para interpretar texto, filter,
 *            map e reduce, sort com função de comparação, leitura de arquivo
 *            com fs.readFileSync e String.repeat para desenhar barras.
 * Requisitos: Node.js 18+, só biblioteca padrão
 * Licença MIT. Um projeto da CodeNomad Academy (codenomad.org)
 * ============================================================
 */
'use strict';

const fs = require('fs');
const path = require('path');

const NOME_DO_PROGRAMA = path.basename(process.argv[1] || '07_calculadora_orcamento.js');
const LIMITE_DE_ALERTA_PERCENTUAL = 30;
const formatoMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

// Orçamento de exemplo, no mesmo formato aceito nos argumentos e no arquivo.
const ORCAMENTO_DE_EXEMPLO = [
  'receita:Salário:5200',
  'receita:Freelance:800',
  'despesa:Aluguel:1900',
  'despesa:Mercado:950',
  'despesa:Transporte:420',
  'despesa:Internet e celular:180',
  'despesa:Lazer:350',
  'despesa:Saúde:260',
  'despesa:Cursos:199',
];

function moeda(valor) {
  return formatoMoeda.format(valor);
}

function percentual(parte, total) {
  return total > 0 ? (parte / total) * 100 : 0;
}

function formatarPercentual(valor) {
  return `${valor.toFixed(1).replace('.', ',')}%`;
}

/**
 * Interpreta um lançamento no formato tipo:categoria:valor.
 * split(':') quebra o texto em partes e a desestruturação dá nome a cada uma.
 */
function interpretarLancamento(texto) {
  const partes = String(texto).trim().split(':');
  if (partes.length !== 3) {
    throw new Error(`lançamento inválido: "${texto}". Use tipo:categoria:valor, como despesa:Aluguel:1500.`);
  }
  const [tipoBruto, categoria, valorBruto] = partes.map((parte) => parte.trim());
  const tipo = { receita: 'receita', r: 'receita', despesa: 'despesa', d: 'despesa' }[tipoBruto.toLowerCase()];
  if (!tipo) {
    throw new Error(`tipo desconhecido em "${texto}": use receita ou despesa.`);
  }
  if (categoria === '') {
    throw new Error(`categoria vazia em "${texto}".`);
  }
  const valor = Number(valorBruto.replace(',', '.'));
  if (valorBruto === '' || Number.isNaN(valor) || valor < 0) {
    throw new Error(`valor inválido em "${texto}": precisa ser um número maior ou igual a zero.`);
  }
  return { tipo, categoria, valor };
}

function lerLinhasDoArquivo(caminho) {
  let conteudo;
  try {
    conteudo = fs.readFileSync(caminho, 'utf8');
  } catch (erro) {
    if (erro.code === 'ENOENT') {
      throw new Error(`não encontrei o arquivo "${caminho}".`);
    }
    throw erro;
  }
  // Linhas vazias e as que começam com # são ignoradas: o arquivo aceita anotações.
  return conteudo
    .split(/\r?\n/)
    .map((linha) => linha.trim())
    .filter((linha) => linha !== '' && !linha.startsWith('#'));
}

function montarRelatorio(lancamentos) {
  const receitas = lancamentos.filter((item) => item.tipo === 'receita');
  // sort com (a, b) => b.valor - a.valor ordena da maior despesa para a menor.
  const despesas = lancamentos.filter((item) => item.tipo === 'despesa').sort((a, b) => b.valor - a.valor);
  const totalReceitas = receitas.reduce((soma, item) => soma + item.valor, 0);
  const totalDespesas = despesas.reduce((soma, item) => soma + item.valor, 0);
  return { receitas, despesas, totalReceitas, totalDespesas, saldo: totalReceitas - totalDespesas };
}

// Um bloco a cada 2%, com teto de 50 blocos, para a barra caber no terminal.
function barra(percentualDaReceita) {
  return '█'.repeat(Math.min(50, Math.round(percentualDaReceita / 2)));
}

function imprimirAlertas(relatorio) {
  const { despesas, totalReceitas, saldo } = relatorio;
  if (despesas.length === 0) {
    console.log('Nenhuma despesa informada: todo o valor recebido sobra.');
    return;
  }
  const maior = despesas[0];
  const percentualDaMaior = percentual(maior.valor, totalReceitas);
  console.log(`Alerta: a categoria que mais pesa é "${maior.categoria}", com ${formatarPercentual(percentualDaMaior)} da receita.`);
  if (percentualDaMaior > LIMITE_DE_ALERTA_PERCENTUAL) {
    console.log(`  Ela passa de ${LIMITE_DE_ALERTA_PERCENTUAL}% da receita: vale rever esse gasto primeiro.`);
  }
  if (saldo < 0) {
    console.log(`Atenção: as despesas superam a receita em ${moeda(-saldo)}.`);
  } else if (saldo === 0) {
    console.log('Atenção: você gasta exatamente o que ganha, sem sobra para imprevistos.');
  } else {
    console.log(`Sobram ${moeda(saldo)} no mês. Guardar parte disso forma uma reserva para emergências.`);
  }
}

function imprimirRelatorio(lancamentos) {
  const relatorio = montarRelatorio(lancamentos);
  if (relatorio.totalReceitas === 0) {
    throw new Error('informe pelo menos uma receita maior que zero para calcular os percentuais.');
  }
  console.log('=== Orçamento mensal ===');
  console.log('');
  console.log('Receitas');
  for (const item of relatorio.receitas) {
    console.log(`  ${item.categoria.padEnd(20)} ${moeda(item.valor).padStart(14)}`);
  }
  console.log(`  ${'Total de receitas'.padEnd(20)} ${moeda(relatorio.totalReceitas).padStart(14)}`);
  console.log('');
  console.log('Despesas (percentual sobre a receita, da maior para a menor)');
  for (const item of relatorio.despesas) {
    const percentualDoItem = percentual(item.valor, relatorio.totalReceitas);
    console.log(`  ${item.categoria.padEnd(20)} ${moeda(item.valor).padStart(14)} ${formatarPercentual(percentualDoItem).padStart(7)}  ${barra(percentualDoItem)}`);
  }
  const percentualDespesas = percentual(relatorio.totalDespesas, relatorio.totalReceitas);
  console.log(`  ${'Total de despesas'.padEnd(20)} ${moeda(relatorio.totalDespesas).padStart(14)} ${formatarPercentual(percentualDespesas).padStart(7)}`);
  console.log('');
  console.log(`Saldo do mês: ${moeda(relatorio.saldo)} (${formatarPercentual(percentual(relatorio.saldo, relatorio.totalReceitas))} da receita)`);
  console.log('');
  imprimirAlertas(relatorio);
}

function mostrarUso() {
  console.log(`Uso: node ${NOME_DO_PROGRAMA} tipo:categoria:valor [tipo:categoria:valor ...]`);
  console.log(`     node ${NOME_DO_PROGRAMA} --arquivo orcamento.txt`);
  console.log(`     node ${NOME_DO_PROGRAMA} --demo`);
  console.log('');
  console.log('  tipo ....... receita ou despesa (ou só r / d)');
  console.log('  categoria .. um nome livre, como Aluguel ou Mercado');
  console.log('  valor ...... em reais, com ponto ou vírgula');
  console.log('');
  console.log('  No arquivo, um lançamento por linha; linhas vazias e com # são ignoradas.');
  console.log(`Exemplo: node ${NOME_DO_PROGRAMA} receita:Salário:5000 despesa:Aluguel:1500 despesa:Mercado:900`);
}

function demo() {
  console.log('=== Demonstração: orçamento de exemplo com nove lançamentos ===');
  console.log('');
  imprimirRelatorio(ORCAMENTO_DE_EXEMPLO.map(interpretarLancamento));
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
  let linhas = argumentos;
  const posicaoDoArquivo = argumentos.indexOf('--arquivo');
  if (posicaoDoArquivo !== -1) {
    const caminho = argumentos[posicaoDoArquivo + 1];
    if (!caminho) {
      throw new Error('informe o caminho depois de --arquivo.');
    }
    linhas = lerLinhasDoArquivo(caminho);
  }
  imprimirRelatorio(linhas.map(interpretarLancamento));
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
 *  1. Some lançamentos repetidos da mesma categoria antes de imprimir (use um Map).
 *  2. Compare dois meses lidos de dois arquivos e mostre o que subiu e o que caiu.
 *  3. Aceite uma meta de economia (--meta 20) e diga se o saldo chegou a 20% da receita.
 */
