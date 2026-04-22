import { resolveApiUrl } from './apiUtils';

/**
 * Global cache for Gemini models to avoid redundant network calls during parallel generation.
 */
let cachedGeminiModels = null;

// Global session trackers for active indices
const sessionIndices = {
  gemini: parseInt(localStorage.getItem('guru_gemini_active_idx') || '0'),
  openai: parseInt(localStorage.getItem('guru_gpt_active_idx') || '0'),
  grok: parseInt(localStorage.getItem('guru_grok_active_idx') || '0')
};

/**
 * Robustly detects if an error is a Quota/Rate Limit error (429).
 */
const isQuotaError = (error, data = {}) => {
  const status = error?.status || data?.error?.code;
  if (status === 429) return true;
  const msg = (error?.message || data?.error?.message || "").toLowerCase();
  return msg.includes('quota exhausted') || msg.includes('rate limit exceeded') || msg.includes('resource has been exhausted');
};

/**
 * Robustly detects if an error is an authentication/key issue (400, 401, 403).
 */
const isAuthError = (error, data = {}) => {
  const status = error?.status || data?.error?.code;
  if (status === 401 || status === 403) return true;
  const msg = (error?.message || data?.error?.message || "").toLowerCase();
  return status === 400 || msg.includes('api key not valid') || msg.includes('invalid api key') || msg.includes('unauthorized') || msg.includes('service_disabled');
};

// Listen for manual selection from the UI Settings
if (typeof window !== 'undefined') {
  window.addEventListener('guru_manual_key_select', (e) => {
    const { provider, index } = e.detail;
    if (sessionIndices.hasOwnProperty(provider)) {
      console.log(`ðŸŽ¯ Manual Selection: Setting ${provider} to index ${index}`);
      sessionIndices[provider] = index;
    }
  });

  // Reset model cache when API key is updated so the new key can discover models fresh
  window.addEventListener('guru_config_updated', () => {
    console.log('ðŸ”„ Config updated â€” clearing Gemini model cache.');
    cachedGeminiModels = null;
  });
}

// --- GEMINI SMART USAGE TRACKER ---
// Limits: 15 Requests Per Minute (RPM), approx 1480 safe daily.
const SAFE_RPM_LIMIT = 14; 
const SAFE_RPD_LIMIT = 1450;

const getRollingUsage = (apiKey) => {
   if (typeof window === 'undefined') return { rpm: 0, rpd: 0 };
   const now = Date.now();
   let history = [];
   try {
     const parsed = JSON.parse(localStorage.getItem(`guru_gemini_history_${apiKey}`) || '[]');
     if (Array.isArray(parsed)) {
       history = parsed;
     }
   } catch {}
   const lastMinute = history.filter(t => now - t < 61000); // 61 seconds sliding window
   const lastDay = history.filter(t => now - t < 86400000); // 24h sliding window
   
   if (history.length > lastDay.length + 50) {
      localStorage.setItem(`guru_gemini_history_${apiKey}`, JSON.stringify(lastDay));
   }
   return { rpm: lastMinute.length, rpd: lastDay.length, history: lastDay };
};

const recordUsage = (apiKey) => {
   if (typeof window === 'undefined') return;
   const now = Date.now();
   try {
       const { history } = getRollingUsage(apiKey);
       history.push(now);
       localStorage.setItem(`guru_gemini_history_${apiKey}`, JSON.stringify(history));
   } catch {}
};

/**
 * Robustly calls the Gemini API, handling model selection and fallbacks.
 */
