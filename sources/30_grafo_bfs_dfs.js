/**
 * ============================================================
 * CodeNomad Academy  |  Sources JavaScript  |  30. Grafos: BFS e DFS num labirinto
 * ------------------------------------------------------------
 * O que faz: Lê um labirinto em texto (# parede, . corredor, S início,
 *            F fim), transforma em grafo, acha o caminho mais curto com busca
 *            em largura (BFS), explora com busca em profundidade (DFS) e
 *            desenha o caminho encontrado sobre o labirinto.
 * Como usar: node sources/30_grafo_bfs_dfs.js labirinto.txt
 *            node sources/30_grafo_bfs_dfs.js --demo
 * O que você aprende: grafo como Map de adjacências, fila e pilha nas buscas,
 *            Map de "anterior" para reconstruir o caminho, recursão com Set
 *            de visitados, optional chaining (?.), template strings como chave.
 * Requisitos: Node.js 18+, só biblioteca padrão
 * Licença MIT. Um projeto da CodeNomad Academy (codenomad.org)
 * ============================================================
 */
'use strict';

const fs = require('fs');

const PAREDE = '#';
const CAMINHO = 'o'; // marca usada para desenhar o caminho encontrado

// Converte o texto em uma grade (array de arrays de letras) e localiza S e F.
function lerLabirinto(texto) {
  const linhas = texto.split(/\r?\n/).filter((linha) => linha.trim() !== '');
  if (linhas.length === 0) throw new Error('o labirinto está vazio');
  const largura = linhas[0].length;
  let inicio = null;
  let fim = null;
  const grade = linhas.map((linha, l) => {
    if (linha.length !== largura) throw new Error(`a linha ${l + 1} tem ${linha.length} colunas; a primeira tem ${largura}`);
    return [...linha].map((letra, c) => {
      if (letra === 'S') inicio = chave(l, c);
      else if (letra === 'F') fim = chave(l, c);
      else if (letra !== PAREDE && letra !== '.') throw new Error(`símbolo "${letra}" inesperado na linha ${l + 1}, coluna ${c + 1}`);
      return letra;
    });
  });
  if (!inicio || !fim) throw new Error('o labirinto precisa ter exatamente um S (início) e um F (fim)');
  return { grade, inicio, fim };
}

// Cada célula vira um vértice identificado pela chave "linha,coluna".
function chave(linha, coluna) {
  return `${linha},${coluna}`;
}

function coordenadas(chaveDaCelula) {
  return chaveDaCelula.split(',').map(Number);
}

// O grafo é um Map: chave da célula -> lista das células vizinhas livres.
// Só as quatro direções contam (sem diagonal), na ordem cima, baixo,
// esquerda, direita. A ordem muda o caminho que a DFS encontra.
function construirGrafo(grade) {
  const grafo = new Map();
  const direcoes = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  grade.forEach((linha, l) => {
    linha.forEach((letra, c) => {
      if (letra === PAREDE) return;
      const vizinhos = [];
      for (const [dl, dc] of direcoes) {
        const vizinho = grade[l + dl]?.[c + dc]; // ?. devolve undefined fora da grade
        if (vizinho !== undefined && vizinho !== PAREDE) vizinhos.push(chave(l + dl, c + dc));
      }
      grafo.set(chave(l, c), vizinhos);
    });
  });
  return grafo;
}

// Segue os ponteiros "anterior" do destino até a origem e inverte.
function reconstruirCaminho(anterior, destino) {
  if (!anterior.has(destino)) return null;
  const caminho = [];
  for (let atual = destino; atual !== null; atual = anterior.get(atual)) caminho.push(atual);
  return caminho.reverse();
}

// BFS: visita por camadas, usando uma fila. A primeira vez que chega ao
// destino é pelo menor número de passos, porque todas as células a
// distância d são visitadas antes de qualquer uma a distância d + 1.
function buscaEmLargura(grafo, origem, destino) {
  const anterior = new Map([[origem, null]]); // quem descobriu cada célula; também marca as visitadas
  const fila = [origem];
  let frente = 0; // índice de frente: tirar da fila sem o custo de shift()
  while (frente < fila.length) {
    const atual = fila[frente];
    frente += 1;
    if (atual === destino) break;
    for (const vizinho of grafo.get(atual)) {
      if (!anterior.has(vizinho)) {
        anterior.set(vizinho, atual);
        fila.push(vizinho);
      }
    }
  }
  return { caminho: reconstruirCaminho(anterior, destino), visitadas: anterior.size };
}

