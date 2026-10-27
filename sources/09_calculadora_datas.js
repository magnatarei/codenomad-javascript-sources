/**
 * ============================================================
 * CodeNomad Academy  |  Sources JavaScript  |  09. Calculadora de datas
 * ------------------------------------------------------------
 * O que faz: Conta os dias entre duas datas, diz o dia da semana, calcula a
 *            idade exata em anos, meses e dias, soma ou subtrai dias de uma
 *            data e mostra quantos dias faltam para uma data futura.
 * Como usar: node 09_calculadora_datas.js entre 2026-01-01 2026-12-25
 *            node 09_calculadora_datas.js dia 25/12/2026
 *            node 09_calculadora_datas.js idade 15/05/1990
 *            node 09_calculadora_datas.js somar 31/01/2026 30
 *            node 09_calculadora_datas.js faltam 25/12/2026
 *            node 09_calculadora_datas.js --demo
 * O que você aprende: o objeto Date e suas armadilhas, por que contar dias em
 *            UTC, Date.UTC e os métodos getUTC*, expressões regulares com grupos
 *            para validar formatos, Intl.DateTimeFormat e subcomandos em um objeto.
 * Requisitos: Node.js 18+, só biblioteca padrão
 * Licença MIT. Um projeto da CodeNomad Academy (codenomad.org)
 * ============================================================
 */
'use strict';

const path = require('path');

const NOME_DO_PROGRAMA = path.basename(process.argv[1] || '09_calculadora_datas.js');
const MILISSEGUNDOS_POR_DIA = 24 * 60 * 60 * 1000;
const nomeDoDiaDaSemana = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', timeZone: 'UTC' });

/**
 * Lê "AAAA-MM-DD" ou "DD/MM/AAAA" e devolve uma Date à meia-noite em UTC.
 * Em UTC não existe horário de verão, então todo dia tem exatamente 24 horas
 * e a conta de dias nunca sai errada por uma hora a mais ou a menos.
 * O Date aceita 30 de fevereiro sem reclamar (vira 2 de março), por isso a
 * função confere se o que saiu é igual ao que entrou.
 */
function lerData(texto) {
  const limpo = String(texto).trim();
  const iso = limpo.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const brasileiro = limpo.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  let partes;
  if (iso) {
    partes = { ano: Number(iso[1]), mesNumero: Number(iso[2]), dia: Number(iso[3]) };
  } else if (brasileiro) {
    partes = { ano: Number(brasileiro[3]), mesNumero: Number(brasileiro[2]), dia: Number(brasileiro[1]) };
  } else {
    throw new Error(`data inválida: "${texto}". Use AAAA-MM-DD ou DD/MM/AAAA.`);
  }
  const data = new Date(Date.UTC(partes.ano, partes.mesNumero - 1, partes.dia));
  const bateu = data.getUTCFullYear() === partes.ano
    && data.getUTCMonth() === partes.mesNumero - 1
    && data.getUTCDate() === partes.dia;
  if (!bateu) {
    throw new Error(`a data "${texto}" não existe no calendário.`);
  }
  return data;
}

function lerInteiro(texto, nome) {
  const valor = Number(String(texto).trim());
  if (String(texto).trim() === '' || !Number.isInteger(valor)) {
    throw new Error(`${nome} precisa ser um número inteiro, recebi "${texto}".`);
  }
  return valor;
}

// A data de hoje, também à meia-noite em UTC, para comparar com as datas lidas.
function hoje() {
  const agora = new Date();
  return new Date(Date.UTC(agora.getFullYear(), agora.getMonth(), agora.getDate()));
}

function formatarData(data) {
  const dia = String(data.getUTCDate()).padStart(2, '0');
  const mesTexto = String(data.getUTCMonth() + 1).padStart(2, '0');
  return `${dia}/${mesTexto}/${data.getUTCFullYear()}`;
}

