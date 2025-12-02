/* Etapas do código:

1. Leitura da Matriz
2. Estratégia:
    - Ponto de Sela
    - Mista 2x2
    - Mista com Suporte Duplo MxN
3. Impressão da Interpretação:
    - Movimento Fixo se houver Ponto de Sela
    - Movimento com Probabilidades se for Mista 2x2
    - Movimento com Probabilidades se for Mista MxN
4. Main: Orquestra as etapas acima
*/

// Biblioteca para entrada de dados
const prompt = require("prompt-sync")({ sigint: true });

/* Função para ler a matriz de pagamento do jogador A 
    - Lê m linhas e n colunas
    - Lê os valores da matriz A de pagamento (de Y para X)
    - Garante que cada linha tenha n valores numéricos
*/
function lerMatriz() {
    const m = parseInt(prompt("Número de movimentos do jogador X (linhas): ").trim());
    const n = parseInt(prompt("Número de movimentos do jogador Y (colunas): ").trim());
    const A = [];

    console.log("Digite a matriz A linha por linha (valores separados por espaço):");
    for (let i = 0; i < m; i++) {
        while (true) {
            const parts = prompt(`Linha ${i + 1}: `).trim().split(/\s+/);
            if (parts.length !== n) {
                console.log(`Por favor, insira exatamente ${n} valores.`);
                continue;
            }
            const row = parts.map(Number);
            if (row.some((x) => Number.isNaN(x))) {
                console.log("Valores inválidos. Use números.");
                continue;
            }
            A.push(row);
            break;
        }
    }
    return { A, m, n };
}

// Retorna o mínimo de uma linha e todos os índices onde ocorre
function minIndicesLinha(linha) {
    const minVal = Math.min(...linha);
    const idxs = linha.map((v, j) => (v === minVal ? j : -1)).filter((j) => j !== -1);
    return { minVal, idxs };
}

// Retorna o máximo da coluna j e todos os índices de linha onde ocorre
function maxIndicesColuna(A, j) {
    const col = A.map((row) => row[j]);
    const maxVal = Math.max(...col);
    const idxs = col.map((v, i) => (v === maxVal ? i : -1)).filter((i) => i !== -1);
    return { maxVal, idxs };
}

/* Função para encontrar ponto de sela
    Procura por um elemento que seja o mínimo na linha i e o máximo na coluna j
        - Se existe, retorna: existe: true, i, j, valor
        - Se não existe, retorna: existe: false
*/
function pontoDeSela(A) {
    const m = A.length;
    const n = A[0].length;
    for (let i = 0; i < m; i++) {
        const { minVal, idxs: jMins } = minIndicesLinha(A[i]);
        for (const jMin of jMins) {
            const { maxVal, idxs: iMaxs } = maxIndicesColuna(A, jMin);
            if (minVal === maxVal && iMaxs.includes(i)) {
                return { existe: true, i, j: jMin, valor: A[i][jMin] };
            }
        }
    }
    return { existe: false };
}

/* Função para estratégia mista 2x2
    Para A 2x2, A = [[a, b], [c, d]]
        D (Denominador) = a + d - b - c

        p = [p1 = (d - c) / D, p2 = (1 - p1)]
        q = [q1 = (d - b) / D, q2 = (1 - q1)]
        v = (a * d - b * c) / D
    Retorna p, q, v
*/
function estrategiasMistas2x2(A) {
    const a = A[0][0], b = A[0][1];
    const c = A[1][0], d = A[1][1];
    const D = a + d - b - c;

    if (Math.abs(D) < 1e-12) throw new Error("Jogo 2x2 degenerado: denominador zero.");

    const p1 = (d - c) / D;
    const p = [p1, 1 - p1];

    const q1 = (d - b) / D;
    const q = [q1, 1 - q1];

    const v = (a * d - b * c) / D;
    return { p, q, v };
}

