export const generateVeoContent = (scriptContent) => {
  if (!scriptContent) return "";
  
  // Clean technical markers if any, replace newlines with space
  const cleanText = scriptContent.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '').replace(/\n+/g, ' ').trim();
  const words = cleanText.split(/\s+/).filter(Boolean);
  
  const totalWords = words.length;
  let numChunks = Math.max(1, Math.round(totalWords / 19));
  
  const baseSize = Math.floor(totalWords / numChunks);
  const remainder = totalWords % numChunks;
  
  const chunks = [];
  let currentIndex = 0;
  
  for (let i = 0; i < numChunks; i++) {
    const currentChunkSize = baseSize + (i < remainder ? 1 : 0);
    chunks.push(words.slice(currentIndex, currentIndex + currentChunkSize).join(' '));
    currentIndex += currentChunkSize;
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
