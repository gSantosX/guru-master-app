export const generateVeoContent = (scriptContent) => {
  if (!scriptContent) return "";
  
  // Clean technical markers if any, replace newlines with space
  const cleanText = scriptContent.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '').replace(/\n+/g, ' ').trim();
  const words = cleanText.split(/\s+/).filter(Boolean);
  
  const chunks = [];
  let currentChunk = [];
  
  for (let i = 0; i < words.length; i++) {
    currentChunk.push(words[i]);
    
    // We aim for 16-22 words. Let's make a natural break around 18-20 words
    if (currentChunk.length >= 18) {
      // Try to break at punctuation if within 18-22
      const isPunctuation = /[\.\!\?\,:;]$/.test(words[i]);
      if (isPunctuation || currentChunk.length >= 21) {
        chunks.push(currentChunk.join(' '));
        currentChunk = [];
      }
    }
  }
  
  if (currentChunk.length > 0) {
    if (chunks.length > 0 && currentChunk.length < 10) {
      // Merge with the last chunk if it's too small, though it might exceed 22 slightly.
      // But user requested STRICT 16-22, so we just push it as its own chunk even if it's small, 
      // or we merge it. Let's just push it to guarantee we don't drastically exceed the 22 limit.
      chunks.push(currentChunk.join(' '));
    } else {
      chunks.push(currentChunk.join(' '));
    }
  }

  let veoData = "";
  let currentMs = 0; // start at 00:00:00,000

  const formatTime = (totalMs) => {
    const h = Math.floor(totalMs / 3600000);
    const m = Math.floor((totalMs % 3600000) / 60000);
    const s = Math.floor((totalMs % 60000) / 1000);
    const ms = totalMs % 1000;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')},${String(ms).padStart(3,'0')}`;
  };

  chunks.forEach((chunk, idx) => {
    const wordCount = chunk.split(/\s+/).length;
    const durationMs = Math.round(wordCount * 436); // ~436ms per word to match example realistically
    const startMs = currentMs;
    const endMs = startMs + durationMs;
    
    veoData += `${idx + 1}\n${formatTime(startMs)} --> ${formatTime(endMs)}\n${chunk}\n\n`;
    
    currentMs = endMs + 58; // 58ms gap between subtitles
  });

  return veoData;
};