/* Função para estratégia mista MxN (suporte duplo)
    Tenta resolver para suporte duplo (linhas r,s e colunas c,d)
        - Encontra payoffs iguais para linhas r,s e colunas c,d
        - Verifica se as probabilidades são válidas
        - Verifica se é melhor-resposta para todas as outras linhas/colunas

    Retorna p, q, v se encontrar solução válida
    Retorna null se não encontrar solução válida
*/
function resolverSuporteDuplo(A, r, s, c, d) {
  const Ar_c = A[r][c], Ar_d = A[r][d];
  const As_c = A[s][c], As_d = A[s][d];

  // Resolve q (indiferença para X)
  const denom_q = (Ar_c - Ar_d) - (As_c - As_d);
  if (Math.abs(denom_q) < 1e-12) return null;
  const q_c = (As_d - Ar_d) / denom_q;
  const q_d = 1 - q_c;

  // Resolve p (indiferença para Y)
  const denom_p = (Ar_c - As_c) - (Ar_d - As_d);
  if (Math.abs(denom_p) < 1e-12) return null;
  const p_r = (As_d - As_c) / denom_p;
  const p_s = 1 - p_r;

  // Probabilidades válidas?
  const okProb =
    q_c >= -1e-9 && q_c <= 1 + 1e-9 &&
    q_d >= -1e-9 && q_d <= 1 + 1e-9 &&
    p_r >= -1e-9 && p_r <= 1 + 1e-9 &&
    p_s >= -1e-9 && p_s <= 1 + 1e-9;
  if (!okProb) return null;

  // Valor do jogo
  const v_r = Ar_c * q_c + Ar_d * q_d;
  const v_s = As_c * q_c + As_d * q_d;
  const v = 0.5 * (v_r + v_s);

  const m = A.length, n = A[0].length;

  // Construção inicial de p (restrito a r,s)
  const p = Array(m).fill(0);
  p[r] = Math.max(0, p_r);
  p[s] = Math.max(0, p_s);
  const sp = p[r] + p[s];
  if (sp <= 1e-12) return null;
  p[r] /= sp; p[s] /= sp;

  // Identifica colunas indiferentes contra p
  const indiferentes = [];
  for (let j = 0; j < n; j++) {
    const payoff_j = p.reduce((acc, pi, i) => acc + pi * A[i][j], 0);
    if (Math.abs(payoff_j - v) < 1e-8) indiferentes.push(j);
  }

  // Regra de desempate:
  // - Se c e d são indiferentes, usa exatamente q_c e q_d (normalizados).
  // - Caso contrário, distribui uniformemente entre todas as indiferentes.
  const q = Array(n).fill(0);
  const parIndiferente = indiferentes.includes(c) && indiferentes.includes(d);

  if (parIndiferente) {
    const sq = Math.max(0, q_c) + Math.max(0, q_d);
    if (sq <= 1e-12) return null;
    q[c] = Math.max(0, q_c) / sq;
    q[d] = Math.max(0, q_d) / sq;
  } else {
    const peso = 1 / indiferentes.length;
    for (const j of indiferentes) q[j] = peso;
  }

  return { p, q, v };
}

/* Função para resolver estratégia mista via Programação Linear (simplex aproximado)
    Método: aproximação iterativa (gradiente projetado)
        - Inicializa probabilidades de Y uniformemente
        - Itera ajustando q (estratégia de Y) para minimizar payoff máximo de X
        - Normaliza q a cada passo para manter soma = 1
        - Calcula p (estratégia de X) a partir dos payoffs contra q

    Retorna p, q e valor do jogo v
*/
function resolverSimplex(A) {
  const m = A.length;
  const n = A[0].length;

  // Inicialização de Y
  let q = Array(n).fill(1/n);

  // Iterações para ajuste de q
  for (let iter = 0; iter < 5000; iter++) {
    const payoffs = A.map(row => row.reduce((acc, val, j) => acc + val * q[j], 0));
    const worstRow = payoffs.indexOf(Math.max(...payoffs));
    const grad = A[worstRow];

    const alpha = 0.01;
    q = q.map((val, j) => val - alpha * grad[j]);
    q = q.map(val => Math.max(0, val));
    const sumQ = q.reduce((a, b) => a + b, 0);
    q = q.map(val => val / sumQ);
  }

  // Payoffs finais contra q
  const payoffs = A.map(row => row.reduce((acc, val, j) => acc + val * q[j], 0));

  // Valor do jogo: média entre min e max payoff (evita sinal errado)
  const v = 0.5 * (Math.min(...payoffs) + Math.max(...payoffs));

  // Linhas quase indiferentes ao valor v entram no suporte
  const tol = 1e-2;
  let suporte = [];
  for (let i = 0; i < m; i++) {
    if (Math.abs(payoffs[i] - v) < tol) suporte.push(i);
  }
  if (suporte.length === 0) {
    // fallback: pega todas as linhas
    suporte = [...Array(m).keys()];
  }

  // Distribui probabilidade uniformemente entre as linhas do suporte
  const p = Array(m).fill(0);
  const peso = 1 / suporte.length;
  for (const i of suporte) p[i] = peso;

  // Normaliza q para garantir soma = 1
  const sumQ = q.reduce((a, b) => a + b, 0);
  q = q.map(val => val / sumQ);

  return { p, q, v };
}

