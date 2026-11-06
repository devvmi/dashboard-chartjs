/* ============================================================
   CÓDIGO DA EQUIPE - Gráficos, Abas e Filtros (data.json)
   ============================================================ */
(function () {
    "use strict";

    const DADOS_URL = "json/data.json";
    const $ = id => document.getElementById(id);

    /* ABAS */
    const TABS = ["inicio", "dashboard", "observacoes"];
    let abaAtual = null;

    function show(name) {
        if (!TABS.includes(name)) name = "inicio";
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

    /* DADOS E FAIXAS */
    const FAIXAS = [
        { nome: "0–2 h", max: 2 }, { nome: "3–5 h", max: 5 },
        { nome: "6–10 h", max: 10 }, { nome: "11–20 h", max: 20 },
        { nome: "Mais de 20 h", max: Infinity }
    ];
    const NOMES_FAIXAS = FAIXAS.map(f => f.nome);
    const FAIXA_MODERADO = 2;
    const FAIXA_INTENSO = 4;
    const MIN_AMOSTRA = 30;

    let CELULAS = [];
    let TOTAL_ESTUDANTES = 0;
    let dadosProntos = false;

    function indiceFaixa(horas) {
        return FAIXAS.findIndex(f => horas <= f.max);
    }

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
        aviso.style.cssText = "background:var(--paper);border:1.5px solid var(--orange);color:var(--ink);border-radius:12px;padding:12px 16px;margin:0 0 24px;font-size:.95rem";
        aviso.textContent = "Não foi possível carregar o " + DADOS_URL + ". Abra o site por um servidor local.";
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

    /* FILTROS */
    const GRUPOS_NIVEL = {
        undergrad: ["Freshman", "Sophomore", "Junior", "Senior"],
        postgrad: ["Graduate"]
    };
    const filtros = { nivel: "all", area: "all", politica: "all" };
    const SELECTS_FILTRO = { lvl: "nivel", area: "area", politica: "politica" };
    const FILTROS_EXTRAS = [
        {
            id: "area", rotulo: "Área",
            opcoes: [["all", "Todas"], ["STEM", "STEM"], ["Business", "Negócios"], ["Humanities", "Humanas"], ["Medical", "Saúde"], ["Arts", "Artes"]]
        },
        {
            id: "politica", rotulo: "Política da instituição",
            opcoes: [["all", "Todas"], ["Actively_Encouraged", "IA incentivada"], ["Allowed_With_Citation", "Permitida com citação"], ["Strict_Ban", "IA proibida"]]
        }
    ];

    function montarFiltros() {
        const selectNivel = $("lvl");
        if (!selectNivel) return;
        const opcaoMedio = selectNivel.querySelector('option[value="highschool"]');
        if (opcaoMedio) opcaoMedio.remove();

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

        const cabecalho = document.querySelector("#dashboard .dh > div");
        const recorte = document.createElement("p");
        recorte.id = "recorte";
        if (cabecalho) cabecalho.appendChild(recorte);

        Object.entries(SELECTS_FILTRO).forEach(([idSelect, nomeFiltro]) => {
            const select = $(idSelect);
            if (select) {
                filtros[nomeFiltro] = select.value;
                select.addEventListener("change", e => {
                    filtros[nomeFiltro] = e.target.value;
                    atualizarDashboard();
                });
            }
        });
    }

    function filtrarCelulas() {
        return CELULAS.filter(c =>
            (filtros.nivel === "all" || GRUPOS_NIVEL[filtros.nivel].includes(c.ano)) &&
            (filtros.area === "all" || c.area === filtros.area) &&
            (filtros.politica === "all" || c.politica === filtros.politica)
        );
    }

    /* CÁLCULO */
    function somarCelulas(celulas) {
        const total = { n: 0, bl: 0, bm: 0, bh: 0, hrs: 0, dgpa: 0, gpa: 0, ret: 0, anx: 0, dep: 0 };
        celulas.forEach(c => {
            for (const metrica in total) total[metrica] += c[metrica];
        });
        return total;
    }
    // Um Total para cada faixa
    function totaisPorFaixa(celulas) {
        return FAIXAS.map((_, i) => somarCelulas(celulas.filter(c => c.faixa === i)));
    }
    // Média = soma / n, mas só se a amostra for grande o bastante.
    // Com null o Chart.js deixa o ponto vazio em vez de mostrar um número instável.
    function media(soma, n) {
        return n >= MIN_AMOSTRA ? soma / n : null;
    }

    function eixosRadar(total) {
        const n = total.n;
        if (n < MIN_AMOSTRA) return [null, null, null, null];
        return [
            total.ret / n,
            (total.gpa / n) / 4 * 100,
            (10 - total.anx / n) / 9 * 100,
            (10 - total.dep / n) / 9 * 100
        ];
    }
    function formatar(valor, casas = 1) {
        return valor.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
    }

    /* MEDIDOR DE BURNOUT (home) */
    const dots = $("dots");
    if (dots) {
        for (let i = 0; i < 100; i++) dots.appendChild(document.createElement("i"));
    }
    const hrs = $("hrs");
    let bandasBurnout = null;

    function pintarPontos(p) {
        if (dots) [...dots.children].forEach((d, i) => d.classList.toggle("on", i < p));
    }

    function meter() {
        if (!hrs) return;
        const h = +hrs.value;
        if ($("hout")) $("hout").textContent = h + " h";
        if (!bandasBurnout) return;
        const p = bandasBurnout[indiceFaixa(h)];
        if ($("pct")) $("pct").textContent = p;
        pintarPontos(p);
    }
    if (hrs) hrs.addEventListener("input", meter);

    function calcularBandasBurnout() {
        bandasBurnout = totaisPorFaixa(CELULAS).map(t => Math.round(t.bh / t.n * 100));
    }

    /* GRÁFICOS */
    const v = nome => getComputedStyle(document.documentElement).getPropertyValue(nome).trim();
    let graficos = null;

    function criarGraficos() {
        const ink = v("--ink"), muted = v("--muted"), line = v("--line");
        Chart.defaults.font.family = '"Bricolage Grotesque", system-ui, sans-serif';
        Chart.defaults.color = muted;
        const base = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };

        const linha = new Chart("c1", {
            type: "line",
            data: { labels: NOMES_FAIXAS, datasets: [{ label: "Variação média de GPA", data: [], borderColor: v("--kiwi"), backgroundColor: v("--kiwi"), borderWidth: 4, tension: .35, pointRadius: 6, pointHoverRadius: 8 }] },
            options: { ...base, plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y >= 0 ? "+" : ""}${formatar(ctx.parsed.y, 3)} pontos de GPA` } } }, scales: { x: { grid: { display: false } }, y: { suggestedMin: 0, suggestedMax: 0.3, grid: { color: line }, title: { display: true, text: "Variação de GPA" } } } }
        });

        const barras = new Chart("c2", {
            type: "bar",
            data: { labels: NOMES_FAIXAS, datasets: [{ label: "Burnout alto (%)", data: [], backgroundColor: [v("--leaf"), v("--leaf"), v("--orange"), v("--melon"), v("--berry")], borderRadius: 10 }] },
            options: { ...base, plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${formatar(ctx.parsed.y)}% com burnout alto` } } }, scales: { x: { grid: { display: false } }, y: { min: 0, max: 100, grid: { color: line }, ticks: { callback: x => x + "%" } } } }
        });

        const radar = new Chart("c3", {
            type: "radar",
            data: { labels: ["Retenção de habilidades", "Desempenho (GPA)", "Controle da ansiedade", "Autonomia"], datasets: [{ label: "Uso moderado", data: [], borderColor: v("--kiwi"), backgroundColor: v("--kiwi") + "33", borderWidth: 3 }, { label: "Uso intenso", data: [], borderColor: v("--berry"), backgroundColor: v("--berry") + "33", borderWidth: 3 }] },
            options: { ...base, plugins: { legend: { display: true, position: "bottom", labels: { color: ink, usePointStyle: true } }, tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${formatar(ctx.parsed.r)}` } } }, scales: { r: { min: 0, max: 100, grid: { color: line }, angleLines: { color: line }, ticks: { display: false }, pointLabels: { color: ink, font: { size: 12 } } } } }
        });
        graficos = { linha, barras, radar };
    }

    function desenharGraficos() {
        if (typeof Chart === "undefined") { console.error("Chart.js ausente."); return; }
        if (!graficos) criarGraficos();
        atualizarDashboard();
    }

    function textoRecorte(n, algumaFaixaVazia) {
        if (!n) return "Nenhum estudante neste recorte.";
        let texto = `Recorte atual: ${formatar(n, 0)} de ${formatar(TOTAL_ESTUDANTES, 0)} estudantes.`;
        if (algumaFaixaVazia) texto += ` Faixas com menos de ${MIN_AMOSTRA} estudantes ficam sem ponto nos gráficos.`;
        return texto;
    }

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
        if ($("recorte")) $("recorte").textContent = textoRecorte(total.n, porFaixa.some(t => t.n < MIN_AMOSTRA));
    }

    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => { if (graficos) Object.values(graficos).forEach(g => g.update()); });
    }

    /* INÍCIO */
    montarFiltros();
    document.querySelectorAll("nav button").forEach(b => b.addEventListener("click", () => show(b.dataset.tab)));
    window.addEventListener("hashchange", () => show(location.hash.slice(1)));

    if ($("pct")) pintarPontos(+$("pct").textContent);
    meter();
    show(location.hash.slice(1) || "inicio");

    carregarDados().then(() => {
        if (!dadosProntos) return;
        calcularBandasBurnout();
        meter();
        atualizarDashboard();
    });

})();


/* ============================================================
   CÓDIGO DE MIGUEL - Back4App (CRUD), Prismix e Eventos
   ============================================================ */

// 1. A "Máquina" HTTP usando as constantes protegidas do config.js
async function requisicaoAPI(endpoint, metodo = 'GET', dados = null) {
    const config = {
        method: metodo,
        headers: {
            'X-Parse-Application-Id': APP_ID,
            'X-Parse-REST-API-Key': REST_KEY,
            'Content-Type': 'application/json'
        }
    };
    if (dados) config.body = JSON.stringify(dados);
    try {
        const response = await fetch(`${SERVER_URL}${endpoint}`, config);
        return await response.json();
    } catch (error) {
        console.error('Erro na requisição Back4App:', error);
        return null;
    }
}

// 2. Carregar as observações
// 2. Carregar as observações
async function carregarTarefas() {
    const resultado = await requisicaoAPI('/parse/classes/Tarefa');
    const listDiv = document.getElementById('listaTarefas');

    if (!listDiv) return;

    if (resultado && resultado.results) {
        listDiv.innerHTML = '';
        resultado.results.forEach(tarefa => {
            const div = document.createElement('div');
            div.className = 'tarefa';
            
            // Criando a estrutura alinhada com os estilos do projeto
            div.innerHTML = `
                <p style="margin: 0; flex-grow: 1;">${tarefa.titulo}</p>
                <button class="btn" onclick="excluirTarefa('${tarefa.objectId}')" style="background: var(--berry); border: none; color: white;">Excluir</button>
            `;
            
            // Aplicando estilo inline rápido para manter os itens arrumados sem precisar mexer no styles.css de Rafa
            div.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 12px; background: var(--paper); border: 1px solid var(--line); border-radius: 8px; margin-bottom: 8px;";
            
            listDiv.appendChild(div);
        });
    }
}

// 3. Adicionar observação
async function adicionarTarefa() {
    const input = document.getElementById('novaTarefa');
    const titulo = input.value;

    if (!titulo.trim()) {
        alert('Digite o texto da observação!');
        return;
    }

    const novaTarefa = { titulo: titulo };
    const resultado = await requisicaoAPI('/parse/classes/Tarefa', 'POST', novaTarefa);

    if (resultado && resultado.objectId) {
        input.value = '';
        carregarTarefas();
    }
}

// 4. Excluir observação (Chamada pelo botão HTML injetado acima)
async function excluirTarefa(objectId) {
    if (confirm('Tem certeza que deseja excluir esta observação?')) {
        await requisicaoAPI(`/parse/classes/Tarefa/${objectId}`, 'DELETE');
        carregarTarefas();
    }
}

// 5. Baixar a lista em .txt
async function baixarLista() {
    const resultado = await requisicaoAPI('/parse/classes/Tarefa');
    if (resultado && resultado.results && resultado.results.length > 0) {
        let textoParaArquivo = "--- MINHAS OBSERVAÇÕES SOBRE IA ---\n\n";
        resultado.results.forEach((tarefa, numero) => {
            textoParaArquivo += `${numero + 1}. ${tarefa.titulo}\n`;
        });
        const arquivoVirtual = new Blob([textoParaArquivo], { type: 'text/plain' });
        const linkDoArquivo = URL.createObjectURL(arquivoVirtual);
        const linkInvisivel = document.createElement('a');
        linkInvisivel.href = linkDoArquivo;
        linkInvisivel.download = 'lista_de_observacoes.txt';
        document.body.appendChild(linkInvisivel);
        linkInvisivel.click();
        document.body.removeChild(linkInvisivel);
    } else {
        alert("A lista está vazia! Adicione algo antes de baixar.");
    }
}

// 6 . Injetar IAs da Prismix na div correta
function carregarIAsPrismix() {
    const ias = ['anthropic', 'openai', 'deepseek', 'midjourney', 'github-copilot'];
    const divPrincipais = document.getElementById('listaPrincipais');

    if (!divPrincipais) return;

    divPrincipais.style.cssText = "display: flex; gap: 12px; flex-wrap: wrap;";

    ias.forEach(ia => {
        const img = document.createElement('img');
        img.src = `https://prismix.dev/api/badge/${ia}.svg`;
        img.alt = `Status ${ia}`;
        img.height = 30;
        divPrincipais.appendChild(img);
    });
}

// 7. Ligar os botões do HTML ao JavaScript e inicializar tudonho
window.addEventListener('load', () => {
    // Liga os botões de observações às suas funções via ID
    const btnAdd = document.getElementById('btnAdicionar');
    if (btnAdd) btnAdd.addEventListener('click', adicionarTarefa);

    const btnAtualizar = document.getElementById('btnAtualizar');
    if (btnAtualizar) btnAtualizar.addEventListener('click', carregarTarefas);

    const btnBaixar = document.getElementById('btnBaixar');
    if (btnBaixar) btnBaixar.addEventListener('click', baixarLista);

    // Permite adicionar a tarefa apertando "Enter" no teclado
    const inputNovaTarefa = document.getElementById('novaTarefa');
    if (inputNovaTarefa) {
        inputNovaTarefa.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') adicionarTarefa();
        });
    }

    // Carreaga os dados iniciais
    carregarTarefas();
    carregarIAsPrismix();
});