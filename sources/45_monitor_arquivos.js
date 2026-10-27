/**
 * ============================================================
 * CodeNomad Academy  |  Sources JavaScript  |  45. Monitor de alterações numa pasta
 * ------------------------------------------------------------
 * O que faz: Observa uma pasta tirando "fotos" dela em intervalos regulares e
 *            compara uma foto com a anterior para descobrir arquivos criados,
 *            alterados e removidos, registrando cada evento com a hora.
 *            Funciona igual em qualquer sistema porque não depende de fs.watch.
 * Como usar: node sources/45_monitor_arquivos.js ./meu-projeto --intervalo 1000 --recursivo
 *            node sources/45_monitor_arquivos.js . --ignorar node_modules,.git,dist
 *            node sources/45_monitor_arquivos.js --demo
 * O que você aprende: fs.readdirSync com withFileTypes, fs.statSync (tamanho e
 *            mtime), Map para comparar estados, laço de setTimeout que não se
 *            sobrepõe, pasta temporária com mkdtemp, limpeza com rmSync e SIGINT.
 * Requisitos: Node.js 18+, só biblioteca padrão
 * Licença MIT. Um projeto da CodeNomad Academy (codenomad.org)
 * ============================================================
 */
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const IGNORAR_PADRAO = ['node_modules', '.git'];
const INTERVALO_MINIMO = 50; // em ms; abaixo disso o monitor só gastaria CPU

function formatarBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Percorre a pasta e devolve um Map: caminho -> { tamanho, modificado }.
 * Usa uma pilha em vez de recursão para você ver como a travessia funciona.
 */
function tirarFoto(pasta, { recursivo, ignorar }) {
  const foto = new Map();
  const pilha = [pasta];
  while (pilha.length > 0) {
    const atual = pilha.pop();
    let itens;
    try {
      itens = fs.readdirSync(atual, { withFileTypes: true });
    } catch {
      continue; // a pasta pode ter sido removida entre uma foto e outra
    }
    for (const item of itens) {
      if (ignorar.includes(item.name)) continue;
      const caminho = path.join(atual, item.name);
      if (item.isDirectory()) {
        if (recursivo) pilha.push(caminho);
        continue;
      }
      if (!item.isFile()) continue; // ignora links simbólicos e afins
      try {
        const info = fs.statSync(caminho);
        foto.set(caminho, { tamanho: info.size, modificado: info.mtimeMs });
      } catch {
        // arquivo sumiu no meio do caminho: a próxima foto resolve
      }
    }
  }
  return foto;
}

/** Compara duas fotos e devolve a lista de eventos, na ordem criado, alterado, removido. */
function compararFotos(antes, depois) {
  const eventos = [];
  for (const [caminho, info] of depois) {
    const anterior = antes.get(caminho);
    if (!anterior) eventos.push({ tipo: 'criado', caminho, info });
    else if (anterior.tamanho !== info.tamanho || anterior.modificado !== info.modificado) {
      eventos.push({ tipo: 'alterado', caminho, info });
    }
  }
  for (const caminho of antes.keys()) {
    if (!depois.has(caminho)) eventos.push({ tipo: 'removido', caminho });
  }
  return eventos;
}

function formatarEvento(evento, raiz) {
  const hora = new Date().toLocaleTimeString('pt-BR');
  const relativo = path.relative(raiz, evento.caminho) || evento.caminho;
  const detalhe = evento.info ? ` (${formatarBytes(evento.info.tamanho)})` : '';
  return `[${hora}] ${evento.tipo.padEnd(8)} ${relativo}${detalhe}`;
}

/**
 * Começa a observar e devolve uma função que para o monitor.
 * Ponto de atenção: usamos setTimeout reagendado no fim de cada varredura, e
 * não setInterval, para uma varredura lenta nunca se sobrepor à seguinte.
 */
function monitorar(pasta, opcoes, aoEvento) {
  let anterior = tirarFoto(pasta, opcoes);
  let ativo = true;
  let temporizador = null;
  const varrer = () => {
    if (!ativo) return;
    const atual = tirarFoto(pasta, opcoes);
    for (const evento of compararFotos(anterior, atual)) aoEvento(evento);
    anterior = atual;
    temporizador = setTimeout(varrer, opcoes.intervaloMs);
  };
  temporizador = setTimeout(varrer, opcoes.intervaloMs);
  return () => {
    ativo = false;
    clearTimeout(temporizador);
  };
}

