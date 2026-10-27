/**
 * ============================================================
 * CodeNomad Academy  |  Sources JavaScript  |  25. Fila de prioridade com heap
 * ------------------------------------------------------------
 * O que faz: Heap binário mínimo implementado do zero (inserir, extrair,
 *            espiar) com comparador configurável, e uma simulação de
 *            pronto-socorro em que pacientes são atendidos por gravidade,
 *            não por ordem de chegada. Com só números, ordena (heapsort).
 * Como usar: node sources/25_fila_prioridade.js Ana:3 Bruno:1 Carla:5 Davi:2
 *            node sources/25_fila_prioridade.js 9 4 7 1 8
 *            node sources/25_fila_prioridade.js --demo
 * O que você aprende: árvore guardada em array (pai em (i-1)/2, filhos em
 *            2i+1 e 2i+2), métodos privados, funções comparadoras e desempate
 *            com ||, heapsort, split para quebrar "nome:gravidade".
 * Requisitos: Node.js 18+, só biblioteca padrão
 * Licença MIT. Um projeto da CodeNomad Academy (codenomad.org)
 * ============================================================
 */
'use strict';

// Heap mínimo: uma árvore binária guardada em um array em que todo pai é
// "menor" que os filhos, segundo o comparador. O menor de todos fica sempre
// no índice 0: espiar é O(1), inserir e extrair são O(log n).
class HeapMinimo {
  #itens = [];
  #comparar;

  // O comparador devolve negativo quando "a" deve sair antes de "b".
  constructor(comparar = (a, b) => a - b) {
    this.#comparar = comparar;
  }

  get tamanho() {
    return this.#itens.length;
  }
  estaVazio() {
    return this.#itens.length === 0;
  }
  espiar() {
    return this.#itens[0];
  }

  inserir(item) {
    this.#itens.push(item); // entra na última folha...
    this.#subir(this.#itens.length - 1); // ...e sobe enquanto for menor que o pai
    return this;
  }

  extrair() {
    if (this.estaVazio()) throw new Error('o heap está vazio');
    const topo = this.#itens[0];
    const ultimo = this.#itens.pop();
    if (!this.estaVazio()) {
      this.#itens[0] = ultimo; // a última folha assume o topo...
      this.#descer(0); // ...e desce até os dois filhos serem maiores
    }
    return topo;
  }

  #subir(indice) {
    let i = indice;
    while (i > 0) {
      const pai = Math.floor((i - 1) / 2);
      if (this.#comparar(this.#itens[i], this.#itens[pai]) >= 0) break;
      this.#trocar(i, pai);
      i = pai;
    }
  }

