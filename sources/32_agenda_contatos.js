/**
 * ============================================================
 * CodeNomad Academy  |  Sources JavaScript  |  32. Agenda de contatos em CSV
 * ------------------------------------------------------------
 * O que faz: Guarda contatos (nome, telefone, e-mail, etiqueta) num arquivo
 *            CSV. Permite adicionar, buscar por qualquer campo, ordenar,
 *            exportar um filtro para outro CSV e apontar duplicados.
 * Como usar: node 32_agenda_contatos.js adicionar "Ana Ribeiro" "(11) 98888-1234" ana@exemplo.com amigos
 *            node 32_agenda_contatos.js buscar ana
 *            node 32_agenda_contatos.js listar --ordenar etiqueta
 *            node 32_agenda_contatos.js exportar trabalho equipe.csv
 *            node 32_agenda_contatos.js duplicados --arquivo agenda.csv
 *            node 32_agenda_contatos.js --demo
 * O que você aprende: como ler e escrever CSV de verdade (campos entre aspas,
 *            vírgulas dentro do campo), normalização de texto para comparar,
 *            Map para agrupar, localeCompare para ordenar em português.
 * Requisitos: Node.js 18+, só biblioteca padrão
 * Licença MIT. Um projeto da CodeNomad Academy (codenomad.org)
 * ============================================================
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const CAMPOS = ['nome', 'telefone', 'email', 'etiqueta'];

// ---------- CSV: ler e escrever ----------

function lerLinhaCsv(linha) {
  // Percorre letra por letra: dentro de aspas, a vírgula faz parte do campo
  // e duas aspas seguidas ("") representam uma aspa literal.
  const campos = [];
  let atual = '';
  let entreAspas = false;
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i];
    if (entreAspas) {
      if (c === '"' && linha[i + 1] === '"') { atual += '"'; i++; }
      else if (c === '"') entreAspas = false;
      else atual += c;
    } else if (c === '"') entreAspas = true;
    else if (c === ',') { campos.push(atual); atual = ''; }
    else atual += c;
  }
  campos.push(atual);
  return campos;
}

function escaparCsv(valor) {
  const texto = String(valor ?? '');
  // Só precisa de aspas se houver vírgula, aspas ou quebra de linha.
  return /[",\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

function carregar(arquivo) {
  if (!fs.existsSync(arquivo)) return [];
  const linhas = fs.readFileSync(arquivo, 'utf8').split(/\r?\n/).filter((l) => l.trim() !== '');
  const cabecalhoOk = lerLinhaCsv(linhas[0] || '').join(',') === CAMPOS.join(',');
  if (!cabecalhoOk) throw new Error(`${arquivo} não tem o cabeçalho esperado (${CAMPOS.join(',')}).`);
  return linhas.slice(1).map((linha) => {
    const valores = lerLinhaCsv(linha);
    // Object.fromEntries monta { nome: ..., telefone: ... } a partir de pares [chave, valor].
    return Object.fromEntries(CAMPOS.map((campo, i) => [campo, valores[i] || '']));
  });
}

function salvar(arquivo, contatos) {
  const linhas = contatos.map((c) => CAMPOS.map((campo) => escaparCsv(c[campo])).join(','));
  fs.writeFileSync(arquivo, [CAMPOS.join(','), ...linhas].join('\n') + '\n', 'utf8');
}

// ---------- Normalização e validação ----------

function normalizar(texto) {
  // NFD separa a letra do acento; o replace tira os acentos soltos. Assim
  // "José" e "jose" ficam iguais nas buscas e na detecção de duplicados.
  return String(texto).normalize('NFD').replace(/\p{Mn}/gu, '').toLowerCase().trim();
}

function soDigitos(telefone) {
  return String(telefone).replace(/\D/g, '');
}

function validarContato(parametros) {
  const [nome, telefone, email, etiqueta] = parametros;
  if (parametros.length < 3) throw new Error('Uso: adicionar "nome" "telefone" "e-mail" [etiqueta]');
  if (!nome.trim()) throw new Error('O nome é obrigatório.');
  if (soDigitos(telefone).length < 8) throw new Error(`Telefone inválido: "${telefone}". Informe ao menos 8 dígitos.`);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error(`E-mail inválido: "${email}".`);
  const etiquetaFinal = (etiqueta || 'geral').trim().toLowerCase();
  return { nome: nome.trim(), telefone: telefone.trim(), email: email.trim().toLowerCase(), etiqueta: etiquetaFinal };
}

// ---------- Operações ----------

function adicionar(contatos, parametros) {
  const contato = validarContato(parametros);
  if (contatos.some((c) => c.email === contato.email)) throw new Error(`Já existe um contato com o e-mail ${contato.email}.`);
  contatos.push(contato);
  return `Contato adicionado: ${contato.nome} <${contato.email}>`;
}

function buscar(contatos, termo) {
  if (!termo.trim()) throw new Error('Informe um termo para buscar.');
  const alvo = normalizar(termo);
  return contatos.filter((c) => CAMPOS.some((campo) => normalizar(c[campo]).includes(alvo)));
}

function ordenar(contatos, campo = 'nome') {
  if (!CAMPOS.includes(campo)) throw new Error(`Campo inválido para ordenar: "${campo}". Use ${CAMPOS.join(', ')}.`);
  // localeCompare com 'pt-BR' trata acentos e maiúsculas do jeito esperado.
  return [...contatos].sort((a, b) => a[campo].localeCompare(b[campo], 'pt-BR') || a.nome.localeCompare(b.nome, 'pt-BR'));
}

function duplicados(contatos) {
  // Agrupa por três chaves diferentes; um grupo com mais de um contato é suspeito.
  const criterios = [
    ['nome', (c) => normalizar(c.nome)],
    ['telefone', (c) => soDigitos(c.telefone).slice(-8)],
    ['e-mail', (c) => normalizar(c.email)],
  ];
  const grupos = [];
  for (const [rotulo, chaveDe] of criterios) {
    const porChave = new Map();
    for (const c of contatos) {
      const chave = chaveDe(c);
      if (!porChave.has(chave)) porChave.set(chave, []);
      porChave.get(chave).push(c);
    }
    for (const [chave, lista] of porChave) {
      if (lista.length > 1) grupos.push({ rotulo, chave, lista });
    }
  }
  return grupos;
}

function tabela(contatos) {
  if (contatos.length === 0) return 'Nenhum contato encontrado.';
  const largura = {};
  for (const campo of CAMPOS) largura[campo] = Math.max(campo.length, ...contatos.map((c) => c[campo].length));
  const linha = (c) => CAMPOS.map((campo) => c[campo].padEnd(largura[campo])).join('  ');
  const cabecalho = Object.fromEntries(CAMPOS.map((campo) => [campo, campo.toUpperCase()]));
  const separador = Object.fromEntries(CAMPOS.map((campo) => [campo, '-'.repeat(largura[campo])]));
  return [cabecalho, separador, ...contatos].map(linha).concat(`${contatos.length} contato(s)`).join('\n');
}

// ---------- Linha de comando ----------

function lerArgumentos(argv) {
  const opcoes = {};
  const posicionais = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--') && argv[i + 1] !== undefined) { opcoes[argv[i].slice(2)] = argv[i + 1]; i++; }
    else posicionais.push(argv[i]);
  }
  return { comando: posicionais[0], parametros: posicionais.slice(1), opcoes };
}

function executar(argv, arquivoPadrao) {
  const { comando, parametros, opcoes } = lerArgumentos(argv);
  const arquivo = opcoes.arquivo || arquivoPadrao;
  const contatos = carregar(arquivo);
  switch (comando) {
    case 'adicionar': {
      const mensagem = adicionar(contatos, parametros);
      salvar(arquivo, contatos);
      return mensagem;
    }
    case 'listar': return tabela(ordenar(contatos, opcoes.ordenar));
    case 'buscar': return tabela(buscar(contatos, parametros.join(' ')));
    case 'exportar': {
      const [termo, destino] = parametros;
      if (!termo || !destino) throw new Error('Uso: exportar <termo> <arquivo-destino.csv>');
      const achados = ordenar(buscar(contatos, termo));
      salvar(destino, achados);
      return `${achados.length} contato(s) com "${termo}" exportado(s) para ${destino}`;
    }
    case 'duplicados': {
      const grupos = duplicados(contatos);
      if (grupos.length === 0) return 'Nenhum duplicado encontrado.';
      const linhaDe = (c) => `  - ${c.nome} | ${c.telefone} | ${c.email}`;
      return grupos.map((g) => [`Mesmo ${g.rotulo} (${g.chave}):`, ...g.lista.map(linhaDe)].join('\n')).join('\n');
    }
    default:
      throw new Error(`Comando desconhecido: "${comando}". Use adicionar, listar, buscar, exportar ou duplicados.`);
  }
}

function mostrarUso() {
  console.log(`Uso: node 32_agenda_contatos.js <comando> [...] [--arquivo contatos.csv]

Comandos:
  adicionar "nome" "telefone" "e-mail" [etiqueta]
  listar [--ordenar nome|telefone|email|etiqueta]
  buscar <termo>                  procura em todos os campos, sem ligar para acentos
  exportar <termo> <destino.csv>  grava num novo CSV só os contatos que batem com o termo
  duplicados                      aponta contatos com o mesmo nome, telefone ou e-mail
  --demo                          executa uma demonstração completa numa pasta temporária`);
}

// ---------- Demonstração ----------

function demo() {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'codenomad-agenda-'));
  const arquivo = path.join(pasta, 'contatos.csv');
  const exportado = path.join(pasta, 'trabalho.csv');
  console.log('=== Agenda de contatos: demonstração ===');
  console.log(`Arquivo temporário: ${arquivo}\n`);
  const roteiro = [
    ['adicionar', 'Ana Ribeiro', '(11) 98888-1234', 'ana.ribeiro@exemplo.com', 'amigos'],
    ['adicionar', 'Bruno Castro', '(21) 97777-5678', 'bruno@exemplo.com', 'trabalho'],
    ['adicionar', 'Carla Souza, Dra.', '(31) 96666-0001', 'carla@exemplo.com', 'trabalho'],
    ['adicionar', 'José Almeida', '(41) 95555-2222', 'jose@exemplo.com', 'família'],
    ['adicionar', 'Jose Almeida', '41955552222', 'j.almeida@exemplo.com'],
    ['adicionar', 'Ana Ribeiro', '(11) 98888-1234', 'ana.ribeiro@exemplo.com', 'amigos'],
    ['listar', '--ordenar', 'etiqueta'],
    ['buscar', 'jose'],
    ['exportar', 'trabalho', exportado],
    ['duplicados'],
    ['adicionar', 'Sem Telefone', '123', 'alguem@exemplo.com'],
  ];
  for (const argv of roteiro) {
    const comando = argv.map((a) => (a.includes(' ') ? `"${a}"` : a)).join(' ');
    console.log(`$ node 32_agenda_contatos.js ${comando}`);
    try {
      console.log(executar(argv, arquivo));
    } catch (erro) {
      console.log(`Erro tratado: ${erro.message}`);
    }
    console.log('');
  }
  console.log('Conteúdo do CSV exportado (repare nas aspas do nome com vírgula):');
  console.log(fs.readFileSync(exportado, 'utf8'));
  fs.rmSync(pasta, { recursive: true, force: true });
  console.log('Pasta temporária removida. Fim da demonstração.');
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--demo')) return demo();
  if (argv.length === 0) return mostrarUso();
  try {
    console.log(executar(argv, path.join(process.cwd(), 'contatos.csv')));
  } catch (erro) {
    console.error(`Erro: ${erro.message}`);
    process.exitCode = 1;
  }
}

main();

/*
 * Para ir além:
 * 1. Crie o comando "remover <e-mail>" e o comando "editar <e-mail> --telefone ...".
 * 2. Aceite vários telefones por contato, separados por ";" dentro do mesmo campo.
 * 3. Gere um arquivo .vcf (vCard) a partir de um contato para importar no celular.
 */
