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

  /* =========================================================
     MEDIDOR DE BURNOUT
     ========================================================= */
  const bands = [{ max: 2, p: 9 }, { max: 5, p: 15 }, { max: 10, p: 28 }, { max: 20, p: 49 }, { max: 99, p: 74 }];
  const dots = document.getElementById("dots");
  for (let i = 0; i < 100; i++) dots.appendChild(document.createElement("i"));
  const hrs = document.getElementById("hrs");

  function meter() {
    const h = +hrs.value;
    const p = bands.find(b => h <= b.max).p;
    document.getElementById("pct").textContent = p;
    document.getElementById("hout").textContent = h + " h";
    [...dots.children].forEach((d, i) => d.classList.toggle("on", i < p));
  }
  hrs.addEventListener("input", meter);

  /* =========================================================
     GRÁFICOS
     Valores por faixa são ilustrativos, exceto 9% e 74% de burnout.
     Troque pelos números reais do seu dataset.
     ========================================================= */
  const labels = ["0–2 h", "3–5 h", "6–10 h", "11–20 h", "Mais de 20 h"];
  const perf = [58, 66, 74, 69, 57];
  const burn = [9, 15, 28, 49, 74];
  const radarLabels = ["Síntese", "Pensamento crítico", "Retenção", "Autonomia", "Criatividade", "Organização"];
  const radarMod = [78, 70, 72, 74, 68, 76];
  const radarHigh = [70, 48, 50, 45, 52, 60];
  const off = { all: [0, 0], undergrad: [1, 0], postgrad: [4, -5], highschool: [-3, 6] };
  const v = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

  function drawCharts() {
    // Sem internet o Chart.js não carrega; avisa no Console em vez de quebrar a aba
    if (typeof Chart === "undefined") {
      console.error("Chart.js não carregou. Confira a conexão com a internet.");
      return;
    }

    charts.forEach(c => c.destroy());
    charts = [];

    const [dp, db] = off[document.getElementById("lvl").value];

    const ink = v("--ink"), muted = v("--muted"), line = v("--line");
    Chart.defaults.font.family = '"Bricolage Grotesque", system-ui, sans-serif';
    Chart.defaults.color = muted;

    const base = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };
    const scales = (max, sfx) => ({
      x: { grid: { display: false } },
      y: { min: 0, max, grid: { color: line }, ticks: { callback: x => x + sfx } }
    });

    charts.push(new Chart("c1", {
      type: "line",
      data: {
        labels,
        datasets: [{
          data: perf.map(x => x + dp),
          borderColor: v("--kiwi"), backgroundColor: v("--kiwi"),
          borderWidth: 4, tension: .35, pointRadius: 6, pointHoverRadius: 8
        }]
      },
      options: { ...base, scales: scales(100, "") }
    }));

    charts.push(new Chart("c2", {
      type: "bar",
      data: {
        labels,
        datasets: [{
          data: burn.map(x => Math.max(1, Math.min(95, x + db))),
          backgroundColor: [v("--leaf"), v("--leaf"), v("--orange"), v("--melon"), v("--berry")],
          borderRadius: 10
        }]
      },
      options: { ...base, scales: scales(100, "%") }
    }));

    charts.push(new Chart("c3", {
      type: "radar",
      data: {
        labels: radarLabels,
        datasets: [
          { label: "Uso moderado", data: radarMod.map(x => x + dp), borderColor: v("--kiwi"), backgroundColor: v("--kiwi") + "33", borderWidth: 3 },
          { label: "Uso intenso", data: radarHigh.map(x => x + dp), borderColor: v("--berry"), backgroundColor: v("--berry") + "33", borderWidth: 3 }
        ]
      },
      options: {
        ...base,
        plugins: { legend: { display: true, position: "bottom", labels: { color: ink, usePointStyle: true } } },
        scales: { r: { min: 0, max: 100, grid: { color: line }, angleLines: { color: line }, ticks: { display: false }, pointLabels: { color: ink, font: { size: 12 } } } }
      }
    }));
  }
  document.getElementById("lvl").addEventListener("change", drawCharts);

  // Se a fonte terminar de carregar depois dos gráficos, redesenha para usar a fonte certa
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => { if (abaAtual === "dashboard") drawCharts(); });
  }

  /* =========================================================
     INÍCIO: tudo que roda quando a página abre
     ========================================================= */
  meter();
  carregarStatusIA();
  carregarTarefas();
  show(location.hash.slice(1) || "inicio");
})();