  #descer(indice) {
    const n = this.#itens.length;
    let i = indice;
    while (true) {
      const esquerdo = 2 * i + 1;
      const direito = 2 * i + 2;
      let menor = i;
      if (esquerdo < n && this.#comparar(this.#itens[esquerdo], this.#itens[menor]) < 0) menor = esquerdo;
      if (direito < n && this.#comparar(this.#itens[direito], this.#itens[menor]) < 0) menor = direito;
      if (menor === i) break; // já é menor que os dois filhos
      this.#trocar(i, menor);
      i = menor;
    }
  }

  #trocar(i, j) {
    [this.#itens[i], this.#itens[j]] = [this.#itens[j], this.#itens[i]];
  }

  // Devolve os níveis da árvore como texto: [raiz], [2 filhos], [4 netos]...
  niveis(rotulo = (item) => String(item)) {
    const linhas = [];
    for (let inicio = 0, largura = 1; inicio < this.#itens.length; inicio += largura, largura *= 2) {
      linhas.push(this.#itens.slice(inicio, inicio + largura).map(rotulo).join('   '));
    }
    return linhas;
  }
}

const GRAVIDADES = { 1: 'emergência', 2: 'muito urgente', 3: 'urgente', 4: 'pouco urgente', 5: 'não urgente' };

// Gravidade menor atende primeiro. No empate, decide a ordem de chegada:
// o || só avalia o segundo critério quando o primeiro dá zero.
function compararPacientes(a, b) {
  return a.gravidade - b.gravidade || a.chegada - b.chegada;
}

// Um médico só. Cada paciente espera a soma das consultas dos que passaram
// na frente dele, mesmo tendo chegado antes.
function simularProntoSocorro(pacientes) {
  const fila = new HeapMinimo(compararPacientes);
  pacientes.forEach((p, i) => fila.inserir({ ...p, chegada: i + 1 }));
  const niveis = fila.niveis((p) => `${p.nome}(${p.gravidade})`);
  const atendimentos = [];
  let relogio = 0;
  while (!fila.estaVazio()) {
    const paciente = fila.extrair();
    atendimentos.push({ ...paciente, espera: relogio });
    relogio += paciente.duracao;
  }
  return { niveis, atendimentos };
}

function imprimirAtendimentos(atendimentos) {
  console.log(`${'Ordem'.padEnd(7)}${'Paciente'.padEnd(10)}${'Gravidade'.padEnd(20)}${'Chegou em'.padStart(10)}${'Espera (min)'.padStart(14)}`);
  atendimentos.forEach((a, i) => {
    const gravidade = `${a.gravidade} (${GRAVIDADES[a.gravidade]})`;
    console.log(`${String(i + 1).padEnd(7)}${a.nome.padEnd(10)}${gravidade.padEnd(20)}${String(a.chegada).padStart(10)}${String(a.espera).padStart(14)}`);
  });
}

// Heapsort: joga tudo no heap e extrai um por um. Cada operação é O(log n),
// então ordenar n itens custa O(n log n).
function ordenarComHeap(numeros) {
  const heap = new HeapMinimo();
  numeros.forEach((n) => heap.inserir(n));
  const ordenados = [];
  while (!heap.estaVazio()) ordenados.push(heap.extrair());
  return ordenados;
}

function demo() {
  const pacientes = [
    { nome: 'Ana', gravidade: 4, duracao: 10 },
    { nome: 'Bruno', gravidade: 2, duracao: 15 },
    { nome: 'Carla', gravidade: 5, duracao: 5 },
    { nome: 'Davi', gravidade: 1, duracao: 30 },
    { nome: 'Elisa', gravidade: 3, duracao: 10 },
    { nome: 'Fábio', gravidade: 2, duracao: 20 },
    { nome: 'Gabi', gravidade: 4, duracao: 10 },
    { nome: 'Hugo', gravidade: 3, duracao: 15 },
  ];
  console.log('=== Pronto-socorro: ordem de chegada ===');
  console.log(pacientes.map((p, i) => `${i + 1}. ${p.nome} (gravidade ${p.gravidade})`).join('  '));

  const { niveis, atendimentos } = simularProntoSocorro(pacientes);
  console.log('\n=== O heap depois das 8 inserções (um nível por linha) ===');
  niveis.forEach((linha, i) => console.log(`nível ${i}: ${linha}`));
  console.log('Repare: o topo é sempre o mais grave; os níveis de baixo não estão ordenados entre si.');

  console.log('\n=== Ordem de atendimento ===');
  imprimirAtendimentos(atendimentos);
  console.log('Bruno e Fábio têm a mesma gravidade: Bruno chegou antes e saiu antes (desempate por chegada).');

  const numeros = [9, 4, 7, 1, 8, 2, 6, 3];
  console.log(`\n=== Heapsort de [${numeros.join(', ')}] ===`);
  console.log(`Resultado: [${ordenarComHeap(numeros).join(', ')}]`);
  const heap = new HeapMinimo().inserir(5).inserir(3).inserir(8);
  console.log(`Espiar sem remover: ${heap.espiar()} (tamanho continua ${heap.tamanho})`);
}

function mostrarUso() {
  console.log('Uso: node 25_fila_prioridade.js Nome:gravidade[:minutos] ...   (gravidade de 1 a 5)');
  console.log('     node 25_fila_prioridade.js <números...>                     (ordena com o heap)');
  console.log('     node 25_fila_prioridade.js --demo');
}

function lerPaciente(arg) {
  const [nome, gravidadeTexto, duracaoTexto = '10'] = arg.split(':');
  const gravidade = Number(gravidadeTexto);
  const duracao = Number(duracaoTexto);
  if (!nome || gravidadeTexto === undefined) throw new Error(`"${arg}" não está no formato Nome:gravidade`);
  if (!Number.isInteger(gravidade) || gravidade < 1 || gravidade > 5) {
    throw new Error(`gravidade "${gravidadeTexto}" de ${nome} precisa ser um inteiro de 1 (emergência) a 5 (não urgente)`);
  }
  if (!Number.isInteger(duracao) || duracao <= 0) throw new Error(`minutos "${duracaoTexto}" de ${nome} precisa ser inteiro positivo`);
  return { nome, gravidade, duracao };
}

function rodarComArgumentos(args) {
  const todosNumeros = args.every((arg) => arg.trim() !== '' && !Number.isNaN(Number(arg)));
  if (todosNumeros) {
    console.log(`Entrada:  [${args.join(', ')}]`);
    console.log(`Ordenado: [${ordenarComHeap(args.map(Number)).join(', ')}]`);
    return;
  }
  const pacientes = args.map(lerPaciente);
  const { niveis, atendimentos } = simularProntoSocorro(pacientes);
  console.log('Heap por níveis:');
  niveis.forEach((linha, i) => console.log(`  nível ${i}: ${linha}`));
  console.log('');
  imprimirAtendimentos(atendimentos);
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--demo')) return demo();
  try {
    if (args.length === 0) throw new Error('nenhum paciente ou número informado');
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
 * 1. Crie um HeapMaximo sem copiar código: basta passar um comparador
 *    invertido para o HeapMinimo. Use-o para achar os 3 maiores de uma lista.
 * 2. Adicione o método atualizar(item, novaGravidade): o paciente piorou e
 *    precisa subir na fila (dica: ache o índice e chame subir ou descer).
 * 3. Compare o tempo do heapsort com o do sort() nativo para 100.000
 *    números gerados com Math.random().
 */
