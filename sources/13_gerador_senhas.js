/**
 * ============================================================
 * CodeNomad Academy  |  Sources JavaScript  |  13. Gerador de senhas seguras
 * ------------------------------------------------------------
 * O que faz: Gera senhas com comprimento e classes de símbolos à escolha
 *            (minúsculas, maiúsculas, números e símbolos) usando o sorteio
 *            criptográfico da biblioteca padrão. Garante pelo menos um
 *            símbolo de cada classe pedida, estima a entropia em bits e o
 *            tempo que um ataque de força bruta levaria.
 * Como usar: node 13_gerador_senhas.js --tamanho 20 --quantidade 3
 *            node 13_gerador_senhas.js --tamanho 12 --sem-simbolos --legivel
 *            node 13_gerador_senhas.js --demo
 * O que você aprende: crypto.randomInt (e por que Math.random não serve
 *            para segurança), embaralhamento de Fisher-Yates, Math.log2,
 *            objetos de opções com valores iniciais, spread e throw.
 * Requisitos: Node.js 18+, só biblioteca padrão
 * Licença MIT. Um projeto da CodeNomad Academy (codenomad.org)
 * ============================================================
 */
'use strict';

const crypto = require('crypto');

const CLASSES = {
  minusculas: 'abcdefghijklmnopqrstuvwxyz',
  maiusculas: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  numeros: '0123456789',
  simbolos: '!@#$%&*()-_=+[]{};:,.?',
};
// Parecidos demais na tela (l, I, 1, O, 0): a opção --legivel os retira.
const AMBIGUOS = new Set('lI1O0');

const OPCOES_INICIAIS = {
  tamanho: 16,
  quantidade: 1,
  minusculas: true,
  maiusculas: true,
  numeros: true,
  simbolos: true,
  legivel: false,
};

/** Sorteia um símbolo do alfabeto sem viés: randomInt nunca favorece uma ponta. */
function sortear(alfabeto) {
  return alfabeto[crypto.randomInt(alfabeto.length)];
}

/** Embaralha a lista no lugar (Fisher-Yates), também com sorteio criptográfico. */
function embaralhar(lista) {
  for (let i = lista.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [lista[i], lista[j]] = [lista[j], lista[i]];
  }
  return lista;
}

/**
 * Entropia de um sorteio livre: cada posição vale log2(tamanho do alfabeto)
 * bits. Garantir uma classe por posição reduz um pouco esse valor; em senhas
 * de 12 símbolos ou mais a diferença é desprezível.
 */
function entropiaBits(tamanho, tamanhoAlfabeto) {
  return tamanho * Math.log2(tamanhoAlfabeto);
}

function classificar(bits) {
  if (bits < 40) return 'fraca';
  if (bits < 60) return 'razoável';
  if (bits < 80) return 'forte';
  return 'excelente';
}

function formatarQuantidade(valor) {
  if (valor < 1) return 'menos de 1';
  if (valor >= 1e6) return valor.toExponential(1).replace('e+', ' x 10^');
  return Math.round(valor).toLocaleString('pt-BR');
}

/** Tempo para testar todas as combinações a 10 bilhões de tentativas por segundo. */
function tempoParaQuebrar(bits) {
  let valor = 2 ** bits / 1e10;
  const escalas = [
    ['segundos', 60], ['minutos', 60], ['horas', 24], ['dias', 365],
    ['anos', 1e6], ['milhões de anos', 1e3], ['bilhões de anos', Infinity],
  ];
  for (const [nome, limite] of escalas) {
    if (valor < limite) return `${formatarQuantidade(valor)} ${nome}`;
    valor /= limite;
  }
  return 'mais tempo que a idade do universo';
}

function gerarSenha(opcoes = {}) {
  // O spread copia os valores iniciais e deixa as opções recebidas por cima.
  const config = { ...OPCOES_INICIAIS, ...opcoes };
  if (!Number.isInteger(config.tamanho) || config.tamanho < 4 || config.tamanho > 128) {
    throw new Error(`o tamanho precisa ser um inteiro de 4 a 128, não "${config.tamanho}"`);
  }
  const alfabetos = Object.keys(CLASSES)
    .filter((nome) => config[nome])
    .map((nome) => (config.legivel ? [...CLASSES[nome]].filter((s) => !AMBIGUOS.has(s)).join('') : CLASSES[nome]));
  if (alfabetos.length === 0) throw new Error('escolha pelo menos uma classe de símbolos');
  const alfabetoTotal = alfabetos.join('');

  // Primeiro um símbolo de cada classe pedida, depois o restante sorteado do
  // alfabeto inteiro; o embaralhamento esconde essa ordem.
  const simbolos = alfabetos.map(sortear);
  while (simbolos.length < config.tamanho) simbolos.push(sortear(alfabetoTotal));
  embaralhar(simbolos);

  return {
    senha: simbolos.join(''),
    tamanhoAlfabeto: alfabetoTotal.length,
    entropia: entropiaBits(config.tamanho, alfabetoTotal.length),
  };
}

