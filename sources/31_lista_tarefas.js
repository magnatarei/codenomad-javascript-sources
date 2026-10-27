/**
 * ============================================================
 * CodeNomad Academy  |  Sources JavaScript  |  31. Lista de tarefas em arquivo JSON
 * ------------------------------------------------------------
 * O que faz: Guarda tarefas com prioridade e data de entrega num arquivo
 *            JSON. Você adiciona, lista (ordenado por prioridade), conclui,
 *            remove e busca tarefas direto pela linha de comando.
 * Como usar: node 31_lista_tarefas.js adicionar "Revisar capítulo 3" --prioridade alta --data 2026-11-05
 *            node 31_lista_tarefas.js listar --todas
 *            node 31_lista_tarefas.js concluir 1
 *            node 31_lista_tarefas.js buscar revisar
 *            node 31_lista_tarefas.js remover 1 --arquivo minhas-tarefas.json
 *            node 31_lista_tarefas.js --demo
 * O que você aprende: leitura e escrita de JSON com fs, process.argv,
 *            ordenação com critérios encadeados, reduce, destructuring,
 *            template strings e tratamento de erros com try/catch.
 * Requisitos: Node.js 18+, só biblioteca padrão
 * Licença MIT. Um projeto da CodeNomad Academy (codenomad.org)
 * ============================================================
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

// Peso de cada prioridade: quanto menor, mais cedo a tarefa aparece na lista.
const PESO = { alta: 1, media: 2, baixa: 3 };
const ROTULO = { alta: 'Alta ', media: 'Média', baixa: 'Baixa' };
const COMANDOS_QUE_GRAVAM = ['adicionar', 'concluir', 'remover'];

// ---------- Persistência ----------

function carregar(arquivo) {
  if (!fs.existsSync(arquivo)) return [];
  let dados;
  try {
    dados = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
  } catch (erro) {
    throw new Error(`Não consegui ler ${arquivo}: ${erro.message}`);
  }
  if (!Array.isArray(dados)) throw new Error(`${arquivo} não contém uma lista de tarefas.`);
  return dados;
}

function salvar(arquivo, tarefas) {
  // O terceiro argumento do stringify é o recuo: deixa o arquivo legível.
  fs.writeFileSync(arquivo, JSON.stringify(tarefas, null, 2) + '\n', 'utf8');
}

// ---------- Validação ----------

function normalizarPrioridade(texto) {
  const chave = String(texto ?? 'media').toLowerCase().replace('é', 'e');
  if (!(chave in PESO)) throw new Error(`Prioridade inválida: "${texto}". Use alta, média ou baixa.`);
  return chave;
}

function validarData(texto) {
  if (texto === undefined) return null;
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(texto));
  // new Date aceita 2026-02-31 e "pula" para março; por isso conferimos de volta.
  const data = partes && new Date(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3]));
  if (!partes || data.getMonth() !== Number(partes[2]) - 1 || data.getDate() !== Number(partes[3])) {
    throw new Error(`Data inválida: "${texto}". Use o formato AAAA-MM-DD.`);
  }
  return texto;
}

function localizar(tarefas, idTexto) {
  const id = Number(idTexto);
  if (!Number.isInteger(id) || id <= 0) throw new Error(`Id inválido: "${idTexto}". Informe o número da tarefa.`);
  const tarefa = tarefas.find((t) => t.id === id);
  if (!tarefa) throw new Error(`Não existe tarefa com id ${id}.`);
  return tarefa;
}

// ---------- Operações ----------

function adicionar(tarefas, descricao, opcoes) {
  if (!descricao.trim()) throw new Error('Informe a descrição da tarefa entre aspas.');
  const tarefa = {
    id: tarefas.reduce((maior, t) => Math.max(maior, t.id), 0) + 1,
    descricao: descricao.trim(),
    prioridade: normalizarPrioridade(opcoes.prioridade),
    data: validarData(opcoes.data),
    concluida: false,
    criadaEm: new Date().toISOString(),
  };
  tarefas.push(tarefa);
  return `Tarefa #${tarefa.id} adicionada: ${tarefa.descricao}`;
}

function concluir(tarefas, idTexto) {
  const tarefa = localizar(tarefas, idTexto);
  if (tarefa.concluida) return `Tarefa #${tarefa.id} já estava concluída.`;
  tarefa.concluida = true;
  return `Tarefa #${tarefa.id} concluída: ${tarefa.descricao}`;
}

function remover(tarefas, idTexto) {
  const tarefa = localizar(tarefas, idTexto);
  tarefas.splice(tarefas.indexOf(tarefa), 1);
  return `Tarefa #${tarefa.id} removida: ${tarefa.descricao}`;
}

function ordenar(tarefas) {
  // Critérios em cascata com ||: pendentes antes, depois prioridade, depois
  // data (quem não tem data vai para o fim) e, por último, o id.
  return [...tarefas].sort((a, b) =>
    Number(a.concluida) - Number(b.concluida) ||
    PESO[a.prioridade] - PESO[b.prioridade] ||
    (a.data || '9999').localeCompare(b.data || '9999') ||
    a.id - b.id);
}

function formatar(t) {
  const marca = t.concluida ? '[x]' : '[ ]';
  return `${marca} #${String(t.id).padStart(2)}  ${ROTULO[t.prioridade]}  ${(t.data || 'sem data').padEnd(10)}  ${t.descricao}`;
}

function listar(tarefas, todas) {
  const visiveis = ordenar(tarefas).filter((t) => todas || !t.concluida);
  if (visiveis.length === 0) return 'Nenhuma tarefa para mostrar.';
  const pendentes = tarefas.filter((t) => !t.concluida).length;
  return [...visiveis.map(formatar), `(${pendentes} pendente(s) de ${tarefas.length})`].join('\n');
}

function buscar(tarefas, termo) {
  if (!termo.trim()) throw new Error('Informe um termo para buscar.');
  const achadas = ordenar(tarefas).filter((t) => t.descricao.toLowerCase().includes(termo.toLowerCase()));
  if (achadas.length === 0) return `Nenhuma tarefa contém "${termo}".`;
  return achadas.map(formatar).join('\n');
}

// ---------- Linha de comando ----------

function lerArgumentos(argv) {
  // Separa "--chave valor" (opções) do resto (posicionais). "--todas" sozinho vira true.
  const opcoes = {};
  const posicionais = [];
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) { posicionais.push(argv[i]); continue; }
    const chave = argv[i].slice(2);
    const seguinte = argv[i + 1];
    if (seguinte !== undefined && !seguinte.startsWith('--')) { opcoes[chave] = seguinte; i++; }
    else opcoes[chave] = true;
  }
  return { comando: posicionais[0], parametros: posicionais.slice(1), opcoes };
}

function executar(argv, arquivoPadrao) {
  const { comando, parametros, opcoes } = lerArgumentos(argv);
  const arquivo = opcoes.arquivo || arquivoPadrao;
  const tarefas = carregar(arquivo);
  let saida;
  switch (comando) {
    case 'adicionar': saida = adicionar(tarefas, parametros.join(' '), opcoes); break;
    case 'listar': saida = listar(tarefas, Boolean(opcoes.todas)); break;
    case 'concluir': saida = concluir(tarefas, parametros[0]); break;
    case 'remover': saida = remover(tarefas, parametros[0]); break;
    case 'buscar': saida = buscar(tarefas, parametros.join(' ')); break;
    default: throw new Error(`Comando desconhecido: "${comando}". Use adicionar, listar, concluir, remover ou buscar.`);
  }
  // Só gravamos nos comandos que mudam a lista; listar e buscar são só leitura.
  if (COMANDOS_QUE_GRAVAM.includes(comando)) salvar(arquivo, tarefas);
  return saida;
}

function mostrarUso() {
  console.log(`Uso: node 31_lista_tarefas.js <comando> [...] [--arquivo tarefas.json]

Comandos:
  adicionar "descrição" [--prioridade alta|média|baixa] [--data AAAA-MM-DD]
  listar [--todas]      lista as pendentes (ou todas), ordenadas por prioridade
  concluir <id>         marca a tarefa como concluída
  remover <id>          apaga a tarefa
  buscar <termo>        procura no texto das tarefas
  --demo                executa uma demonstração completa num arquivo temporário

Sem --arquivo, a lista fica em tarefas.json na pasta atual.`);
}

// ---------- Demonstração ----------

function demo() {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'codenomad-tarefas-'));
  const arquivo = path.join(pasta, 'tarefas.json');
  console.log('=== Lista de tarefas: demonstração ===');
  console.log(`Arquivo temporário: ${arquivo}\n`);
  const roteiro = [
    ['adicionar', 'Revisar capítulo 3 de JavaScript', '--prioridade', 'alta', '--data', '2026-11-05'],
    ['adicionar', 'Comprar material para a aula', '--prioridade', 'baixa'],
    ['adicionar', 'Entregar exercício de funções', '--prioridade', 'alta', '--data', '2026-11-02'],
    ['adicionar', 'Organizar anotações da semana', '--data', '2026-11-10'],
    ['listar'],
    ['concluir', '3'],
    ['buscar', 'aula'],
    ['remover', '2'],
    ['listar', '--todas'],
    ['concluir', '99'],
    ['adicionar', 'Tarefa com data errada', '--data', '2026-02-31'],
  ];
  for (const argv of roteiro) {
    const comando = argv.map((a) => (a.includes(' ') ? `"${a}"` : a)).join(' ');
    console.log(`$ node 31_lista_tarefas.js ${comando}`);
    try {
      console.log(executar(argv, arquivo));
    } catch (erro) {
      console.log(`Erro tratado: ${erro.message}`);
    }
    console.log('');
  }
  console.log('Conteúdo final do JSON:');
  console.log(fs.readFileSync(arquivo, 'utf8'));
  fs.rmSync(pasta, { recursive: true, force: true });
  console.log('Pasta temporária removida. Fim da demonstração.');
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--demo')) return demo();
  if (argv.length === 0) return mostrarUso();
  try {
    console.log(executar(argv, path.join(process.cwd(), 'tarefas.json')));
  } catch (erro) {
    console.error(`Erro: ${erro.message}`);
    process.exitCode = 1;
  }
}

main();

/*
 * Para ir além:
 * 1. Crie o comando "editar <id>" para trocar descrição, prioridade ou data.
 * 2. Mostre um aviso "ATRASADA" nas tarefas pendentes cuja data já passou.
 * 3. Permita etiquetas (#estudo, #casa) e um filtro "listar --etiqueta estudo".
 */
