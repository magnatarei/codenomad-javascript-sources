/**
 * ============================================================
 * CodeNomad Academy  |  Sources JavaScript  |  42. Servidor HTTP mínimo
 * ------------------------------------------------------------
 * O que faz: Sobe um servidor web sem nenhuma biblioteca externa. Serve os
 *            arquivos de uma pasta (com índice de diretório), responde JSON
 *            em /api/hora e /api/eco (devolve o que você mandou) e registra
 *            cada pedido com hora, status e tempo de resposta.
 * Como usar: node sources/42_servidor_http_minimo.js --porta 8080 --pasta ./meu-site
 *            node sources/42_servidor_http_minimo.js            (porta 3000, pasta atual)
 *            node sources/42_servidor_http_minimo.js --demo
 * O que você aprende: http.createServer, request e response como streams,
 *            URL e searchParams, tipos MIME, fs.createReadStream com pipe,
 *            proteção contra "../" no caminho, encerramento limpo com SIGINT.
 * Requisitos: Node.js 18+, só biblioteca padrão
 * Licença MIT. Um projeto da CodeNomad Academy (codenomad.org)
 * ============================================================
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Tipo de conteúdo por extensão. Sem isto o navegador trataria tudo como texto puro.
const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.ico': 'image/x-icon', '.pdf': 'application/pdf',
};
const LIMITE_CORPO = 1024 * 1024; // 1 MB: evita que um cliente mande um corpo infinito

function registrar(mensagem) {
  const hora = new Date().toLocaleTimeString('pt-BR');
  console.log(`[${hora}] ${mensagem}`);
}

function responderJson(res, status, dados) {
  const corpo = JSON.stringify(dados, null, 2);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(corpo) });
  res.end(corpo);
}

/** Junta os pedaços do corpo do pedido; rejeita se passar do limite. */
function lerCorpo(req) {
  return new Promise((resolve, reject) => {
    const pedacos = [];
    let tamanho = 0;
    req.on('data', (pedaco) => {
      tamanho += pedaco.length;
      if (tamanho > LIMITE_CORPO) {
        reject(new Error('corpo do pedido maior que 1 MB'));
        req.destroy();
        return;
      }
      pedacos.push(pedaco);
    });
    req.on('end', () => resolve(Buffer.concat(pedacos).toString('utf8')));
    req.on('error', reject);
  });
}

function tentarJson(texto) {
  try {
    return JSON.parse(texto);
  } catch {
    return texto; // não era JSON: devolve o texto cru mesmo
  }
}

async function tratarApi(req, res, url) {
  if (url.pathname === '/api/hora') {
    const agora = new Date();
    return responderJson(res, 200, {
      iso: agora.toISOString(),
      local: agora.toLocaleString('pt-BR'),
      timestamp: agora.getTime(),
      fusoEmMinutos: -agora.getTimezoneOffset(),
    });
  }
  if (url.pathname === '/api/eco') {
    const corpo = await lerCorpo(req);
    return responderJson(res, 200, {
      metodo: req.method,
      caminho: url.pathname,
      consulta: Object.fromEntries(url.searchParams), // ?a=1&b=2 vira { a: '1', b: '2' }
      cabecalhos: req.headers,
      corpo: tentarJson(corpo),
    });
  }
  responderJson(res, 404, { erro: 'rota não encontrada', rotas: ['/api/hora', '/api/eco'] });
}

function listarDiretorio(res, pasta, caminhoUrl) {
  const itens = fs.readdirSync(pasta, { withFileTypes: true })
    .map((item) => `<li><a href="${path.posix.join(caminhoUrl, item.name)}">${item.name}${item.isDirectory() ? '/' : ''}</a></li>`);
  const html = `<!doctype html><meta charset="utf-8"><title>Índice de ${caminhoUrl}</title><h1>Índice de ${caminhoUrl}</h1><ul>${itens.join('')}</ul>`;
  res.writeHead(200, { 'content-type': TIPOS['.html'] });
  res.end(html);
}

async function servirArquivo(res, raiz, caminhoUrl) {
  // Ponto de atenção: sem esta checagem, "/../../senhas.txt" leria fora da pasta.
  const alvo = path.join(raiz, path.normalize(decodeURIComponent(caminhoUrl)));
  if (alvo !== raiz && !alvo.startsWith(raiz + path.sep)) {
    return responderJson(res, 403, { erro: 'caminho fora da pasta servida' });
  }
  let info;
  try {
    info = await fs.promises.stat(alvo);
  } catch {
    return responderJson(res, 404, { erro: 'arquivo não encontrado', caminho: caminhoUrl });
  }
  if (info.isDirectory()) {
    const indice = path.join(alvo, 'index.html');
    if (!fs.existsSync(indice)) return listarDiretorio(res, alvo, caminhoUrl);
    info = await fs.promises.stat(indice);
    return enviarArquivo(res, indice, info.size);
  }
  enviarArquivo(res, alvo, info.size);
}

function enviarArquivo(res, arquivo, tamanho) {
  const tipo = TIPOS[path.extname(arquivo).toLowerCase()] || 'application/octet-stream';
  res.writeHead(200, { 'content-type': tipo, 'content-length': tamanho });
  fs.createReadStream(arquivo).pipe(res); // stream: o arquivo nunca é carregado inteiro na memória
}

