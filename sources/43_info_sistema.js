/**
 * ============================================================
 * CodeNomad Academy  |  Sources JavaScript  |  43. Informações do sistema
 * ------------------------------------------------------------
 * O que faz: Mostra um retrato da máquina onde o Node está rodando: sistema
 *            operacional, versão do Node, usuário, pasta atual, CPUs, memória,
 *            interfaces de rede, variáveis de ambiente filtradas (com segredos
 *            ocultos) e espaço em disco da pasta atual. Pode sair em JSON.
 * Como usar: node sources/43_info_sistema.js tudo
 *            node sources/43_info_sistema.js cpu memoria disco
 *            node sources/43_info_sistema.js env --prefixo NODE --json
 *            node sources/43_info_sistema.js --demo
 * O que você aprende: módulo os (cpus, totalmem, networkInterfaces, userInfo),
 *            objeto process (version, env, memoryUsage), fs.statfs com
 *            detecção de recurso, formatação de bytes e durações, saída JSON.
 * Requisitos: Node.js 18+, só biblioteca padrão
 * Licença MIT. Um projeto da CodeNomad Academy (codenomad.org)
 * ============================================================
 */
'use strict';

const os = require('os');
const fs = require('fs');

const SECOES = ['sistema', 'linguagem', 'cpu', 'memoria', 'rede', 'env', 'disco'];
// Nomes de variáveis que costumam guardar segredos: o valor nunca é impresso.
const PARECE_SEGREDO = /(KEY|TOKEN|SECRET|SENHA|PASS|PWD|CREDENTIAL|AUTH)/i;
// Sem --prefixo, só estas variáveis aparecem: são inofensivas e existem na maioria dos sistemas.
const ENV_SEGURAS = ['HOME', 'USERPROFILE', 'USER', 'USERNAME', 'SHELL', 'COMSPEC', 'LANG', 'TERM', 'TMP', 'TEMP', 'NODE_ENV'];

function formatarBytes(bytes) {
  const unidades = ['B', 'KB', 'MB', 'GB', 'TB'];
  let valor = bytes;
  let i = 0;
  while (valor >= 1024 && i < unidades.length - 1) {
    valor /= 1024;
    i += 1;
  }
  return `${valor.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${unidades[i]}`;
}

