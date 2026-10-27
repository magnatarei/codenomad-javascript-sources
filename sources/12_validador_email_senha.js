/**
 * ============================================================
 * CodeNomad Academy  |  Sources JavaScript  |  12. Validador de e-mail e força de senha
 * ------------------------------------------------------------
 * O que faz: Valida um e-mail com regras claras (um único @, domínio com
 *            ponto, sem espaços, limites de tamanho) e dá uma nota de 0 a 10
 *            à força de uma senha, olhando comprimento, classes de símbolos,
 *            sequências e repetições, com dicas concretas de melhoria.
 * Como usar: node 12_validador_email_senha.js --email ana.souza@exemplo.com.br
 *            node 12_validador_email_senha.js --senha "Tr3s cafés por manhã!"
 *            node 12_validador_email_senha.js --demo
 * O que você aprende: expressões regulares, split e every, Set para
 *            consulta rápida, acúmulo de motivos em arrays, pontuação por
 *            critérios e alinhamento de colunas com padStart e padEnd.
 * Requisitos: Node.js 18+, só biblioteca padrão
 * Licença MIT. Um projeto da CodeNomad Academy (codenomad.org)
 * ============================================================
 */
'use strict';

/**
 * Valida o e-mail por partes e acumula os motivos de recusa em um array.
 * A regra oficial (RFC 5322) é enorme; estas cobrem o que importa no dia a
 * dia e, melhor, dizem exatamente o que está errado.
 */
function validarEmail(email) {
  const texto = String(email).trim();
  const motivos = [];
  if (texto.length === 0) return { valido: false, motivos: ['e-mail vazio'] };
  if (texto.length > 254) motivos.push('passa de 254 símbolos no total');
  if (/\s/.test(texto)) motivos.push('contém espaço');

  const partes = texto.split('@');
  if (partes.length !== 2) {
    motivos.push(partes.length < 2 ? 'falta o @' : 'tem mais de um @');
    return { valido: false, motivos };
  }
  const [local, dominio] = partes;

  // Antes do @: letras, números e . _ % + -, sem ponto nas pontas nem dobrado.
  if (local.length === 0) motivos.push('nada antes do @');
  else if (local.length > 64) motivos.push('a parte antes do @ passa de 64 símbolos');
  else if (!/^[a-z0-9._%+-]+$/i.test(local)) motivos.push('símbolo não permitido antes do @');
  else if (/^\.|\.$|\.\./.test(local)) motivos.push('ponto no início, no fim ou dois pontos seguidos antes do @');

  // Depois do @: rótulos separados por ponto, cada um com 1 a 63 símbolos e
  // sem hífen nas pontas; a terminação (com, br, org) só tem letras.
  const rotulos = dominio.split('.');
  const rotuloValido = (rotulo) => /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/i.test(rotulo);
  if (rotulos.length < 2) motivos.push('domínio sem ponto (esperava algo como exemplo.com)');
  else if (!/^[a-z]{2,}$/i.test(rotulos[rotulos.length - 1])) motivos.push('a terminação do domínio só pode ter letras (2 ou mais)');
  if (!rotulos.every(rotuloValido)) motivos.push('domínio com trecho vazio ou símbolo não permitido');

  return { valido: motivos.length === 0, motivos };
}

