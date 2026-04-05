import React, { createContext, useContext, useState } from 'react';

const PersistenceContext = createContext();

/**
 * PersistenceProvider — Elite State Persistence
 * Keeps tab data alive during switching and handles "Rule of 7" cleanup.
 */
export const PersistenceProvider = ({ children }) => {
  // 1. Video Tab Global State (Files + Configs)
  const [videoState, setVideoState] = useState({
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
  const [miningState, setMiningState] = useState({
    channels: [],
    niche: '',
    isSearching: false
  });

  // 3. Image Prompts Global State
  const [promptState, setPromptState] = useState({
    file: null,
    subtitleBlocks: [],
    prompts: "",
    selectedStyle: 'ultra-realista',
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
    }
  });

  // Helper to update video settings
  const updateVideoSettings = (newSettings) => {
    setVideoState(prev => ({
      ...prev,
      settings: { ...prev.settings, ...newSettings }
    }));
  };

  // Helper to clear video form
  const clearVideoState = () => {
    setVideoState({
      audioFile: null,
      musicFile: null,
      imageFiles: [],
      videoFiles: [],
      subtitleFile: null,
      settings: videoState.settings // keep settings
    });
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
      setPromptState
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