/** Monta o servidor, mas ainda não escuta: quem chama decide a porta. */
function criarServidor(raiz) {
  return http.createServer(async (req, res) => {
    const inicio = process.hrtime.bigint();
    const url = new URL(req.url, 'http://localhost'); // a base só serve para interpretar caminho e query
    res.on('finish', () => {
      const ms = Number(process.hrtime.bigint() - inicio) / 1e6;
      registrar(`${req.method} ${url.pathname} ${res.statusCode} ${ms.toFixed(1)} ms`);
    });
    try {
      if (url.pathname.startsWith('/api/')) await tratarApi(req, res, url);
      else if (req.method !== 'GET' && req.method !== 'HEAD') responderJson(res, 405, { erro: 'método não permitido para arquivos' });
      else await servirArquivo(res, raiz, url.pathname);
    } catch (erro) {
      if (!res.headersSent) responderJson(res, 500, { erro: 'falha interna', detalhe: erro.message });
    }
  });
}

/** Cliente pequeno usado só na demonstração: faz um pedido ao próprio servidor. */
function pedir(porta, { metodo = 'GET', caminho, corpo }) {
  return new Promise((resolve, reject) => {
    const cabecalhos = corpo ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(corpo) } : {};
    const req = http.request({ host: '127.0.0.1', port: porta, method: metodo, path: caminho, headers: cabecalhos }, (res) => {
      const pedacos = [];
      res.on('data', (p) => pedacos.push(p));
      res.on('end', () => resolve({ status: res.statusCode, tipo: res.headers['content-type'], corpo: Buffer.concat(pedacos).toString('utf8') }));
    });
    req.on('error', reject);
    req.end(corpo);
  });
}

async function demonstracao() {
  console.log('=== Demonstração: servidor HTTP mínimo ===');
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'codenomad-servidor-'));
  fs.writeFileSync(path.join(pasta, 'index.html'), '<!doctype html><meta charset="utf-8"><h1>Olá do servidor da CodeNomad Academy</h1>\n');
  fs.writeFileSync(path.join(pasta, 'ola.txt'), 'Arquivo de texto servido da pasta temporária.\n');
  const servidor = criarServidor(pasta);
  // Porta 0 pede ao sistema qualquer porta livre; address() diz qual foi.
  const porta = await new Promise((resolve) => servidor.listen(0, '127.0.0.1', () => resolve(servidor.address().port)));
  console.log(`Servidor no ar em http://127.0.0.1:${porta}, servindo ${pasta}\n`);
  const pedidos = [
    { caminho: '/api/hora' },
    { caminho: '/ola.txt' },
    { caminho: '/' },
    { metodo: 'POST', caminho: '/api/eco?aluno=Ana&turma=3', corpo: '{"nota": 9.5}' },
    { caminho: '/nao-existe.txt' },
  ];
  for (const pedido of pedidos) {
    const resposta = await pedir(porta, pedido);
    console.log(`${pedido.metodo || 'GET'} ${pedido.caminho} -> ${resposta.status} (${resposta.tipo})`);
    console.log(resposta.corpo.trim().split('\n').slice(0, 12).map((l) => `    ${l}`).join('\n'));
  }
  // Node 19+ mantém conexões keep-alive abertas; sem closeAllConnections o close() ficaria esperando.
  await new Promise((resolve) => {
    servidor.close(resolve);
    servidor.closeAllConnections();
  });
  fs.rmSync(pasta, { recursive: true, force: true });
  console.log('\nServidor encerrado e pasta temporária removida.');
}

function lerArgumentos(lista) {
  const opcoes = {};
  for (let i = 0; i < lista.length; i++) {
    if (!lista[i].startsWith('--')) continue;
    const temValor = lista[i + 1] !== undefined && !lista[i + 1].startsWith('--');
    opcoes[lista[i].slice(2)] = temValor ? lista[++i] : true;
  }
  return opcoes;
}

function principal() {
  const opcoes = lerArgumentos(process.argv.slice(2));
  if (opcoes.demo) return demonstracao();
  if (opcoes.ajuda) {
    console.log('Uso: node 42_servidor_http_minimo.js [--porta 3000] [--pasta .] [--publico] | --demo');
    return;
  }
  const porta = Number(opcoes.porta ?? 3000);
  const pasta = path.resolve(String(opcoes.pasta ?? '.'));
  if (!Number.isInteger(porta) || porta < 1 || porta > 65535) {
    console.error(`Erro: --porta precisa ser um inteiro entre 1 e 65535 (recebi "${opcoes.porta}")`);
    process.exitCode = 1;
    return;
  }
  if (!fs.existsSync(pasta) || !fs.statSync(pasta).isDirectory()) {
    console.error(`Erro: a pasta "${pasta}" não existe ou não é um diretório`);
    process.exitCode = 1;
    return;
  }
  const host = opcoes.publico ? '0.0.0.0' : '127.0.0.1'; // --publico expõe para outras máquinas da rede
  const servidor = criarServidor(pasta);
  servidor.on('error', (erro) => {
    const motivo = erro.code === 'EADDRINUSE' ? `a porta ${porta} já está em uso` : erro.message;
    console.error(`Erro ao subir o servidor: ${motivo}`);
    process.exitCode = 1;
  });
  servidor.listen(porta, host, () => {
    console.log(`Servindo ${pasta} em http://${host === '0.0.0.0' ? os.hostname() : host}:${porta}`);
    console.log('Rotas de API: /api/hora e /api/eco. Ctrl+C para parar.');
  });
  process.on('SIGINT', () => {
    console.log('\nEncerrando...');
    servidor.close(() => process.exit(0));
    servidor.closeAllConnections();
  });
}

principal();

/*
 * Para ir além:
 *   1. Acrescente /api/contador: cada GET soma 1 e devolve o total (guarde o valor numa variável do módulo).
 *   2. Suporte cache no navegador com os cabeçalhos ETag e If-None-Match, respondendo 304 quando nada mudou.
 *   3. Permita POST /api/arquivos para gravar um arquivo na pasta, validando o nome e recusando "..".
 */