export const callGemini = async (apiKeys, prompt, options = {}) => {
  if (!apiKeys) throw new Error("Chave Gemini ausente!");

  // Parse multi-keys
  const keyList = apiKeys.split(',').map(k => k.trim()).filter(Boolean);
  let lastError = null;

  // UNIVERSAL CONTROL: If a specific index is forced (manual selection), use ONLY that key.
  const forcedIdx = options.forcedIndex !== undefined ? options.forcedIndex : sessionIndices.gemini;
  const isStrict = options.forcedIndex !== undefined;

  const startIndex = forcedIdx % (keyList.length || 1);
  const iterations = isStrict ? 1 : keyList.length; // If strict, try only the selected key

  for (let i = 0; i < iterations; i++) {
    const kIdx = (startIndex + i) % keyList.length;
    const apiKey = keyList[kIdx];
    
    // PREEMPTIVE CHECK
    const usage = getRollingUsage(apiKey);
    if ((usage.rpm >= SAFE_RPM_LIMIT || usage.rpd >= SAFE_RPD_LIMIT) && i < iterations - 1) {
       console.warn(`ðŸ”„ Gemini Tracker: Chave ${kIdx} bateu no teto de seguranÃ§a (RPM: ${usage.rpm}). Pulando preventiva...`);
       continue;
    }
    
    if (kIdx !== startIndex && usage.rpm < SAFE_RPM_LIMIT) {
        console.warn(`ðŸ”„ Gemini: Entrando na prÃ³xima chave (Index ${kIdx})...`);
    }

    try {
      const modelsToTry = [];
      
      // If a specific model is requested, try it first
      if (options.model) {
        modelsToTry.push(options.model);
      }

      if (cachedGeminiModels) {
        modelsToTry.push(...cachedGeminiModels);
      } else {
        try {
          const modelsRes = await fetch(resolveApiUrl(`/api/gemini/v1beta/models?key=${apiKey}`));
          if (modelsRes.ok) {
            const modelsData = await modelsRes.json();
            if (modelsData.models) {
              const list = [];
              // Only models confirmed to work on v1beta generateContent endpoint
              const flash20 = modelsData.models.find(m => m.name === 'models/gemini-2.0-flash' && m.supportedGenerationMethods?.includes('generateContent'));
              const flash20lite = modelsData.models.find(m => m.name === 'models/gemini-2.0-flash-lite' && m.supportedGenerationMethods?.includes('generateContent'));
              const flash15latest = modelsData.models.find(m => m.name === 'models/gemini-1.5-flash-latest' && m.supportedGenerationMethods?.includes('generateContent'));
              
              if (flash20) list.push(flash20.name);
              if (flash20lite) list.push(flash20lite.name);
              if (flash15latest) list.push(flash15latest.name);
              
              if (list.length > 0) {
                cachedGeminiModels = list;
                modelsToTry.push(...list);
              }
            }
          }
        } catch (e) {
          console.error("Gemini model list error:", e);
        }
      }

      // Hardcoded fallbacks â€” confirmed working on v1beta (April 2025)
      const fallbacks = [
        "models/gemini-2.0-flash",
        "models/gemini-2.0-flash-lite",
        "models/gemini-1.5-flash-latest"
      ];
      fallbacks.forEach(f => { if (!modelsToTry.includes(f)) modelsToTry.push(f); });

      for (const modelPath of modelsToTry) {
        let attempts = 0;
        while (attempts < 2) {
          attempts++;
          try {
            const cleanPath = modelPath.startsWith('models/') ? modelPath : `models/${modelPath}`;
            // Switching to v1beta for broader model compatibility (Flash 8B, Gemini 2.0)
            const res = await fetch(resolveApiUrl(`/api/gemini/v1beta/${cleanPath}:generateContent?key=${apiKey}`), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: {
                  maxOutputTokens: options.maxOutputTokens || 8192,
                  temperature: options.temperature || 0.7,
                  ...options.generationConfig
                }
              })
            });

            const data = await res.json();
            if (res.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
              recordUsage(apiKey);
              // Store this as the successful index for the session
              if (sessionIndices.gemini !== kIdx) {
                sessionIndices.gemini = kIdx;
                window.dispatchEvent(new CustomEvent('guru_key_rotated', { detail: { provider: 'gemini', index: kIdx } }));
              }
              return data.candidates[0].content.parts[0].text;
            }

            if (data.error) {
              const errorMsg = data.error.message || "Unknown error";
              
              // 404 = model not found / deprecated — clear cache and try next model
              if (res.status === 404) {
                console.warn(`⚠️ [Gemini]: Modelo ${modelPath} não encontrado (404). Tentando próximo...`);
                cachedGeminiModels = null; // reset cache so we re-fetch
                break; // break while loop, continue for-loop to next model
              }
              
              if (isQuotaError(null, data)) {
                if (attempts === 1) {
                  await new Promise(r => setTimeout(r, 2000));
                  continue; 
                }
                console.warn(`⚠️ [Gemini]: Cota atingida na chave ${kIdx}.`);
                const err = new Error(errorMsg);
                err.status = 429;
                throw err;
              }

              if (isAuthError(null, data)) {
                console.error(`❌ [Gemini]: Erro de Autenticação/Chave na chave ${kIdx}: ${errorMsg}`);
                const err = new Error(errorMsg);
                err.status = 403;
                throw err;
              }
              
              throw new Error(errorMsg || "Erro desconhecido na API do Google");
            }
          } catch (e) {
            if (isQuotaError(e)) {
                e.status = 429; // Ensure status is set for the outer loop
                throw e; 
            }
            lastError = e;
            break;
          }
        }
      }
    } catch (e) {
      lastError = e;
      if (isQuotaError(e) && i < iterations - 1) {
        console.warn(`ðŸ”„ [Gemini]: Rotacionando para prÃ³xima chave devido a limite de quota...`);
        continue;
      }
      // If it's an Auth error, we might still want to try the next key in case only one is bad
      if (isAuthError(e) && i < iterations - 1) {
        console.warn(`ðŸ”„ [Gemini]: Chave invÃ¡lida dÃ©tectada (Index ${kIdx}). Tentando prÃ³xima...`);
        continue;
      }
      break;
    }
  }

  // FINAL RECOVERY: Try GPT if Gemini is completely exhausted
  const gptKey = options.gptKey || localStorage.getItem('guru_gpt_key');
  const lastMsg = lastError?.message || "";
  
  // Strict Quota Check for Fallback
  const isQuotaReached = lastError?.status === 429 || 
                         (lastMsg.toLowerCase().includes('quota') && lastMsg.toLowerCase().includes('exhausted')) ||
                         lastMsg.toLowerCase().includes('rate limit exceeded');

  if (gptKey && isQuotaReached) {
    try {
      console.warn("ðŸš¨ Todas as chaves Gemini exauridas (ou bloqueadas). Acionando Fallback CrÃ­tico para GPT...");
      window.dispatchEvent(new CustomEvent('guru_fallback_triggered', { 
        detail: { message: "Gemini esgotado. Acionando GPT de emergÃªncia..." } 
      }));
      // Try with GPT-4o-mini as it is reliable and cheaper for emergency recovery
      return await callGPT(gptKey, prompt, "gpt-4o-mini", options);
    } catch (gptErr) {
      console.error("Critical Fallback also failed:", gptErr);
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error("NÃ£o foi possÃ­vel obter resposta do Gemini apÃ³s tentar todas as chaves.");
};


/**
 * Calls Gemini (Imagen) to generate an image from a prompt.
 * Uses the v1beta endpoint for Imagen 3.
 */
export const callGeminiImage = async (apiKeys, prompt, options = {}) => {
  if (!apiKeys) throw new Error("Chave Gemini ausente!");

  const keyList = apiKeys.split(',').map(k => k.trim()).filter(Boolean);
  let lastError = null;

  // Start from the last known working key in this session
  const startIndex = sessionIndices.gemini % (keyList.length || 1);

  for (let i = 0; i < keyList.length; i++) {
    const kIdx = (startIndex + i) % keyList.length;
    const apiKey = keyList[kIdx];

    try {
      if (kIdx !== startIndex) {
          console.warn(`ðŸ”„ Gemini Imagem: Tentando prÃ³xima chave (Index ${kIdx})...`);
      }

      const modelPath = options.model || "models/imagen-3.0-generate-001";
      const url = resolveApiUrl(`/api/gemini/v1beta/${modelPath}:generateImages?key=${apiKey}`);

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt,
          number_of_images: 1,
          aspect_ratio: options.aspect_ratio || "16:9",
          safety_settings: options.safety_settings || []
        })
      });

      const data = await res.json();
      
      if (res.ok) {
        let imageUrl = data.images?.[0]?.url || data.images?.[0]?.image_url;
        if (imageUrl) {
          // Sync successful index
          if (sessionIndices.gemini !== kIdx) {
            sessionIndices.gemini = kIdx;
            window.dispatchEvent(new CustomEvent('guru_key_rotated', { detail: { provider: 'gemini', index: kIdx } }));
          }
          return imageUrl;
        }
      }

      if (isQuotaError(null, data) && i < keyList.length - 1) {
        console.warn(`âš ï¸ [Gemini Imagem]: Cota atingida na chave ${kIdx}. Rotacionando...`);
        continue;
      }

      if (data.error) {
        throw new Error(`Gemini Image Error: ${data.error.message}`);
      }
      
      throw new Error("Resposta de imagem do Gemini vazia ou malformada.");
    } catch (e) {
      lastError = e;
      if (isQuotaError(e) && i < keyList.length - 1) {
        console.warn(`ðŸ”„ [Gemini Imagem]: Rotacionando para prÃ³xima chave...`);
        continue;
      }
      console.error("Gemini Image generation failure on index " + kIdx, e);
    }
  }

  if (isQuotaError(lastError)) {
    throw new Error("Limite Google API Key diÃ¡rio excedido");
  }

  throw lastError || new Error("Falha total na geraÃ§Ã£o de imagem Gemini apÃ³s tentar todas as chaves.");
};

