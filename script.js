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
