import React, { useState } from 'react';
import { Video, Settings2, Play, Music, Mic, Layers, Image as ImageIcon, CheckCircle, Captions } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { stackPush, stackRead, MAX_STACK } from '../utils/stackUtils';
import { resolveApiUrl } from '../utils/apiUtils';

export const VideoTab = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [renderSuccess, setRenderSuccess] = useState(false);
  
  // Ativos de Mídia
  const [musicFile, setMusicFile] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [imageFiles, setImageFiles] = useState([]);
  const [videoFiles, setVideoFiles] = useState([]);
  const [subtitleFile, setSubtitleFile] = useState(null);
  const [formKey, setFormKey] = useState(Date.now()); // Para forçar limpeza do buffer do input de arquivos

  // Configs FFMPEG
  const [resolution, setResolution] = useState('1080p (1920x1080)');
  const [fps, setFps] = useState('30 FPS');
  const [transitionStyle, setTransitionStyle] = useState('crossfade');
  const [zoomStyle, setZoomStyle] = useState('zoom-in');
  const [zoomSpeed, setZoomSpeed] = useState('Normal (1.1x)');
  const [filterStyle, setFilterStyle] = useState('nenhum');
  const [outputDir, setOutputDir] = useState(() => localStorage.getItem('guru_output_dir') || '');

  const handleSelectFolder = async () => {
    if (window.electronAPI && window.electronAPI.selectFolder) {
      const res = await window.electronAPI.selectFolder();
      if (res.success && res.folderPath) {
         setOutputDir(res.folderPath);
         localStorage.setItem('guru_output_dir', res.folderPath);
      }
    } else {
      alert("A seleção de pastas só está disponível na versão Desktop.");
    }
  };

  const startRender = async () => {
    if (!audioFile && imageFiles.length === 0 && videoFiles.length === 0) {
      alert("Por favor, adicione pelo menos um áudio de narração e algumas imagens/vídeos antes de renderizar.");
      return;
    }
    
    const activeRenders = stackRead('guru_active_renders');
    if (activeRenders.length >= MAX_STACK) {
        alert(`Limite de ${MAX_STACK} projetos ativos atingido. Cancele algum na aba de Progresso ou espere finalizar.`);
        return;
    }
    
    setIsGenerating(true);
    
    const cleanFileName = (name) => name ? name.split('.').slice(0, -1).join('.') || name : null;
    let projNameSkeleton = cleanFileName(audioFile?.name);
    if (!projNameSkeleton && videoFiles.length > 0) projNameSkeleton = `Vídeo ${cleanFileName(videoFiles[0].name)}`;
    if (!projNameSkeleton && imageFiles.length > 0) projNameSkeleton = `Vídeo ${cleanFileName(imageFiles[0].name)}`;
    if (!projNameSkeleton) projNameSkeleton = 'Projeto ' + new Date().getTime().toString().slice(-4);

    try {
      const formData = new FormData();
      formData.append('projectName', projNameSkeleton);
      
      const settings = {
        resolution,
        fps,
        transitionStyle,
        zoomStyle,
        zoomSpeed,
        filterStyle,
        outputDir
      };
      formData.append('settings', JSON.stringify(settings));
      
      if (audioFile) formData.append('audio', audioFile);
      if (musicFile) formData.append('music', musicFile);
      if (subtitleFile) formData.append('subtitle', subtitleFile);
      
      imageFiles.forEach((file, index) => {
         formData.append(`image_${index}`, file);
      });
      videoFiles.forEach((file, index) => {
         formData.append(`video_${index}`, file);
      });

      // Send to python backend
      const response = await fetch(resolveApiUrl('/api/render'), {
         method: 'POST',
         body: formData
      });
      
      if (!response.ok) throw new Error('Falha de conexão com Motor FFmpeg (Backend Python)');
      
      const data = await response.json();
      
      const newProj = { 
         id: data.job_id, 
         name: projNameSkeleton, 
         status: 'Postando na Fila...', 
         progress: 0, 
         color: 'neon-purple' 
      };
      
      // LIFO stack push — newest first, max 6
      stackPush('guru_active_renders', newProj);
      window.dispatchEvent(new Event('guru_active_updated'));
      
      setIsGenerating(false);
      setRenderSuccess(true);
      
    } catch (error) {
      console.error("Erro na renderização:", error);
      if (error.name === 'AbortError' || error.message.includes('network')) {
        alert("A conexão com o servidor falhou. Se você estiver enviando muitos vídeos (ex: 185), o upload pode demorar alguns minutos. Tente novamente e aguarde a barra de progresso do navegador aparecer.");
      } else {
        alert("Erro ao conectar ao motor local! O Backend Python (Flask) está rodando e aceitando mídias pesadas?");
      }
      setIsGenerating(false);
    }
  };

  const clearForm = () => {
     setMusicFile(null);
     setAudioFile(null);
     setImageFiles([]);
     setVideoFiles([]);
     setSubtitleFile(null);
     setRenderSuccess(false);
     setFormKey(Date.now());
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto min-h-full md:h-full flex flex-col overflow-y-auto md:overflow-hidden custom-scrollbar">
      <header className="mb-6 md:mb-8 shrink-0">
        <h2 className="text-2xl md:text-4xl font-bold text-glow-purple text-white flex items-center gap-2 md:gap-3">
          <Video className="text-neon-purple w-8 h-8 md:w-10 md:h-10 shrink-0" />
          Gerar Vídeo
        </h2>
        <p className="text-sm md:text-base text-gray-400 mt-2">Combine seu roteiro, voz e imagens em uma obra-prima final usando motor FFmpeg.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 flex-1 pb-10 md:pb-0 overflow-y-auto custom-scrollbar">
        
        {/* Left Column: Configuration */}
        <div className="space-y-6">
          <div className="glass-card p-6 border-l-4 border-neon-cyan">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4 border-b border-white/10 pb-2">
              <Layers className="text-neon-cyan w-5 h-5" /> Ativos de Mídia
            </h3>
            
            <div className="space-y-4">
              {/* Narração */}
              <div className="p-3 bg-dark/50 border border-white/5 rounded-xl flex items-center justify-between group hover:border-white/20 transition-colors">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 shrink-0 rounded-lg bg-orange-500/20 flex items-center justify-center">
                    <Mic className="w-5 h-5 text-orange-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-white font-medium text-sm">Áudio Original (Narração)</h4>
                    <p className="text-xs text-gray-500 truncate">{audioFile ? audioFile.name : 'Voz do locutor...'}</p>
                  </div>
                </div>
                <label className="text-xs px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-md text-white transition-colors cursor-pointer shrink-0 ml-2 shadow-inner border border-white/5">
                  <input key={formKey + 'aud'} type="file" accept="audio/*" className="hidden" onChange={e => setAudioFile(e.target.files[0])} />
                  {audioFile ? 'Trocar' : 'Selecionar'}
                </label>
              </div>

              {/* Imagens */}
              <div className="p-3 bg-dark/50 border border-white/5 rounded-xl flex items-center justify-between group hover:border-white/20 transition-colors">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 shrink-0 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <ImageIcon className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-white font-medium text-sm">Biblioteca de Imagens</h4>
                    <p className="text-xs text-gray-500 truncate">{imageFiles.length > 0 ? `${imageFiles.length} imagens carregadas` : 'Pasta ou fotos soltas...'}</p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0 ml-2">
                  <label className="text-[10px] md:text-xs px-2 md:px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-md text-white transition-colors cursor-pointer shadow-inner border border-white/5 whitespace-nowrap">
                     <input key={formKey + 'img'} type="file" accept="image/*" multiple className="hidden" onChange={e => setImageFiles(prev => [...prev, ...Array.from(e.target.files)])} />
                     + Arquivos
                  </label>
                  <label className="text-[10px] md:text-xs px-2 md:px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-md text-white transition-colors cursor-pointer shadow-inner border border-white/5 whitespace-nowrap">
                     <input key={formKey + 'dir'} type="file" accept="image/*" multiple webkitdirectory="true" directory="true" className="hidden" onChange={e => setImageFiles(prev => [...prev, ...Array.from(e.target.files).filter(f => f.type.startsWith('image/'))])} />
                     + Pasta
                  </label>
                </div>
              </div>

              {/* Vídeos */}
              <div className="p-3 bg-dark/50 border border-white/5 rounded-xl flex items-center justify-between group hover:border-white/20 transition-colors">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 shrink-0 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <Video className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-white font-medium text-sm">Biblioteca de Vídeos</h4>
                    <p className="text-xs text-gray-500 truncate">{videoFiles.length > 0 ? `${videoFiles.length} vídeos carregados` : 'Pasta ou vídeos (.mp4)...'}</p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0 ml-2">
                  <label className="text-[10px] md:text-xs px-2 md:px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-md text-white transition-colors cursor-pointer shadow-inner border border-white/5 whitespace-nowrap">
                     <input key={formKey + 'vid'} type="file" accept="video/mp4,video/quicktime,video/*" multiple className="hidden" onChange={e => setVideoFiles(prev => [...prev, ...Array.from(e.target.files)])} />
                     + Arquivos
                  </label>
                  <label className="text-[10px] md:text-xs px-2 md:px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-md text-white transition-colors cursor-pointer shadow-inner border border-white/5 whitespace-nowrap">
                     <input key={formKey + 'vdir'} type="file" accept="video/mp4,video/quicktime,video/*" multiple webkitdirectory="true" directory="true" className="hidden" onChange={e => setVideoFiles(prev => [...prev, ...Array.from(e.target.files).filter(f => f.type.startsWith('video/') || f.name.toLowerCase().endsWith('.mp4') || f.name.toLowerCase().endsWith('.mov'))])} />
                     + Pasta
                  </label>
                </div>
              </div>

              {/* Música (Opcional) */}
              <div className="p-3 bg-dark/50 border border-white/5 rounded-xl flex items-center justify-between group hover:border-white/20 transition-colors">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 shrink-0 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <Music className="w-5 h-5 text-green-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-white font-medium text-sm flex gap-2 items-center">Trilha Sonora <span className="text-[9px] bg-dark-lighter px-1.5 py-0.5 rounded border border-white/10 text-gray-400 uppercase tracking-widest">Opcional</span></h4>
                    <p className="text-xs text-gray-500 truncate">{musicFile ? musicFile.name : 'Música de fundo...'}</p>
                  </div>
                </div>
                <label className="text-xs px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-md text-white transition-colors cursor-pointer shrink-0 ml-2 shadow-inner border border-white/5">
                  <input key={formKey + 'mus'} type="file" accept="audio/*" className="hidden" onChange={e => setMusicFile(e.target.files[0])} />
                  {musicFile ? 'Trocar' : 'Selecionar'}
                </label>
              </div>

              {/* Legenda (Opcional) */}
              <div className={`p-3 border rounded-xl flex items-center justify-between group transition-colors ${
                subtitleFile
                  ? 'bg-yellow-500/10 border-yellow-500/40 hover:border-yellow-500/70'
                  : 'bg-dark/50 border-white/5 hover:border-white/20'
              }`}>
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className={`w-10 h-10 shrink-0 rounded-lg flex items-center justify-center ${
                    subtitleFile ? 'bg-yellow-500/20' : 'bg-yellow-500/10'
                  }`}>
                    <Captions className={`w-5 h-5 ${subtitleFile ? 'text-yellow-400' : 'text-yellow-600'}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-white font-medium text-sm flex gap-2 items-center">
                      Legenda (Subtitle)
                      <span className="text-[9px] bg-dark-lighter px-1.5 py-0.5 rounded border border-white/10 text-gray-400 uppercase tracking-widest">Opcional</span>
                    </h4>
                    <p className="text-xs truncate">
                      {subtitleFile
                        ? <span className="text-yellow-400 font-medium">{subtitleFile.name} — será renderizada no vídeo</span>
                        : <span className="text-gray-500">.srt ou .ass — queimada no vídeo pelo FFmpeg</span>}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0 ml-2">
                  <label className="text-xs px-3 py-1.5 bg-white/10 hover:bg-yellow-500/20 hover:border-yellow-500/40 rounded-md text-white transition-colors cursor-pointer shadow-inner border border-white/5">
                    <input key={formKey + 'sub'} type="file" accept=".srt,.ass,.vtt" className="hidden" onChange={e => setSubtitleFile(e.target.files[0])} />
                    {subtitleFile ? 'Trocar' : 'Selecionar'}
                  </label>
                  {subtitleFile && (
                    <button
                      onClick={() => setSubtitleFile(null)}
                      className="text-xs px-2 py-1.5 bg-red-500/10 hover:bg-red-500/20 rounded-md text-red-400 border border-red-500/20 transition-colors"
                      title="Remover legenda"
                    >✕</button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card p-6 border-l-4 border-neon-purple shadow-xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-5 border-b border-white/10 pb-2">
              <Settings2 className="text-neon-purple w-5 h-5" /> Configurações de Renderização
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-6">
              
              {/* Qualidade Visual */}
              <div className="col-span-1 sm:col-span-2">
                <label className="text-xs text-gray-400 font-bold uppercase tracking-wider block mb-2">Qualidade de Saída</label>
                <div className="flex gap-2">
                  <select className="flex-1 bg-dark/60 border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-neon-purple/50 text-xs shadow-inner" value={resolution} onChange={e=>setResolution(e.target.value)}>
                    <option>1080p Horizontal (1920x1080)</option>
                    <option>4K Filmes (3840x2160)</option>
                    <option>Shorts / Reels (1080x1920)</option>
                    <option>Quadrado (1080x1080)</option>
                  </select>
                  <select className="w-28 bg-dark/60 border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-neon-purple/50 text-xs shadow-inner" value={fps} onChange={e=>setFps(e.target.value)}>
                    <option>24 FPS</option>
                    <option>30 FPS</option>
                    <option>60 FPS</option>
                  </select>
                </div>
              </div>

              {/* Transição */}
              <div>
                <label className="text-xs text-gray-400 font-bold uppercase tracking-wider block mb-2 text-neon-cyan">Estilo de Transição</label>
                <select className="w-full bg-dark/60 border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-neon-cyan/50 text-xs shadow-inner" value={transitionStyle} onChange={e=>setTransitionStyle(e.target.value)}>
                  <option value="crossfade">Suave (Crossfade)</option>
                  <option value="fade">Piscar Preto (Fade Out/In)</option>
                  <option value="dissolve">Dissolver (Xfade)</option>
                  <option value="wipeleft">Deslizar para a Esquerda</option>
                  <option value="wiperight">Deslizar para a Direita</option>
                  <option value="none">Corte Seco (Sem efeito)</option>
                </select>
              </div>

              {/* Filtro Visual */}
              <div>
                <label className="text-xs text-gray-400 font-bold uppercase tracking-wider block mb-2 text-neon-pink">Filtro Visual (FFmpeg)</label>
                <select className="w-full bg-dark/60 border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-neon-pink/50 text-xs shadow-inner" value={filterStyle} onChange={e=>setFilterStyle(e.target.value)}>
                  <option value="nenhum">Cor Original (Nenhum)</option>
                  <option value="sepia">Tons de Sépia (Vintage)</option>
                  <option value="grayscale">Preto & Branco (Dramático)</option>
                  <option value="high-contrast">Alto Contraste (+20%)</option>
                  <option value="high-saturation">Cores Vibrantes (+Saturação)</option>
                  <option value="blur">Suavizado (Leve Desfoque)</option>
                  <option value="vignette">Vinheta Escura (Foco Central)</option>
                </select>
              </div>

              {/* Efeito de Movimento (Ken Burns) */}
              <div>
                <label className="text-xs text-gray-400 font-bold uppercase tracking-wider block mb-2 text-blue-400">Animação 3D (Zoom & Pan)</label>
                <select className="w-full bg-dark/60 border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-blue-500/50 text-xs shadow-inner" value={zoomStyle} onChange={e=>setZoomStyle(e.target.value)}>
                  <option value="zoom-in">Acercar Câmera (Zoom In)</option>
                  <option value="zoom-out">Afastar Câmera (Zoom Out)</option>
                  <option value="pan-right">Deslizar para Direita (Pan R)</option>
                  <option value="pan-left">Deslizar para Esquerda (Pan L)</option>
                  <option value="random">Variado (Modo Aleatório)</option>
                  <option value="none">Imagem Estática</option>
                </select>
              </div>

              {/* Velocidade de Zoom */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Intensidade do Movto</label>
                  <span className="text-[10px] text-gray-300 font-mono bg-white/10 px-1.5 py-0.5 rounded">{zoomSpeed}</span>
                </div>
                <input 
                  type="range" min="1" max="5" step="1" 
                  value={zoomSpeed.includes('Lenta') ? 1 : zoomSpeed.includes('Média') ? 2 : zoomSpeed.includes('Normal') ? 3 : zoomSpeed.includes('Rápida') ? 4 : 5}
                  onChange={(e) => {
                     const v = e.target.value;
                     if(v==='1') setZoomSpeed('Muito Lenta (1.05x)');
                     if(v==='2') setZoomSpeed('Média (1.08x)');
                     if(v==='3') setZoomSpeed('Normal (1.1x)');
                     if(v==='4') setZoomSpeed('Rápida (1.15x)');
                     if(v==='5') setZoomSpeed('Agressiva (1.2x)');
                  }}
                  className="w-full h-1.5 bg-dark border border-white/5 rounded-lg appearance-none cursor-pointer accent-neon-purple mt-2 disabled:opacity-30 disabled:grayscale"
                  disabled={zoomStyle === 'none'}
                />
              </div>

            </div>
          </div>
        </div>

        {/* Right Column: Preview and Action */}
        <div className="glass-card flex flex-col relative overflow-hidden shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-neon-purple/5 via-dark to-dark-lighter pointer-events-none" />
          
          <div className="p-5 border-b border-white/10 bg-dark/50 relative z-10 flex justify-between items-center backdrop-blur-sm">
            <h3 className="font-bold text-white flex items-center gap-2">
              Resumo do Motor Final
            </h3>
            <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-1 bg-neon-purple/20 text-neon-purple rounded border border-neon-purple/30">FFmpeg Pipeline</span>
          </div>
          
          <div className="flex-1 p-6 relative z-10 flex flex-col items-center justify-center">
             <div className={`w-full max-w-sm ${resolution.includes('Shorts') ? 'aspect-[9/16] w-auto h-64' : resolution.includes('Quadrado') ? 'aspect-square w-48' : 'aspect-video'} bg-dark-lighter rounded-xl border border-white/10 flex flex-col items-center justify-center relative overflow-hidden group shadow-[0_0_50px_rgba(0,0,0,0.6)] transition-all duration-500`}>
               <div className="absolute inset-0 opacity-10 flex flex-wrap gap-1 p-2 overflow-hidden pointer-events-none">
                  {[...Array(20)].map((_, i) => <div key={i} className="w-1/4 h-1/4 min-w-[30px] min-h-[30px] bg-white rounded-sm" />)}
               </div>
               <Play className="w-12 h-12 text-white/40 group-hover:text-neon-purple group-hover:scale-110 transition-all cursor-pointer z-10 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]" />
               <div className="absolute inset-0 border-2 border-transparent group-hover:border-neon-purple/50 transition-colors rounded-xl pointer-events-none" />
               
               {/* Label on video frame showing applied visual filter */}
               {filterStyle !== 'nenhum' && (
                 <div className="absolute bottom-2 left-2 bg-dark/80 px-2 py-1 rounded text-[10px] font-mono text-neon-pink uppercase">Filtro: {filterStyle}</div>
               )}
               {zoomStyle !== 'none' && (
                 <div className="absolute bottom-2 right-2 bg-dark/80 px-2 py-1 rounded text-[10px] font-mono text-blue-400 uppercase">Mov: {zoomStyle}</div>
               )}
             </div>
             
             <div className="mt-8 grid grid-cols-2 gap-4 w-full max-w-sm">
                <div className="bg-dark/40 p-3 rounded-lg border border-white/5 text-center">
                   <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Mídia Inserida</p>
                   <p className="text-sm font-bold text-white">{imageFiles.length} Imgs / {videoFiles.length} Vids</p>
                   <p className="text-xs text-gray-400">{audioFile ? 'C/ Narração' : 'Sem Voz'}</p>
                </div>
                <div className="bg-dark/40 p-3 rounded-lg border border-white/5 text-center">
                   <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Impacto Previsto</p>
                   <p className="text-sm font-bold text-neon-purple transition-colors">Tamanho Médio</p>
                   <p className="text-xs font-mono text-gray-400">{resolution.split('(')[0]}</p>
                 </div>
              </div>
              <div className="mt-6 w-full max-w-sm mb-4">
                 <div className="flex justify-between items-center mb-2">
                    <label className="text-xs text-gray-400 font-bold uppercase tracking-wider text-green-400">Pasta de Saída</label>
                    <button type="button" onClick={handleSelectFolder} className="text-[10px] bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded transition-colors border border-white/5 font-mono cursor-pointer relative z-20">Alterar</button>
                 </div>
                 <div className="w-full bg-dark/60 border border-white/10 rounded-lg p-3 flex flex-col items-start min-h-[44px] justify-center text-xs shadow-inner cursor-pointer hover:border-white/30 transition-colors relative z-20" onClick={handleSelectFolder}>
                    {outputDir ? (
                       <span className="text-green-400 font-mono tracking-tighter truncate w-full" title={outputDir}>{outputDir}</span>
                    ) : (
                       <span className="text-gray-500 italic">Pasta padrão (/backend/output/)</span>
                    )}
                 </div>
              </div>
           </div>

           <div className="p-5 mt-auto relative z-10 bg-dark/30 backdrop-blur-md border-t border-white/10 min-h-[96px] flex items-center justify-center">
            {renderSuccess ? (
              <div className="w-full flex w-full p-4 rounded-xl flex items-center justify-between gap-4 bg-green-500/10 border border-green-500/30 text-green-400 shadow-[0_0_20px_rgba(34,197,94,0.15)] animate-fade-in">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                     <CheckCircle className="w-5 h-5" />
                   </div>
                   <div>
                     <h4 className="font-bold text-sm">Arquivo Renderizando!</h4>
                     <p className="text-xs text-green-400/80 mt-0.5">O processo foi iniciado. Verifique a aba <b>Em Progresso</b> para detalhes.</p>
                   </div>
                </div>
                <button onClick={clearForm} className="text-xs font-bold px-3 py-2 bg-green-500/20 hover:bg-green-500/40 rounded-lg transition-colors border border-green-500/30">
                  Criar Novo
                </button>
              </div>
            ) : (
              <button 
                onClick={startRender}
                disabled={isGenerating}
                className={`w-full py-4 rounded-xl flex items-center justify-center gap-3 font-black tracking-wide transition-all duration-300 transform active:scale-[0.98] ${
                  isGenerating
                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-600 via-neon-purple to-blue-600 text-white shadow-[0_0_30px_rgba(157,78,221,0.4)] hover:shadow-[0_0_50px_rgba(157,78,221,0.6)]'
                }`}
              >
                {isGenerating ? (
                  <LoadingSpinner message="Compilando Matriz Audiovisual..." size="sm" />
                ) : (
                  <>
                    <Video className="w-6 h-6" /> INICIAR REDE DE RENDERIZAÇÃO
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