/**
 * Robustly calls OpenAI (GPT) API via proxy.
 */
export const callGPT = async (apiKeys, prompt, model = "gpt-4o-mini", options = {}) => {
  if (!apiKeys) throw new Error("Chave GPT ausente!");

  const keyList = apiKeys.split(',').map(k => k.trim()).filter(Boolean);
  let lastError = null;

  // UNIVERSAL CONTROL
  const forcedIdx = options.forcedIndex !== undefined ? options.forcedIndex : sessionIndices.openai;
  const isStrict = options.forcedIndex !== undefined || (typeof window !== 'undefined' && localStorage.getItem('guru_gpt_active_idx') !== null);

  const startIndex = forcedIdx % (keyList.length || 1);
  const iterations = isStrict ? 1 : keyList.length;

  for (let i = 0; i < iterations; i++) {
    const kIdx = (startIndex + i) % keyList.length;
    const apiKey = keyList[kIdx];
    
    try {
      if (kIdx !== startIndex) {
        console.warn(`ðŸ”„ GPT: Tentando prÃ³xima chave (Index ${kIdx})...`);
      }

      const response = await fetch(resolveApiUrl("/api/openai/v1/chat/completions"), {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          "Authorization": `Bearer ${apiKey}` 
        },
        body: JSON.stringify({ 
          model: model, 
          messages: options.messages || [{ role: "user", content: prompt }],
          temperature: options.temperature ?? 0.7,
          max_tokens: options.max_tokens || 4096
        })
      });

      const data = await response.json();
      if (!response.ok) {
        if (isQuotaError(null, data) || response.status === 429) {
          console.warn(`âš ï¸ [OpenAI]: 429/Quota na chave ${kIdx}. Rotacionando para prÃ³xima...`);
          const err = new Error(data.error?.message || "OpenAI Rate Limit");
          err.status = 429;
          throw err; // Trigger the catch rotation
        }
        const err = new Error(data.error?.message || response.statusText);
        err.status = response.status;
        throw err;
      }
      return data.choices[0].message.content;
    } catch (e) {
      lastError = e;
      if (isQuotaError(e) && i < keyList.length - 1) {
        console.warn(`ðŸ”„ [OpenAI]: Ativando rotaÃ§Ã£o devido a limite de quota...`);
        continue; 
      }
      break;
    }
  }

  throw lastError || new Error("NÃ£o foi possÃ­vel obter resposta do GPT.");
};

