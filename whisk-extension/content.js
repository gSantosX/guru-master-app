const API_BASE = "http://localhost:5000/api/whisk";

let isRunning = false;

console.log("%c Auto Whisk Companion %c v1.1.0 Loaded ", "background: #00f3ff; color: #000; font-weight: bold; border-radius: 3px 0 0 3px;", "background: #333; color: #fff; border-radius: 0 3px 3px 0;");

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getNextPrompt() {
    try {
        const res = await fetch(`${API_BASE}/next`);
        const data = await res.json();
        return { prompt: data.prompt, index: data.index };
    } catch (e) {
        return { prompt: null, index: null };
    }
}

async function getWhiskSettings() {
    try {
        const res = await fetch(`${API_BASE}/settings`);
        return await res.json();
    } catch (e) {
        return { aspect_ratio: "16:9", image_count: 1, prompt_interval: 5, auto_download: true };
    }
}

async function automate() {
    if (isRunning) return;
    isRunning = true;
    console.log("Starting Whisk Automation Loop...");
    let processedAtLeastOne = false;
    
    while (true) {
        // 1. Aguardar o input estar disponível ANTES de puxar do backend para evitar pular prompts (descarte)
        let input = null;
        for(let i = 0; i < 5; i++) {
            input = document.querySelector('[contenteditable="true"]') || 
                    document.querySelector('textarea.sc-18deeb1d-8.DwQls') ||
                    document.querySelector('textarea[placeholder*="Descreva sua ideia"]') ||
                    document.querySelector('textarea[placeholder*="describe"]') ||
                    document.querySelector('textarea[placeholder*="descreva"]') ||
                    document.querySelector('textarea[aria-label*="prompt"]') ||
                    document.querySelector('textarea');
            if (input) break;
            await sleep(2000);
        }

        if (!input) {
            console.warn("🔌 Prompt input not found. Retrying in 5s...");
            await sleep(5000);
            continue;
        }

        // 2. Com a página carregada, puxar o prompt da fila
        const nextData = await getNextPrompt();
        const prompt = nextData.prompt;
        
        if (!prompt) {
            if (processedAtLeastOne) {
                isRunning = false;
                return; // Para o loop ao concluir sem mensagem visual
            }
            await sleep(5000);
            continue;
        }

        processedAtLeastOne = true;
        console.log(`🚀 Processing prompt [${nextData.index}]:`, prompt);
        
        try {
            chrome.runtime.sendMessage({ type: "SET_PROMPT_INDEX", index: nextData.index });
        } catch(err) {
            console.warn("Could not notify background script.", err);
        }

        input.focus();
        input.click();
        await sleep(500);

        if (input.tagName === 'DIV' || input.getAttribute('contenteditable') === 'true') {
            input.innerText = prompt;
        } else {
            // Bypass React's Virtual DOM to simulate a real user typing
            let nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
            if (!nativeSetter) nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
            
            if (nativeSetter) {
                nativeSetter.call(input, prompt);
            } else {
                input.value = prompt;
            }
        }
        
        // Trigger all possible events to let the page know we typed
        input.dispatchEvent(new Event('focus', { bubbles: true }));
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));

        // 3. Click Generate button with safe retries
        let genBtn = null;
        for(let i = 0; i < 5; i++) {
            await sleep(1500); // Wait for React state to enable button
            
            let allClickables = Array.from(document.querySelectorAll('button, [role="button"], input[type="submit"]'));
            genBtn = allClickables.find(b => {
                const txt = (b.innerText || "").toLowerCase();
                const label = b.getAttribute('aria-label')?.toLowerCase() || "";
                const title = b.getAttribute('title')?.toLowerCase() || "";
                return txt.includes('generate') || txt.includes('gerar') || txt.includes('criar') || 
                       txt.includes('enviar') || txt.includes('send') || txt.includes('submit') || 
                       label.includes('generate') || label.includes('gerar') || label.includes('enviar') || 
                       label.includes('comando') || label.includes('send') || label.includes('submit') ||
                       title.includes('generate') || title.includes('gerar') || title.includes('send') || title.includes('enviar');
            });
            
            if (!genBtn) {
                genBtn = document.querySelector('button[type="submit"]') || 
                         document.querySelector('button[aria-disabled="false"]') ||
                         document.querySelector('.prompt-submit-button');
            }
            
            if (genBtn) break;
            
            // Re-trigger event as fallback if button not enabled
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }

        if (!genBtn) {
            console.warn("🧭 Generate button not found after attempting. Discarding this prompt to not stall.");
            continue; // Can't recover, must skip to prevent deadlocking system
        }

        console.log("⚡ Clicking Generate...");
        genBtn.click();

        // 3. Wait for result (can take up to 90s)
        let resultFound = false;
        let attempts = 0;
        const maxAttempts = 45; // 45 * 2s = 90s
        
        while (!resultFound && attempts < maxAttempts) {
            await sleep(2000);
            attempts++;
            
            // Look for any download button
            let downloadBtn = document.querySelector('button[aria-label*="Download"]') || 
                              document.querySelector('button[aria-label*="Baixar"]') ||
                              document.querySelector('button[title*="Download"]') ||
                              document.querySelector('button[title*="Baixar"]') ||
                              document.querySelector('button[aria-label*="Salvar"]') ||
                              document.querySelector('button[aria-label*="Save"]');
                              
            if (!downloadBtn) {
                // Procurar por botões que contenham o texto 'download'
                let allBtns = Array.from(document.querySelectorAll('button, a'));
                downloadBtn = allBtns.find(b => {
                    const txt = (b.innerText || "").toLowerCase();
                    return txt.includes('download') || txt.includes('baixar') || txt.includes('salvar');
                });
            }

            if (!downloadBtn) {
                // Fallback extremo: Procurar pela seta de download SVG (Material UI Download icon)
                const svgDownload = document.querySelector('svg path[d*="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"]');
                if (svgDownload) downloadBtn = svgDownload.closest('button, a, div[role="button"]');
            }

            if (downloadBtn) {
                console.log("✅ Result found! Triggering download...");
                const settings = await getWhiskSettings();
                if (settings.auto_download) {
                    let allDownloads = Array.from(document.querySelectorAll('button[aria-label*="Download"], button[aria-label*="Baixar"], button[title*="Baixar"], button[aria-label*="Salvar"], svg path[d*="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"]'));
                    
                    // Filter valid clickable elements
                    const uniqueBtns = new Set();
                    allDownloads.forEach(btn => {
                        const clickable = btn.closest('button, a, div[role="button"]') || btn;
                        uniqueBtns.add(clickable);
                    });
                    
                    const btnArray = Array.from(uniqueBtns);
                    // Decide how many to click based on image_count
                    const toDownload = Math.min(settings.image_count || 1, btnArray.length > 0 ? btnArray.length : 1);
                    
                    console.log(`Baixando ${toDownload} variações...`);
                    for (let i = 0; i < toDownload; i++) {
                        if (btnArray[i]) {
                           btnArray[i].click();
                           await sleep(1500); // Wait between downloads
                        } else {
                           downloadBtn.click(); // Fallback to the first found
                           await sleep(1500);
                        }
                    }
                    await sleep(3000); // 3 segundos adicionais para confirmar downloads finais
                }
                resultFound = true;
            }
        }

        const finalSettings = await getWhiskSettings();
        const delaySeconds = finalSettings.prompt_interval || 5;

        if (!resultFound) {
            console.warn("⚠️ Timed out waiting for image. Moving to next prompt.");
            await sleep(5000);
        } else {
            console.log(`⏳ Aguardando ${delaySeconds}s antes do próximo prompt...`);
            await sleep(delaySeconds * 1000);
        }
    }
}

async function sendHeartbeat() {
    try {
        await fetch(`${API_BASE}/heartbeat`, { method: 'POST' });
    } catch (e) {}
}

// A função showCompletedOverlay foi removida a pedido do usuário.

// Initialize
if (location.href.includes('labs.google')) {
    console.log("Companion initialized on Google Labs");
    setInterval(sendHeartbeat, 5000);
    sendHeartbeat();
    
    // Start automation after a brief delay to let the page load
    setTimeout(automate, 3000);
}
