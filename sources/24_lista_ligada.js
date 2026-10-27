/**
 * ============================================================
 * CodeNomad Academy  |  Sources JavaScript  |  24. Lista ligada do zero
 * ------------------------------------------------------------
 * O que faz: Implementa uma lista simplesmente ligada com inserir no início,
 *            no fim e em uma posição, remover, buscar, inverter, tamanho e
 *            impressão, e compara com o array da linguagem em duas operações.
 * Como usar: node sources/24_lista_ligada.js 10 20 30 --inserir-em 1:15 --remover 30 --inverter
 *            node sources/24_lista_ligada.js --demo
 * O que você aprende: objetos ligados por referência, percorrer com while,
 *            iteradores com function* e Symbol.iterator, spread, RangeError.
 * Requisitos: Node.js 18+, só biblioteca padrão
 * Licença MIT. Um projeto da CodeNomad Academy (codenomad.org)
 * ============================================================
 */
'use strict';

// Cada nó guarda um valor e a referência para o próximo; o último aponta para null.
class No {
  constructor(valor, proximo = null) {
    this.valor = valor;
    this.proximo = proximo;
  }
}

class ListaLigada {
  #cabeca = null; // primeiro nó; null quando a lista está vazia
  #tamanho = 0;

  get tamanho() {
    return this.#tamanho;
  }
  // O(1): basta criar o nó apontando para a antiga cabeça.
  inserirInicio(valor) {
    this.#cabeca = new No(valor, this.#cabeca);
    this.#tamanho += 1;
    return this; // devolver "this" permite encadear chamadas
  }

  // O(n): sem referência para o último nó, é preciso caminhar até ele.
  inserirFim(valor) {
    const novo = new No(valor);
    if (this.#cabeca === null) {
      this.#cabeca = novo;
    } else {
      let atual = this.#cabeca;
      while (atual.proximo !== null) atual = atual.proximo;
      atual.proximo = novo;
    }
    this.#tamanho += 1;
    return this;
  }

  inserirEm(posicao, valor) {
    this.#validarPosicao(posicao, this.#tamanho); // posição == tamanho insere no fim
    if (posicao === 0) return this.inserirInicio(valor);
    const anterior = this.#noEm(posicao - 1);
    anterior.proximo = new No(valor, anterior.proximo); // o novo nó entra na corrente
    this.#tamanho += 1;
    return this;
  }

  removerEm(posicao) {
    this.#validarPosicao(posicao, this.#tamanho - 1);
    let removido;
    if (posicao === 0) {
      removido = this.#cabeca;
      this.#cabeca = removido.proximo;
    } else {
      const anterior = this.#noEm(posicao - 1);
      removido = anterior.proximo;
      anterior.proximo = removido.proximo; // a corrente "pula" o nó removido
    }
    this.#tamanho -= 1;
    return removido.valor;
  }

  // Remove a primeira ocorrência do valor. Devolve true se encontrou.
  remover(valor) {
    const posicao = this.buscar(valor);
    if (posicao === -1) return false;
    this.removerEm(posicao);
    return true;
  }
  buscar(valor) {
    let posicao = 0;
    for (const v of this) { // for...of funciona graças ao iterador definido abaixo
      if (v === valor) return posicao;
      posicao += 1;
    }
    return -1;
  }
  valorEm(posicao) {
    this.#validarPosicao(posicao, this.#tamanho - 1);
    return this.#noEm(posicao).valor;
  }

  // Inverte no lugar: vai virando cada ponteiro "próximo" para trás.
  inverter() {
    let anterior = null;
    let atual = this.#cabeca;
    while (atual !== null) {
      const proximo = atual.proximo; // guarda antes de perder a referência
      atual.proximo = anterior;
      anterior = atual;
      atual = proximo;
    }
    this.#cabeca = anterior;
    return this;
  }

  // Generator: torna a lista iterável, e for...of, spread e Array.from passam a funcionar.
  *[Symbol.iterator]() {
    let atual = this.#cabeca;
    while (atual !== null) {
      yield atual.valor;
      atual = atual.proximo;
    }
  }

  toString() {
    return this.#tamanho === 0 ? '(vazia)' : `${[...this].join(' -> ')} -> null`;
  }
  #noEm(posicao) {
    let atual = this.#cabeca;
    for (let i = 0; i < posicao; i += 1) atual = atual.proximo;
    return atual;
  }
  #validarPosicao(posicao, maximo) {
    if (maximo < 0) throw new Error('a lista está vazia');
    if (!Number.isInteger(posicao) || posicao < 0 || posicao > maximo) {
      throw new RangeError(`posição ${posicao} fora do intervalo 0..${maximo}`);
    }
  }
}

function cronometrar(acao) {
  const inicio = performance.now();
  acao();
  return (performance.now() - inicio).toFixed(2);
}