function formatarPorcento(fracao) {
  return `${(fracao * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
}

function formatarDuracao(totalSegundos) {
  const dias = Math.floor(totalSegundos / 86400);
  const horas = Math.floor((totalSegundos % 86400) / 3600);
  const minutos = Math.floor((totalSegundos % 3600) / 60);
  const partes = [];
  if (dias) partes.push(`${dias} d`);
  if (horas) partes.push(`${horas} h`);
  partes.push(`${minutos} min`);
  return partes.join(' ');
}

function coletarSistema() {
  let usuario = { username: '(desconhecido)', shell: null };
  try {
    usuario = os.userInfo(); // pode falhar em contêineres sem cadastro de usuário
  } catch {
    // mantém o valor padrão
  }
  return {
    'Sistema': `${os.type()} ${os.release()} (${process.platform})`,
    'Arquitetura': os.arch(),
    'Máquina': os.hostname(),
    'Ligada há': formatarDuracao(os.uptime()),
    'Usuário': usuario.username,
    'Shell': usuario.shell || process.env.SHELL || process.env.COMSPEC || '(não informado)',
    'Pasta inicial': os.homedir(),
    'Pasta atual': process.cwd(),
    'Pasta temporária': os.tmpdir(),
  };
}

function coletarLinguagem() {
  return {
    'Node.js': process.version,
    'Motor V8': process.versions.v8,
    'Executável': process.execPath,
    'PID do processo': process.pid,
    'Módulos nativos (ABI)': process.versions.modules,
  };
}

function coletarCpu() {
  const cpus = os.cpus();
  const carga = os.loadavg(); // no Windows vem sempre [0, 0, 0]
  const temCarga = process.platform !== 'win32';
  return {
    'Núcleos lógicos': cpus.length,
    'Modelo': cpus.length ? cpus[0].model.trim() : '(desconhecido)',
    'Velocidade': cpus.length ? `${cpus[0].speed} MHz` : '(desconhecida)',
    'Carga média (1, 5, 15 min)': temCarga ? carga.map((c) => c.toFixed(2)).join(', ') : 'não disponível no Windows',
  };
}

function coletarMemoria() {
  const total = os.totalmem();
  const livre = os.freemem();
  const processo = process.memoryUsage();
  return {
    'Total': formatarBytes(total),
    'Livre': formatarBytes(livre),
    'Em uso': `${formatarBytes(total - livre)} (${formatarPorcento(1 - livre / total)})`,
    'Este processo (RSS)': formatarBytes(processo.rss),
    'Heap do JavaScript': `${formatarBytes(processo.heapUsed)} de ${formatarBytes(processo.heapTotal)}`,
  };
}

function coletarRede() {
  const resultado = {};
  for (const [nome, enderecos] of Object.entries(os.networkInterfaces())) {
    const externos = enderecos.filter((e) => !e.internal); // tira o loopback (127.0.0.1 e ::1)
    if (externos.length) resultado[nome] = externos.map((e) => `${e.address} (${e.family})`).join(', ');
  }
  return Object.keys(resultado).length ? resultado : { 'Interfaces': 'nenhuma interface externa encontrada' };
}

function coletarEnv(prefixo) {
  const resultado = {};
  const nomes = Object.keys(process.env).sort();
  for (const nome of nomes) {
    const entra = prefixo ? nome.toUpperCase().startsWith(prefixo.toUpperCase()) : ENV_SEGURAS.includes(nome.toUpperCase());
    if (!entra) continue;
    resultado[nome] = PARECE_SEGREDO.test(nome) ? '(oculto: parece um segredo)' : process.env[nome];
  }
  return Object.keys(resultado).length ? resultado : { 'Resultado': `nenhuma variável ${prefixo ? `com prefixo ${prefixo}` : 'da lista segura'}` };
}

async function coletarDisco(pasta) {
  // fs.statfs chegou no Node 18.15; em versões mais antigas a função não existe.
  if (typeof fs.promises.statfs !== 'function') return { 'Espaço em disco': 'indisponível (precisa de Node 18.15 ou mais novo)' };
  try {
    const info = await fs.promises.statfs(pasta);
    const total = info.bsize * info.blocks;
    const livre = info.bsize * info.bavail;
    return {
      'Pasta medida': pasta,
      'Tamanho do volume': formatarBytes(total),
      'Livre': formatarBytes(livre),
      'Usado': `${formatarBytes(total - livre)} (${formatarPorcento(1 - livre / total)})`,
    };
  } catch (erro) {
    return { 'Espaço em disco': `não foi possível medir: ${erro.message}` };
  }
}

async function coletar(secoes, prefixo) {
  const coletores = {
    sistema: coletarSistema, linguagem: coletarLinguagem, cpu: coletarCpu, memoria: coletarMemoria,
    rede: coletarRede, env: () => coletarEnv(prefixo), disco: () => coletarDisco(process.cwd()),
  };
  const relatorio = {};
  for (const secao of secoes) relatorio[secao] = await coletores[secao]();
  return relatorio;
}

function imprimir(relatorio) {
  const titulos = { sistema: 'Sistema', linguagem: 'Linguagem', cpu: 'Processador', memoria: 'Memória', rede: 'Rede', env: 'Variáveis de ambiente', disco: 'Disco' };
  for (const [secao, dados] of Object.entries(relatorio)) {
    console.log(`\n== ${titulos[secao]} ==`);
    const largura = Math.max(...Object.keys(dados).map((k) => k.length));
    for (const [rotulo, valor] of Object.entries(dados)) console.log(`  ${rotulo.padEnd(largura)}  ${valor}`);
  }
}

/** Tira acentos para aceitar "memória" e "memoria" na linha de comando. */
function semAcento(texto) {
  return texto.normalize('NFD').replace(/\p{Mn}/gu, '').toLowerCase();
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
  console.log('Uso: node 43_info_sistema.js <secoes...> [--prefixo NOME] [--json]');
  console.log(`Seções: tudo, ${SECOES.join(', ')}`);
  console.log('       node 43_info_sistema.js --demo');
}

async function principal() {
  const { opcoes, posicionais } = lerArgumentos(process.argv.slice(2));
  if (opcoes.ajuda || (posicionais.length === 0 && !opcoes.demo)) {
    uso();
    process.exitCode = opcoes.ajuda ? 0 : 1;
    return;
  }
  const pedidas = opcoes.demo ? ['tudo'] : posicionais.map(semAcento);
  const invalidas = pedidas.filter((s) => s !== 'tudo' && !SECOES.includes(s));
  if (invalidas.length) {
    console.error(`Erro: seção desconhecida: ${invalidas.join(', ')}. Use: tudo, ${SECOES.join(', ')}`);
    process.exitCode = 1;
    return;
  }
  const secoes = pedidas.includes('tudo') ? SECOES : [...new Set(pedidas)];
  const prefixo = typeof opcoes.prefixo === 'string' ? opcoes.prefixo : null;
  const relatorio = await coletar(secoes, prefixo);
  if (opcoes.json) {
    console.log(JSON.stringify(relatorio, null, 2));
    return;
  }
  if (opcoes.demo) console.log('=== Demonstração: informações do sistema atual ===');
  imprimir(relatorio);
}

principal();

/*
 * Para ir além:
 *   1. Acrescente a seção "processo" com process.argv, process.uptime() e process.title.
 *   2. Mostre o uso de CPU medindo os.cpus() duas vezes com 1 s de intervalo e comparando os tempos idle.
 *   3. Grave o relatório num arquivo com --salvar e compare duas execuções, apontando o que mudou.
 */
