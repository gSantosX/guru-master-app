import { resolveApiUrl } from './apiUtils';

/**
 * Robustly calls the Gemini API, handling model selection and fallbacks.
 */
export const callGemini = async (apiKey, prompt, options = {}) => {
  if (!apiKey) throw new Error("Chave Gemini ausente!");

  const modelsToTry = [];
  try {
    const modelsRes = await fetch(resolveApiUrl(`/api/gemini/v1beta/models?key=${apiKey}`));
    if (modelsRes.ok) {
    const modelsData = await modelsRes.json();
    if (modelsData.models) {
      // Collect all promising models in order of preference
      const flash20 = modelsData.models.find(m => m.name.includes('gemini-2.0-flash') && m.supportedGenerationMethods?.includes('generateContent'));
      const flash15 = modelsData.models.find(m => m.name.includes('gemini-1.5-flash') && m.supportedGenerationMethods?.includes('generateContent'));
      const pro15 = modelsData.models.find(m => m.name.includes('gemini-1.5-pro') && m.supportedGenerationMethods?.includes('generateContent'));
      const pro10 = modelsData.models.find(m => m.name.includes('gemini-1.0-pro') && m.supportedGenerationMethods?.includes('generateContent'));
      
      if (flash20) modelsToTry.push(flash20.name);
      if (flash15) modelsToTry.push(flash15.name);
      if (pro15) modelsToTry.push(pro15.name);
      if (pro10) modelsToTry.push(pro10.name);
      
      // Add any other gemini models as a last resort
      modelsData.models.forEach(m => {
        if (m.name.includes('gemini') && m.supportedGenerationMethods?.includes('generateContent') && !modelsToTry.includes(m.name)) {
          modelsToTry.push(m.name);
        }
      });
    }
    }
  } catch (e) {
    console.error("Gemini model list error:", e);
  }

  // Ensure we have at least the standard ones if list failed
  const fallbacks = [
    "models/gemini-1.5-flash", 
    "models/gemini-1.5-flash-latest",
    "models/gemini-1.5-pro", 
    "models/gemini-1.5-pro-latest",
    "models/gemini-pro"
  ];
  fallbacks.forEach(f => {
    if (!modelsToTry.includes(f)) modelsToTry.push(f);
  });

  let lastError = null;
  for (const modelPath of modelsToTry) {
    try {
      // Ensure modelPath starts with "models/" for the URL
      const cleanPath = modelPath.startsWith('models/') ? modelPath : `models/${modelPath}`;
      
      const res = await fetch(resolveApiUrl(`/api/gemini/v1beta/${cleanPath}:generateContent?key=${apiKey}`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: options.generationConfig || {}
        })
      });

      const data = await res.json();
      
      if (res.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
        return data.candidates[0].content.parts[0].text;
      }

      // If we got an error, specifically check for quota/rate limit (429)
      if (data.error) {
        lastError = new Error(`Gemini (${cleanPath}): ${data.error.message}`);
        
        // Try next model for common recoverable errors
        const retryableMessages = ['quota', 'not found', 'supported', 'limit', 'exhausted'];
        const isRetryable = retryableMessages.some(msg => data.error.message?.toLowerCase().includes(msg));
        
        if (res.status === 429 || res.status === 404 || res.status === 400 || isRetryable || res.status >= 500) {
          console.warn(`Error for ${cleanPath}, trying next...`, data.error.message);
          
          // If v1beta failed with "not found", try v1 for the same model
          if (res.status === 400 || res.status === 404) {
             const v1Res = await fetch(resolveApiUrl(`/api/gemini/v1/${cleanPath}:generateContent?key=${apiKey}`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{ role: "user", parts: [{ text: prompt }] }],
                  generationConfig: options.generationConfig || {}
                })
             });
             const v1Data = await v1Res.json();
             if (v1Res.ok && v1Data.candidates?.[0]?.content?.parts?.[0]?.text) {
                return v1Data.candidates[0].content.parts[0].text;
             }
          }
          continue; // Try next model in loop
        }
        
        // If it's a fatal error (like 401 Unauthorized), stop immediately
        throw lastError;
      }
    } catch (e) {
      lastError = e;
      console.error(`Error calling ${modelPath}:`, e);
    }
  }

  throw lastError || new Error("Não foi possível obter resposta do Gemini.");
};

/**
 * Calls Gemini (Imagen) to generate an image from a prompt.
 * Uses the v1beta endpoint for Imagen 3.
 */
export const callGeminiImage = async (apiKey, prompt, options = {}) => {
  if (!apiKey) throw new Error("Chave Gemini ausente!");

  const modelPath = options.model || "models/imagen-3.0-generate-001";
  const url = resolveApiUrl(`/api/gemini/v1beta/${modelPath}:generateImages?key=${apiKey}`);

  try {
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
    if (res.ok && data.images?.[0]?.url) {
      return data.images[0].url;
    } else if (res.ok && data.images?.[0]?.image_url) {
      return data.images[0].image_url;
    }
    
    // Fallback if the above doesn't work (some accounts use a different response structure)
    if (data.error) {
       throw new Error(`Gemini Image Error: ${data.error.message}`);
    }
    
    throw new Error("Resposta de imagem do Gemini vazia ou malformada.");
  } catch (e) {
    console.error("Gemini Image generation failed:", e);
    throw e;
  }
};

/**
 * Robustly calls OpenAI (GPT) API via proxy.
 */
export const callGPT = async (apiKey, prompt, model = "gpt-4o-mini", options = {}) => {
  if (!apiKey) throw new Error("Chave GPT ausente!");

  const response = await fetch(resolveApiUrl("/api/openai/v1/chat/completions"), {
    method: "POST",
    headers: { 
      "Content-Type": "application/json", 
      "Authorization": `Bearer ${apiKey}` 
    },
    body: JSON.stringify({ 
      model: model, 
      messages: options.messages || [{ role: "user", content: prompt }],
      temperature: options.temperature ?? 0.7
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`GPT Error: ${data.error?.message || response.statusText}`);
  }

  return data.choices[0].message.content;
};

/**
 * Translates SRT content while preserving timestamps and structure.
 */
export const translateSRT = async (srtText, targetLang, apiKey, provider = 'gemini') => {
  if (!apiKey) throw new Error("API Key ausente para tradução!");

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
    return await callGPT(apiKey, prompt, "gpt-4o-mini");
  } else {
    return await callGemini(apiKey, prompt);
  }
};

/**
 * Robustly calls Grok API via proxy.
 */
export const callGrok = async (apiKey, prompt, model = "grok-beta", options = {}) => {
  if (!apiKey) throw new Error("Chave Grok ausente!");

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
    throw new Error(`Grok Error: ${data.error?.message || response.statusText}`);
  }

  return data.choices[0].message.content;
};