// Onde a lista ganha do array e onde perde: inserir no início é O(1) na
// lista e O(n) no array; ler uma posição é O(1) no array e O(n) na lista.
function compararComArray(quantidade) {
  const lista = new ListaLigada();
  const array = [];
  console.log(`Inserir ${quantidade} itens no início:`);
  const msLista = cronometrar(() => { for (let i = 0; i < quantidade; i += 1) lista.inserirInicio(i); });
  const msArray = cronometrar(() => { for (let i = 0; i < quantidade; i += 1) array.unshift(i); });
  console.log(`  lista.inserirInicio: ${msLista.padStart(8)} ms`);
  console.log(`  array.unshift:       ${msArray.padStart(8)} ms (cada unshift desloca todos os itens)`);
  const meio = Math.floor(quantidade / 2);
  let soma = 0;
  console.log(`Ler o item do meio (posição ${meio}) 500 vezes:`);
  const msLerLista = cronometrar(() => { for (let i = 0; i < 500; i += 1) soma += lista.valorEm(meio); });
  const msLerArray = cronometrar(() => { for (let i = 0; i < 500; i += 1) soma += array[meio]; });
  console.log(`  lista.valorEm:       ${msLerLista.padStart(8)} ms (caminha nó a nó até a posição)`);
  console.log(`  array[meio]:         ${msLerArray.padStart(8)} ms`);
  return soma;
}

function mostrar(rotulo, lista) {
  console.log(`${rotulo.padEnd(28)} ${lista}`);
}

function demo() {
  console.log('=== Operações passo a passo ===');
  const lista = new ListaLigada();
  mostrar('nova lista', lista);
  mostrar('inserirFim(10)', lista.inserirFim(10));
  mostrar('inserirFim(20).inserirFim(30)', lista.inserirFim(20).inserirFim(30));
  mostrar('inserirInicio(5)', lista.inserirInicio(5));
  mostrar('inserirEm(2, 15)', lista.inserirEm(2, 15));
  console.log(`${'buscar(20)'.padEnd(28)} índice ${lista.buscar(20)}`);
  console.log(`${'buscar(99)'.padEnd(28)} índice ${lista.buscar(99)} (não existe)`);
  console.log(`${'removerEm(0)'.padEnd(28)} removeu ${lista.removerEm(0)}, ficou ${lista}`);
  console.log(`${'remover(30)'.padEnd(28)} ${lista.remover(30) ? 'removido' : 'não estava na lista'}`);
  console.log(`${'remover(99)'.padEnd(28)} ${lista.remover(99) ? 'removido' : 'não estava na lista'}`);
  mostrar('inverter()', lista.inverter());
  console.log(`${'tamanho e valorEm(1)'.padEnd(28)} ${lista.tamanho} e ${lista.valorEm(1)}`);
  console.log(`${'[...lista]'.padEnd(28)} [${[...lista].join(', ')}]`);
  try {
    lista.inserirEm(10, 1);
  } catch (erro) {
    console.log(`${'inserirEm(10, 1)'.padEnd(28)} erro tratado: ${erro.message}`);
  }

  console.log('\n=== Lista ligada contra array (30.000 itens) ===');
  compararComArray(30000);
  console.log('Cada estrutura tem o seu ponto forte; escolha pela operação mais frequente.');
}

function lerNumero(texto) {
  const n = Number(texto);
  if (texto === undefined || texto.trim() === '' || Number.isNaN(n)) throw new Error(`"${texto}" não é um número`);
  return n;
}

function mostrarUso() {
  console.log('Uso: node 24_lista_ligada.js <números...> [--inserir-em POS:VALOR] [--remover VALOR] [--buscar VALOR] [--inverter]');
  console.log('     node 24_lista_ligada.js --demo');
}

// Os números vêm primeiro e montam a lista; depois as opções são aplicadas
// na ordem em que aparecem, e a lista é impressa após cada uma.
function rodarComArgumentos(args) {
  const lista = new ListaLigada();
  let i = 0;
  while (i < args.length && !args[i].startsWith('--')) {
    lista.inserirFim(lerNumero(args[i]));
    i += 1;
  }
  mostrar('lista inicial', lista);
  for (; i < args.length; i += 1) {
    const opcao = args[i];
    const valor = args[i + 1];
    if (opcao === '--inverter') {
      mostrar('inverter()', lista.inverter());
      continue;
    }
    if (valor === undefined || valor.startsWith('--')) throw new Error(`${opcao} precisa de um valor logo depois`);
    i += 1; // o valor foi consumido junto com a opção
    if (opcao === '--buscar') {
      console.log(`${`buscar(${valor})`.padEnd(28)} índice ${lista.buscar(lerNumero(valor))}`);
    } else if (opcao === '--remover') {
      const removido = lista.remover(lerNumero(valor));
      mostrar(`remover(${valor})${removido ? '' : ' sem efeito'}`, lista);
    } else if (opcao === '--inserir-em') {
      const [posicao, novo] = valor.split(':');
      if (novo === undefined) throw new Error(`--inserir-em espera POS:VALOR, recebeu "${valor}"`);
      mostrar(`inserirEm(${posicao}, ${novo})`, lista.inserirEm(lerNumero(posicao), lerNumero(novo)));
    } else {
      throw new Error(`opção desconhecida "${opcao}"`);
    }
  }
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--demo')) return demo();
  try {
    if (args.length === 0) throw new Error('nenhum número informado');
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
 * 1. Guarde uma referência para o último nó (cauda) e faça inserirFim virar O(1).
 * 2. Transforme em lista duplamente ligada (nó com "anterior") e itere de trás para a frente.
 * 3. Detecte ciclo com dois ponteiros, um andando 1 nó e outro 2 (lebre e tartaruga).
 */