function demo() {
  console.log('=== Gerador de senhas seguras: demonstração ===\n');
  const perfis = [
    { titulo: '6 símbolos, letras e números (curta demais)', opcoes: { tamanho: 6, simbolos: false } },
    { titulo: '12 símbolos, letras e números', opcoes: { tamanho: 12, simbolos: false } },
    { titulo: '16 símbolos, todas as classes', opcoes: { tamanho: 16 } },
    { titulo: '24 símbolos, todas as classes, sem ambíguos (--legivel)', opcoes: { tamanho: 24, legivel: true } },
  ];
  for (const perfil of perfis) {
    const resultado = gerarSenha(perfil.opcoes);
    console.log(perfil.titulo);
    console.log(`  senha    : ${resultado.senha}`);
    console.log(`  alfabeto : ${resultado.tamanhoAlfabeto} símbolos possíveis em cada posição`);
    console.log(`  entropia : ${resultado.entropia.toFixed(1)} bits (${classificar(resultado.entropia)})`);
    console.log(`  força bruta a 10 bilhões de tentativas por segundo: ${tempoParaQuebrar(resultado.entropia)}\n`);
  }
  console.log('Por que crypto.randomInt e não Math.random? Math.random é previsível:');
  console.log('quem descobre o estado interno do gerador adivinha as próximas senhas.');
}

function uso() {
  console.log(`Uso:
  node 13_gerador_senhas.js [--tamanho N] [--quantidade N] [--legivel]
                            [--sem-minusculas] [--sem-maiusculas] [--sem-numeros] [--sem-simbolos]
  node 13_gerador_senhas.js --demo

Exemplos:
  node 13_gerador_senhas.js --tamanho 20 --quantidade 3
  node 13_gerador_senhas.js --tamanho 12 --sem-simbolos --legivel`);
}

function lerOpcoes(args) {
  const opcoes = { ...OPCOES_INICIAIS, demo: false };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--demo') {
      opcoes.demo = true;
    } else if (arg === '--legivel') {
      opcoes.legivel = true;
    } else if (arg.startsWith('--sem-')) {
      const classe = arg.slice('--sem-'.length);
      if (!(classe in CLASSES)) throw new Error(`classe desconhecida em "${arg}"; as classes são ${Object.keys(CLASSES).join(', ')}`);
      opcoes[classe] = false;
    } else if (arg === '--tamanho' || arg === '--quantidade') {
      const valor = Number(args[i + 1]);
      if (!Number.isInteger(valor)) throw new Error(`${arg} precisa de um número inteiro logo depois, não "${args[i + 1] ?? ''}"`);
      opcoes[arg.slice(2)] = valor;
      i++;
    } else {
      throw new Error(`argumento desconhecido: "${arg}"`);
    }
  }
  if (opcoes.quantidade < 1 || opcoes.quantidade > 50) throw new Error('a quantidade vai de 1 a 50');
  return opcoes;
}

function main(args) {
  if (args.length === 0) {
    uso();
    return 0;
  }
  try {
    const opcoes = lerOpcoes(args);
    if (opcoes.demo) {
      demo();
      return 0;
    }
    for (let i = 0; i < opcoes.quantidade; i++) {
      const resultado = gerarSenha(opcoes);
      console.log(`${resultado.senha}   (${resultado.entropia.toFixed(1)} bits, ${classificar(resultado.entropia)})`);
    }
    return 0;
  } catch (err) {
    console.error(`Erro: ${err.message}`);
    console.error('Rode sem argumentos para ver o uso.');
    return 1;
  }
}

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}

module.exports = { gerarSenha, entropiaBits, classificar, tempoParaQuebrar };

/* ------------------------------------------------------------
 * Para ir além
 *  1. Crie a opção --frase N que sorteia N palavras de uma lista e as une
 *     com hífen; calcule a entropia como N vezes log2(tamanho da lista).
 *  2. Adicione --proibir "abc" para garantir que a senha nunca contenha um
 *     trecho informado (o nome do serviço, por exemplo).
 *  3. Meça com process.hrtime.bigint() quanto tempo leva gerar 10 mil
 *     senhas e compare com uma versão que usa Math.random.
 * ------------------------------------------------------------ */
