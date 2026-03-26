const API_BASE = "http://localhost:5000/api/whisk";

let isRunning = false;

console.log("Auto Whisk Companion Loaded");

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getNextPrompt() {
    try {
        const res = await fetch(`${API_BASE}/next`);
        const data = await res.json();
        return data.prompt;
    } catch (e) {
        console.error("Error fetching next prompt:", e);
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
    console.log("Starting Whisk Automation...");
    
    while (true) {
        const prompt = await getNextPrompt();
        if (!prompt) {
            console.log("No prompts in queue. Waiting 5s...");
            await sleep(5000);
            continue;
        }

        console.log("Processing prompt:", prompt);
        
        // 1. Find and fill prompt input
        let input = document.querySelector('[contenteditable="true"]') || 
                    document.querySelector('textarea.prompt-input') ||
                    document.querySelector('textarea[aria-label*="prompt"]') ||
                    document.querySelector('textarea');

        if (!input) {
            console.error("Could not find prompt input! Searching deeper...");
            // Try searching all textareas
            input = Array.from(document.querySelectorAll('textarea')).find(t => t.placeholder?.toLowerCase().includes('describe') || t.ariaLabel?.toLowerCase().includes('prompt'));
        }

        if (!input) {
            console.error("Critical: Prompt input not found.");
            await sleep(5000);
            continue;
        }

        input.focus();
        if (input.tagName === 'DIV') {
            input.innerText = prompt;
        } else {
            input.value = prompt;
        }
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));

        // 2. Click Generate button
        let buttons = Array.from(document.querySelectorAll('button'));
        let genBtn = buttons.find(b => 
            b.innerText.toLowerCase().includes('generate') || 
            b.innerText.toLowerCase().includes('gerar') || 
            b.ariaLabel?.toLowerCase().includes('generate') ||
            b.ariaLabel?.toLowerCase().includes('gerar') ||
            b.querySelector('svg')?.parentElement?.innerText?.includes('Gerar')
        );
        
        if (!genBtn) {
            console.error("Could not find Generate button! Trying by icon/class...");
            genBtn = document.querySelector('button[type="submit"]') || document.querySelector('.generate-button');
        }

        if (!genBtn) {
            console.error("Critical: Generate button not found.");
            await sleep(5000);
            continue;
        }

        genBtn.click();
        console.log("Generation started for:", prompt);
        console.log("Generation started...");

        // 3. Wait for result (can take 10-30s)
        // We look for the download button or for the "Generate" button to be clickable again
        let resultFound = false;
        let attempts = 0;
        while (!resultFound && attempts < 60) {
            await sleep(2000);
            attempts++;
            
            let downloadBtn = document.querySelector('button[aria-label*="Download"]');
            if (downloadBtn) {
                console.log("Result found! Downloading...");
                if ((await getWhiskSettings()).auto_download) {
                    downloadBtn.click();
                }
                resultFound = true;
            }
        }

        console.log("Prompt processed. Moving to next...");
        await sleep(3000); // Cooldown
    }
}

async function sendHeartbeat() {
    try {
        await fetch(`${API_BASE}/heartbeat`, { method: 'POST' });
    } catch (e) {}
}

// Start watching for prompts if we are on the right page
if (location.href.includes('labs.google/fx')) {
    setInterval(sendHeartbeat, 5000);
    sendHeartbeat();
    automate();
}
