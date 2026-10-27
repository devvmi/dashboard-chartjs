// API 1 - 'Prismix' que mostra na tela o Status das IAs mais famosas

function carregarStatusIA() {
    
    const iasEscolhidas = ['anthropic', 'gemini-api', 'openai', 'github-copilot', 'midjourney'];
    
    const divPrincipais = document.getElementById('listaPrincipais');
    divPrincipais.innerHTML = ''; 

        // Injeta a img para os status
    iasEscolhidas.forEach(ia => {
        const urlDaImagem = `https://prismix.dev/api/badge/${ia}.svg`;
        
        divPrincipais.innerHTML += `
            <img src="${urlDaImagem}" alt="Status ${ia}" style="margin-bottom: 10px; display: block; width: 200px;">
        `;
    });
}

carregarStatusIA(); // Necessário add <div id="listaPrincipais"></div> e <Script src="script.js"></Script> no body

   // API 2 - 'Back4App' BaaS - Backend como serviço
           
// Função para fazer requisições HTTP
async function requisicaoAPI(endpoint, metodo = 'GET', dados = null) {
    const config = {
        method: metodo,
        headers: {
            'X-Parse-Application-Id': APP_ID,
            'X-Parse-REST-API-Key': REST_KEY,
            'Content-Type': 'application/json'
        }
    };

    if (dados) {
        config.body = JSON.stringify(dados);
    }

    try {
        const response = await fetch(`${SERVER_URL}${endpoint}`, config);
        return await response.json();
    } catch (error) {
        console.error('Erro na requisição:', error);
        return null;
    }
}

// Carregar e exibir as observações na tela
async function carregarTarefas() {
    const resultado = await requisicaoAPI('/parse/classes/Tarefa');
    const listDiv = document.getElementById('listaTarefas');

    if (resultado && resultado.results) {
        listDiv.innerHTML = '';
        resultado.results.forEach(tarefa => {
            const div = document.createElement('div');

            div.className = 'tarefa';

            // Agora a div só tem o texto da observação e o botão de lixeira/excluir
            div.innerHTML = `
                <h3>${tarefa.titulo}</h3>
                <button onclick="excluirTarefa('${tarefa.objectId}')">Excluir</button>
            `;
            listDiv.appendChild(div);
        });
    }
}

// Adicionar uma nova observação no banco
async function adicionarTarefa() {
    const titulo = document.getElementById('novaTarefa').value;

    if (!titulo.trim()) {
        alert('Digite o texto da observação!');
        return;
    }

    // O pacote de dados agora só leva o texto, sem status de conclusão
    const novaTarefa = {
        titulo: titulo
    };

    const resultado = await requisicaoAPI('/parse/classes/Tarefa', 'POST', novaTarefa);

    if (resultado && resultado.objectId) {
        document.getElementById('novaTarefa').value = ''; // Limpa o input
        carregarTarefas(); // Atualiza a lista
    }
}

// Excluir a observação do banco
async function excluirTarefa(objectId) {
    if (confirm('Tem certeza que deseja excluir esta observação?')) {
        await requisicaoAPI(`/parse/classes/Tarefa/${objectId}`, 'DELETE');
        carregarTarefas();
    }
}

// Puxa a lista automaticamente quando você abre o index.html
window.onload = carregarTarefas;

