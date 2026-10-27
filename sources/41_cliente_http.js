/**
 * ============================================================
 * CodeNomad Academy  |  Sources JavaScript  |  41. Cliente HTTP sem dependências
 * ------------------------------------------------------------
 * O que faz: Faz um pedido GET numa URL e mostra status, cabeçalhos e corpo da
 *            resposta. Quando o corpo é JSON, interpreta e extrai os campos que
 *            você pedir (caminhos como "loja.nome" ou "produtos.0.preco").
 *            Trata tempo esgotado, redirecionamento e erro de rede com
 *            mensagens claras, sem instalar nada.
 * Como usar: node sources/41_cliente_http.js https://loja.exemplo.test/api/produtos --campos loja.nome,produtos.0.preco
 *            node sources/41_cliente_http.js http://localhost:3000/api/hora --timeout 3000 --so-corpo
 *            node sources/41_cliente_http.js --demo
 * O que você aprende: módulos http e https, a classe URL, eventos de stream
 *            (data, end, error), Promise em volta de callback, Buffer,
 *            JSON.parse com try/catch, redirecionamento e códigos de erro de rede.
 * Requisitos: Node.js 18+, só biblioteca padrão
 * Licença MIT. Um projeto da CodeNomad Academy (codenomad.org)
 * ============================================================
 */
'use strict';

const http = require('http');
const https = require('https');

const MAX_REDIRECIONAMENTOS = 5;
const LIMITE_TELA = 1200; // quantas letras do corpo aparecem na tela; o resto é resumido

/** Traduz o código de erro que o Node devolve para uma frase em português. */
function descreverErro(erro) {
  const mapa = {
    ENOTFOUND: 'endereço não encontrado (confira o nome do site e a sua conexão)',
    ECONNREFUSED: 'conexão recusada (nada escuta nessa porta)',
    ECONNRESET: 'conexão encerrada pelo servidor no meio da resposta',
    ETIMEDOUT: 'tempo esgotado ao conectar',
    EAI_AGAIN: 'falha temporária ao resolver o nome (DNS)',
    CERT_HAS_EXPIRED: 'certificado HTTPS vencido',
    ERR_TLS_CERT_ALTNAME_INVALID: 'certificado HTTPS não bate com o domínio',
  };
  if (erro.code && mapa[erro.code]) return `${mapa[erro.code]} [${erro.code}]`;
  return erro.message;
}

/**
 * Faz GET e resolve com { url, status, statusTexto, cabecalhos, corpo }.
 * Segue redirecionamentos (301, 302, 303, 307, 308) até o limite.
 * A Promise embrulha a API de callback do módulo http: resolve no "end"
 * da resposta e rejeita em qualquer "error".
 */
function buscar(urlTexto, { timeoutMs = 8000, saltos = 0 } = {}) {
  return new Promise((resolve, reject) => {
    let url;
    try {
      url = new URL(urlTexto);
    } catch {
      return reject(new Error(`URL inválida: "${urlTexto}"`));
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return reject(new Error(`Protocolo não suportado: ${url.protocol} (use http ou https)`));
    }
    const modulo = url.protocol === 'https:' ? https : http;
    const cabecalhosPedido = { 'user-agent': 'CodeNomad-Cliente/1.0', accept: 'application/json, text/*;q=0.8, */*;q=0.5' };
    const pedido = modulo.get(url, { headers: cabecalhosPedido }, (resposta) => {
      const { statusCode, statusMessage, headers } = resposta;
      // Redirecionamento: o novo endereço vem no cabeçalho "location" e pode ser relativo.
      if ([301, 302, 303, 307, 308].includes(statusCode) && headers.location) {
        resposta.resume(); // descarta o corpo para liberar a conexão
        if (saltos >= MAX_REDIRECIONAMENTOS) return reject(new Error('Redirecionamentos demais (laço no servidor?)'));
        const destino = new URL(headers.location, url).toString();
        console.log(`-> ${statusCode} redireciona para ${destino}`);
        return resolve(buscar(destino, { timeoutMs, saltos: saltos + 1 }));
      }
      const pedacos = []; // o corpo chega em partes (Buffer); juntamos tudo no fim
      resposta.on('data', (pedaco) => pedacos.push(pedaco));
      resposta.on('end', () => resolve({
        url: url.toString(),
        status: statusCode,
        statusTexto: statusMessage,
        cabecalhos: headers,
        corpo: Buffer.concat(pedacos).toString('utf8'),
      }));
      resposta.on('error', reject);
    });
    // Sem isto, um servidor que aceita a conexão e nunca responde deixaria o programa parado.
    pedido.setTimeout(timeoutMs, () => pedido.destroy(new Error(`tempo esgotado: ${timeoutMs} ms sem resposta`)));
    pedido.on('error', reject);
  });
}

