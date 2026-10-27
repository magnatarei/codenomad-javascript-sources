/**
 * ============================================================
 * CodeNomad Academy  |  Sources JavaScript  |  23. Pilha e fila na prática
 * ------------------------------------------------------------
 * O que faz: Implementa pilha (LIFO) e fila (FIFO) com as operações clássicas
 *            e usa as duas em três problemas reais: parênteses balanceados,
 *            desfazer/refazer de um editor e fila de atendimento com espera.
 * Como usar: node sources/23_pilha_fila.js balancear "{[()]}(a+b)"
 *            node sources/23_pilha_fila.js fila 4 2 7 3 5
 *            node sources/23_pilha_fila.js --demo
 * O que você aprende: classes com campos privados (#), getters, Map e Set,
 *            por que shift() é caro, fila com índice de frente, reduce.
 * Requisitos: Node.js 18+, só biblioteca padrão
 * Licença MIT. Um projeto da CodeNomad Academy (codenomad.org)
 * ============================================================
 */
'use strict';

// Pilha (LIFO): o último que entra é o primeiro que sai, como pratos
// empilhados. O array da linguagem já faz push e pop no fim em tempo constante.
class Pilha {
  #itens = []; // o # torna o campo privado: só a própria classe enxerga

  empilhar(item) {
    this.#itens.push(item);
    return this; // devolver "this" permite encadear: pilha.empilhar(1).empilhar(2)
  }

  desempilhar() {
    if (this.estaVazia()) throw new Error('a pilha está vazia');
    return this.#itens.pop();
  }

  topo() {
    return this.#itens[this.#itens.length - 1];
  }
  estaVazia() {
    return this.#itens.length === 0;
  }
  get tamanho() {
    return this.#itens.length;
  }
  toString() {
    return `[${this.#itens.join(', ')}] <- topo`;
  }
}

// Fila (FIFO): o primeiro que entra é o primeiro que sai, como a fila da
// padaria. Usar shift() para tirar da frente obriga a deslocar todos os
// outros itens uma posição; aqui a fila só avança um índice de frente.
class Fila {
  #itens = [];
  #frente = 0;

  enfileirar(item) {
    this.#itens.push(item);
    return this;
  }

  desenfileirar() {
    if (this.estaVazia()) throw new Error('a fila está vazia');
    const item = this.#itens[this.#frente];
    this.#frente += 1;
    // Quando mais da metade do array já foi consumida, descarta o trecho
    // morto de uma vez, para a memória não crescer sem parar.
    if (this.#frente > 32 && this.#frente * 2 > this.#itens.length) {
      this.#itens = this.#itens.slice(this.#frente);
      this.#frente = 0;
    }
    return item;
  }

  frente() {
    return this.#itens[this.#frente];
  }
  estaVazia() {
    return this.#frente >= this.#itens.length;
  }
  get tamanho() {
    return this.#itens.length - this.#frente;
  }
  toString() {
    return `frente -> [${this.#itens.slice(this.#frente).join(', ')}]`;
  }
}

// Problema 1: parênteses balanceados. Cada abertura vai para a pilha; cada
// fechamento precisa combinar com o topo. No fim, a pilha tem de estar vazia.
const PARES = new Map([[')', '('], [']', '['], ['}', '{']]);
const ABERTURAS = new Set(PARES.values());

function verificarBalanceamento(texto) {
  const pilha = new Pilha();
  for (let i = 0; i < texto.length; i += 1) {
    const simbolo = texto[i];
    if (ABERTURAS.has(simbolo)) {
      pilha.empilhar({ simbolo, posicao: i });
    } else if (PARES.has(simbolo)) {
      if (pilha.estaVazia()) return { ok: false, motivo: `"${simbolo}" na posição ${i} fecha sem nada aberto` };
      const aberto = pilha.desempilhar();
      if (aberto.simbolo !== PARES.get(simbolo)) {
        return { ok: false, motivo: `"${simbolo}" na posição ${i} não combina com "${aberto.simbolo}" da posição ${aberto.posicao}` };
      }
    }
  }
  if (!pilha.estaVazia()) {
    const sobra = pilha.topo();
    return { ok: false, motivo: `"${sobra.simbolo}" da posição ${sobra.posicao} nunca foi fechado` };
  }
  return { ok: true, motivo: 'todos os símbolos combinam' };
}

// Problema 2: desfazer e refazer com duas pilhas de estados. Uma guarda os
// textos anteriores; a outra, os que foram desfeitos e podem voltar.
class Editor {
  #texto = '';
  #historico = new Pilha();
  #refaziveis = new Pilha();

  get texto() {
    return this.#texto;
  }
  digitar(trecho) {
    this.#historico.empilhar(this.#texto);
    this.#refaziveis = new Pilha(); // uma ação nova descarta o que podia ser refeito
    this.#texto += trecho;
  }

