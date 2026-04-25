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
      console.log(`🎯 Manual Selection: Setting ${provider} to index ${index}`);
      sessionIndices[provider] = index;
    }
  });

  // Limpa cache de modelos E histórico de uso quando chaves são atualizadas
  window.addEventListener('guru_config_updated', () => {
    console.log('🔄 Config atualizada — limpando cache de modelos e histórico de chamadas.');
    cachedGeminiModels = null;
    // Limpa histórico do tracker para todas as chaves armazenadas
    // Evita que o tracker bloqueie chaves novas com histórico de chaves antigas
    try {
      Object.keys(localStorage)
        .filter(k => k.startsWith('guru_gemini_history_'))
        .forEach(k => localStorage.removeItem(k));
      console.log('✅ Histórico de uso das chaves Gemini limpo.');
    } catch(e) { console.warn('Erro ao limpar histórico:', e); }
  });
}

// --- GEMINI SMART USAGE TRACKER ---
// Free tier real limits: 15 RPM, 1500 RPD for flash models.
// We set safety margin slightly below to avoid hard blocks.
const SAFE_RPM_LIMIT = 14;   // Google free = 15 RPM  → bloqueia em 14 para dar margem
const SAFE_RPD_LIMIT = 1480; // Google free = 1500 RPD → era 1450, aumentado para 1480

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
    
    // PREEMPTIVE CHECK — só pula se houver OUTRA chave disponível
    const usage = getRollingUsage(apiKey);
    if ((usage.rpm >= SAFE_RPM_LIMIT || usage.rpd >= SAFE_RPD_LIMIT) && i < iterations - 1) {
       console.warn(`🔄 [Tracker] Chave ${kIdx} no teto de segurança (RPM: ${usage.rpm}/${SAFE_RPM_LIMIT}, RPD: ${usage.rpd}/${SAFE_RPD_LIMIT}). Pulando para próxima chave...`);
       continue;
    }
    if (usage.rpm >= SAFE_RPM_LIMIT || usage.rpd >= SAFE_RPD_LIMIT) {
       // Última chave disponível e está no limite — avisa mas tenta mesmo assim
       console.warn(`⚠️ [Tracker] Chave ${kIdx} no teto mas é a única disponível. Tentando mesmo assim (o Google decide)...`);
    }
    
    if (kIdx !== startIndex && usage.rpm < SAFE_RPM_LIMIT) {
        console.warn(`🔄 Gemini: Entrando na próxima chave (Index ${kIdx})...`);
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
          // v1beta is only for listing models, NOT for generateContent
          const modelsRes = await fetch(resolveApiUrl(`/api/gemini/v1beta/models?key=${apiKey}`));
          if (modelsRes.ok) {
            const modelsData = await modelsRes.json();
            if (modelsData.models) {
              const list = [];
              // Priority: 2.0-flash > 1.5-flash > 1.5-pro
              const flash20 = modelsData.models.find(m => m.name.includes('gemini-2.0-flash') && m.supportedGenerationMethods?.includes('generateContent'));
              const flash15 = modelsData.models.find(m => m.name.includes('gemini-1.5-flash') && !m.name.includes('8b') && m.supportedGenerationMethods?.includes('generateContent'));
              const pro15 = modelsData.models.find(m => m.name.includes('gemini-1.5-pro') && m.supportedGenerationMethods?.includes('generateContent'));
              
              if (flash20) list.push(flash20.name);
              if (flash15) list.push(flash15.name);
              if (pro15) list.push(pro15.name);
              
              cachedGeminiModels = list;
              modelsToTry.push(...list);
            }
          }
        } catch (e) {
          console.error("Gemini model list error:", e);
        }
      }

      // Real Fallbacks — inclui 2.5-flash que é o modelo mais pedido pelo sistema
      const fallbacks = [
        "models/gemini-2.5-flash",   // adicionado: modelo padrão do ImagePromptsTab
        "models/gemini-2.0-flash",
        "models/gemini-1.5-flash",
        "models/gemini-1.5-pro"
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
        console.warn(`🔄 [Gemini]: Rotacionando para próxima chave devido a limite de quota...`);
        continue;
      }
      // If it's an Auth error, we might still want to try the next key in case only one is bad
      if (isAuthError(e) && i < iterations - 1) {
        console.warn(`🔄 [Gemini]: Chave inválida détectada (Index ${kIdx}). Tentando próxima...`);
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
      console.warn("🚨 Todas as chaves Gemini exauridas (ou bloqueadas). Acionando Fallback Crítico para GPT...");
      window.dispatchEvent(new CustomEvent('guru_fallback_triggered', { 
        detail: { message: "Gemini esgotado. Acionando GPT de emergência..." } 
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

  throw new Error("Não foi possível obter resposta do Gemini após tentar todas as chaves.");
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
          console.warn(`🔄 Gemini Imagem: Tentando próxima chave (Index ${kIdx})...`);
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
        console.warn(`⚠️ [Gemini Imagem]: Cota atingida na chave ${kIdx}. Rotacionando...`);
        continue;
      }

      if (data.error) {
        throw new Error(`Gemini Image Error: ${data.error.message}`);
      }
      
      throw new Error("Resposta de imagem do Gemini vazia ou malformada.");
    } catch (e) {
      lastError = e;
      if (isQuotaError(e) && i < keyList.length - 1) {
        console.warn(`🔄 [Gemini Imagem]: Rotacionando para próxima chave...`);
        continue;
      }
      console.error("Gemini Image generation failure on index " + kIdx, e);
    }
  }

  if (isQuotaError(lastError)) {
    throw new Error("Limite Google API Key diário excedido");
  }

  throw lastError || new Error("Falha total na geração de imagem Gemini após tentar todas as chaves.");
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
        console.warn(`🔄 GPT: Tentando próxima chave (Index ${kIdx})...`);
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
          console.warn(`⚠️ [OpenAI]: 429/Quota na chave ${kIdx}. Rotacionando para próxima...`);
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
        console.warn(`🔄 [OpenAI]: Ativando rotação devido a limite de quota...`);
        continue; 
      }
      break;
    }
  }

  throw lastError || new Error("Não foi possível obter resposta do GPT.");
};