function plural(quantidade, singular, varios) {
  return `${quantidade} ${quantidade === 1 ? singular : varios}`;
}

// "uma sexta-feira", mas "um sábado" e "um domingo": o artigo acompanha o nome.
function diaComArtigo(data) {
  const nome = nomeDoDiaDaSemana.format(data);
  return `${nome === 'sábado' || nome === 'domingo' ? 'um' : 'uma'} ${nome}`;
}

// Subtrair duas Dates dá a diferença em milissegundos; dividir pelo dia dá os dias.
function diasEntre(inicio, fim) {
  return Math.round((fim - inicio) / MILISSEGUNDOS_POR_DIA);
}

function somarDias(data, dias) {
  return new Date(data.getTime() + dias * MILISSEGUNDOS_POR_DIA);
}

function idadeExata(nascimento, referencia) {
  if (referencia < nascimento) {
    throw new Error('a data de referência vem antes do nascimento.');
  }
  let anos = referencia.getUTCFullYear() - nascimento.getUTCFullYear();
  let meses = referencia.getUTCMonth() - nascimento.getUTCMonth();
  let dias = referencia.getUTCDate() - nascimento.getUTCDate();
  if (dias < 0) {
    meses -= 1;
    // Dia 0 do mês atual é o último dia do mês anterior: um truque clássico do Date.
    dias += new Date(Date.UTC(referencia.getUTCFullYear(), referencia.getUTCMonth(), 0)).getUTCDate();
  }
  if (meses < 0) {
    anos -= 1;
    meses += 12;
  }
  return { anos, meses, dias };
}

// Cada subcomando é uma propriedade do objeto: para acrescentar um, basta uma entrada nova.
const COMANDOS = {
  entre: {
    uso: 'entre <data1> <data2>',
    executar([primeira, segunda]) {
      const inicio = lerData(primeira);
      const fim = lerData(segunda);
      const dias = diasEntre(inicio, fim);
      const semanas = Math.floor(Math.abs(dias) / 7);
      console.log(`De ${formatarData(inicio)} a ${formatarData(fim)}: ${plural(Math.abs(dias), 'dia', 'dias')}${dias < 0 ? ' (a segunda data vem antes)' : ''}.`);
      console.log(`Isso equivale a ${plural(semanas, 'semana', 'semanas')} e ${plural(Math.abs(dias) % 7, 'dia', 'dias')}.`);
    },
  },
  dia: {
    uso: 'dia <data>',
    executar([texto]) {
      const data = lerData(texto);
      console.log(`${formatarData(data)} cai em ${diaComArtigo(data)}.`);
    },
  },
  idade: {
    uso: 'idade <nascimento> [data_de_referência]',
    executar([nascimentoTexto, referenciaTexto]) {
      const nascimento = lerData(nascimentoTexto);
      const referencia = referenciaTexto ? lerData(referenciaTexto) : hoje();
      const { anos, meses, dias } = idadeExata(nascimento, referencia);
      console.log(`Quem nasceu em ${formatarData(nascimento)} tem, em ${formatarData(referencia)}: ${plural(anos, 'ano', 'anos')}, ${plural(meses, 'mês', 'meses')} e ${plural(dias, 'dia', 'dias')}.`);
      console.log(`Em dias corridos: ${diasEntre(nascimento, referencia)}.`);
    },
  },
  somar: {
    uso: 'somar <data> <dias>  (dias negativos subtraem)',
    executar([texto, diasTexto]) {
      const data = lerData(texto);
      const dias = lerInteiro(diasTexto, 'A quantidade de dias');
      const resultado = somarDias(data, dias);
      const verbo = dias < 0 ? 'menos' : 'mais';
      console.log(`${formatarData(data)} ${verbo} ${plural(Math.abs(dias), 'dia', 'dias')} = ${formatarData(resultado)} (${nomeDoDiaDaSemana.format(resultado)}).`);
    },
  },
  faltam: {
    uso: 'faltam <data> [data_de_referência]',
    executar([texto, referenciaTexto]) {
      const alvo = lerData(texto);
      const referencia = referenciaTexto ? lerData(referenciaTexto) : hoje();
      const dias = diasEntre(referencia, alvo);
      if (dias > 0) {
        console.log(`Faltam ${plural(dias, 'dia', 'dias')} para ${formatarData(alvo)}, contando a partir de ${formatarData(referencia)}.`);
      } else if (dias === 0) {
        console.log(`${formatarData(alvo)} é a própria data de referência: é hoje!`);
      } else {
        console.log(`${formatarData(alvo)} já passou: foi há ${plural(-dias, 'dia', 'dias')}, contando a partir de ${formatarData(referencia)}.`);
      }
    },
  },
};