// DFS: mergulha pelo primeiro vizinho livre até bater em um beco e só então
// volta (a recursão faz as vezes da pilha). Acha um caminho, não o mais
// curto. A profundidade da recursão é o tamanho do caminho explorado.
function buscaEmProfundidade(grafo, origem, destino) {
  const visitadas = new Set();
  function explorar(atual) {
    visitadas.add(atual);
    if (atual === destino) return [atual];
    for (const vizinho of grafo.get(atual)) {
      if (visitadas.has(vizinho)) continue;
      const resto = explorar(vizinho);
      if (resto !== null) return [atual, ...resto];
    }
    return null; // beco sem saída: volta para o chamador tentar outro vizinho
  }
  return { caminho: explorar(origem), visitadas: visitadas.size };
}

function desenhar(grade, caminho) {
  const copia = grade.map((linha) => [...linha]);
  for (const celula of caminho ?? []) {
    const [l, c] = coordenadas(celula);
    if (copia[l][c] === '.') copia[l][c] = CAMINHO; // preserva o S e o F
  }
  return copia.map((linha) => linha.join('')).join('\n');
}

function resolver(texto) {
  const { grade, inicio, fim } = lerLabirinto(texto);
  const grafo = construirGrafo(grade);
  console.log(`Labirinto de ${grade.length} linhas por ${grade[0].length} colunas: ${grafo.size} células livres (vértices).`);
  const resultados = [['BFS (largura)', buscaEmLargura(grafo, inicio, fim)], ['DFS (profundidade)', buscaEmProfundidade(grafo, inicio, fim)]];
  for (const [nome, r] of resultados) {
    if (r.caminho === null) {
      console.log(`\n${nome}: sem saída. F não é alcançável a partir de S; explorou ${r.visitadas} células.`);
      continue;
    }
    console.log(`\n${nome}: caminho com ${r.caminho.length - 1} passos, explorando ${r.visitadas} células.`);
    console.log(desenhar(grade, r.caminho));
  }
  return resultados;
}

const LABIRINTO_DEMO = `
##############
#S...........#
#.####.#.###.#
#.#....#.#...#
#.#.####.#.#.#
#.#......#.#.#
#.########.#.#
#..........#F#
##############`;

const LABIRINTO_SEM_SAIDA = `
########
#S..#..#
#.#.#.F#
#...####
########`;

function demo() {
  console.log('=== Labirinto 1: há um caminho curto por cima e um longo por baixo ===');
  const [[, bfs], [, dfs]] = resolver(LABIRINTO_DEMO);
  console.log(`\nA BFS garante o menor caminho (${bfs.caminho.length - 1} passos).`);
  console.log(`A DFS seguiu a primeira direção livre (cima, baixo, esquerda, direita) e achou um caminho de ${dfs.caminho.length - 1} passos.`);
  console.log('\n=== Labirinto 2: o F está cercado ===');
  resolver(LABIRINTO_SEM_SAIDA);
}

function mostrarUso() {
  console.log('Uso: node 30_grafo_bfs_dfs.js <arquivo.txt>   (# parede, . corredor, S início, F fim)');
  console.log('     node 30_grafo_bfs_dfs.js --demo');
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--demo')) return demo();
  try {
    if (args.length === 0) throw new Error('informe o arquivo do labirinto');
    let texto;
    try {
      texto = fs.readFileSync(args[0], 'utf8');
    } catch (erro) {
      if (erro.code === 'ENOENT') throw new Error(`não encontrei o arquivo "${args[0]}"`);
      throw erro;
    }
    resolver(texto);
  } catch (erro) {
    console.error(`Erro: ${erro.message}`);
    mostrarUso();
    process.exitCode = 1;
  }
}

main();

/*
 * Para ir além:
 * 1. Reescreva a DFS sem recursão, com um array usado como pilha, e compare
 *    o caminho encontrado com o da versão recursiva.
 * 2. Dê pesos às células (areia custa 3, corredor custa 1) e implemente o
 *    algoritmo de Dijkstra com a fila de prioridade da source 25.
 * 3. Gere labirintos aleatórios com DFS (cave corredores a partir de uma
 *    grade só de paredes) e resolva com a BFS.
 */