/**
 * Translates SRT content while preserving timestamps and structure.
 */
export const translateSRT = async (srtText, targetLang, apiKeys, provider = 'gemini') => {
  if (!apiKeys) throw new Error("API Key ausente para tradução!");

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
        console.warn(`🔄 Grok: Tentando próxima chave (Index ${kIdx})...`);
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
          console.warn(`⚠️ Grok Cota atingida na chave ${kIdx}.`);
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

  throw lastError || new Error("Não foi possível obter resposta do Grok.");
};

/**
 * Universal dispatcher for AI calls.
 * Respects global configuration for active engine and key index.
 */
export const callAI = async (prompt, options = {}) => {
  const activeAI = localStorage.getItem('guru_active_ai') || 'Gemini';
  
  if (activeAI === 'Gemini') {
    // Prioritize exclusive prompts key if this is a prompt task
    const promptsKey = (localStorage.getItem('guru_gemini_prompts_key') || '').trim();
    const mainKeys = (localStorage.getItem('guru_gemini_key') || '').trim();
    
    if (options.isPromptTask && promptsKey) {
      console.log('💎 Using Exclusive Prompts Key for this task (with main key fallback)');
      try {
        // No forcedIndex — allow rotation if the key string contains multiple keys
        return await callGemini(promptsKey, prompt, { ...options });
      } catch (exclusiveErr) {
        const isExhausted = exclusiveErr?.status === 429 || 
          (exclusiveErr?.message || '').toLowerCase().includes('quota');
        if (isExhausted && mainKeys) {
          console.warn('⚠️ Exclusive Prompts Key exhausted. Falling back to main Gemini keys...');
          const idx = parseInt(localStorage.getItem('guru_gemini_active_idx') || '0');
          return await callGemini(mainKeys, prompt, { ...options, forcedIndex: idx });
        }
        throw exclusiveErr;
      }
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