// Função para gerar o arquivo e fazer o download
async function baixarLista() {
    // 1. Pede a lista atualizada
    const resultado = await requisicaoAPI('/parse/classes/Tarefa');
    
    // Verifica se tem itens lá na lista
    if (resultado && resultado.results && resultado.results.length > 0) {
        
        // 2. Monta o textinho que vai dentro do arquivo
        let textoParaArquivo = "--- MINHAS OBSERVAÇÕES SOBRE IA ---\n\n";
        
        resultado.results.forEach((tarefa, numero) => {
            textoParaArquivo += `${numero + 1}. ${tarefa.titulo}\n`;
        });

        // 3. Cria um "arquivo virtual" de texto lá no navegador
        const arquivoVirtual = new Blob([textoParaArquivo], { type: 'text/plain' });
        const linkDoArquivo = URL.createObjectURL(arquivoVirtual);

        // 4. Link temporario: cria um link, clica nele e depois apaga
        const linkInvisivel = document.createElement('a');
        linkInvisivel.href = linkDoArquivo;
        linkInvisivel.download = 'lista_de_observacoes.txt'; // Nome do arquivo que vai baixar
        
        document.body.appendChild(linkInvisivel);
        linkInvisivel.click(); // Força o clique para iniciar o download
        document.body.removeChild(linkInvisivel); // Apaga o link para não sujar a tela

    } else {
        alert("A lista está vazia! Adicione algo antes de baixar.");
    }
}


 // RAFA QUE ADD - PRA FUNCIONAR OS BOTOES E DEIXAR BONITINHO HIHII

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    document.getElementById(tabId).classList.add('active');
    const targetBtn = document.querySelector(`.nav-btn[data-tab="${tabId}"]`);
    if (targetBtn) {
        targetBtn.classList.add('active');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.querySelectorAll('.nav-btn').forEach(button => {
    button.addEventListener('click', () => {
        const tabId = button.getAttribute('data-tab');
        switchTab(tabId);
    });
});

// Configuração Global do Chart.js para Tema Claro
Chart.defaults.font.family = "'Plus Jakarta Sans', sans-serif";
Chart.defaults.color = '#64748b';
Chart.defaults.scale.grid.color = '#f1f5f9';

let performanceChartInstance = null;
let burnoutChartInstance = null;
let radarChartInstance = null;

// Inicialização dos Gráficos
function initCharts(filter = 'all') {
    // Destruir gráficos anteriores se existirem
    if (performanceChartInstance) performanceChartInstance.destroy();
    if (burnoutChartInstance) burnoutChartInstance.destroy();
    if (radarChartInstance) radarChartInstance.destroy();

    // Dados ajustados conforme o filtro acadêmico simulado
    let multiplier = 1;
    if (filter === 'undergrad') multiplier = 1.1;
    if (filter === 'postgrad') multiplier = 0.9;
    if (filter === 'highschool') multiplier = 0.95;

    // 1. Gráfico de Linha: Desempenho vs Horas de IA
    const ctxPerf = document.getElementById('performanceChart').getContext('2d');
    performanceChartInstance = new Chart(ctxPerf, {
        type: 'line',
        data: {
            labels: ['0-2h', '2-5h', '5-10h', '10-15h', '15-20h', '20+h'],
            datasets: [{
                label: 'Desempenho Acadêmico (Média Ponderada)',
                data: [65, 78, 88, 85, 72, 58].map(v => Math.min(100, Math.round(v * multiplier))),
                borderColor: '#4f46e5',
                backgroundColor: 'rgba(79, 70, 229, 0.08)',
                borderWidth: 3,
                fill: true,
                tension: 0.35,
                pointBackgroundColor: '#4f46e5',
                pointRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    min: 40,
                    max: 100
                }
            }
        }
    });

    // 2. Gráfico de Rosca: Risco de Burnout
    const ctxBurnout = document.getElementById('burnoutChart').getContext('2d');
    burnoutChartInstance = new Chart(ctxBurnout, {
        type: 'doughnut',
        data: {
            labels: ['Baixo (0-2h)', 'Moderado (2-10h)', 'Alto (10-20h)', 'Severo (20+h)'],
            datasets: [{
                data: [9, 22, 45, 74],
                backgroundColor: ['#10b981', '#0ea5e9', '#f97316', '#ef4444'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { boxWidth: 12, font: { size: 11 } }
                }
            }
        }
    });

    // 3. Gráfico Radar: Habilidades Cognitivas
    const ctxRadar = document.getElementById('radarChart').getContext('2d');
    radarChartInstance = new Chart(ctxRadar, {
        type: 'radar',
        data: {
            labels: ['Pensamento Crítico', 'Retenção de Memória', 'Criatividade', 'Velocidade de Entrega', 'Resolução de Problemas'],
            datasets: [{
                label: 'Com Uso Moderado',
                data: [85, 80, 90, 95, 88],
                backgroundColor: 'rgba(14, 165, 233, 0.15)',
                borderColor: '#0ea5e9',
                borderWidth: 2
            }, {
                label: 'Com Uso Excessivo (20h+)',
                data: [50, 45, 55, 75, 48],
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                borderColor: '#ef4444',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { boxWidth: 12, font: { size: 11 } }
                }
            },
            scales: {
                r: {
                    min: 0,
                    max: 100,
                    ticks: { stepSize: 25 }
                }
            }
        }
    });
}

// Evento de Filtro Acadêmico
document.getElementById('academicFilter').addEventListener('change', (e) => {
    initCharts(e.target.value);
});

// Inicializar na carga da página
window.addEventListener('DOMContentLoaded', () => {
    initCharts('all');
});