/**
 * Translates SRT content while preserving timestamps and structure.
 */
export const translateSRT = async (srtText, targetLang, apiKeys, provider = 'gemini') => {
  if (!apiKeys) throw new Error("API Key ausente para traduÃ§Ã£o!");

  const prompt = `Translate the following SRT file content into ${targetLang}. 
  STRICT RULES:
  1. Keep EXACTLY the same timestamps and block numbers.
  2. Translate ONLY the text lines.
  3. Maintain the SRT format perfectly (Number -> Time -> Text -> Empty Line).
  4. Preserve any special characters or formatting like <i> or <b>.
  5. Return ONLY the translated SRT content.

  CONTENT:
  ${srtText}`;

  if (provider === 'gpt') {
    return await callGPT(apiKeys, prompt, "gpt-4o-mini");
  } else {
    return await callGemini(apiKeys, prompt);
  }
};

/**
 * Robustly calls Grok API via proxy.
 */
export const callGrok = async (apiKeys, prompt, model = "grok-beta", options = {}) => {
  if (!apiKeys) throw new Error("Chave Grok ausente!");

  const keyList = apiKeys.split(',').map(k => k.trim()).filter(Boolean);
  let lastError = null;

  // UNIVERSAL CONTROL
  const forcedIdx = options.forcedIndex !== undefined ? options.forcedIndex : sessionIndices.grok;
  const isStrict = options.forcedIndex !== undefined || (typeof window !== 'undefined' && localStorage.getItem('guru_grok_active_idx') !== null);

  const startIndex = forcedIdx % (keyList.length || 1);
  const iterations = isStrict ? 1 : keyList.length;

  for (let i = 0; i < iterations; i++) {
    const kIdx = (startIndex + i) % keyList.length;
    const apiKey = keyList[kIdx];

    try {
      if (kIdx !== startIndex) {
        console.warn(`ðŸ”„ Grok: Tentando prÃ³xima chave (Index ${kIdx})...`);
      }

      const response = await fetch(resolveApiUrl("/api/grok/v1/chat/completions"), {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          "Authorization": `Bearer ${apiKey}` 
        },
        body: JSON.stringify({ 
          model: model, 
          messages: options.messages || [
            { role: "system", content: "You are a professional assistant." },
            { role: "user", content: prompt }
          ]
        })
      });

      const data = await response.json();
      if (!response.ok) {
        if (response.status === 429 && i < keyList.length - 1) {
          console.warn(`âš ï¸ Grok Cota atingida na chave ${kIdx}.`);
          continue; 
        }
        const err = new Error(data.error?.message || response.statusText);
        err.status = response.status;
        throw err;
      }

      // Store this as the successful index for the session
      if (sessionIndices.grok !== kIdx) {
        sessionIndices.grok = kIdx;
        window.dispatchEvent(new CustomEvent('guru_key_rotated', { detail: { provider: 'grok', index: kIdx } }));
      }

      return data.choices[0].message.content;
    } catch (e) {
      lastError = e;
      if (e.status === 429 && i < keyList.length - 1) {
        continue; // Try next key in rotation circle
      }
      break;
    }
  }

  throw lastError || new Error("NÃ£o foi possÃ­vel obter resposta do Grok.");
};