/* Função para estratégia mista 
    - Primeiro tenta 2x2
    - Se falhar, tenta suportes duplos MxN
    - Retorna p, q, v ou null se não encontrar

    - Trata erro de Denominador zero em 2x2 como falha retorna null
*/
function estrategiasMistasGenerico(A) {
    const m = A.length, n = A[0].length;

    if (m == 2 && n == 2) {
        try {
            return estrategiasMistas2x2(A); // usa a fórmula direta para 2x2
        } catch (err) {
            console.log("Erro capturado em 2x2:", err.message);
            return null;
        }
    }

    var suporteDuplo = false;
    // Caso geral: tenta suportes de tamanho 2
    if (suporteDuplo){
        for (let r = 0; r < m; r++) {
            for (let s = r + 1; s < m; s++) {
                for (let c = 0; c < n; c++) {
                    for (let d = c + 1; d < n; d++) {
                        const sol = resolverSuporteDuplo(A, r, s, c, d);
                        if (sol) return sol;
                    }
                }
            }
        }
    }

    // Se não achou nada, tenta PL geral (simplex)
    console.log("Nenhum suporte duplo encontrado. Resolvendo via programação linear...");
    return resolverSimplex(A);
}

// Imprime interpretação para estratégia pura (ponto de sela).
function interpretarPuro(i, j, valor) {
  console.log("\nResultado: Estratégia pura (ponto de sela).");
  console.log(`- Jogador X deve escolher permanentemente o movimento ${i + 1}.`);
  console.log(`- Jogador Y deve escolher permanentemente o movimento ${j + 1}.`);
  console.log(`- Valor do jogo (pagamento de Y para X): ${valor.toFixed(6)}`);
}

// Imprime interpretação para estratégia mista.
function interpretarMisto(p, q, v) {
  console.log("\nResultado: Estratégias mistas (equilíbrio).");
  console.log("- Jogador X deve escolher os movimentos com as seguintes probabilidades:");
  p.forEach((prob, idx) => console.log(`  * Movimento ${idx + 1}: ${prob.toFixed(6)}`));
  console.log("- Jogador Y deve escolher os movimentos com as seguintes probabilidades:");
  q.forEach((prob, idx) => console.log(`  * Movimento ${idx + 1}: ${prob.toFixed(6)}`));
  console.log(`- Valor do jogo (pagamento esperado de Y para X): ${v.toFixed(6)}`);
}

/* Função principal
    - Lê a matriz
    - Verifica se há ponto de sela
        - Se houver ponto de sela, imprime o movimento fixo
        - Se não houver ponto de sela, aplica estratégias mistas
    - Imprime a interpretação dos resultados
*/
function main() {
  console.log("==== Análise de Jogo de Matriz (Soma Zero) ====");
  const { A, m, n } = lerMatriz();

  const sela = pontoDeSela(A);
  if (sela.existe) {
    interpretarPuro(sela.i, sela.j, sela.valor);
    return;
  }

  const misto = estrategiasMistasGenerico(A);
  if (misto) {
    interpretarMisto(misto.p, misto.q, misto.v);
  } else {
    console.log("\nNão foi encontrado ponto de sela nem equilíbrio misto com suporte de tamanho 2.");
  }
}

main();