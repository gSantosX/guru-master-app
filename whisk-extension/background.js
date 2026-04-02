// background.js - Auto Whisk Companion
// Handles background tasks such as intercepting downloads and renaming them

let currentPromptIndex = 1;

// Escuta as mensagens enviadas pelo content.js informando qual é o índice atual da fila
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "SET_PROMPT_INDEX") {
        currentPromptIndex = request.index;
        console.log("Background: Target index updated to", currentPromptIndex);
        sendResponse({status: "ok"});
    }
});

// Intercepta todos os downloads iniciados pelo Chrome
chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
    // Verifica se a URL do arquivo sendo baixado pertence aos servidores de imagens do Google (Whisk)
    if (item.url.includes("googleusercontent.com") || item.url.includes("labs.google")) {
        // Formata o número (ex: 1 vira '01', 12 vira '12')
        const paddedIndex = String(currentPromptIndex).padStart(2, '0');
        
        // Pega a extensão da imagem que o Google retornou (na dúvida, png)
        const parts = item.filename.split('.');
        const ext = parts.length > 1 ? parts.pop() : 'png';
        
        // Monta o novo formato renumerado e limpo pedido pelo usuário
        const finalFilename = `imagem_${paddedIndex}.${ext}`;
        
        console.log(`Background: Renaming Whisk download from ${item.filename} to ${finalFilename}`);
        
        // Sugere o novo nome e lida com conflitos não sobrescrevendo (por via das dúvidas)
        suggest({ filename: finalFilename, conflictAction: 'uniquify' });
        return true;
    }
    
    // Devolve o nome normal para qualquer download que não seja a automação
    suggest();
});