  desfazer() {
    if (this.#historico.estaVazia()) return false;
    this.#refaziveis.empilhar(this.#texto);
    this.#texto = this.#historico.desempilhar();
    return true;
  }

  refazer() {
    if (this.#refaziveis.estaVazia()) return false;
    this.#historico.empilhar(this.#texto);
    this.#texto = this.#refaziveis.desempilhar();
    return true;
  }
}

// Problema 3: um atendente, uma fila. Cada cliente chega em um minuto e
// precisa de alguns minutos; a espera é o tempo entre chegar e ser chamado.
function simularAtendimento(clientes) {
  const fila = new Fila();
  clientes.forEach((cliente) => fila.enfileirar(cliente));
  let relogio = 0; // minuto em que o atendente fica livre
  const atendidos = [];
  while (!fila.estaVazia()) {
    const cliente = fila.desenfileirar();
    const inicio = Math.max(relogio, cliente.chegada); // ninguém é atendido antes de chegar
    relogio = inicio + cliente.duracao;
    atendidos.push({ ...cliente, inicio, espera: inicio - cliente.chegada, fim: relogio });
  }
  const totalEspera = atendidos.reduce((soma, a) => soma + a.espera, 0);
  return { atendidos, mediaEspera: totalEspera / atendidos.length };
}

function imprimirAtendimento({ atendidos, mediaEspera }) {
  console.log(`${'Cliente'.padEnd(10)}${'Chegada'.padStart(8)}${'Início'.padStart(8)}${'Duração'.padStart(9)}${'Espera'.padStart(8)}${'Fim'.padStart(6)}`);
  for (const a of atendidos) {
    console.log(`${a.nome.padEnd(10)}${String(a.chegada).padStart(8)}${String(a.inicio).padStart(8)}${String(a.duracao).padStart(9)}${String(a.espera).padStart(8)}${String(a.fim).padStart(6)}`);
  }
  console.log(`Espera média: ${mediaEspera.toFixed(1)} min. Último cliente sai no minuto ${atendidos[atendidos.length - 1].fim}.`);
}

function demo() {
  console.log('=== Pilha e fila: operações básicas ===');
  const pilha = new Pilha().empilhar('a').empilhar('b').empilhar('c');
  console.log(`Pilha após empilhar a, b, c: ${pilha}`);
  console.log(`Desempilhar devolve "${pilha.desempilhar()}"; topo agora é "${pilha.topo()}"; tamanho ${pilha.tamanho}`);
  const fila = new Fila().enfileirar('a').enfileirar('b').enfileirar('c');
  console.log(`Fila após enfileirar a, b, c: ${fila}`);
  console.log(`Desenfileirar devolve "${fila.desenfileirar()}"; frente agora é "${fila.frente()}"; tamanho ${fila.tamanho}`);

  console.log('\n=== Problema 1: parênteses balanceados ===');
  for (const texto of ['{[()]}', '(a + b) * [c - d]', '(]', '((a)', 'x)']) {
    const r = verificarBalanceamento(texto);
    console.log(`${texto.padEnd(20)} ${r.ok ? 'ok' : 'erro'}: ${r.motivo}`);
  }

  console.log('\n=== Problema 2: desfazer e refazer ===');
  const editor = new Editor();
  const passos = [
    ['digitar', 'Olá'], ['digitar', ', mundo'], ['digitar', '!'],
    ['desfazer'], ['desfazer'], ['refazer'], ['digitar', ' de novo'], ['refazer'],
  ];
  for (const [acao, trecho] of passos) {
    let feito = true;
    if (acao === 'digitar') editor.digitar(trecho);
    else if (acao === 'desfazer') feito = editor.desfazer();
    else feito = editor.refazer();
    const rotulo = acao === 'digitar' ? `digitar "${trecho}"` : acao;
    console.log(`${rotulo.padEnd(20)} -> "${editor.texto}"${feito ? '' : ' (nada a fazer)'}`);
  }

  console.log('\n=== Problema 3: fila de atendimento com um atendente ===');
  imprimirAtendimento(simularAtendimento([
    { nome: 'Ana', chegada: 0, duracao: 4 },
    { nome: 'Bruno', chegada: 1, duracao: 2 },
    { nome: 'Carla', chegada: 2, duracao: 7 },
    { nome: 'Davi', chegada: 10, duracao: 3 },
    { nome: 'Elisa', chegada: 11, duracao: 5 },
  ]));
}

function mostrarUso() {
  console.log('Uso: node 23_pilha_fila.js balancear "<texto com parênteses>"');
  console.log('     node 23_pilha_fila.js fila <duração de cada cliente, em minutos...>');
  console.log('     node 23_pilha_fila.js --demo');
}

function rodarComArgumentos([comando, ...resto]) {
  if (comando === 'balancear') {
    if (resto.length === 0) throw new Error('informe o texto a verificar');
    const texto = resto.join(' ');
    const r = verificarBalanceamento(texto);
    console.log(`${texto}\n${r.ok ? 'Balanceado' : 'Não balanceado'}: ${r.motivo}`);
    process.exitCode = r.ok ? 0 : 2; // código 2 avisa um script chamador que falhou
  } else if (comando === 'fila') {
    if (resto.length === 0) throw new Error('informe a duração de pelo menos um cliente');
    const clientes = resto.map((arg, i) => {
      const duracao = Number(arg);
      if (!Number.isInteger(duracao) || duracao <= 0) throw new Error(`"${arg}" não é uma duração inteira positiva`);
      return { nome: `Cliente ${i + 1}`, chegada: 0, duracao };
    });
    imprimirAtendimento(simularAtendimento(clientes));
  } else {
    throw new Error(`comando desconhecido "${comando}"`);
  }
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--demo')) return demo();
  try {
    if (args.length === 0) throw new Error('nenhum comando informado');
    rodarComArgumentos(args);
  } catch (erro) {
    console.error(`Erro: ${erro.message}`);
    mostrarUso();
    process.exitCode = 1;
  }
}

main();

/*
 * Para ir além:
 * 1. Ponha dois atendentes na simulação: cada cliente vai para o que ficar
 *    livre primeiro. Compare a espera média com a de um atendente só.
 * 2. Faça o balanceador ignorar parênteses dentro de strings, como "(" em
 *    console.log("(").
 * 3. Limite o histórico do editor a 5 estados: ao passar disso, o mais
 *    antigo é descartado (uma fila dentro do desfazer).
 */
