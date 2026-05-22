import React, { createContext, useContext, useState } from 'react';
import { useCloudStorage } from '../hooks/useCloudStorage';

const PersistenceContext = createContext();

/**
 * PersistenceProvider — Elite State Persistence
 * Keeps tab data alive during switching and handles "Rule of 7" cleanup.
 * Now using Cloud Storage to sync automatically across devices.
 */
export const PersistenceProvider = ({ children }) => {
  // 1. Video Tab Global State (Files + Configs)
  const [videoState, setVideoState] = useCloudStorage('video_state', {
    audioFile: null,
    musicFile: null,
    imageFiles: [],
    videoFiles: [],
    subtitleFile: null,
    settings: {
        resolution: '1080p Horizontal (1920x1080)',
        fps: '30 FPS',
        transitionStyle: 'crossfade',
        zoomStyle: 'zoom-in',
        zoomSpeed: 'Normal (1.1x)',
        filterStyle: 'nenhum',
        encoder: 'libx264',
        renderPreset: 'medium',
        narrationVolume: 0,
        videoVolume: -15,
        musicVolume: -15,
        outputDir: localStorage.getItem('guru_output_dir') || ''
    }
  });

  // 2. Channel Mining Global State
  const [miningState, setMiningState] = useCloudStorage('mining_state', {
    channels: [],
    niche: 'Finanças',
    isSearching: false,
    maxAgeMonths: 0,
    videoFormat: 'normal',
    langCode: 'pt'
  });

  // 3. Image Prompts Global State
  const [promptState, setPromptState] = useCloudStorage('prompt_state', {
    file: null,
    subtitleBlocks: [],
    prompts: "",
    selectedScriptId: '',
    promptPools: [],
    selectedPoolId: null,
    availableScripts: [],
    visualDNA: {
      scenario: '',
      era: '',
      mood: '',
      lighting: '',
      palette: '',
      camera: ''
    },
    speechMode: 'true', // 'true' = Com Fala, 'false' = Sem Fala
    genMode: 'quality', // always Elite Quality — Speed mode removed
    withText: false,
    // Veo 3.1 Cinematographic Parameters
    genero: '',             // Required: style/genre (text, can be custom)
    cameraMovimento: [],    // Optional: array of selected camera tags
    composicao: [],         // Optional: array of selected composition tags
    focoLente: [],          // Optional: array of selected focus/lens tags
    atmosferaLuz: []        // Optional: array of selected atmosphere/light tags
  });
  
  // 4. Video Cover Global State (Titles, ShockWords, Covers)
  const [coverState, setCoverState] = useCloudStorage('cover_state', {
    selectedScript: null,
    titles: [],
    shockWords: { one: '', two: '', three: '' },
    covers: {},
    coverPrefs: {},
    description: '',
    lastSelectedTitle: ''
  });

  // 5. Script Creator Global State
  const [scriptState, setScriptState] = useCloudStorage('script_state', {
    titulo: '',
    dna: 'Jornada do Herói',
    alma: 'Épica e Cinematográfica',
    cta: 'Viral (Engajamento)',
    nicho: 'Documentário',
    idioma: 'Português (BR)',
    formato: 'Texto Corrido',
    natureza: 'Dados Reais (usar pesquisa web)',
    safety: 'Formato Seguro (Safety)',
    intellect: 'Médio Intelectual',
    formality: 'Médio',
    tamanho: 5000,
    generatedScript: null,
    generationProgress: 0,
    statusMessage: '',
    lastSavedId: null
  });

  // Triggers for reactive cross-tab navigation and actions
  const [imagePromptTrigger, setImagePromptTrigger] = useState(null);
  const [seoTrigger, setSeoTrigger] = useState(null);
  const [coverTrigger, setCoverTrigger] = useState(null);
  const [whiskTrigger, setWhiskTrigger] = useState(null);

  // Helper to update video settings
  const updateVideoSettings = (newSettings) => {
    setVideoState(prev => ({
      ...prev,
      settings: { ...prev.settings, ...newSettings }
    }));
  };

  // Helper to clear video form
  const clearVideoState = () => {
    setVideoState(prev => ({
      audioFile: null,
      musicFile: null,
      imageFiles: [],
      videoFiles: [],
      subtitleFile: null,
      settings: prev.settings // keep settings
    }));
  };

  return (
    <PersistenceContext.Provider value={{
      videoState,
      setVideoState,
      updateVideoSettings,
      clearVideoState,
      miningState,
      setMiningState,
      promptState,
      setPromptState,
      coverState,
      setCoverState,
      scriptState,
      setScriptState,
      imagePromptTrigger,
      setImagePromptTrigger,
      seoTrigger,
      setSeoTrigger,
      coverTrigger,
      setCoverTrigger,
      whiskTrigger,
      setWhiskTrigger
    }}>
      {children}
    </PersistenceContext.Provider>
  );
};

export const usePersistence = () => {
  const context = useContext(PersistenceContext);
  if (!context) {
    throw new Error('usePersistence must be used within a PersistenceProvider');
  }
  return context;
};
