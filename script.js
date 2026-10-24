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

carregarStatusIA();

// Necessário add <div id="listaPrincipais"></div> e <Script src="script.js"></Script> no body