function executarComando(nome, argumentos) {
  const comando = COMANDOS[nome];
  if (!comando) {
    throw new Error(`comando desconhecido: "${nome}". Os comandos são ${Object.keys(COMANDOS).join(', ')}.`);
  }
  // O uso diz quantos argumentos são obrigatórios: os que estão entre < >.
  const obrigatorios = (comando.uso.match(/<[^>]+>/g) || []).length;
  if (argumentos.length < obrigatorios) {
    throw new Error(`faltam argumentos. Uso: node ${NOME_DO_PROGRAMA} ${comando.uso}`);
  }
  comando.executar(argumentos);
}

function mostrarUso() {
  console.log(`Uso: node ${NOME_DO_PROGRAMA} <comando> [argumentos]`);
  console.log(`     node ${NOME_DO_PROGRAMA} --demo`);
  console.log('');
  console.log('Comandos:');
  for (const comando of Object.values(COMANDOS)) {
    console.log(`  ${comando.uso}`);
  }
  console.log('');
  console.log('Datas no formato AAAA-MM-DD ou DD/MM/AAAA. Sem data de referência, vale hoje.');
}

function demo() {
  const referencia = '27/10/2026';
  console.log(`=== Demonstração: cada comando com datas de exemplo (referência fixa: ${referencia}) ===`);
  console.log('');
  const roteiro = [
    ['entre', ['2026-01-01', '2026-12-25']],
    ['entre', ['25/12/2026', '01/01/2026']],
    ['dia', ['25/12/2026']],
    ['dia', ['2000-02-29']],
    ['idade', ['15/05/1990', referencia]],
    ['somar', ['31/01/2026', '30']],
    ['somar', ['01/03/2026', '-1']],
    ['faltam', ['25/12/2026', referencia]],
    ['faltam', ['01/01/2026', referencia]],
  ];
  for (const [comando, argumentos] of roteiro) {
    console.log(`> ${comando} ${argumentos.join(' ')}`);
    executarComando(comando, argumentos);
    console.log('');
  }
  console.log(`Hoje de verdade, segundo o relógio deste computador, é ${formatarData(hoje())}, ${nomeDoDiaDaSemana.format(hoje())}.`);
}

function main(argumentos) {
  if (argumentos.includes('--demo')) {
    demo();
    return;
  }
  if (argumentos.length === 0 || argumentos.includes('--ajuda') || argumentos.includes('-h')) {
    mostrarUso();
    return;
  }
  const [comando, ...resto] = argumentos;
  executarComando(comando.toLowerCase(), resto);
}

try {
  main(process.argv.slice(2));
} catch (erro) {
  console.error(`Erro: ${erro.message}`);
  console.error(`Rode "node ${NOME_DO_PROGRAMA}" sem argumentos para ver o uso.`);
  process.exitCode = 1;
}

/*
 * Para ir além:
 *  1. Acrescente o comando "uteis", que conta só dias de segunda a sexta entre duas datas.
 *  2. Faça "somar" aceitar meses (somar 31/01/2026 1m) e trate o caso de o mês seguinte ser mais curto.
 *  3. Leia uma lista de aniversários de um arquivo e imprima o próximo a chegar.
 */