/**
 * Universal dispatcher for AI calls.
 * Respects global configuration for active engine and key index.
 */
export const callAI = async (prompt, options = {}) => {
  const activeAI = localStorage.getItem('guru_active_ai') || 'Gemini';
  
  if (activeAI === 'Gemini') {
    // Prioritize exclusive prompts key if this is a prompt task
    const promptsKey = localStorage.getItem('guru_gemini_prompts_key') || '';
    const mainKeys = localStorage.getItem('guru_gemini_key') || '';
    
    if (options.isPromptTask && promptsKey) {
      console.log('ðŸ’Ž Using Exclusive Prompts Key for this task');
      return await callGemini(promptsKey, prompt, { ...options, forcedIndex: 0 });
    }
    
    const idx = parseInt(localStorage.getItem('guru_gemini_active_idx') || '0');
    return await callGemini(mainKeys, prompt, { ...options, forcedIndex: idx });
  } else if (activeAI === 'OpenAI' || activeAI === 'GPT') {
    const keys = localStorage.getItem('guru_gpt_key') || '';
    const idx = parseInt(localStorage.getItem('guru_gpt_active_idx') || '0');
    return await callGPT(keys, prompt, options.model || "gpt-4o-mini", { ...options, forcedIndex: idx });
  } else if (activeAI === 'Grok') {
    const keys = localStorage.getItem('guru_grok_key') || '';
    const idx = parseInt(localStorage.getItem('guru_grok_active_idx') || '0');
    return await callGrok(keys, prompt, options.model || "grok-beta", { ...options, forcedIndex: idx });
  }
  
  // Default to Gemini if unknown
  const defaultKeys = localStorage.getItem('guru_gemini_key') || '';
  return await callGemini(defaultKeys, prompt, options);
};