function dormir(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function demonstracao() {
  console.log('=== Demonstração: monitor de pasta ===');
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'codenomad-monitor-'));
  console.log(`Pasta temporária: ${pasta}`);
  console.log('Observando a cada 150 ms. Vou criar, alterar e remover arquivos.\n');
  const opcoes = { recursivo: true, ignorar: IGNORAR_PADRAO, intervaloMs: 150 };
  let total = 0;
  const parar = monitorar(pasta, opcoes, (evento) => {
    total += 1;
    console.log(`  ${formatarEvento(evento, pasta)}`);
  });
  const notas = path.join(pasta, 'notas.txt');
  console.log('> criando notas.txt');
  fs.writeFileSync(notas, 'primeira linha\n');
  await dormir(400);
  console.log('> acrescentando uma linha em notas.txt');
  fs.appendFileSync(notas, 'segunda linha\n');
  await dormir(400);
  console.log('> criando relatorios/outubro.md (subpasta)');
  fs.mkdirSync(path.join(pasta, 'relatorios'));
  fs.writeFileSync(path.join(pasta, 'relatorios', 'outubro.md'), '# Relatório de outubro\n');
  await dormir(400);
  console.log('> removendo notas.txt');
  fs.unlinkSync(notas);
  await dormir(400);
  parar();
  fs.rmSync(pasta, { recursive: true, force: true });
  console.log(`\nMonitor parado: ${total} eventos detectados. Pasta temporária removida.`);
}

function lerArgumentos(lista) {
  const opcoes = {};
  const posicionais = [];
  for (let i = 0; i < lista.length; i++) {
    if (!lista[i].startsWith('--')) {
      posicionais.push(lista[i]);
    } else {
      const temValor = lista[i + 1] !== undefined && !lista[i + 1].startsWith('--');
      opcoes[lista[i].slice(2)] = temValor ? lista[++i] : true;
    }
  }
  return { opcoes, posicionais };
}

function uso() {
  console.log('Uso: node 45_monitor_arquivos.js <pasta> [--intervalo 1000] [--recursivo] [--ignorar a,b,c]');
  console.log('     node 45_monitor_arquivos.js --demo');
}

function principal() {
  const { opcoes, posicionais } = lerArgumentos(process.argv.slice(2));
  if (opcoes.demo) return demonstracao();
  if (opcoes.ajuda || posicionais.length !== 1) {
    uso();
    process.exitCode = opcoes.ajuda ? 0 : 1;
    return;
  }
  const pasta = path.resolve(posicionais[0]);
  if (!fs.existsSync(pasta) || !fs.statSync(pasta).isDirectory()) {
    console.error(`Erro: "${pasta}" não existe ou não é uma pasta`);
    process.exitCode = 1;
    return;
  }
  const intervaloMs = Number(opcoes.intervalo ?? 1000);
  if (!Number.isInteger(intervaloMs) || intervaloMs < INTERVALO_MINIMO) {
    console.error(`Erro: --intervalo precisa ser um inteiro em ms, no mínimo ${INTERVALO_MINIMO} (recebi "${opcoes.intervalo}")`);
    process.exitCode = 1;
    return;
  }
  const ignorar = typeof opcoes.ignorar === 'string' ? opcoes.ignorar.split(',').filter(Boolean) : IGNORAR_PADRAO;
  const config = { recursivo: Boolean(opcoes.recursivo), ignorar, intervaloMs };
  let total = 0;
  const parar = monitorar(pasta, config, (evento) => {
    total += 1;
    console.log(formatarEvento(evento, pasta));
  });
  console.log(`Observando ${pasta}${config.recursivo ? ' (com subpastas)' : ''} a cada ${intervaloMs} ms. Ignorando: ${ignorar.join(', ') || 'nada'}. Ctrl+C para parar.`);
  process.on('SIGINT', () => {
    parar();
    console.log(`\nMonitor encerrado: ${total} eventos registrados.`);
    process.exit(0);
  });
}

principal();

/*
 * Para ir além:
 *   1. Aceite --filtro "*.js" e mostre só os arquivos cujo nome bate com o padrão.
 *   2. Grave os eventos num arquivo de log (fs.appendFileSync) além de imprimir na tela.
 *   3. Execute um comando (child_process.spawn) sempre que algo mudar, como um "npm test" automático.
 */