/** Interpreta o corpo como JSON quando o tipo ou o conteúdo indicam isso; senão devolve null. */
function interpretarJson(cabecalhos, corpo) {
  const tipo = String(cabecalhos['content-type'] || '');
  if (!tipo.includes('json') && !/^\s*[[{]/.test(corpo)) return null;
  try {
    return JSON.parse(corpo);
  } catch {
    return null; // o servidor disse que era JSON, mas o corpo veio quebrado
  }
}

/** Percorre um caminho como "produtos.0.nome" dentro de um objeto ou array. */
function extrairCampo(objeto, caminho) {
  let atual = objeto;
  for (const parte of caminho.split('.')) {
    if (atual === null || typeof atual !== 'object' || !(parte in atual)) return undefined;
    atual = atual[parte];
  }
  return atual;
}

function formatarValor(valor) {
  if (valor === undefined) return '(campo não existe)';
  return typeof valor === 'object' ? JSON.stringify(valor) : String(valor);
}

function mostrarResposta(resposta, { campos = [], soCorpo = false } = {}) {
  const json = interpretarJson(resposta.cabecalhos, resposta.corpo);
  if (!soCorpo) {
    console.log(`URL final: ${resposta.url}`);
    console.log(`Status: ${resposta.status} ${resposta.statusTexto}`);
    console.log('Cabeçalhos:');
    for (const nome of Object.keys(resposta.cabecalhos).sort()) {
      console.log(`  ${nome}: ${resposta.cabecalhos[nome]}`);
    }
    console.log(`Corpo (${Buffer.byteLength(resposta.corpo)} bytes${json ? ', JSON interpretado' : ''}):`);
  }
  const texto = json ? JSON.stringify(json, null, 2) : resposta.corpo;
  console.log(texto.length > LIMITE_TELA ? `${texto.slice(0, LIMITE_TELA)}\n... (${texto.length - LIMITE_TELA} letras omitidas)` : texto);
  if (campos.length > 0) {
    console.log('Campos extraídos:');
    if (!json) console.log('  (o corpo não é JSON, não há campos para extrair)');
    for (const caminho of json ? campos : []) {
      console.log(`  ${caminho} = ${formatarValor(extrairCampo(json, caminho))}`);
    }
  }
}

/** Resposta de exemplo usada no modo --demo. Nenhum byte sai para a rede. */
const RESPOSTA_EXEMPLO = {
  url: 'https://loja.exemplo.test/api/produtos',
  status: 200,
  statusTexto: 'OK',
  cabecalhos: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-cache',
    date: 'Tue, 27 Oct 2026 14:00:00 GMT',
    server: 'ServidorExemplo/1.0',
  },
  corpo: JSON.stringify({
    loja: { nome: 'Papelaria Horizonte', cidade: 'Curitiba' },
    produtos: [
      { nome: 'Caderno 96 folhas', preco: 18.9, estoque: 42 },
      { nome: 'Caneta azul', preco: 2.5, estoque: 300 },
      { nome: 'Mochila escolar', preco: 129.0, estoque: 7 },
    ],
    total: 3,
  }),
};

function demonstracao() {
  console.log('=== Demonstração: cliente HTTP (sem acessar a rede) ===');
  console.log('A resposta abaixo está embutida no arquivo e é tratada como se tivesse vindo do servidor.\n');
  const campos = ['loja.nome', 'produtos.1.preco', 'produtos.length', 'total', 'loja.telefone'];
  mostrarResposta(RESPOSTA_EXEMPLO, { campos });

  console.log('\nTabela montada a partir do JSON:');
  const dados = JSON.parse(RESPOSTA_EXEMPLO.corpo);
  for (const produto of dados.produtos) {
    console.log(`  ${produto.nome.padEnd(20)} R$ ${produto.preco.toFixed(2).padStart(7)}   estoque: ${produto.estoque}`);
  }

  console.log('\nComo os erros de rede aparecem para o usuário:');
  for (const codigo of ['ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT']) {
    console.log(`  ${descreverErro({ code: codigo, message: codigo })}`);
  }
  console.log(`  ${descreverErro(new Error('tempo esgotado: 8000 ms sem resposta'))}`);
  console.log('\nPara testar de verdade: node sources/41_cliente_http.js http://localhost:3000/api/hora');
}

function lerArgumentos(lista) {
  const opcoes = {};
  const posicionais = [];
  for (let i = 0; i < lista.length; i++) {
    const item = lista[i];
    if (!item.startsWith('--')) {
      posicionais.push(item);
    } else if (lista[i + 1] !== undefined && !lista[i + 1].startsWith('--')) {
      opcoes[item.slice(2)] = lista[++i]; // a opção consome o valor seguinte
    } else {
      opcoes[item.slice(2)] = true;
    }
  }
  return { opcoes, posicionais };
}

function uso() {
  console.log('Uso: node 41_cliente_http.js <url> [--campos a.b,c.0.d] [--timeout ms] [--so-corpo]');
  console.log('     node 41_cliente_http.js --demo');
}

async function principal() {
  const { opcoes, posicionais } = lerArgumentos(process.argv.slice(2));
  if (opcoes.demo) return demonstracao();
  if (opcoes.ajuda) return uso();
  if (posicionais.length !== 1) {
    uso();
    process.exitCode = 1;
    return;
  }
  const timeoutMs = Number(opcoes.timeout ?? 8000);
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    console.error(`Erro: --timeout precisa ser um inteiro positivo em milissegundos (recebi "${opcoes.timeout}")`);
    process.exitCode = 1;
    return;
  }
  const campos = typeof opcoes.campos === 'string' ? opcoes.campos.split(',').filter(Boolean) : [];
  try {
    const resposta = await buscar(posicionais[0], { timeoutMs });
    mostrarResposta(resposta, { campos, soCorpo: Boolean(opcoes['so-corpo']) });
    if (resposta.status >= 400) process.exitCode = 2; // o servidor respondeu, mas com erro
  } catch (erro) {
    console.error(`Erro: ${descreverErro(erro)}`);
    process.exitCode = 1;
  }
}

principal();

/*
 * Para ir além:
 *   1. Aceite --metodo POST e --dados '{"a":1}' usando http.request em vez de http.get.
 *   2. Grave o corpo num arquivo com --salvar nome.ext, usando stream (pipe) em vez de juntar tudo na memória.
 *   3. Mostre o tempo de cada etapa (DNS, conexão, primeiro byte) com os eventos "socket" e "response".
 */
