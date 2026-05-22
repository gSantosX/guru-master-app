import { resolveApiUrl } from './apiUtils';

/**
 * Global cache for Gemini models to avoid redundant network calls during parallel generation.
 */
let cachedGeminiModels = null;

// Global session trackers for active indices
const sessionIndices = {
  gemini: parseInt(localStorage.getItem('guru_gemini_active_idx') || '0'),
  openai: parseInt(localStorage.getItem('guru_gpt_active_idx') || '0'),
  grok: parseInt(localStorage.getItem('guru_grok_active_idx') || '0'),
  lastSuccessfulModel: null // Cache do modelo que funcionou para esta chave/sessão
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
  // Limpa histórico acumulado ao iniciar (chave paga — contadores do free tier são irrelevantes)
  try {
    Object.keys(localStorage)
      .filter(k => k.startsWith('guru_gemini_history_'))
      .forEach(k => localStorage.removeItem(k));
    console.log('✅ [aiUtils] Histórico de uso reiniciado (chave paga ativa).');
  } catch(e) { console.warn('Erro ao limpar histórico inicial:', e); }

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
// Chave PAGA: limites muito maiores — sem bloqueio preemptivo por cota diária.
// O tracker apenas registra uso para fins de diagnóstico (não bloqueia).
const SAFE_RPM_LIMIT = 950;    // Paid tier: ~1000 RPM
const SAFE_RPD_LIMIT = 999999; // Paid tier: sem limite diário fixo

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
  if (!apiKeys) apiKeys = 'GLOBAL';

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
    
    // Tracker apenas para log — chave paga não tem limite preemptivo
    const usage = getRollingUsage(apiKey);
    if (usage.rpm >= SAFE_RPM_LIMIT && i < iterations - 1) {
       console.warn(`🔄 [Tracker] Chave ${kIdx} próxima do limite de RPM (${usage.rpm}/${SAFE_RPM_LIMIT}). Rotacionando...`);
       continue;
    }
    
    if (kIdx !== startIndex) {
        console.warn(`🔄 Gemini: Entrando na próxima chave (Index ${kIdx})...`);
    }


    try {
      // Modelos a tentar — ordem de prioridade (API v1beta compatível).
      // gemini-1.5-pro NÃO disponível na v1beta — removido dos fallbacks.
      const modelsToTry = [];

      // 1. Modelo pedido explicitamente vem primeiro
      if (options.model) {
        const m = options.model.startsWith('models/') ? options.model : `models/${options.model}`;
        modelsToTry.push(m);
      }

      // 2. Fallbacks universais cruzando todas as gerações de chaves (novas e antigas)
      const fallbacks = [
        'models/gemini-2.5-flash',
        'models/gemini-3.1-flash-lite-preview',
        'models/gemini-2.0-flash-exp',
        'models/gemini-1.5-flash-latest',
        'models/gemini-1.5-flash',
        'models/gemini-3.1-pro-preview',
        'models/gemini-2.5-pro',
        'models/gemini-1.5-pro-latest',
        'models/gemini-1.5-pro',
        'models/gemini-pro-latest', // Essencial para a chave Mestra Global
        'models/gemini-pro' // Último recurso de emergência para chaves legadas
      ];
      
      // PRIORIDADE: Tentar primeiro o último modelo que funcionou nesta sessão para evitar latência de fallback
      if (sessionIndices.lastSuccessfulModel && !options.model) {
        modelsToTry.push(sessionIndices.lastSuccessfulModel);
      }
      
      fallbacks.forEach(f => { if (!modelsToTry.includes(f)) modelsToTry.push(f); });


      for (const modelPath of modelsToTry) {
        // Tentar v1beta e depois v1 para cada modelo (algumas chaves só aceitam uma das versões)
        const versionsToTry = ['v1beta', 'v1'];
        
        for (const apiVersion of versionsToTry) {
          let attempts = 0;
          const MAX_ATTEMPTS = 2;
          let versionSuccess = false;

          while (attempts < MAX_ATTEMPTS && !versionSuccess) {
            attempts++;
            try {
              const cleanPath = modelPath.startsWith('models/') ? modelPath : `models/${modelPath}`;
              
              // Limitar output tokens do gemini-pro (1.0) para evitar erro de not supported
              const isLegacyPro = modelPath.includes('gemini-pro') && !modelPath.includes('1.5');
              const safeOutputTokens = options.maxOutputTokens ? Math.min(options.maxOutputTokens, isLegacyPro ? 2048 : 8192) : (isLegacyPro ? 2048 : 8192);

              const queryParam = apiKey === 'GLOBAL' ? '' : `?key=${apiKey}`;
              const promptParts = options.imagePart ? [options.imagePart, { text: prompt }] : [{ text: prompt }];

              const res = await fetch(resolveApiUrl(`/api/gemini/${apiVersion}/${cleanPath}:generateContent${queryParam}`), {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    contents: [{ role: "user", parts: promptParts }],
                    generationConfig: {
                      maxOutputTokens: safeOutputTokens,
                      temperature: options.temperature || 0.7,
                      ...options.generationConfig
                    }
                })
              });

              const data = await res.json();
              if (res.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
                recordUsage(apiKey);
                sessionIndices.lastSuccessfulModel = modelPath;
                if (sessionIndices.gemini !== kIdx) {
                  sessionIndices.gemini = kIdx;
                  window.dispatchEvent(new CustomEvent('guru_key_rotated', { detail: { provider: 'gemini', index: kIdx } }));
                }
                versionSuccess = true;
                return data.candidates[0].content.parts[0].text;
              }

              if (data.error) {
                const errorMsg = data.error.message || "Unknown error";
                
                // Se for "Not Found" ou "Not Supported", tenta a outra versão (v1/v1beta) antes de desistir do modelo
                if (errorMsg.toLowerCase().includes('not found') || errorMsg.toLowerCase().includes('not supported')) {
                  console.warn(`[Gemini] Modelo ${modelPath} não encontrado na versão ${apiVersion}. Tentando alternativa...`);
                  lastError = new Error(errorMsg);
                  break; // Sai do while, vai para a próxima apiVersion ou próximo modelo
                }

                if (isQuotaError(null, data)) {
                  if (attempts < MAX_ATTEMPTS) {
                    const waitMs = 1500 * Math.pow(2, attempts - 1);
                    await new Promise(r => setTimeout(r, waitMs));
                    continue;
                  }
                  break; 
                }

                if (isAuthError(null, data)) {
                  const err = new Error("Chave de IA indisponível no momento. Tente novamente em instantes ou verifique suas configurações.");
                  err.status = 403;
                  throw err;
                }
                
                const err = new Error(typeof data.error === 'string' ? data.error : (errorMsg || "Erro desconhecido na API do Google"));
                err.status = data.error.code || 500;
                throw err;
              }

              if (!res.ok) {
                 const err = new Error(data.message || data.error_message || `HTTP Error ${res.status}: ${res.statusText}`);
                 err.status = res.status;
                 throw err;
              }

              // Se a requisição foi bem-sucedida mas não retornou texto (ex: bloqueio de segurança)
              if (res.ok && (!data.candidates || data.candidates.length === 0 || !data.candidates[0]?.content)) {
                 const blockReason = data.promptFeedback?.blockReason || data.candidates?.[0]?.finishReason || "Desconhecido";
                 const err = new Error(`Prompt bloqueado pelos filtros de segurança do Google. Motivo: ${blockReason}`);
                 err.status = 400;
                 throw err;
              }
            } catch (e) {
              if (isQuotaError(e) && attempts < MAX_ATTEMPTS) {
                await new Promise(r => setTimeout(r, 1500));
                continue;
              }
              lastError = e;
              break;
            }
          }
          if (versionSuccess) break;
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
  const gptKey = options.gptKey || (typeof window !== 'undefined' ? localStorage.getItem('guru_gpt_key') : null);
  const lastMsg = lastError?.message || "";
  
  // Strict Quota Check for Fallback
  const isQuotaReached = lastError?.status === 429 || 
                         (lastMsg.toLowerCase().includes('quota') && lastMsg.toLowerCase().includes('exhausted')) ||
                         lastMsg.toLowerCase().includes('rate limit exceeded');
                         
  const isModelError = lastMsg.toLowerCase().includes('not found') || lastMsg.toLowerCase().includes('not supported') || lastMsg.toLowerCase().includes('internal');

  // Fallback se esgotou a cota OU se deu erro bizarro no modelo do Google
  if (gptKey && (isQuotaReached || isModelError || !lastError)) {
    try {
      console.warn("🚨 Gemini inoperante (Cota/Erro Modelo). Acionando Fallback Crítico para GPT...");
      window.dispatchEvent(new CustomEvent('guru_fallback_triggered', { 
        detail: { message: "Gemini temporariamente indisponível. Acionando GPT de emergência..." } 
      }));
      // Try with GPT-4o-mini as it is reliable and cheaper for emergency recovery
      return await callGPT(gptKey, prompt, "gpt-4o-mini", options);
    } catch (gptErr) {
      console.error("Critical Fallback also failed:", gptErr);
    }
  }

  if (lastError) {
    const errorMsg = lastError.message || "";
    if (errorMsg.includes('not found') || errorMsg.includes('not supported')) {
      throw new Error("Chave paga (Google Cloud) sem acesso: Certifique-se de que a 'Generative Language API' (AI Studio) está habilitada no console do GCP para este projeto e região. Erro nativo: " + errorMsg);
    }
    throw lastError;
  }

  throw new Error("Não foi possível obter resposta do Gemini após tentar todas as chaves.");
};


/**
 * Calls Gemini (Imagen) to generate an image from a prompt.
 * Uses the v1beta endpoint for Imagen 3.
 */
export const callGeminiImage = async (apiKeys, prompt, options = {}) => {
  if (!apiKeys) apiKeys = 'GLOBAL';

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

      const queryParam = apiKey === 'GLOBAL' ? '' : `?key=${apiKey}`;
      const url = resolveApiUrl(`/api/gemini/v1beta/${modelPath}:generateImages${queryParam}`);

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
  const globalConfigs = JSON.parse(localStorage.getItem('guru_configs') || '{}');
  const userModel = globalConfigs.active_model;
  
  if (activeAI === 'Gemini') {
    const mainKeys = (localStorage.getItem('guru_gemini_key') || '').trim() || 'GLOBAL';
    const idx = parseInt(localStorage.getItem('guru_gemini_active_idx') || '0');
    // Prioriza o modelo exigido pela função (ex: gemini-2.5-flash para análises profundas), senão usa o das Configurações, senão default FLASH
    const finalModel = options.model || (userModel && userModel.startsWith('gemini') ? userModel : 'gemini-2.5-flash');
    return await callGemini(mainKeys, prompt, { ...options, model: finalModel, forcedIndex: idx });
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
  const defaultKeys = (localStorage.getItem('guru_gemini_key') || '').trim() || 'GLOBAL';
  return await callGemini(defaultKeys, prompt, options);
};

// -------------------------------------------------------------
// IMAGE GENERATION (Imagen 4)
// -------------------------------------------------------------
export const generateGeminiImage = async (prompt, apiKey = 'GLOBAL') => {
  const modelPath = 'models/imagen-4.0-fast-generate-001';
  const queryParam = apiKey === 'GLOBAL' ? '' : `?key=${apiKey}`;
  const url = resolveApiUrl(`/api/gemini/v1beta/${modelPath}:predict${queryParam}`);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: { sampleCount: 1, aspectRatio: "16:9" }
      })
    });

    const data = await res.json();
    
    if (!res.ok) {
       const errorMessage = data.error?.message || data.message || `HTTP Error ${res.status}`;
       
       // Fallback automático para a chave Global se a chave pessoal der erro de faturamento/quota
       if (apiKey !== 'GLOBAL' && (errorMessage.toLowerCase().includes('paid plan') || errorMessage.toLowerCase().includes('billing') || res.status === 403)) {
           console.warn("[Gemini Imagen] Chave pessoal recusada por falta de faturamento. Tentando chave Global Mestra Paga...");
           return await generateGeminiImage(prompt, 'GLOBAL');
       }

       const err = new Error(errorMessage);
       err.status = res.status;
       throw err;
    }

    if (data.predictions && data.predictions[0]?.bytesBase64Encoded) {
       if (apiKey !== 'GLOBAL') recordUsage(apiKey);
       return `data:image/jpeg;base64,${data.predictions[0].bytesBase64Encoded}`;
    }

    throw new Error("A API não retornou os dados de imagem esperados.");
  } catch (err) {
    console.error('[Gemini Imagen Error]', err);
    throw err;
  }
};

