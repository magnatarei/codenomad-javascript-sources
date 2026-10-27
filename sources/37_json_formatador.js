/**
 * ============================================================
 * CodeNomad Academy  |  Sources JavaScript  |  37. Validador e formatador de JSON
 * ------------------------------------------------------------
 * O que faz: Valida um arquivo JSON apontando linha e coluna do erro,
 *            formata com recuo, compacta, extrai um valor por caminho
 *            (ex.: cliente.pedidos[0].total) e lista todas as chaves com o
 *            tipo de cada valor.
 * Como usar: node 37_json_formatador.js dados.json
 *            node 37_json_formatador.js dados.json --validar
 *            node 37_json_formatador.js dados.json --recuo 4 --gravar formatado.json
 *            node 37_json_formatador.js dados.json --compactar
 *            node 37_json_formatador.js dados.json --caminho pedidos[0].itens[1].nome
 *            node 37_json_formatador.js dados.json --chaves
 *            node 37_json_formatador.js --demo
 * O que você aprende: JSON.parse e JSON.stringify a fundo (recuo e
 *            compactação), como transformar a posição do erro do parser em
 *            linha e coluna, expressão regular para quebrar um caminho,
 *            recursão para percorrer objetos e listas, typeof e Array.isArray.
 * Requisitos: Node.js 18+, só biblioteca padrão
 * Licença MIT. Um projeto da CodeNomad Academy (codenomad.org)
 * ============================================================
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

// ---------- Validação ----------

function posicaoDoErro(texto, mensagem) {
  // Na maioria dos erros o parser diz "... in JSON at position 130".
  const porPosicao = /position (\d+)/.exec(mensagem);
  if (porPosicao) return Number(porPosicao[1]);
  // Em "Unexpected token" (Node 20+) não vem posição, mas vem um trecho do texto
  // com até 10 letras de cada lado do erro; "..." marca onde o trecho foi cortado.
  const porTrecho = /Unexpected token '(.)', (\.\.\.)?"(.*)"(\.\.\.)? is not valid JSON/s.exec(mensagem);
  if (!porTrecho) return texto.length; // ex.: "Unexpected end of JSON input"
  const [, token, cortadoAntes, trecho, cortadoDepois] = porTrecho;
  if (cortadoAntes) return Math.max(texto.indexOf(trecho), 0) + 10;
  if (cortadoDepois) return trecho.length - 10;
  return Math.max(texto.indexOf(token), 0); // texto curto: a mensagem traz ele inteiro
}

function validar(texto) {
  try {
    return { ok: true, valor: JSON.parse(texto) };
  } catch (erro) {
    // Contamos as quebras de linha antes da posição do erro para achar linha e coluna.
    const posicao = posicaoDoErro(texto, erro.message);
    const antes = texto.slice(0, posicao);
    const linha = antes.split('\n').length;
    const coluna = posicao - antes.lastIndexOf('\n');
    const trecho = texto.split('\n')[linha - 1] || '';
    return { ok: false, mensagem: erro.message, linha, coluna, trecho };
  }
}

function descreverErro(resultado) {
  const { mensagem, linha, coluna, trecho } = resultado;
  const margem = ' '.repeat(String(linha).length);
  return [
    `JSON inválido na linha ${linha}, coluna ${coluna}: ${mensagem}`,
    `  ${linha} | ${trecho}`,
    `  ${margem} | ${' '.repeat(coluna - 1)}^`,
  ].join('\n');
}

function tipoDe(valor) {
  if (valor === null) return 'nulo';
  if (Array.isArray(valor)) return 'lista';
  return { string: 'texto', number: 'número', boolean: 'booleano', object: 'objeto' }[typeof valor];
}

// ---------- Caminhos e chaves ----------

function quebrarCaminho(caminho) {
  // "cliente.pedidos[0].total" vira ["cliente", "pedidos", 0, "total"].
  const partes = caminho.match(/[^.[\]]+|\[\d+\]/g);
  if (!partes || partes.join('') !== caminho.replace(/\./g, '')) throw new Error(`Caminho inválido: "${caminho}"`);
  return partes.map((p) => (p.startsWith('[') ? Number(p.slice(1, -1)) : p));
}

function extrair(valor, caminho) {
  let atual = valor;
  let percorrido = '';
  for (const parte of quebrarCaminho(caminho)) {
    const onde = percorrido || '(raiz)';
    if (typeof parte === 'number') {
      if (!Array.isArray(atual)) throw new Error(`${onde} é ${tipoDe(atual)}, não uma lista; [${parte}] não se aplica.`);
      if (parte >= atual.length) throw new Error(`${onde} tem ${atual.length} item(ns); a posição [${parte}] não existe.`);
      percorrido += `[${parte}]`;
    } else {
      if (tipoDe(atual) !== 'objeto') throw new Error(`${onde} é ${tipoDe(atual)}, não um objeto; a chave "${parte}" não se aplica.`);
      if (!(parte in atual)) throw new Error(`A chave "${parte}" não existe em ${onde}. Chaves disponíveis: ${Object.keys(atual).join(', ')}`);
      percorrido += percorrido ? `.${parte}` : parte;
    }
    atual = atual[parte];
  }
  return atual;
}

function listarChaves(valor, caminho = '', linhas = []) {
  // Recursão: objetos e listas descem um nível; os demais valores são folhas.
  const tipo = tipoDe(valor);
  if (tipo === 'objeto') {
    linhas.push(`${caminho || '(raiz)'}: objeto com ${Object.keys(valor).length} chave(s)`);
    for (const [chave, item] of Object.entries(valor)) listarChaves(item, caminho ? `${caminho}.${chave}` : chave, linhas);
  } else if (tipo === 'lista') {
    linhas.push(`${caminho || '(raiz)'}: lista com ${valor.length} item(ns)`);
    valor.forEach((item, i) => listarChaves(item, `${caminho}[${i}]`, linhas));
  } else {
    linhas.push(`${caminho}: ${tipo} = ${JSON.stringify(valor)}`);
  }
  return linhas;
}

// ---------- Linha de comando ----------

function lerArgumentos(argv) {
  const opcoes = { recuo: 2 };
  let arquivo;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) { arquivo = arg; continue; }
    if (['--compactar', '--chaves', '--validar'].includes(arg)) { opcoes[arg.slice(2)] = true; continue; }
    const valor = argv[++i];
    if (valor === undefined) throw new Error(`A opção ${arg} precisa de um valor.`);
    if (arg === '--recuo') {
      opcoes.recuo = Number(valor);
      if (!Number.isInteger(opcoes.recuo) || opcoes.recuo < 0 || opcoes.recuo > 10) throw new Error(`--recuo aceita de 0 a 10 espaços, não "${valor}".`);
    } else if (arg === '--caminho') opcoes.caminho = valor;
    else if (arg === '--gravar') opcoes.gravar = valor;
    else throw new Error(`Opção desconhecida: ${arg}`);
  }
  if (!arquivo) throw new Error('Informe o arquivo JSON. Exemplo: node 37_json_formatador.js dados.json');
  return { arquivo, opcoes };
}

function processar(texto, opcoes) {
  const resultado = validar(texto);
  if (!resultado.ok) throw new Error(descreverErro(resultado));
  const { valor } = resultado;
  if (opcoes.validar) return `JSON válido: ${tipoDe(valor)} na raiz, ${listarChaves(valor).length} caminho(s), ${texto.split('\n').length} linha(s).`;
  if (opcoes.caminho !== undefined) {
    const achado = extrair(valor, opcoes.caminho);
    return typeof achado === 'object' ? JSON.stringify(achado, null, opcoes.recuo) : String(achado);
  }
  if (opcoes.chaves) return listarChaves(valor).join('\n');
  // JSON.stringify sem recuo gera uma linha só; com recuo, quebra e indenta.
  return opcoes.compactar ? JSON.stringify(valor) : JSON.stringify(valor, null, opcoes.recuo);
}

function executar(argv) {
  const { arquivo, opcoes } = lerArgumentos(argv);
  if (!fs.existsSync(arquivo)) throw new Error(`Arquivo não encontrado: ${arquivo}`);
  const saida = processar(fs.readFileSync(arquivo, 'utf8'), opcoes);
  if (!opcoes.gravar) { console.log(saida); return; }
  fs.writeFileSync(opcoes.gravar, saida + '\n', 'utf8');
  console.log(`Gravado em ${opcoes.gravar} (${saida.split('\n').length} linha(s)).`);
}

function mostrarUso() {
  console.log(`Uso: node 37_json_formatador.js <arquivo.json> [opção]

  (sem opção)          valida e imprime formatado com recuo de 2 espaços
  --validar            só confere e resume (tipo da raiz, caminhos, linhas)
  --recuo N            tamanho do recuo (0 a 10)
  --compactar          tudo numa linha só, sem espaços
  --caminho a.b[0].c   imprime só o valor nesse caminho
  --chaves             lista todos os caminhos com tipo e valor
  --gravar arquivo     grava a saída num arquivo em vez de imprimir
  --demo               demonstração completa com arquivos temporários`);
}

// ---------- Demonstração ----------

const EXEMPLO = {
  loja: 'Papelaria Central',
  cliente: { nome: 'Ana Ribeiro', email: 'ana@exemplo.com', ativo: true },
  pedidos: [
    { numero: 101, total: 57.8, itens: [{ nome: 'Caderno', quantidade: 2 }, { nome: 'Caneta', quantidade: 6 }] },
    { numero: 102, total: 149.9, itens: [{ nome: 'Mochila', quantidade: 1 }] },
  ],
  observacoes: null,
};

const INVALIDO = `{
  "loja": "Papelaria Central",
  "pedidos": [
    { "numero": 101, "total": 57.8 },
    { "numero": 102, "total": 149.9 }
  ]
  "ativo": true
}`;

function demo() {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'codenomad-json-'));
  const valido = path.join(pasta, 'loja.json');
  const quebrado = path.join(pasta, 'quebrado.json');
  const virgula = path.join(pasta, 'virgula.json');
  fs.writeFileSync(valido, JSON.stringify(EXEMPLO), 'utf8'); // gravado compacto de propósito
  fs.writeFileSync(quebrado, INVALIDO, 'utf8');
  fs.writeFileSync(virgula, '{"turma": "JS-1", "notas": [9.5, 7,], "ativa": true}', 'utf8');
  console.log('=== Validador e formatador de JSON: demonstração ===');
  console.log(`Arquivos temporários em ${pasta}\n`);
  const cenas = [
    ['loja.json --validar', [valido, '--validar']],
    ['loja.json (formatar com recuo 2)', [valido]],
    ['loja.json --compactar', [valido, '--compactar']],
    ['loja.json --caminho pedidos[0].itens[1].nome', [valido, '--caminho', 'pedidos[0].itens[1].nome']],
    ['loja.json --caminho cliente --recuo 4', [valido, '--caminho', 'cliente', '--recuo', '4']],
    ['loja.json --caminho cliente.telefone (chave que não existe)', [valido, '--caminho', 'cliente.telefone']],
    ['loja.json --chaves', [valido, '--chaves']],
    ['loja.json --recuo 4 --gravar formatado.json', [valido, '--recuo', '4', '--gravar', path.join(pasta, 'formatado.json')]],
    ['quebrado.json (falta uma vírgula depois da lista)', [quebrado]],
    ['virgula.json (vírgula sobrando antes do colchete)', [virgula]],
  ];
  for (const [titulo, argv] of cenas) {
    console.log(`$ node 37_json_formatador.js ${titulo}`);
    try {
      executar(argv);
    } catch (erro) {
      console.log(`Erro tratado: ${erro.message}`);
    }
    console.log('');
  }
  fs.rmSync(pasta, { recursive: true, force: true });
  console.log('Pasta temporária removida. Fim da demonstração.');
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--demo')) return demo();
  if (argv.length === 0) return mostrarUso();
  try {
    executar(argv);
  } catch (erro) {
    console.error(`Erro: ${erro.message}`);
    process.exitCode = 1;
  }
}

main();

/*
 * Para ir além:
 * 1. Crie --ordenar, que grava o JSON com as chaves de cada objeto em ordem alfabética.
 * 2. Aceite --definir caminho=valor para alterar um valor e gravar o arquivo de volta.
 * 3. Compare dois arquivos JSON e liste os caminhos que existem só em um ou têm valores diferentes.
 */