const SENHAS_COMUNS = new Set([
  '123456', '123456789', '12345678', 'senha', 'senha123', 'password', 'qwerty',
  'abc123', '111111', 'admin', 'letmein', 'iloveyou', 'brasil', 'futebol',
]);
const SEQUENCIAS = ['abcdefghijklmnopqrstuvwxyz', '0123456789', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

/** Acha o primeiro trecho de 3 símbolos em sequência (abc, 321, qwe), em qualquer sentido. */
function acharSequencia(senha) {
  const baixo = senha.toLowerCase();
  for (let i = 0; i + 3 <= baixo.length; i++) {
    const trecho = baixo.slice(i, i + 3);
    const invertido = [...trecho].reverse().join('');
    if (SEQUENCIAS.some((s) => s.includes(trecho) || s.includes(invertido))) return trecho;
  }
  return null;
}

/**
 * Pontua a senha de 0 a 10: comprimento vale até 6 pontos, cada classe de
 * símbolo vale 1, e sequências ou repetições tiram 2 cada. Uma senha da
 * lista de senhas comuns vai direto para zero, não importa o resto.
 */
function avaliarSenha(senha) {
  const texto = String(senha);
  const dicas = [];
  let pontos = 0;

  if (texto.length >= 8) pontos += 2;
  if (texto.length >= 12) pontos += 2;
  if (texto.length >= 16) pontos += 2;
  if (texto.length < 12) dicas.push('use 12 símbolos ou mais; uma frase inteira é fácil de lembrar');

  const classes = {
    minusculas: /[a-z]/.test(texto),
    maiusculas: /[A-Z]/.test(texto),
    numeros: /[0-9]/.test(texto),
    simbolos: /[^a-zA-Z0-9]/.test(texto),
  };
  const presentes = Object.keys(classes).filter((nome) => classes[nome]);
  pontos += presentes.length;
  if (!classes.maiusculas) dicas.push('misture letras maiúsculas');
  if (!classes.numeros) dicas.push('inclua algum número');
  if (!classes.simbolos) dicas.push('inclua símbolos (! ? # ou até um espaço)');

  const sequencia = acharSequencia(texto);
  if (sequencia) {
    pontos -= 2;
    dicas.push(`evite sequências como "${sequencia}"`);
  }
  const repeticao = texto.match(/(.)\1{2,}/); // o mesmo símbolo três ou mais vezes seguidas
  if (repeticao) {
    pontos -= 2;
    dicas.push(`evite repetições como "${repeticao[0]}"`);
  }
  if (SENHAS_COMUNS.has(texto.toLowerCase())) {
    pontos = 0;
    dicas.unshift('esta senha aparece em toda lista de senhas vazadas');
  }

  const nota = Math.max(0, Math.min(10, pontos));
  const rotulo = nota >= 9 ? 'forte' : nota >= 7 ? 'boa' : nota >= 4 ? 'razoável' : 'fraca';
  return { nota, rotulo, classes: presentes.map((nome) => NOMES_DAS_CLASSES[nome]), dicas };
}

// Identificadores não levam acento; o texto mostrado ao usuário, sim.
const NOMES_DAS_CLASSES = { minusculas: 'minúsculas', maiusculas: 'maiúsculas', numeros: 'números', simbolos: 'símbolos' };

function mostrarEmail(email) {
  const resultado = validarEmail(email);
  console.log(`  ${resultado.valido ? 'VÁLIDO  ' : 'INVÁLIDO'}  ${email}`);
  resultado.motivos.forEach((motivo) => console.log(`            motivo: ${motivo}`));
  return resultado.valido;
}

// Em um sistema de verdade, nunca imprima nem registre senhas; aqui o
// objetivo é didático e a senha veio da própria linha de comando.
function mostrarSenha(senha) {
  const resultado = avaliarSenha(senha);
  const barra = '#'.repeat(resultado.nota).padEnd(10, '.');
  console.log(`  [${barra}] ${String(resultado.nota).padStart(2)}/10  ${resultado.rotulo.padEnd(8)} "${senha}"`);
  console.log(`            classes: ${resultado.classes.join(', ') || 'nenhuma'}`);
  resultado.dicas.forEach((dica) => console.log(`            dica: ${dica}`));
  return resultado.nota >= 4;
}

function demo() {
  console.log('=== Validador de e-mail e força de senha: demonstração ===\n');
  console.log('E-mails:');
  const emails = ['ana.souza@exemplo.com.br', 'joao@exemplo', 'maria silva@exemplo.com', 'pedro@@exemplo.com', '.lucas@exemplo.com'];
  emails.forEach(mostrarEmail);

  console.log('\nSenhas:');
  const senhas = ['123456', 'cachorro', 'C4ch0rr0!', 'Cachorro2024', 'Tr3s cafés por manhã, sem açúcar!'];
  senhas.forEach(mostrarSenha);
  console.log('\nRepare: a frase longa vence a senha curta cheia de símbolos.');
}

function uso() {
  console.log(`Uso:
  node 12_validador_email_senha.js --email <endereço> [--email <outro>]
  node 12_validador_email_senha.js --senha "<senha>"
  node 12_validador_email_senha.js --demo

Exemplo:
  node 12_validador_email_senha.js --email ana.souza@exemplo.com.br --senha "Tr3s cafés por manhã!"`);
}

/** Transforma a lista de argumentos em um objeto; erro de uso vira exceção. */
function lerOpcoes(args) {
  const opcoes = { emails: [], senhas: [], demo: false };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--demo') {
      opcoes.demo = true;
    } else if (arg === '--email' || arg === '--senha') {
      const valor = args[i + 1];
      if (valor === undefined) throw new Error(`${arg} precisa de um valor logo depois`);
      (arg === '--email' ? opcoes.emails : opcoes.senhas).push(valor);
      i++; // pula o valor que acabou de ser consumido
    } else {
      throw new Error(`argumento desconhecido: "${arg}"`);
    }
  }
  return opcoes;
}

function main(args) {
  if (args.length === 0) {
    uso();
    return 0;
  }
  let opcoes;
  try {
    opcoes = lerOpcoes(args);
  } catch (err) {
    console.error(`Erro: ${err.message}. Use --email, --senha ou --demo.`);
    return 1;
  }
  if (opcoes.demo) {
    demo();
    return 0;
  }
  // Termina com 1 se algum e-mail for inválido ou alguma senha for fraca,
  // para o programa servir dentro de scripts.
  let tudoBem = true;
  if (opcoes.emails.length > 0) {
    console.log('E-mails:');
    for (const email of opcoes.emails) tudoBem = mostrarEmail(email) && tudoBem;
  }
  if (opcoes.senhas.length > 0) {
    console.log('Senhas:');
    for (const senha of opcoes.senhas) tudoBem = mostrarSenha(senha) && tudoBem;
  }
  return tudoBem ? 0 : 1;
}

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}

module.exports = { validarEmail, avaliarSenha, acharSequencia };

/* ------------------------------------------------------------
 * Para ir além
 *  1. Acrescente uma lista de domínios descartáveis (e-mails temporários)
 *     e recuse endereços que usem um deles, explicando o motivo.
 *  2. Troque a nota por uma estimativa de entropia em bits, como faz o
 *     source 13, e compare os dois critérios nas mesmas senhas.
 *  3. Leia várias senhas de um arquivo, uma por linha, e gere um relatório
 *     com a quantidade de fracas, razoáveis, boas e fortes.
 * ------------------------------------------------------------ */
