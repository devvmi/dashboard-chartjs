(function () {
  "use strict";

  /* =========================================================
     API 1 - 'Prismix': mostra na tela o status das IAs mais famosas
     ========================================================= */
  function carregarStatusIA() {
    const iasEscolhidas = ["anthropic", "gemini-api", "openai", "github-copilot", "midjourney"];
    const divPrincipais = document.getElementById("listaPrincipais");
    divPrincipais.innerHTML = "";

    iasEscolhidas.forEach(ia => {
      const img = document.createElement("img");
      img.src = `https://prismix.dev/api/badge/${ia}.svg`;
      img.alt = `Status ${ia}`;
      divPrincipais.appendChild(img);
    });
  }

  // Função para fazer requisições HTTP
  async function requisicaoAPI(endpoint, metodo = "GET", dados = null) {
    try {
      const config = {
        method: metodo,
        headers: {
          "X-Parse-Application-Id": APP_ID,
          "X-Parse-REST-API-Key": REST_KEY,
          "Content-Type": "application/json"
        }
      };

      if (dados) {
        config.body = JSON.stringify(dados);
      }

      const response = await fetch(`${SERVER_URL}${endpoint}`, config);
      return await response.json();
    } catch (error) {
      console.error("Erro na requisição:", error);
      return null;
    }
  }

  function mensagemLista(texto) {
    const listDiv = document.getElementById("listaTarefas");
    listDiv.innerHTML = "";
    const p = document.createElement("p");
    p.className = "empty";
    p.textContent = texto;
    listDiv.appendChild(p);
  }

  async function carregarTarefas() {
    const resultado = await requisicaoAPI("/parse/classes/Tarefa");
    const listDiv = document.getElementById("listaTarefas");

    if (!resultado || !resultado.results) {
      mensagemLista("Não foi possível carregar as observações. Confira o config.js e o Console (F12).");
      return;
    }

    if (!resultado.results.length) {
      mensagemLista("Nenhuma observação ainda. Escreva a primeira acima.");
      return;
    }

    listDiv.innerHTML = "";
    resultado.results.forEach(tarefa => {
      const div = document.createElement("div");
      div.className = "tarefa";

      const texto = document.createElement("span");
      texto.textContent = tarefa.titulo;

      const botao = document.createElement("button");
      botao.textContent = "Excluir";
      botao.setAttribute("aria-label", "Excluir observação: " + tarefa.titulo);
      botao.addEventListener("click", () => excluirTarefa(tarefa.objectId));

      div.append(texto, botao);
      listDiv.appendChild(div);
    });
  }

  // Adicionar uma nova observação no banco
  async function adicionarTarefa() {
    const input = document.getElementById("novaTarefa");
    const titulo = input.value;

    if (!titulo.trim()) {
      alert("Digite o texto da observação!");
      return;
    }
    const novaTarefa = { titulo: titulo };

    const resultado = await requisicaoAPI("/parse/classes/Tarefa", "POST", novaTarefa);

    if (resultado && resultado.objectId) {
      input.value = ""; // Limpa o input
      carregarTarefas(); // Atualiza a lista
    } else {
      alert("Não foi possível salvar a observação. Confira o config.js e o Console (F12).");
    }
  }

  // Excluir a observação do banco
  async function excluirTarefa(objectId) {
    if (confirm("Tem certeza que deseja excluir esta observação?")) {
      const resultado = await requisicaoAPI(`/parse/classes/Tarefa/${objectId}`, "DELETE");
      if (!resultado) alert("Não foi possível excluir a observação.");
      carregarTarefas();
    }
  }

  // Função para gerar o arquivo e fazer o download
  async function baixarLista() {
    // 1. Pede a lista atualizada
    const resultado = await requisicaoAPI("/parse/classes/Tarefa");

    // Verifica se tem itens lá na lista
    if (resultado && resultado.results && resultado.results.length > 0) {

      // 2. Monta o textinho que vai dentro do arquivo
      let textoParaArquivo = "--- MINHAS OBSERVAÇÕES SOBRE IA ---\n\n";

      resultado.results.forEach((tarefa, numero) => {
        textoParaArquivo += `${numero + 1}. ${tarefa.titulo}\n`;
      });

      // 3. Cria um "arquivo virtual" de texto lá no navegador
      const arquivoVirtual = new Blob([textoParaArquivo], { type: "text/plain" });
      const linkDoArquivo = URL.createObjectURL(arquivoVirtual);

      // 4. Link temporário: cria um link, clica nele e depois apaga
      const linkInvisivel = document.createElement("a");
      linkInvisivel.href = linkDoArquivo;
      linkInvisivel.download = "lista_de_observacoes.txt"; // Nome do arquivo que vai baixar

      document.body.appendChild(linkInvisivel);
      linkInvisivel.click(); // Força o clique para iniciar o download
      document.body.removeChild(linkInvisivel); // Apaga o link para não sujar a tela

      // Libera a memória só depois, senão alguns navegadores cancelam o download
      setTimeout(() => URL.revokeObjectURL(linkDoArquivo), 1000);

    } else if (resultado && resultado.results) {
      alert("A lista está vazia! Adicione algo antes de baixar.");
    } else {
      alert("Não foi possível buscar a lista. Confira o config.js e o Console (F12).");
    }
  }

  // Botões da aba Observações (ligados aqui para o HTML ficar só com HTML)
  document.getElementById("btnAdicionar").addEventListener("click", adicionarTarefa);
  document.getElementById("btnAtualizar").addEventListener("click", carregarTarefas);
  document.getElementById("btnBaixar").addEventListener("click", baixarLista);
  document.getElementById("novaTarefa").addEventListener("keydown", e => {
    if (e.key === "Enter") adicionarTarefa();
  });

  /* =========================================================
     ABAS
     ========================================================= */
  const TABS = ["inicio", "dashboard", "observacoes"];
  let abaAtual = null;
  let charts = [];

  function show(name) {
    if (!TABS.includes(name)) name = "inicio";

    // Evita trabalho dobro: mudar o hash dispara "hashchange", que chamaria show() de novo
    if (name === abaAtual) return;
    abaAtual = name;

    TABS.forEach(t => document.getElementById(t).hidden = t !== name);
    document.querySelectorAll("nav button").forEach(b => {
      if (b.dataset.tab === name) b.setAttribute("aria-current", "page");
      else b.removeAttribute("aria-current");
    });

    if (name === "dashboard") drawCharts();
    if (location.hash !== "#" + name) location.hash = name;
  }

  document.querySelectorAll("nav button").forEach(b =>
    b.addEventListener("click", () => show(b.dataset.tab))
  );
  window.addEventListener("hashchange", () => show(location.hash.slice(1)));
/* ============================================================
   AI & Academia — script.js
   Feito para o index.html e o styles.css atuais, sem alterar nenhum dos dois.
   Cuida das abas, do medidor de burnout da home, dos filtros e dos gráficos.
   Não faz chamadas de API (Back4App e Prismix ficam de fora): só lê o json/data.json local.
   ============================================================ */
(function () {
  "use strict";

  // Onde está o dataset de 50.000 estudantes, relativo ao index.html
  const DADOS_URL = "json/data.json";

  const $ = id => document.getElementById(id);

  /* =========================================================
     ABAS
     ========================================================= */
  const TABS = ["inicio", "dashboard", "observacoes"];
  let abaAtual = null;

  function show(name) {
    if (!TABS.includes(name)) name = "inicio";

    // Evita trabalho dobro: mudar o hash dispara "hashchange", que chamaria show() de novo
    if (name === abaAtual) return;
    abaAtual = name;

    TABS.forEach(t => { $(t).hidden = t !== name; });
    document.querySelectorAll("nav button").forEach(b => {
      if (b.dataset.tab === name) b.setAttribute("aria-current", "page");
      else b.removeAttribute("aria-current");
    });

    if (name === "dashboard") desenharGraficos();
    if (location.hash !== "#" + name) location.hash = name;
  }

  /* =========================================================
     DADOS
     Os 50.000 estudantes são lidos do data.json e agrupados em "células".
     Cada célula guarda a contagem (n) e as somas das métricas de um grupo:
     faixa de horas x ano de estudo x área x política institucional.
     Filtrar = escolher as células certas. Média = soma / n.
     ========================================================= */

  // Faixas de horas semanais de IA, as mesmas do texto do HTML ("0–2 h", "3–5 h", ...).
  // Cada faixa vai até o limite "max", inclusive: 2 h cai em "0–2 h", 20 h cai em "11–20 h".
  const FAIXAS = [
    { nome: "0–2 h", max: 2 },
    { nome: "3–5 h", max: 5 },
    { nome: "6–10 h", max: 10 },
    { nome: "11–20 h", max: 20 },
    { nome: "Mais de 20 h", max: Infinity }
  ];
  const NOMES_FAIXAS = FAIXAS.map(f => f.nome);

  // Faixas comparadas no radar: o HTML diz "uso moderado (6–10 h) comparado a uso intenso (mais de 20 h)"
  const FAIXA_MODERADO = 2;
  const FAIXA_INTENSO = 4;

  const MIN_AMOSTRA = 30; // grupos com menos estudantes que isso ficam sem ponto no gráfico

  let CELULAS = [];
  let TOTAL_ESTUDANTES = 0;
  let dadosProntos = false;

  function indiceFaixa(horas) {
    return FAIXAS.findIndex(f => horas <= f.max);
  }

  // n = estudantes | bl/bm/bh = burnout baixo/médio/alto | hrs = horas de IA | dgpa = variação de GPA
  // gpa = GPA pós-semestre | ret = retenção | anx = ansiedade | dep = dependência percebida
  function agregarEstudantes(estudantes) {
    const grupos = new Map();

    estudantes.forEach(e => {
      const faixa = indiceFaixa(e.Weekly_GenAI_Hours);
      if (faixa === -1) return;

      const chave = [faixa, e.Year_of_Study, e.Major_Category, e.Institutional_Policy].join("|");
      if (!grupos.has(chave)) {
        grupos.set(chave, {
          faixa, ano: e.Year_of_Study, area: e.Major_Category, politica: e.Institutional_Policy,
          n: 0, bl: 0, bm: 0, bh: 0, hrs: 0, dgpa: 0, gpa: 0, ret: 0, anx: 0, dep: 0
        });
      }

      const c = grupos.get(chave);
      c.n++;
      if (e.Burnout_Risk_Level === "Low") c.bl++;
      if (e.Burnout_Risk_Level === "Medium") c.bm++;
      if (e.Burnout_Risk_Level === "High") c.bh++;
      c.hrs += e.Weekly_GenAI_Hours;
      c.dgpa += e.Post_Semester_GPA - e.Pre_Semester_GPA;
      c.gpa += e.Post_Semester_GPA;
      c.ret += e.Skill_Retention_Score;
      c.anx += e.Anxiety_Level_During_Exams;
      c.dep += e.Perceived_AI_Dependency;
    });

    return Array.from(grupos.values());
  }

  // Aviso no topo da página se o data.json não carregar (ex.: site aberto direto do arquivo, sem servidor)
  function mostrarAvisoDados(mostrar) {
    let aviso = $("avisoDados");
    if (!mostrar) {
      if (aviso) aviso.remove();
      return;
    }
    if (aviso) return;

    aviso = document.createElement("p");
    aviso.id = "avisoDados";
    aviso.setAttribute("role", "alert");
    aviso.style.cssText = "background:var(--paper);border:1.5px solid var(--orange);color:var(--ink);" +
      "border-radius:12px;padding:12px 16px;margin:0 0 24px;font-size:.95rem";
    aviso.textContent = "Não foi possível carregar o " + DADOS_URL + ". Abra o site por um servidor local " +
      "(por exemplo, a extensão Live Server do VS Code) ou pelo GitHub Pages, e confira se o arquivo está nessa pasta.";
    const main = document.querySelector("main");
    main.insertBefore(aviso, main.firstChild);
  }

  async function carregarDados() {
    try {
      const resposta = await fetch(DADOS_URL);
      if (!resposta.ok) throw new Error("HTTP " + resposta.status);
      CELULAS = agregarEstudantes(await resposta.json());
      TOTAL_ESTUDANTES = CELULAS.reduce((soma, c) => soma + c.n, 0);
      dadosProntos = true;
      mostrarAvisoDados(false);
    } catch (erro) {
      console.error("Erro ao carregar " + DADOS_URL + ":", erro);
      mostrarAvisoDados(true);
    }
  }

  /* =========================================================
     FILTROS
     ========================================================= */

  // "Graduação" reúne os 4 anos de graduação; "Pós-graduação" é o ano "Graduate"
  const GRUPOS_NIVEL = {
    undergrad: ["Freshman", "Sophomore", "Junior", "Senior"],
    postgrad: ["Graduate"]
  };

  // Filtros ativos ("all" = sem filtro)
  const filtros = { nivel: "all", area: "all", politica: "all" };

  // id do <select> -> nome do filtro acima.
  // O de nível (#lvl) já existe no index.html; os outros dois são criados por montarFiltros().
  const SELECTS_FILTRO = { lvl: "nivel", area: "area", politica: "politica" };

  // Selects extras, criados pelo script com a mesma classe (.filter) do filtro que já existe
  const FILTROS_EXTRAS = [
    {
      id: "area", rotulo: "Área",
      opcoes: [["all", "Todas"], ["STEM", "STEM"], ["Business", "Negócios"],
               ["Humanities", "Humanas"], ["Medical", "Saúde"], ["Arts", "Artes"]]
    },
    {
      id: "politica", rotulo: "Política da instituição",
      opcoes: [["all", "Todas"], ["Actively_Encouraged", "IA incentivada"],
               ["Allowed_With_Citation", "Permitida com citação"], ["Strict_Ban", "IA proibida"]]
    }
  ];

  function montarFiltros() {
    const selectNivel = $("lvl");

    // O dataset não tem estudantes de ensino médio, então essa opção não filtraria nada
    const opcaoMedio = selectNivel.querySelector('option[value="highschool"]');
    if (opcaoMedio) opcaoMedio.remove();

    // Junta os 3 filtros numa caixa só, lado a lado
    const filtroNivel = selectNivel.closest(".filter");
    const caixa = document.createElement("div");
    caixa.style.cssText = "display:flex;flex-wrap:wrap;gap:16px;align-items:center";
    filtroNivel.parentNode.insertBefore(caixa, filtroNivel);
    caixa.appendChild(filtroNivel);

    FILTROS_EXTRAS.forEach(f => {
      const grupo = document.createElement("div");
      grupo.className = "filter";

      const rotulo = document.createElement("label");
      rotulo.htmlFor = f.id;
      rotulo.textContent = f.rotulo;

      const select = document.createElement("select");
      select.id = f.id;
      f.opcoes.forEach(([valor, texto]) => {
        const opcao = document.createElement("option");
        opcao.value = valor;
        opcao.textContent = texto;
        select.appendChild(opcao);
      });

      grupo.append(rotulo, select);
      caixa.appendChild(grupo);
    });

    // Linha com o tamanho do recorte, logo abaixo do texto de abertura do dashboard
    const cabecalho = document.querySelector("#dashboard .dh > div");
    const recorte = document.createElement("p");
    recorte.id = "recorte";
    cabecalho.appendChild(recorte);

    // Cada <select> atualiza o seu filtro e redesenha o dashboard
    Object.entries(SELECTS_FILTRO).forEach(([idSelect, nomeFiltro]) => {
      const select = $(idSelect);
      // O navegador pode restaurar o valor do select após um refresh, então lê o valor atual
      filtros[nomeFiltro] = select.value;
      select.addEventListener("change", e => {
        filtros[nomeFiltro] = e.target.value;
        atualizarDashboard();
      });
    });
  }

  // Devolve só as células que passam pelos filtros ativos
  function filtrarCelulas() {
    return CELULAS.filter(c =>
      (filtros.nivel === "all" || GRUPOS_NIVEL[filtros.nivel].includes(c.ano)) &&
      (filtros.area === "all" || c.area === filtros.area) &&
      (filtros.politica === "all" || c.politica === filtros.politica)
    );
  }

  /* =========================================================
     CÁLCULO
     ========================================================= */

  // Soma as métricas de várias células em um único total
  function somarCelulas(celulas) {
    const total = { n: 0, bl: 0, bm: 0, bh: 0, hrs: 0, dgpa: 0, gpa: 0, ret: 0, anx: 0, dep: 0 };
    celulas.forEach(c => {
      for (const metrica in total) total[metrica] += c[metrica];
    });
    return total;
  }

  // Um total para cada faixa de horas
  function totaisPorFaixa(celulas) {
    return FAIXAS.map((_, i) => somarCelulas(celulas.filter(c => c.faixa === i)));
  }

  // Média = soma / n, mas só se a amostra for grande o bastante.
  // Com null o Chart.js deixa o ponto vazio em vez de mostrar um número instável.
  function media(soma, n) {
    return n >= MIN_AMOSTRA ? soma / n : null;
  }

  // Os 4 eixos do radar, todos de 0 a 100 (quanto maior, melhor)
  function eixosRadar(total) {
    const n = total.n;
    if (n < MIN_AMOSTRA) return [null, null, null, null];
    return [
      total.ret / n,                   // Retenção de habilidades (já vem de 0 a 100)
      (total.gpa / n) / 4 * 100,       // GPA pós-semestre (escala 0-4 convertida para 0-100)
      (10 - total.anx / n) / 9 * 100,  // Controle da ansiedade (nível 1-10 invertido)
      (10 - total.dep / n) / 9 * 100   // Autonomia (dependência percebida 1-10 invertida)
    ];
  }

  function formatar(valor, casas = 1) {
    return valor.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
  }

  /* =========================================================
     MEDIDOR DE BURNOUT (home)
     A porcentagem de cada faixa vem do dataset inteiro: estudantes com burnout alto / estudantes da faixa.
     ========================================================= */
  const dots = $("dots");
  for (let i = 0; i < 100; i++) dots.appendChild(document.createElement("i"));
  const hrs = $("hrs");

  let bandasBurnout = null; // % de burnout alto por faixa, preenchido quando os dados chegam

  function pintarPontos(p) {
    [...dots.children].forEach((d, i) => d.classList.toggle("on", i < p));
  }

  function meter() {
    const h = +hrs.value;
    $("hout").textContent = h + " h";
    if (!bandasBurnout) return; // sem dados, mantém o valor inicial do HTML
    const p = bandasBurnout[indiceFaixa(h)];
    $("pct").textContent = p;
    pintarPontos(p);
  }
  hrs.addEventListener("input", meter);

  function calcularBandasBurnout() {
    bandasBurnout = totaisPorFaixa(CELULAS).map(t => Math.round(t.bh / t.n * 100));
  }

  /* =========================================================
     GRÁFICOS
     ========================================================= */
  const v = nome => getComputedStyle(document.documentElement).getPropertyValue(nome).trim();

  let graficos = null; // { linha, barras, radar }, criados na primeira vez que a aba Dashboard abre

  function criarGraficos() {
    const ink = v("--ink"), muted = v("--muted"), line = v("--line");
    Chart.defaults.font.family = '"Bricolage Grotesque", system-ui, sans-serif';
    Chart.defaults.color = muted;

    const base = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };

    // 1. Linha: variação média de GPA no semestre, por faixa de horas
    const linha = new Chart("c1", {
      type: "line",
      data: {
        labels: NOMES_FAIXAS,
        datasets: [{
          label: "Variação média de GPA (pós − pré)",
          data: [],
          borderColor: v("--kiwi"), backgroundColor: v("--kiwi"),
          borderWidth: 4, tension: .35, pointRadius: 6, pointHoverRadius: 8
        }]
      },
      options: {
        ...base,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.parsed.y >= 0 ? "+" : ""}${formatar(ctx.parsed.y, 3)} pontos de GPA`
            }
          }
        },
        scales: {
          x: { grid: { display: false } },
          y: {
            suggestedMin: 0, suggestedMax: 0.3, grid: { color: line },
            title: { display: true, text: "Variação de GPA no semestre" }
          }
        }
      }
    });

    // 2. Barras: % de estudantes com burnout alto, por faixa de horas
    const barras = new Chart("c2", {
      type: "bar",
      data: {
        labels: NOMES_FAIXAS,
        datasets: [{
          label: "Burnout alto (%)",
          data: [],
          backgroundColor: [v("--leaf"), v("--leaf"), v("--orange"), v("--melon"), v("--berry")],
          borderRadius: 10
        }]
      },
      options: {
        ...base,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ` ${formatar(ctx.parsed.y)}% com burnout alto` } }
        },
        scales: {
          x: { grid: { display: false } },
          y: { min: 0, max: 100, grid: { color: line }, ticks: { callback: x => x + "%" } }
        }
      }
    });

    // 3. Radar: uso moderado x uso intenso
    const radar = new Chart("c3", {
      type: "radar",
      data: {
        labels: ["Retenção de habilidades", "Desempenho (GPA)", "Controle da ansiedade", "Autonomia"],
        datasets: [
          { label: "Uso moderado", data: [], borderColor: v("--kiwi"), backgroundColor: v("--kiwi") + "33", borderWidth: 3 },
          { label: "Uso intenso", data: [], borderColor: v("--berry"), backgroundColor: v("--berry") + "33", borderWidth: 3 }
        ]
      },
      options: {
        ...base,
        plugins: {
          legend: { display: true, position: "bottom", labels: { color: ink, usePointStyle: true } },
          tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${formatar(ctx.parsed.r)}` } }
        },
        scales: {
          r: {
            min: 0, max: 100, grid: { color: line }, angleLines: { color: line },
            ticks: { display: false }, pointLabels: { color: ink, font: { size: 12 } }
          }
        }
      }
    });

    graficos = { linha, barras, radar };
  }

  // Abre o dashboard: cria os gráficos na primeira vez e preenche com os filtros ativos
  function desenharGraficos() {
    // Sem internet o Chart.js não carrega; avisa no Console em vez de quebrar a aba
    if (typeof Chart === "undefined") {
      console.error("Chart.js não carregou. Confira a conexão com a internet.");
      return;
    }
    if (!graficos) criarGraficos();
    atualizarDashboard();
  }

  function textoRecorte(n, algumaFaixaVazia) {
    if (!n) return "Nenhum estudante neste recorte.";
    let texto = `Recorte atual: ${formatar(n, 0)} de ${formatar(TOTAL_ESTUDANTES, 0)} estudantes.`;
    if (algumaFaixaVazia) texto += ` Faixas com menos de ${MIN_AMOSTRA} estudantes ficam sem ponto nos gráficos.`;
    return texto;
  }

  // Recalcula tudo com os filtros ativos e atualiza os gráficos.
  // É a função que todo filtro novo precisa chamar.
  function atualizarDashboard() {
    if (!graficos || !dadosProntos) return;

    const celulas = filtrarCelulas();
    const porFaixa = totaisPorFaixa(celulas);

    graficos.linha.data.datasets[0].data = porFaixa.map(t => media(t.dgpa, t.n));
    graficos.barras.data.datasets[0].data = porFaixa.map(t => media(t.bh * 100, t.n));
    graficos.radar.data.datasets[0].data = eixosRadar(porFaixa[FAIXA_MODERADO]);
    graficos.radar.data.datasets[1].data = eixosRadar(porFaixa[FAIXA_INTENSO]);

    Object.values(graficos).forEach(g => g.update());

    const total = somarCelulas(celulas);
    $("recorte").textContent = textoRecorte(total.n, porFaixa.some(t => t.n < MIN_AMOSTRA));
  }

  // Se a fonte terminar de carregar depois dos gráficos, redesenha para usar a fonte certa
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      if (graficos) Object.values(graficos).forEach(g => g.update());
    });
  }  
})();

  /* =========================================================
     INÍCIO: tudo que roda quando a página abre
     ========================================================= */
  meter();
  carregarStatusIA();
  carregarTarefas();
  show(location.hash.slice(1) || "inicio");
  montarFiltros();

  document.querySelectorAll("nav button").forEach(b =>
    b.addEventListener("click", () => show(b.dataset.tab))
  );
  window.addEventListener("hashchange", () => show(location.hash.slice(1)));

  pintarPontos(+$("pct").textContent); // mostra o valor inicial do HTML até os dados chegarem
  meter();
  show(location.hash.slice(1) || "inicio");

  carregarDados().then(() => {
    if (!dadosProntos) return;
    calcularBandasBurnout();
    meter();
    atualizarDashboard();
  });
})();
