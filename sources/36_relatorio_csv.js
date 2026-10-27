/**
 * ============================================================
 * CodeNomad Academy  |  Sources JavaScript  |  36. Relatório de vendas a partir de CSV
 * ------------------------------------------------------------
 * O que faz: Lê um CSV de vendas (data, produto, categoria, quantidade,
 *            valor unitário), calcula totais por categoria e por mês, ticket
 *            médio, produto mais vendido e imprime um relatório alinhado.
 *            Linhas inválidas são apontadas no fim, sem derrubar o programa.
 * Como usar: node 36_relatorio_csv.js vendas.csv
 *            node 36_relatorio_csv.js vendas.csv --top 3
 *            node 36_relatorio_csv.js --demo
 * O que você aprende: leitura de CSV (inclusive campos entre aspas), números
 *            no formato brasileiro ("18,90"), Map e reduce para somar por grupo,
 *            Intl.NumberFormat para moeda, padStart e padEnd para alinhar
 *            colunas e um gerador de números pseudoaleatórios com semente.
 * Requisitos: Node.js 18+, só biblioteca padrão
 * Licença MIT. Um projeto da CodeNomad Academy (codenomad.org)
 * ============================================================
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const COLUNAS = ['data', 'produto', 'categoria', 'quantidade', 'valor'];
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

// ---------- Leitura e validação ----------

function lerLinhaCsv(linha) {
  // Um campo entre aspas pode conter vírgula, como "18,90". Fora das aspas a vírgula separa.
  const campos = [];
  let atual = '';
  let entreAspas = false;
  for (const c of linha) {
    if (c === '"') entreAspas = !entreAspas;
    else if (c === ',' && !entreAspas) { campos.push(atual); atual = ''; }
    else atual += c;
  }
  campos.push(atual);
  return campos.map((campo) => campo.trim());
}

function paraNumero(texto) {
  // "1.234,56" vira 1234.56: some o ponto de milhar e troque a vírgula pelo ponto.
  const limpo = texto.includes(',') ? texto.replace(/\./g, '').replace(',', '.') : texto;
  const numero = Number(limpo);
  if (limpo === '' || Number.isNaN(numero)) throw new Error(`número inválido: "${texto}"`);
  return numero;
}

function dataValida(texto) {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
  if (!partes) return false;
  const data = new Date(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3]));
  return data.getMonth() === Number(partes[2]) - 1 && data.getDate() === Number(partes[3]);
}

function lerVendas(texto) {
  const linhas = texto.split(/\r?\n/).filter((l) => l.trim() !== '');
  const cabecalho = lerLinhaCsv(linhas[0] || '').map((c) => c.toLowerCase());
  if (cabecalho.join(',') !== COLUNAS.join(',')) {
    throw new Error(`Cabeçalho esperado: ${COLUNAS.join(',')}. Encontrado: "${linhas[0] || ''}"`);
  }
  const vendas = [];
  const avisos = [];
  linhas.slice(1).forEach((linha, i) => {
    try {
      const [data, produto, categoria, quantidade, valor] = lerLinhaCsv(linha);
      if (!dataValida(data)) throw new Error(`data inválida: "${data}"`);
      if (!produto || !categoria) throw new Error('produto e categoria são obrigatórios');
      const qtd = paraNumero(quantidade);
      if (!Number.isInteger(qtd) || qtd <= 0) throw new Error(`quantidade inválida: "${quantidade}"`);
      const unitario = paraNumero(valor);
      if (unitario < 0) throw new Error(`valor negativo: "${valor}"`);
      vendas.push({ data, mes: data.slice(0, 7), produto, categoria, quantidade: qtd, total: qtd * unitario });
    } catch (erro) {
      avisos.push(`linha ${i + 2} ignorada (${erro.message})`); // +2: a linha 1 é o cabeçalho
    }
  });
  if (vendas.length === 0) throw new Error('Nenhuma venda válida no arquivo.');
  return { vendas, avisos };
}

// ---------- Agregação ----------

function somarPor(vendas, chaveDe) {
  // Map agrupa pela chave; cada grupo acumula contagem, itens e receita.
  const grupos = new Map();
  for (const v of vendas) {
    const chave = chaveDe(v);
    const grupo = grupos.get(chave) || { chave, vendas: 0, quantidade: 0, total: 0 };
    grupo.vendas += 1;
    grupo.quantidade += v.quantidade;
    grupo.total += v.total;
    grupos.set(chave, grupo);
  }
  return [...grupos.values()];
}

function nomeMes(chave) {
  const [ano, mes] = chave.split('-');
  return `${MESES[Number(mes) - 1]}/${ano}`;
}

// ---------- Relatório ----------

function montarRelatorio(vendas, avisos, top) {
  const receita = vendas.reduce((soma, v) => soma + v.total, 0);
  const itens = vendas.reduce((soma, v) => soma + v.quantidade, 0);
  const datas = vendas.map((v) => v.data).sort();
  const porCategoria = somarPor(vendas, (v) => v.categoria).sort((a, b) => b.total - a.total);
  const porMes = somarPor(vendas, (v) => v.mes).sort((a, b) => a.chave.localeCompare(b.chave));
  const porProduto = somarPor(vendas, (v) => v.produto);
  const maisVendidos = [...porProduto].sort((a, b) => b.quantidade - a.quantidade);
  const maiorReceita = [...porProduto].sort((a, b) => b.total - a.total)[0];
  const maiorMes = Math.max(...porMes.map((m) => m.total));

  const L = ['RELATÓRIO DE VENDAS', '='.repeat(62)];
  L.push(`Período: ${datas[0]} a ${datas[datas.length - 1]}`);
  L.push(`Vendas: ${vendas.length}   Itens vendidos: ${itens}`);
  L.push(`Receita total: ${moeda.format(receita)}   Ticket médio: ${moeda.format(receita / vendas.length)}`);
  L.push('', 'Por categoria', '-'.repeat(62));
  L.push(`${'Categoria'.padEnd(16)}${'Vendas'.padStart(8)}${'Itens'.padStart(8)}${'Receita'.padStart(18)}${'Parte'.padStart(9)}`);
  for (const c of porCategoria) {
    const parte = `${(c.total / receita * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
    L.push(`${c.chave.padEnd(16)}${String(c.vendas).padStart(8)}${String(c.quantidade).padStart(8)}${moeda.format(c.total).padStart(18)}${parte.padStart(9)}`);
  }
  L.push('', 'Por mês', '-'.repeat(62));
  for (const m of porMes) {
    // Barra proporcional ao maior mês: 30 colunas no máximo.
    const barra = '#'.repeat(Math.round(m.total / maiorMes * 30));
    L.push(`${nomeMes(m.chave).padEnd(10)}${String(m.vendas).padStart(4)} vendas${moeda.format(m.total).padStart(18)}  ${barra}`);
  }
  L.push('', `Top ${top} produtos por quantidade`, '-'.repeat(62));
  maisVendidos.slice(0, top).forEach((p, i) => {
    L.push(`${String(i + 1).padStart(2)}. ${p.chave.padEnd(24)}${String(p.quantidade).padStart(5)} un.${moeda.format(p.total).padStart(18)}`);
  });
  L.push('', `Produto mais vendido: ${maisVendidos[0].chave} (${maisVendidos[0].quantidade} unidades)`);
  L.push(`Produto com maior receita: ${maiorReceita.chave} (${moeda.format(maiorReceita.total)})`);
  if (avisos.length > 0) L.push('', `Avisos (${avisos.length}):`, ...avisos.map((a) => `  ${a}`));
  return L.join('\n');
}

// ---------- Linha de comando ----------

function executar(argv) {
  const arquivo = argv.find((a) => !a.startsWith('--'));
  if (!arquivo) throw new Error('Informe o arquivo CSV. Exemplo: node 36_relatorio_csv.js vendas.csv');
  if (!fs.existsSync(arquivo)) throw new Error(`Arquivo não encontrado: ${arquivo}`);
  let top = 5;
  const posicaoTop = argv.indexOf('--top');
  if (posicaoTop !== -1) {
    top = Number(argv[posicaoTop + 1]);
    if (!Number.isInteger(top) || top < 1) throw new Error(`--top precisa de um número inteiro maior que zero, não "${argv[posicaoTop + 1]}".`);
  }
  const { vendas, avisos } = lerVendas(fs.readFileSync(arquivo, 'utf8'));
  console.log(montarRelatorio(vendas, avisos, top));
}

function mostrarUso() {
  console.log(`Uso: node 36_relatorio_csv.js <vendas.csv> [--top N]

O CSV precisa do cabeçalho: ${COLUNAS.join(',')}
  data        AAAA-MM-DD
  quantidade  inteiro maior que zero
  valor       preço unitário; "18,90" (entre aspas) ou 18.90
  --top N     quantos produtos listar no ranking (padrão 5)
  --demo      gera um CSV de exemplo com 60 vendas e imprime o relatório`);
}

// ---------- Demonstração ----------

function criarGerador(semente) {
  // Gerador linear congruente: a mesma semente produz sempre a mesma sequência,
  // então a demonstração é reproduzível (Math.random não aceita semente).
  let estado = semente;
  return () => {
    estado = (estado * 1103515245 + 12345) % 2147483648;
    return estado / 2147483648;
  };
}

function gerarCsvExemplo() {
  const sortear = criarGerador(2026);
  const catalogo = [
    ['Caderno pautado', 'Papelaria', 18.9], ['Caneta azul', 'Papelaria', 3.5], ['Estojo', 'Acessórios', 24.9],
    ['Mochila escolar', 'Acessórios', 149.9], ['Fone de ouvido', 'Eletrônicos', 89], ['Mouse sem fio', 'Eletrônicos', 65],
    ['Livro de JavaScript', 'Livros', 79.9], ['Livro de lógica', 'Livros', 59.9],
  ];
  const linhas = [COLUNAS.join(',')];
  for (let i = 0; i < 60; i++) {
    const [produto, categoria, preco] = catalogo[Math.floor(sortear() * catalogo.length)];
    const mes = String(1 + Math.floor(sortear() * 3)).padStart(2, '0');
    const dia = String(1 + Math.floor(sortear() * 28)).padStart(2, '0');
    const quantidade = 1 + Math.floor(sortear() * 4);
    linhas.push(`2026-${mes}-${dia},${produto},${categoria},${quantidade},"${preco.toFixed(2).replace('.', ',')}"`);
  }
  linhas.push('2026-02-30,Caneta azul,Papelaria,2,"3,50"', '2026-03-05,Estojo,Acessórios,abc,"24,90"');
  return linhas.join('\n') + '\n';
}

function demo() {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'codenomad-vendas-'));
  const arquivo = path.join(pasta, 'vendas.csv');
  fs.writeFileSync(arquivo, gerarCsvExemplo(), 'utf8');
  console.log('=== Relatório de vendas: demonstração ===');
  console.log(`CSV temporário com 60 vendas (mais 2 linhas erradas de propósito): ${arquivo}`);
  console.log('Primeiras linhas do arquivo:');
  console.log(fs.readFileSync(arquivo, 'utf8').split('\n').slice(0, 5).map((l) => `  ${l}`).join('\n'));
  console.log('\n$ node 36_relatorio_csv.js vendas.csv --top 3\n');
  executar([arquivo, '--top', '3']);
  console.log('\n$ node 36_relatorio_csv.js vendas.csv --top zero');
  try {
    executar([arquivo, '--top', 'zero']);
  } catch (erro) {
    console.log(`Erro tratado: ${erro.message}`);
  }
  fs.rmSync(pasta, { recursive: true, force: true });
  console.log('\nPasta temporária removida. Fim da demonstração.');
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--demo')) return demo();
  if (argv.length === 0) return mostrarUso();
  try {
    executar(argv);
  } catch (erro) {
    console.error(`Erro: ${erro.message}`);
    process.exitCode = 1;
  }
}

main();

/*
 * Para ir além:
 * 1. Adicione --inicio AAAA-MM-DD e --fim AAAA-MM-DD para filtrar o período antes de calcular.
 * 2. Grave o relatório em um arquivo com --gravar relatorio.txt e também uma versão em CSV dos totais.
 * 3. Calcule a variação percentual de cada mês em relação ao anterior e mostre uma seta (sobe/desce).
 */
