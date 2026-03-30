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
        return data.prompt;
    } catch (e) {
        return null;
    }
}

async function getWhiskSettings() {
    try {
        const res = await fetch(`${API_BASE}/settings`);
        return await res.json();
    } catch (e) {
        return { aspect_ratio: "16:9", image_count: 1, auto_download: true };
    }
}

async function automate() {
    if (isRunning) return;
    isRunning = true;
    console.log("Starting Whisk Automation Loop...");
    
    while (true) {
        const prompt = await getNextPrompt();
        if (!prompt) {
            await sleep(5000);
            continue;
        }

        console.log("🚀 Processing prompt:", prompt);
        
        // 1. Find and fill prompt input
        // Using extra robust selectors for Google Labs Whisk
        let input = document.querySelector('[contenteditable="true"]') || 
                    document.querySelector('textarea.sc-18deeb1d-8.DwQls') ||
                    document.querySelector('textarea[placeholder*="Descreva sua ideia"]') ||
                    document.querySelector('textarea[placeholder*="describe"]') ||
                    document.querySelector('textarea[placeholder*="descreva"]') ||
                    document.querySelector('textarea[aria-label*="prompt"]') ||
                    document.querySelector('textarea');

        if (!input) {
            console.error("❌ Prompt input not found. Retrying in 5s...");
            await sleep(5000);
            continue;
        }

        input.focus();
        
        // Click to focus if needed
        input.click();
        await sleep(500);

        if (input.tagName === 'DIV' || input.getAttribute('contenteditable') === 'true') {
            input.innerText = prompt;
        } else {
            input.value = prompt;
        }
        
        // Trigger all possible events to let the page know we typed
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

        await sleep(1000);

        // 2. Click Generate button
        let buttons = Array.from(document.querySelectorAll('button'));
        let genBtn = buttons.find(b => {
            const txt = b.innerText.toLowerCase();
            const label = b.getAttribute('aria-label')?.toLowerCase() || "";
            return txt.includes('generate') || txt.includes('gerar') || txt.includes('criar') || 
                   txt.includes('enviar') || label.includes('generate') || label.includes('gerar') || 
                   label.includes('enviar') || label.includes('comando');
        });
        
        if (!genBtn) {
            // Find by SVG/Icon if text is missing
            genBtn = document.querySelector('button[aria-label="Enviar comando"]') || 
                     document.querySelector('button.sc-bece3008-0.iCCEfi.sc-18deeb1d-6.cTTkJg') ||
                     document.querySelector('button[type="submit"]') || 
                     document.querySelector('button.generate-button') ||
                     document.querySelector('.prompt-submit-button') ||
                     document.querySelector('button[aria-disabled="false"]');
        }

        if (!genBtn) {
            console.error("❌ Generate button not found.");
            await sleep(5000);
            continue;
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
                              Array.from(document.querySelectorAll('button')).find(b => {
                                  const txt = b.innerText.toLowerCase();
                                  return txt.includes('download') || txt.includes('baixar');
                              });

            if (downloadBtn) {
                console.log("✅ Result found! Triggering download...");
                const settings = await getWhiskSettings();
                if (settings.auto_download) {
                    downloadBtn.click();
                    await sleep(2000); // Wait for download trig
                }
                resultFound = true;
            }
        }

        if (!resultFound) {
            console.warn("⚠️ Timed out waiting for image. Moving to next prompt.");
        }

        await sleep(4000); // Cooldown before next prompt
    }
}

async function sendHeartbeat() {
    try {
        await fetch(`${API_BASE}/heartbeat`, { method: 'POST' });
    } catch (e) {}
}

// Initialize
if (location.href.includes('labs.google')) {
    console.log("Companion initialized on Google Labs");
    setInterval(sendHeartbeat, 5000);
    sendHeartbeat();
    
    // Start automation after a brief delay to let the page load
    setTimeout(automate, 3000);
}
