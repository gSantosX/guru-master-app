import React, { useState, useEffect, useCallback } from 'react';
import { Settings, Key, Palette, HardDrive, Shield, CheckCircle, Cpu, AlertCircle, Info, Zap, RefreshCw, Layout, Plus, Minus, Youtube, Download , Trash2} from 'lucide-react';
import { motion } from 'framer-motion';
import { useSystemStatus } from '../contexts/SystemStatusContext';
import { resolveApiUrl } from '../utils/apiUtils';
import { t } from '../utils/i18n';
import { useAuth } from '../contexts/AuthContext';

export const SettingsTab = () => {
  const { status, configs, checkConnectivity, updateConfig, isInitialized, activeIndices, checkBulkKeys, showToast } = useSystemStatus();
  const { user } = useAuth();
  const isAdmin = user?.email === 'suporte.gurumaster@gmail.com' || localStorage.getItem('guru_user_email') === 'suporte.gurumaster@gmail.com';
  
  const [geminiKeys, setGeminiKeys] = useState(configs.gemini_key || '');
  const [gptKeys, setGptKeys] = useState(configs.gpt_key || '');
  const [grokKeys, setGrokKeys] = useState(configs.grok_key || '');
  const [geminiPromptsKey, setGeminiPromptsKey] = useState(configs.gemini_prompts_key || '');
  const [googleScriptKey, setGoogleScriptKey] = useState(configs.google_script_key || '');
  const [youtubeKey, setYoutubeKey] = useState(configs.youtube_key || '');
  // status de validação das chaves pessoais: null | 'checking' | 'valid' | 'invalid'
  const [googleScriptKeyStatus, setGoogleScriptKeyStatus] = useState(null);
  const [youtubeKeyStatus, setYoutubeKeyStatus] = useState(null);
  
  const [anthropicKey, setAnthropicKey] = useState(configs.anthropic_key || '');
  const [deepseekKey, setDeepseekKey] = useState(configs.deepseek_key || '');
  const [elevenlabsKey, setElevenlabsKey] = useState(configs.elevenlabs_key || '');
  const [leonardoKey, setLeonardoKey] = useState(configs.leonardo_key || '');
  const [googleClientId, setGoogleClientId] = useState(configs.google_client_id || '');
  const [smtpUser, setSmtpUser] = useState(configs.smtp_user || '');
  const [smtpPass, setSmtpPass] = useState(configs.smtp_password || '');
  const [activeAi, setActiveAi] = useState(configs.active_ai);
  const [ffmpegPath, setFfmpegPath] = useState(configs.ffmpeg_path || 'ffmpeg');
  const [ffprobePath, setFfprobePath] = useState(configs.ffprobe_path || 'ffprobe');
  const [flowDownloadsPath, setFlowDownloadsPath] = useState(configs.flow_downloads_path || '');
  
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('guru_theme') || 'neon');
  const [reduceMotion, setReduceMotion] = useState(localStorage.getItem('guru_reduce_motion') === 'true');
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [appFontSize, setAppFontSize] = useState(Number(localStorage.getItem('guru_app_font_size')) || 16);
  const [storageInfo, setStorageInfo] = useState({ cache_size: 0, total_space: 21474836480, free_space: 0 }); 
  // promptsKeyStatus removed — using global status.prompts_key from context

  // Flag to block auto-save when we're syncing FROM cloud (not user typing)
  const syncingFromCloud = React.useRef(false);

  // Sync form fields whenever configs change (e.g., after loading from Supabase)
  useEffect(() => {
    if (!configs) return;
    // Block auto-save during sync so we don't overwrite cloud data with empty strings
    syncingFromCloud.current = true;
    setGeminiKeys(configs.gemini_key || '');
    setGptKeys(configs.gpt_key || '');
    setGrokKeys(configs.grok_key || '');
    setGeminiPromptsKey(configs.gemini_prompts_key || '');
    const gsk = configs.google_script_key || '';
    const ytk = configs.youtube_key || '';
    setGoogleScriptKey(gsk);
    setYoutubeKey(ytk);
    setAnthropicKey(configs.anthropic_key || '');
    setDeepseekKey(configs.deepseek_key || '');
    setElevenlabsKey(configs.elevenlabs_key || '');
    setLeonardoKey(configs.leonardo_key || '');
    setGoogleClientId(configs.google_client_id || '');
    setSmtpUser(configs.smtp_user || '');
    setSmtpPass(configs.smtp_password || '');
    // Auto-valida se já tem chaves salvas
    if (gsk) setTimeout(() => testGoogleScriptKey(gsk), 1200);
    if (ytk) setTimeout(() => testYoutubeKey(ytk), 1600);
    if (configs.active_ai) setActiveAi(configs.active_ai);
    setFfmpegPath(configs.ffmpeg_path || 'ffmpeg');
    setFfprobePath(configs.ffprobe_path || 'ffprobe');
    setFlowDownloadsPath(configs.flow_downloads_path || '');
    // Release lock after debounce + buffer (1.5s debounce + 1.5s buffer)
    setTimeout(() => { syncingFromCloud.current = false; }, 3000);
  }, [configs]);

  // Auto-save removed — user must click SALVAR to persist (avoids loop with syncingFromCloud)

  const fetchStorageInfo = async () => {
    // Storage info only available in local Electron/desktop mode
    setStorageInfo({ cache_size: 0, total_space: 0, free_space: 0 });
  };

  const formatBytes = (bytes, decimals = 1) => {
    if (bytes === 0) return '0 MB';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    if (i < 2) return '0.1 MB'; // Minimum display
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  
  const handleClearAllKeys = async () => {
    // Limpa os campos visuais imediatamente
    setGeminiKeys('');
    setGptKeys('');
    setGrokKeys('');
    setGeminiPromptsKey('');
    setGoogleScriptKey('');
    setAnthropicKey('');
    setDeepseekKey('');
    setElevenlabsKey('');
    setLeonardoKey('');
    setYoutubeKey('');

    setIsSaving(true);
    const success = await updateConfig({
      gemini_key: '',
      gpt_key: '',
      grok_key: '',
      gemini_prompts_key: '',
      google_script_key: '',
      anthropic_key: '',
      deepseek_key: '',
      elevenlabs_key: '',
      leonardo_key: '',
      youtube_key: '',
    });
    setIsSaving(false);

    if (showToast) {
      showToast(
        success
          ? '🗑️ Todas as chaves foram excluídas permanentemente.'
          : '⚠️ Chaves apagadas da tela, mas houve erro ao salvar no servidor. Clique em Salvar.',
        success ? 'warning' : 'error'
      );
    }
  };


  const handleSaveKeys = async () => {
    setIsSaving(true);
    const success = await updateConfig({
      gemini_key: typeof geminiKeys === 'string' ? geminiKeys.split(',').map(k => k.trim()).filter(Boolean).join(',') : '',
      gpt_key: typeof gptKeys === 'string' ? gptKeys.split(',').map(k => k.trim()).filter(Boolean).join(',') : '',
      grok_key: typeof grokKeys === 'string' ? grokKeys.split(',').map(k => k.trim()).filter(Boolean).join(',') : '',
      gemini_prompts_key: geminiPromptsKey.trim(),
      google_script_key: googleScriptKey.trim(),
      anthropic_key: anthropicKey,
      deepseek_key: deepseekKey,
      elevenlabs_key: elevenlabsKey,
      leonardo_key: leonardoKey,
      youtube_key: youtubeKey,
      google_client_id: googleClientId,
      smtp_user: smtpUser,
      smtp_password: smtpPass,
      active_ai: activeAi,
      ffmpeg_path: ffmpegPath,
      ffprobe_path: ffprobePath,
      flow_downloads_path: flowDownloadsPath
    });
    
    setIsSaving(false);
    if (success) {
      setIsSaved(true);
      // Re-check all keys on save
      checkAllKeyStatuses();
      setTimeout(() => setIsSaved(false), 2000);
    }
  };

  // Check key statuses using the REAL configs values (not form field state)
  // This avoids showing "offline" when fields haven't been filled yet
  const checkAllKeyStatuses = useCallback(async () => {
    await checkConnectivity();
  }, [checkConnectivity]);

  // Run key check once configs are fully loaded (not just initialized)
  useEffect(() => {
    if (isInitialized && (configs.gemini_key || configs.gpt_key || configs.grok_key || configs.gemini_prompts_key)) {
      checkAllKeyStatuses();
    }
  }, [isInitialized, configs.gemini_key, configs.gpt_key, configs.grok_key, configs.gemini_prompts_key]);

  const handleReconnect = async () => {
    setIsReconnecting(true);
    await checkConnectivity();
    setTimeout(() => setIsReconnecting(false), 1200);
  };

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('guru_theme', newTheme);
    window.dispatchEvent(new Event('guru_theme_change'));
  };

  const handleMotionChange = (e) => {
    const isChecked = typeof e === 'boolean' ? e : e.target.checked;
    setReduceMotion(isChecked);
    localStorage.setItem('guru_reduce_motion', isChecked);
    window.dispatchEvent(new Event('guru_motion_change'));
  };

  // ── VALIDAÇÃO REAL DA CHAVE GOOGLE (Gemini) via /api/check ──────────────────
  const testGoogleScriptKey = async (keyToTest) => {
    const key = (keyToTest !== undefined ? keyToTest : googleScriptKey).trim();
    if (!key) { setGoogleScriptKeyStatus(null); return false; }
    setGoogleScriptKeyStatus('checking');
    try {
      const res = await fetch(resolveApiUrl('/api/check'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'gemini', keys: [key] })
      });
      if (!res.ok) { setGoogleScriptKeyStatus('invalid'); return false; }
      const data = await res.json();
      const st = data.statuses?.[0] || 'offline';
      const valid = st === 'online';
      setGoogleScriptKeyStatus(valid ? 'valid' : 'invalid');
      return valid;
    } catch {
      setGoogleScriptKeyStatus('invalid');
      return false;
    }
  };

  // ── VALIDAÇÃO REAL DA CHAVE YOUTUBE via /api/check ────────────────────────
  const testYoutubeKey = async (keyToTest) => {
    const key = (keyToTest !== undefined ? keyToTest : youtubeKey).trim();
    if (!key) { setYoutubeKeyStatus(null); return false; }
    setYoutubeKeyStatus('checking');
    try {
      const res = await fetch(resolveApiUrl('/api/check'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'youtube', keys: [key] })
      });
      if (!res.ok) { setYoutubeKeyStatus('invalid'); return false; }
      const data = await res.json();
      const st = data.statuses?.[0] || 'offline';
      const valid = st === 'online';
      setYoutubeKeyStatus(valid ? 'valid' : 'invalid');
      return valid;
    } catch {
      setYoutubeKeyStatus('invalid');
      return false;
    }
  };

  // ── SALVAR E VERIFICAR CHAVES PESSOAIS ────────────────────────────────────
  const handleSavePersonalKeys = async () => {
    setIsSaving(true);
    // Valida ambas em paralelo antes de salvar
    const keyToTest = googleScriptKey.trim() || geminiPromptsKey.trim();
    const [gOk, ytOk] = await Promise.all([
      keyToTest ? testGoogleScriptKey(keyToTest) : Promise.resolve(null),
      youtubeKey.trim() ? testYoutubeKey(youtubeKey) : Promise.resolve(null),
    ]);
    // Só salva se pelo menos a validação não retornou 'invalid' (null = campo vazio = ok)
    const hasError = gOk === false || ytOk === false;
    if (!hasError) {
      await updateConfig({
        google_script_key: '',          // limpa chave do roteiro (não usada mais)
        gemini_prompts_key: keyToTest,  // salva como chave exclusiva do Gerador de Prompts
        youtube_key: youtubeKey.trim(),
      });
      showToast('✅ Chaves verificadas e salvas com sucesso!', 'success');
    } else {
      showToast('❌ Uma ou mais chaves estão inválidas. Verifique e tente novamente.', 'error');
    }
    setIsSaving(false);
  };

  const handleClearCache = async () => {
    if (confirm(t('settings.clear_warning'))) {
      try {
        await fetch(resolveApiUrl('/api/storage/clear'), { method: 'POST' });
        localStorage.removeItem('guru_scripts');
        localStorage.removeItem('guru_active_renders');
        localStorage.removeItem('guru_completed_renders');
        await fetchStorageInfo();
        alert(t('settings.clear_success'));
        window.dispatchEvent(new Event('guru_completed_updated'));
        window.dispatchEvent(new Event('guru_scripts_updated'));
      } catch (e) {
        alert("Erro ao limpar cache remoto.");
      }
    }
  };

  const MultiKeyField = ({ label, keysStr, setKeysStr, placeholder }) => {
    const { activeIndices, setManualActiveIndex, keyStatuses } = useSystemStatus();
    const provider = label.toLowerCase() === 'openai' ? 'openai' : label.toLowerCase();
    const statuses = keyStatuses[provider] || [];
    const activeIdx = activeIndices[provider] || 0;

    const keysArray = (typeof keysStr === 'string' ? keysStr : '').split(',').map(k => k.trim()).filter(Boolean);

    const handlePaste = (e) => {
      e.preventDefault();
      const pasted = (e.clipboardData || window.clipboardData).getData('text').trim();
      const cleanPasted = pasted.replace(/[\n\r\s]+/g, ',').replace(/,+/g, ',');

      const currentVal = typeof keysStr === 'string' ? keysStr : '';
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      
      let before = currentVal.substring(0, start);
      let after = currentVal.substring(end);
      
      if (before && !before.endsWith(',') && !before.endsWith(', ') && !cleanPasted.startsWith(',')) {
        before += ", ";
      }
      if (after && !after.startsWith(',') && !after.startsWith(', ') && !cleanPasted.endsWith(',')) {
        after = ", " + after;
      }
      
      setKeysStr(before + cleanPasted + after);
    };

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-medium text-gray-300">{label} (Separe chaves com vírgula)</label>
        </div>
        
        <textarea 
          value={typeof keysStr === 'string' ? keysStr : ''}
          onChange={(e) => setKeysStr(e.target.value)}
          onPaste={handlePaste}
          placeholder={`Cole as chaves aqui... Ex: ${placeholder}`}
          rows={Math.max(2, Math.min(4, keysArray.length > 2 ? 3 : 2))}
          className="w-full bg-dark/50 border border-white/10 rounded-lg p-2 text-gray-400 focus:outline-none focus:border-neon-cyan/50 text-xs font-mono break-all resize-none shadow-inner transition-all hover:bg-dark/70"
        />

        {keysArray.length > 0 && (
          <div className="flex gap-2 flex-wrap mt-2">
            {keysArray.map((key, idx) => {
              const statusStr = statuses[idx] || '';
              const isOnline = statusStr.startsWith('online');
              const isQuota = statusStr.startsWith('quota');
              const isChecking = statusStr.startsWith('checking');
              
              const isExhaustedOrOffline = isQuota || (!isOnline && !isChecking && statusStr !== '');

              let statusColor = isOnline ? 'bg-green-500/20 text-green-400 border-green-500/30' : 
                                isChecking ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                                'bg-red-500/20 text-red-500 border-red-500/30';
              
              let statusDot = isOnline ? 'bg-green-400' : isChecking ? 'bg-yellow-400 animate-pulse' : 'bg-red-500';

              let label = idx === activeIdx ? 'Ativo' : 'Reserva';
              if (isExhaustedOrOffline) {
                 label = isQuota ? 'Esgotada' : 'Offline';
              }

              return (
                 <div key={idx} className={`flex items-center gap-2 px-2 py-1 rounded border text-[9px] font-black uppercase tracking-widest ${idx === activeIdx ? 'ring-1 ring-neon-cyan shadow-[0_0_10px_rgba(0,243,255,0.2)]' : ''} ${statusColor}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${statusDot}`}></div>
                    <span>{label}: ...{key.slice(-4)}</span>
                    <button 
                      onClick={() => setManualActiveIndex(provider, idx)}
                      className={`ml-1 px-1.5 py-0.5 rounded ${idx === activeIdx ? 'bg-white/20' : 'bg-black/20 hover:bg-black/40'} transition-colors`}
                    >
                      {idx === activeIdx ? 'Usando' : 'Forçar Uso'}
                    </button>
                 </div>
              );
            })}
          </div>
        )}
        
        {keysArray.length > 1 && (
          <div className="flex items-center gap-2 mt-2 px-3 py-2 bg-neon-cyan/5 border border-neon-cyan/10 rounded-lg">
             <Zap className="w-3 h-3 text-neon-cyan animate-pulse shrink-0" />
             <span className="text-[9px] text-gray-500 font-medium uppercase tracking-wider">
               Rotação Automática: O Guru Master pulará a chave esgotada e usará a próxima.
             </span>
          </div>
        )}
      </div>
    );
  };

  const StatusItem = ({ label, status, icon: Icon, error }) => {
    const isOnline     = status === 'online' || status === 'configured';
    const isChecking   = status === 'checking...';
    const isOffline    = status === 'offline' || status === 'unconfigured' || (!isOnline && !isChecking);

    let displayStatus = isOnline ? 'LIGADO' : isChecking ? 'TESTANDO' : 'DESLIGADO';
    
    const provider = label.toLowerCase();
    const isAi = provider.includes('gemini') || provider.includes('openai') || provider.includes('grok');
    if (isAi && isOnline && status === 'online') {
       const keyType = provider.includes('gemini') ? 'gemini' : provider.includes('openai') ? 'openai' : 'grok';
       const idx = activeIndices[keyType];
       displayStatus += idx === 0 ? ' (PRIME)' : ` (RES ${idx})`;
    }

    return (
      <div className="p-3 bg-dark/40 rounded-xl border border-white/5 flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon className={`w-4 h-4 ${isOnline ? 'text-green-400' : isChecking ? 'text-yellow-400 animate-pulse' : 'text-red-400'}`} />
            <span className="text-sm text-gray-300">{label}</span>
          </div>
          <span className={`text-[10px] px-2.5 py-0.5 rounded-lg font-black tracking-widest uppercase shadow-sm ${
            isOnline    ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 
            isChecking  ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-4' :
            'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}>
            {displayStatus}
          </span>
        </div>
        {(error || status === 'quota') && (
          <p className="text-[10px] text-red-400/80 mt-1 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> {status === 'quota' ? (label.toLowerCase().includes('youtube') ? 'Cota do YouTube excedida.' : 'Limite da API Excedido') : error}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto h-full flex flex-col overflow-y-auto custom-scrollbar pb-20">
      <header className="mb-6 md:mb-8 shrink-0">
        <h2 className="text-2xl md:text-4xl font-bold text-gray-200 flex items-center gap-2 md:gap-3">
          <Settings className="text-gray-400 w-8 h-8 md:w-10 md:h-10" />
          {t('settings.title')}
        </h2>
        <p className="text-sm md:text-base text-gray-400 mt-2">{t('settings.subtitle')}</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 flex-1">
        
        {/* Left Column */}
        <div className="space-y-6">

          {/* ── CARD PÚBLICO: SUAS CHAVES PESSOAIS (visível a TODOS) ────── */}
          <div className="glass-card p-6 border border-neon-cyan/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-neon-cyan/5 rounded-full blur-xl pointer-events-none" />
            <h3 className="text-lg font-black text-white flex items-center gap-2 mb-1 uppercase tracking-widest">
              <Key className="text-neon-cyan w-5 h-5" /> Suas Chaves Pessoais
            </h3>
            <p className="text-[10px] text-gray-500 mb-5 italic tracking-wide">
              Estas chaves são exclusivas da sua conta e aumentam seus limites de uso.
            </p>

            <div className="space-y-5">
              {/* CHAVE EXCLUSIVA — CRIADOR DE PROMPTS */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-br from-neon-pink to-neon-purple shadow-[0_0_6px_rgba(255,44,182,0.5)]" />
                    <label className="text-xs font-black uppercase tracking-widest bg-gradient-to-r from-neon-pink to-neon-purple bg-clip-text text-transparent">
                      Criador de Prompts — Chave Exclusiva
                    </label>
                  </div>
                  {(configs.google_script_key || configs.gemini_prompts_key) && (
                    <button
                      onClick={() => {
                        if (confirm("Tem certeza que deseja excluir esta chave permanentemente de todas as suas máquinas?")) {
                          setGoogleScriptKey('');
                          setGeminiPromptsKey('');
                          setGoogleScriptKeyStatus(null);
                          updateConfig({ google_script_key: '', gemini_prompts_key: '' });
                          showToast("Chave do Criador de Prompts esquecida permanentemente.", "warning");
                        }
                      }}
                      className="text-[9px] text-red-500 hover:text-red-400 font-bold uppercase flex items-center gap-1 transition-all"
                    >
                      <Trash2 className="w-3 h-3" /> Esquecer chave
                    </button>
                  )}
                </div>
                <p className="text-[9px] text-gray-500 italic mb-2 pl-5">
                  Chave gratuita usada <span className="text-neon-pink font-bold">exclusivamente</span> para criar prompts de imagem e vídeo. Não consome a cota paga.
                  <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="ml-1 text-neon-cyan underline">Obter chave gratuita ↗</a>
                </p>
                <div className="relative">
                  <input
                    type="password"
                    value={googleScriptKey || geminiPromptsKey}
                    onChange={(e) => { setGoogleScriptKey(e.target.value); setGeminiPromptsKey(e.target.value); setGoogleScriptKeyStatus(null); }}
                    placeholder="AIza... (chave gratuita do Google AI Studio)"
                    className={`w-full bg-dark/50 rounded-lg p-2.5 pr-32 text-gray-300 focus:outline-none text-xs font-mono transition-all hover:bg-dark/70 border ${
                      googleScriptKeyStatus === 'valid'    ? 'border-green-500/60 shadow-[0_0_16px_rgba(34,197,94,0.3)]' :
                      googleScriptKeyStatus === 'invalid'  ? 'border-red-500/60 shadow-[0_0_12px_rgba(239,68,68,0.2)]' :
                      googleScriptKeyStatus === 'checking' ? 'border-yellow-500/40' :
                      'border-neon-pink/20 focus:border-neon-pink/60'
                    }`}
                  />
                  {/* Badge de status inline */}
                  {googleScriptKeyStatus && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                      {googleScriptKeyStatus === 'checking' && (
                        <span className="text-[8px] px-2 py-1 rounded bg-yellow-500/20 text-yellow-400 font-black uppercase border border-yellow-500/30 animate-pulse">Verificando...</span>
                      )}
                      {googleScriptKeyStatus === 'valid' && (
                        <span className="text-[8px] px-2 py-1 rounded bg-green-500/20 text-green-400 font-black uppercase border border-green-500/30">✓ Conectada</span>
                      )}
                      {googleScriptKeyStatus === 'invalid' && (
                        <span className="text-[8px] px-2 py-1 rounded bg-red-500/20 text-red-400 font-black uppercase border border-red-500/30">✗ Inválida</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* YOUTUBE API KEY */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Youtube className="w-3.5 h-3.5 text-red-400" />
                    <label className="text-xs font-black text-gray-300 uppercase tracking-widest">
                      YouTube API Key
                    </label>
                    {youtubeKeyStatus === 'valid' && (
                      <span className="text-[8px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 font-black uppercase border border-green-500/30">✓ Online</span>
                    )}
                  </div>
                  {configs.youtube_key && (
                    <button
                      onClick={() => {
                        if (confirm("Tem certeza que deseja excluir esta chave permanentemente de todas as suas máquinas?")) {
                          setYoutubeKey('');
                          setYoutubeKeyStatus(null);
                          updateConfig({ youtube_key: '' });
                          showToast("Chave do YouTube esquecida permanentemente.", "warning");
                        }
                      }}
                      className="text-[9px] text-red-500 hover:text-red-400 font-bold uppercase flex items-center gap-1 transition-all"
                    >
                      <Trash2 className="w-3 h-3" /> Esquecer chave
                    </button>
                  )}
                </div>
                <p className="text-[9px] text-gray-500 italic mb-2 pl-5">
                  Necessária para o Modelador de Canais e Monitoramento.
                  <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="ml-1 text-red-400 underline">Obter chave ↗</a>
                </p>
                <div className="relative">
                  <input
                    type="password"
                    value={youtubeKey}
                    onChange={(e) => { setYoutubeKey(e.target.value); setYoutubeKeyStatus(null); }}
                    placeholder="AIza..."
                    className={`w-full bg-dark/50 rounded-lg p-2.5 pr-10 text-gray-300 focus:outline-none text-xs font-mono transition-all hover:bg-dark/70 border ${
                      youtubeKeyStatus === 'valid'    ? 'border-green-500/60 shadow-[0_0_12px_rgba(34,197,94,0.25)]' :
                      youtubeKeyStatus === 'invalid'  ? 'border-red-500/60 shadow-[0_0_12px_rgba(239,68,68,0.2)]' :
                      youtubeKeyStatus === 'checking' ? 'border-yellow-500/40' :
                      'border-white/10 focus:border-red-400/40'
                    }`}
                  />
                  {youtubeKeyStatus === 'checking' && (
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                      <RefreshCw className="w-3.5 h-3.5 text-yellow-400 animate-spin" />
                    </div>
                  )}
                </div>
              </div>

              {/* SALVAR E VERIFICAR */}
              <button
                onClick={handleSavePersonalKeys}
                disabled={isSaving}
                className={`w-full py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 ${
                  googleScriptKeyStatus === 'valid' && youtubeKeyStatus !== 'invalid'
                    ? 'bg-green-500/15 text-green-400 border border-green-500/40 shadow-[0_0_20px_rgba(34,197,94,0.2)] hover:shadow-[0_0_30px_rgba(34,197,94,0.35)]'
                    : 'bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30 hover:bg-neon-cyan/20 hover:shadow-[0_0_15px_rgba(0,243,255,0.2)]'
                }`}
              >
                {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <><Key className="w-3.5 h-3.5" /> Salvar e Verificar Conexão</>}
              </button>
            </div>
          </div>

          {isAdmin ? (
          <div className="glass-card p-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4 border-b border-white/10 pb-2">
              <Key className="text-neon-cyan w-5 h-5" /> {t('settings.api_config')}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-300 block mb-2">{t('settings.ai_engine')}</label>
                <div className="flex gap-2">
                  {['Gemini', 'GPT', 'Grok'].map(ai => (
                    <button
                      key={ai}
                      onClick={async () => {
                        setActiveAi(ai);
                        const success = await updateConfig({ active_ai: ai });
                        if (success) {
                           localStorage.setItem('guru_active_ai', ai);
                        }
                      }}
                      className={`flex-1 py-2 text-sm rounded-lg font-medium transition-colors border
                        ${activeAi === ai 
                          ? 'bg-neon-cyan/20 text-neon-cyan border-neon-cyan/50 shadow-[0_0_10px_rgba(0,243,255,0.2)]'
                          : 'bg-dark/50 text-gray-400 border-white/10 hover:border-white/30'
                        }`}
                    >
                      {ai}
                    </button>
                  ))}
                </div>
              </div>

              {/* MODEL SELECTOR */}
              <div className="pt-2">
                <label className="text-sm font-medium text-gray-300 block mb-2">Modelo de Inteligência</label>
                <select 
                  value={configs.active_model || 'gemini-2.5-flash'}
                  onChange={async (e) => {
                    await updateConfig({ active_model: e.target.value });
                    showToast(`Modelo alterado para: ${e.target.value}`, 'success');
                  }}
                  className="w-full bg-dark/60 border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-neon-cyan/50 text-xs shadow-inner appearance-none cursor-pointer hover:bg-white/5 transition-colors"
                >
                  <optgroup label="Google Gemini — Gratuito ✅" className="bg-dark text-gray-500">
                    <option value="gemini-3.1-flash-lite">⚡ Gemini 3.1 Flash Lite (500 req/dia — MAIS ECONÔMICO)</option>
                    <option value="gemini-2.5-flash">🚀 Gemini 2.5 Flash (20 req/dia — PADRÃO RECOMENDADO)</option>
                    <option value="gemini-2.5-flash-lite">💡 Gemini 2.5 Flash Lite (20 req/dia)</option>
                  </optgroup>
                  <optgroup label="OpenAI" className="bg-dark text-gray-500">
                    <option value="gpt-4o">GPT-4o (Omni)</option>
                    <option value="gpt-4o-mini">GPT-4o Mini (Econômico)</option>
                    <option value="o1-preview">OpenAI o1-Preview</option>
                  </optgroup>
                  <optgroup label="xAI" className="bg-dark text-gray-500">
                    <option value="grok-beta">Grok Beta</option>
                  </optgroup>
                </select>
                <p className="text-[9px] text-gray-600 mt-1 italic tracking-tight">* O modelo selecionado será usado em todas as gerações de roteiros e análises.</p>
              </div>
              
              <div className="pt-2">
                <MultiKeyField 
                  label="Gemini" 
                  keysStr={geminiKeys} 
                  setKeysStr={setGeminiKeys} 
                  placeholder="AIza..." 
                />
              </div>

              <div className="pt-2">
                <MultiKeyField 
                  label="OpenAI" 
                  keysStr={gptKeys} 
                  setKeysStr={setGptKeys} 
                  placeholder="sk-..." 
                />
              </div>
              
              <div className="pt-2">
                <MultiKeyField 
                  label="Grok" 
                  keysStr={grokKeys} 
                  setKeysStr={setGrokKeys} 
                  placeholder="xai-..." 
                />
              </div>

              {/* ── CHAVE EXCLUSIVA GERADOR DE PROMPTS ─────────────── */}
              <div className="pt-3 border-t border-neon-pink/20">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-4 h-4 rounded bg-gradient-to-br from-neon-pink to-neon-purple flex items-center justify-center shrink-0">
                    <span className="text-[8px]">✦</span>
                  </div>
                  <label className="text-[10px] font-black uppercase tracking-widest bg-gradient-to-r from-neon-pink to-neon-purple bg-clip-text text-transparent">
                    Chave Exclusiva — Gerador de Prompts
                  </label>
                </div>
                <p className="text-[9px] text-gray-500 italic mb-2 pl-6">
                  Esta chave será usada <span className="text-neon-pink font-bold">somente</span> na aba "Gerador de Prompts". 
                  Se vazia, usa a chave Gemini principal. Ideal para separar cotas de uso.
                </p>
                <div className="relative">
                  <input
                    type="password"
                    value={geminiPromptsKey}
                    onChange={(e) => setGeminiPromptsKey(e.target.value)}
                    placeholder="AIza... (chave exclusiva para prompts)"
                    className="w-full bg-dark/50 border border-neon-pink/20 rounded-lg p-2.5 pr-20 text-gray-300 focus:outline-none focus:border-neon-pink/50 text-xs font-mono transition-all hover:bg-dark/70 shadow-[0_0_10px_rgba(255,44,182,0.05)] focus:shadow-[0_0_15px_rgba(255,44,182,0.15)]"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                      onClick={async () => {
                        if (!geminiPromptsKey.trim()) return;
                        setIsSaving(true);
                        await updateConfig({ gemini_prompts_key: geminiPromptsKey.trim() });
                        await checkConnectivity();
                        setIsSaving(false);
                        showToast('Teste de conexão concluído', 'info');
                      }}
                      className="text-[8px] px-2 py-1 rounded bg-neon-pink/20 text-neon-pink font-black uppercase tracking-wider border border-neon-pink/30 hover:bg-neon-pink/30 transition-colors"
                    >
                      {status.prompts_key === 'checking...' ? '...' : 'Testar'}
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300 block mb-1">Anthropic (Claude) Key</label>
                <input 
                  type="password" 
                  value={anthropicKey}
                  onChange={(e) => setAnthropicKey(e.target.value)}
                  placeholder="sk-ant-..."
                  className="w-full bg-dark/50 border border-white/10 rounded-lg p-2.5 text-gray-400 focus:outline-none focus:border-neon-cyan/50 text-sm font-mono"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-300 block mb-1">DeepSeek Key</label>
                <input 
                  type="password" 
                  value={deepseekKey}
                  onChange={(e) => setDeepseekKey(e.target.value)}
                  placeholder="ds-..."
                  className="w-full bg-dark/50 border border-white/10 rounded-lg p-2.5 text-gray-400 focus:outline-none focus:border-neon-cyan/50 text-sm font-mono"
                />
              </div>

              <div className="pt-2 border-t border-white/5">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Multimídia & Voz</label>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="text-[10px] font-medium text-gray-400 mb-1 block">ElevenLabs API (Locução)</label>
                    <input 
                      type="password" 
                      value={elevenlabsKey}
                      onChange={(e) => setElevenlabsKey(e.target.value)}
                      placeholder="Chave ElevenLabs..."
                      className="w-full bg-dark/50 border border-white/10 rounded-lg p-2.5 text-gray-400 focus:outline-none focus:border-neon-cyan/50 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-gray-400 mb-1 block">Leonardo.ai (Imagens)</label>
                    <input 
                      type="password" 
                      value={leonardoKey}
                      onChange={(e) => setLeonardoKey(e.target.value)}
                      placeholder="Chave Leonardo..."
                      className="w-full bg-dark/50 border border-white/10 rounded-lg p-2.5 text-gray-400 focus:outline-none focus:border-neon-cyan/50 text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-white/5">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Caminhos do Sistema</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-gray-400 mb-1 block">FFmpeg Executável</label>
                    <input 
                      type="text" 
                      value={ffmpegPath}
                      onChange={(e) => setFfmpegPath(e.target.value)}
                      className="w-full bg-dark/50 border border-white/10 rounded-lg p-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 mb-1 block">FFprobe Executável</label>
                    <input 
                      type="text" 
                      value={ffprobePath}
                      onChange={(e) => setFfprobePath(e.target.value)}
                      className="w-full bg-dark/50 border border-white/10 rounded-lg p-2 text-xs"
                    />
                  </div>
                </div>
                <div className="mt-3">
                    <label className="text-[10px] text-gray-400 mb-1 block">Pasta de Downloads Auto Flow</label>
                    <input 
                      type="text" 
                      value={flowDownloadsPath}
                      onChange={(e) => setFlowDownloadsPath(e.target.value)}
                      placeholder="C:\Users\...\Auto Flow Downloads"
                      className="w-full bg-dark/50 border border-white/10 rounded-lg p-2 text-[10px] font-mono"
                    />
                </div>
              </div>

              <div className="pt-2 border-t border-white/5">
                <label className="text-sm font-medium text-gray-300 block mb-1">{t('settings.youtube_key')}</label>
                <div className="relative">
                  <input 
                    type="password" 
                    value={youtubeKey}
                    onChange={(e) => setYoutubeKey(e.target.value)}
                    placeholder="AIza..."
                    className="w-full bg-dark/50 border border-white/10 rounded-lg p-2.5 pr-20 text-gray-400 focus:outline-none focus:border-neon-cyan/50 text-sm font-mono"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <button
                      onClick={async () => {
                        if (!youtubeKey.trim()) return;
                        setIsSaving(true);
                        await updateConfig({ youtube_key: youtubeKey.trim() });
                        await checkConnectivity();
                        setIsSaving(false);
                        showToast('Teste de conexão YouTube concluído', 'info');
                      }}
                      className="text-[8px] px-2 py-1 rounded bg-neon-cyan/20 text-neon-cyan font-black uppercase tracking-wider border border-neon-cyan/30 hover:bg-neon-cyan/30 transition-colors"
                    >
                      {status.youtube === 'checking...' ? '...' : 'Testar'}
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300 block mb-1">Google Client ID (OAuth)</label>
                <input 
                  type="text" 
                  value={googleClientId}
                  onChange={(e) => setGoogleClientId(e.target.value)}
                  placeholder="...apps.googleusercontent.com"
                  className="w-full bg-dark/50 border border-white/10 rounded-lg p-2.5 text-gray-400 focus:outline-none focus:border-neon-cyan/50 text-[10px] font-mono"
                />
              </div>

              {isAdmin && (
              <div className="pt-2 border-t border-white/5 mt-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Configurações de E-mail (SMTP)</label>
                <div className="grid grid-cols-1 gap-3">
                   <input 
                     type="text" 
                     value={smtpUser}
                     onChange={(e) => setSmtpUser(e.target.value)}
                     placeholder="seu-email@gmail.com"
                     className="w-full bg-dark/50 border border-white/10 rounded-lg p-2.5 text-gray-400 focus:outline-none focus:border-neon-cyan/50 text-xs"
                   />
                   <input 
                     type="password" 
                     value={smtpPass}
                     onChange={(e) => setSmtpPass(e.target.value)}
                     placeholder="Senha de app do Google"
                     className="w-full bg-dark/50 border border-white/10 rounded-lg p-2.5 text-gray-400 focus:outline-none focus:border-neon-cyan/50 text-xs"
                   />
                </div>
              </div>
              )}

              {/* ── BOTÃO SALVAR E EXCLUIR ──────────────────────────────────── */}
              <div className="pt-4 flex gap-3">
                <button
                  onClick={handleClearAllKeys}
                  title="Excluir Todas as Chaves"
                  className="px-5 py-3 rounded-xl bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500/20 hover:text-white transition-colors flex items-center justify-center shrink-0 active:scale-95"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <button
                  onClick={handleSaveKeys}
                  disabled={isSaving}
                  className={`flex-1 py-3 rounded-xl font-black text-sm uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 ${
                    isSaved
                      ? 'bg-green-500/20 text-green-400 border border-green-500/40 shadow-[0_0_15px_rgba(74,222,128,0.2)]'
                      : isSaving
                      ? 'bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30 opacity-70 cursor-not-allowed'
                      : 'bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/40 hover:bg-neon-cyan/25 hover:shadow-[0_0_20px_rgba(0,243,255,0.3)] active:scale-[0.98]'
                  }`}
                >
                  {isSaving ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : isSaved ? (
                    <><CheckCircle className="w-4 h-4" /> Chaves Salvas com Sucesso!</>
                  ) : (
                    <><Key className="w-4 h-4" /> Salvar Todas as Chaves</>
                  )}
                </button>
              </div>
            </div>
          </div>
          ) : (
          /* Card status para usuários comuns — sem nenhuma chave exposta */
          <div className="glass-card p-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4 border-b border-white/10 pb-2">
              <Shield className="text-neon-cyan w-5 h-5" /> Status das Integrações
            </h3>
            <div className="space-y-3">
              {[
                { label: 'Gemini AI (Motor Principal)', st: status.gemini, icon: Shield },
                { label: 'Chave Exclusiva (Prompts)', st: status.prompts_key, icon: Shield },
                { label: 'YouTube API', st: status.youtube, icon: Youtube },
              ].map(({ label, st, icon: Icon }) => {
                const on = st === 'online' || st === 'configured';
                const chk = st === 'checking...';
                return (
                  <div key={label} className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/[0.02]">
                    <Icon className={`w-4 h-4 shrink-0 ${on ? 'text-green-400' : chk ? 'text-yellow-400 animate-pulse' : 'text-red-400'}`} />
                    <span className="text-sm text-gray-300 flex-1">{label}</span>
                    <span className={`text-[9px] px-2.5 py-1 rounded-lg font-black uppercase tracking-widest border ${
                      on ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                      chk ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                      'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}>{on ? 'LIGADO' : chk ? 'TESTANDO' : 'DESLIGADO'}</span>
                  </div>
                );
              })}
            </div>
          </div>
          )}


          <div className="glass-card p-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4 border-b border-white/10 pb-2">
              <HardDrive className="text-neon-purple w-5 h-5" /> {t('settings.storage_title')}
            </h3>
            
             <div className="space-y-4">
               <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300">{t('settings.storage_used')}</span>
                    <span className="text-neon-purple font-bold">
                       {formatBytes(storageInfo.cache_size)} / {formatBytes(storageInfo.total_space)}
                    </span>
                  </div>
                  <div className="w-full bg-dark bg-opacity-50 rounded-full h-2 overflow-hidden border border-white/5">
                    <div 
                      className="bg-neon-purple h-2 rounded-full shadow-[0_0_10px_#9d00ff] transition-all duration-1000" 
                      style={{ width: `${Math.min(100, (storageInfo.cache_size / storageInfo.total_space) * 100 + 0.5)}%` }}
                    ></div>
                  </div>
               </div>
               
               <p className="text-xs text-gray-500">O armazenamento local contém dados de projetos temporários, legendas em cache e renderizações finais antes da exportação.</p>
               
               <button onClick={handleClearCache} className="text-sm text-red-400 hover:text-red-300 border border-red-500/30 hover:bg-red-500/10 px-4 py-2 rounded-lg transition-colors w-full shadow-lg">
                 {t('settings.clear_cache')}
               </button>
             </div>
          </div>

          {/* LOCAL ENGINE DOWNLOAD */}
          <div className="glass-card p-6 border-neon-cyan/30 relative overflow-hidden group mt-6">
            <div className="absolute top-0 right-0 w-32 h-32 bg-neon-cyan/5 rounded-full blur-2xl group-hover:bg-neon-cyan/10 transition-colors pointer-events-none"></div>
            <div className="absolute -top-1 -right-1">
               <div className="px-3 py-1 bg-neon-cyan/20 border border-neon-cyan/30 rounded-bl-xl">
                  <span className="text-[8px] font-black text-neon-cyan uppercase tracking-widest animate-pulse">Stable Release</span>
               </div>
            </div>

            <h3 className="text-sm md:text-base font-black text-white flex items-center gap-2 mb-2 border-b border-white/10 pb-2 relative z-10 uppercase tracking-widest">
              <Cpu className="text-neon-cyan w-5 h-5" /> Guru Master Desktop
            </h3>
            
             <div className="space-y-4 relative z-10 pt-2">
               <div className="flex gap-4 items-start">
                  <div className="w-16 h-16 rounded-xl border border-white/10 bg-black/40 flex items-center justify-center shrink-0 shadow-2xl">
                     <img src="logo.jpg" alt="Icon" className="w-12 h-12 rounded-lg object-cover" />
                  </div>
                  <p className="text-[11px] text-gray-400 font-medium leading-relaxed">
                     A versão Desktop profissional é um software autocontido que já inclui o motor **FFmpeg** e **Python**. 
                     Ideal para renderização de vídeos em alta escala usando 100% da sua GPU.
                  </p>
               </div>

               <div className="bg-black/40 border border-white/5 rounded-xl p-4">
                  <ul className="text-[10px] text-gray-500 space-y-2 font-bold uppercase tracking-tight">
                     <li className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-neon-cyan" /> Instalação Zero-Config (Tudo incluído)</li>
                     <li className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-neon-cyan" /> Integração Nativa com Windows Defender</li>
                     <li className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-neon-cyan" /> Suporte a Renderizações Massivas (100+ vídeos)</li>
                  </ul>
               </div>
               
               <div 
                 className="block w-full cursor-not-allowed opacity-50"
                 title="Disponível em breve!"
               >
                  <button disabled className="w-full bg-white text-dark font-black uppercase tracking-widest py-3.5 rounded-xl transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)] flex items-center justify-center gap-2 text-xs">
                    <Download className="w-4 h-4 shrink-0" /> Baixar Instalador Windows (.exe) (Em breve!)
                  </button>
               </div>
               <p className="text-center text-[8px] text-gray-600 font-bold uppercase tracking-widest">Versão atual compatível com Windows 10/11 x64</p>
             </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <div className="glass-card p-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4 border-b border-white/10 pb-2">
              <Palette className="text-neon-pink w-5 h-5" /> {t('settings.interface_title')}
            </h3>
            
            <div className="space-y-4">
               <div>
                <label className="text-sm font-medium text-gray-300 block mb-2">{t('settings.theme_mode')}</label>
                <div className="grid grid-cols-2 gap-3">
                   <button 
                     onClick={() => handleThemeChange('neon')}
                     className={`py-3 text-xs font-medium rounded-xl transition-colors ${theme === 'neon' ? 'bg-neon-cyan/20 border border-neon-cyan text-neon-cyan shadow-[0_0_10px_rgba(0,243,255,0.2)]' : 'bg-dark/50 border border-white/10 text-gray-400 hover:bg-white/5'}`}
                   >{t('settings.theme_neon')}</button>
                   <button 
                     onClick={() => handleThemeChange('minimal')}
                     className={`py-3 text-xs font-medium rounded-xl transition-colors ${theme === 'minimal' ? 'bg-white/10 border border-white/30 text-white shadow-[0_0_10px_rgba(255,255,255,0.1)]' : 'bg-dark/50 border border-white/10 text-gray-400 hover:bg-white/5'}`}
                   >{t('settings.theme_minimal')}</button>
                   <button 
                     onClick={() => handleThemeChange('light')}
                     className={`py-3 text-xs font-medium rounded-xl transition-colors ${theme === 'light' ? 'bg-blue-500/10 border border-blue-500 text-blue-400' : 'bg-dark/50 border border-white/10 text-gray-400 hover:bg-white/5'}`}
                   >{t('settings.theme_light')}</button>
                   <button 
                     onClick={() => handleThemeChange('soft')}
                     className={`py-3 text-xs font-medium rounded-xl transition-colors ${theme === 'soft' ? 'bg-purple-400/20 border border-purple-400 text-purple-300' : 'bg-dark/50 border border-white/10 text-gray-400 hover:bg-white/5'}`}
                   >{t('settings.theme_soft')}</button>
                </div>
               </div>
               
               <div className="pt-2">
                 <div className="flex items-center justify-between p-3 bg-dark/50 rounded-xl border border-white/5 shadow-inner">
                    <div className="flex-1 pr-4">
                       <span className="text-sm text-gray-200 font-bold block mb-0.5">{t('settings.effects_label')}</span>
                       <span className="text-[10px] text-gray-500 font-medium">{t('settings.effects_desc')}</span>
                    </div>
                    <div className="relative inline-block w-12 h-6 select-none">
                       <input 
                         type="checkbox" 
                         id="motion" 
                         checked={!reduceMotion} 
                         onChange={(e) => handleMotionChange({ target: { checked: !e.target.checked } })}
                         className="opacity-0 absolute w-full h-full cursor-pointer z-10"
                       />
                       <div className={`block w-full h-full rounded-full transition-all duration-300 ${!reduceMotion ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]' : 'bg-gray-700'}`}></div>
                       <div className={`absolute left-1 top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 ${!reduceMotion ? 'translate-x-6' : 'translate-x-0 shadow-md'}`}></div>
                    </div>
                 </div>
               </div>

               {/* Zoom & Font Size Section */}
               <div className="pt-4 space-y-4">
                 <div className="p-4 bg-dark/50 rounded-xl border border-white/5 shadow-inner space-y-4">
                    <div className="flex items-center gap-2 mb-2 border-b border-white/5 pb-2">
                       <Layout className="w-4 h-4 text-neon-cyan" />
                       <span className="text-xs font-bold text-white uppercase tracking-wider">{t('settings.accessibility_title')}</span>
                    </div>
                    
                    {/* Font Size Controls */}
                    <div>
                       <div className="flex justify-between items-center mb-2">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('settings.font_size')}</label>
                          <span className="text-[10px] font-mono text-neon-purple px-2 py-0.5 rounded bg-neon-purple/10 border border-neon-purple/20">
                             {appFontSize}px
                          </span>
                       </div>
                       <div className="flex items-center gap-2">
                          <button 
                             onClick={() => {
                                const newVal = Math.max(12, appFontSize - 1);
                                setAppFontSize(newVal);
                                localStorage.setItem('guru_app_font_size', newVal);
                                window.dispatchEvent(new Event('guru_font_size_change'));
                             }}
                             className="flex-1 flex justify-center py-2 bg-dark hover:bg-white/5 border border-white/5 hover:border-white/10 rounded-lg text-gray-400 hover:text-white transition-all"
                             title={t('settings.font_dec')}
                          >
                             <Minus className="w-4 h-4" />
                          </button>
                          <button 
                             onClick={() => {
                                const newVal = Math.min(24, appFontSize + 1);
                                setAppFontSize(newVal);
                                localStorage.setItem('guru_app_font_size', newVal);
                                window.dispatchEvent(new Event('guru_font_size_change'));
                             }}
                             className="flex-1 flex justify-center py-2 bg-dark hover:bg-white/5 border border-white/5 hover:border-white/10 rounded-lg text-gray-400 hover:text-white transition-all"
                             title={t('settings.font_inc')}
                          >
                             <Plus className="w-4 h-4" />
                          </button>
                       </div>
                    </div>
                 </div>
               </div>
            </div>
          </div>
          
          <div className="glass-card p-6 border-neon-cyan/20">
            <div className="flex items-center justify-between mb-4">
               <div className="flex items-center gap-3">
                  <div className="p-2 bg-neon-cyan/10 rounded-lg">
                      <Cpu className="w-5 h-5 text-neon-cyan" />
                  </div>
                  <div>
                      <h3 className="text-white font-bold">{t('sidebar.system_status')}</h3>
                      <p className="text-xs text-gray-500 font-mono">{t('settings.realtime_diagnosis')}</p>
                  </div>
               </div>
               <button 
                 onClick={handleReconnect}
                 disabled={isReconnecting}
                 className={`p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all ${isReconnecting ? 'rotate-180 opacity-50' : ''}`}
                 title={t('sidebar.reconnect')}
               >
                 <RefreshCw className={`w-4 h-4 text-neon-cyan ${isReconnecting ? 'animate-spin' : ''}`} />
               </button>
            </div>

            <div className="space-y-3">
               <StatusItem 
                 label={t('settings.render_motor')} 
                 status={status.rendering} 
                 icon={Zap} 
                 error={status.rendering === 'offline' ? status.details.error : null}
               />
               
               <StatusItem 
                 label={t('settings.ffmpeg_status')} 
                 status={status.ffmpeg} 
                 icon={Info} 
                 error={status.ffmpeg === 'offline' ? 'FFmpeg não encontrado ou erro de execução' : null}
               />

               <StatusItem 
                 label="FFprobe" 
                 status={status.ffprobe} 
                 icon={Info} 
                 error={status.ffprobe === 'offline' ? 'FFprobe não encontrado' : null}
               />

               <StatusItem 
                 label={t('settings.gemini_connection')} 
                 status={status.gemini} 
                 icon={Shield} 
                 error={status.gemini === 'offline' && geminiKeys.length > 0 ? 'Limite excedido ou chave inválida' : null}
               />

               {/* Chave Exclusiva de Prompts — sempre visível */}
                <StatusItem
                  label="Chave Exclusiva (Prompts)"
                  status={status.prompts_key}
                  icon={Shield}
                  error={status.prompts_key === 'offline' && configs.gemini_prompts_key ? (status.details.prompts_error || 'Chave de Prompts expirada ou inválida') : null}
                />

               <StatusItem 
                 label={t('settings.openai_connection')} 
                 status={status.openai} 
                 icon={Shield} 
                 error={status.openai === 'offline' && gptKeys.length > 0 ? 'Limite excedido ou chave inválida' : null}
               />

               <StatusItem 
                 label="Anthropic (Claude)" 
                 status={status.anthropic} 
                 icon={Shield} 
                 error={status.anthropic === 'offline' && anthropicKey ? 'Chave Claude inválida' : null}
               />

               <StatusItem 
                 label="DeepSeek AI" 
                 status={status.deepseek} 
                 icon={Shield} 
                 error={status.deepseek === 'offline' && deepseekKey ? 'Chave DeepSeek inválida' : null}
               />

               <StatusItem 
                 label="ElevenLabs (Voz)" 
                 status={status.elevenlabs} 
                 icon={Info} 
                 error={status.elevenlabs === 'offline' && elevenlabsKey ? 'Erro de chave ElevenLabs' : null}
               />

               <StatusItem 
                 label="Leonardo.ai (Imagens)" 
                 status={status.leonardo} 
                 icon={Palette} 
                 error={status.leonardo === 'offline' && leonardoKey ? 'Chave Leonardo inválida' : null}
               />

                <StatusItem 
                  label={t('settings.youtube_connection')} 
                  status={status.youtube} 
                  icon={Youtube} 
                  error={status.youtube === 'offline' && configs.youtube_key ? (status.details.youtube_error || 'Chave de API do YouTube inválida') : null}
                />

               {isAdmin && (
               <StatusItem 
                 label="E-mail (SMTP)" 
                 status={status.smtp} 
                 icon={Shield} 
                 error={status.smtp === 'offline' && smtpUser ? 'Erro de autenticação SMTP' : null}
               />
               )}

               {status.details.ffmpeg && status.ffmpeg === 'online' && (
                 <p className="text-[10px] text-gray-500 font-mono mt-2 truncate">
                   Versão: {status.details.ffmpeg.split(' ')[2]}
                 </p>
               )}
            </div>
          </div>
          
          <div className="glass-card p-6 border border-white/10">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
              <Shield className="text-gray-400 w-5 h-5" /> {t('settings.about_title')}
            </h3>
            <p className="text-sm text-gray-400 mb-4">{t('settings.about_desc')} v2.5.2</p>
            <div className="text-xs text-gray-500 space-y-1">
               <p>Frontend: React, TailwindCSS, Framer Node</p>
               <p>Backend Engine: Local Python Workers</p>
               <p>Render Core: FFmpeg x64</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
