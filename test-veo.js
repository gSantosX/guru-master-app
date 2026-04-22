import fs from 'fs';

const generateVeoContent = (scriptContent) => {
  if (!scriptContent) return "";
  
  const cleanText = scriptContent.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '').replace(/\n+/g, ' ').trim();
  const words = cleanText.split(/\s+/).filter(Boolean);
  
  const chunks = [];
  let currentChunk = [];
  
  for (let i = 0; i < words.length; i++) {
    currentChunk.push(words[i]);
    
    if (currentChunk.length >= 16) {
      const isPunctuation = /[\.\!\?\,:;]$/.test(words[i]);
      if (isPunctuation || currentChunk.length >= 21) {
        chunks.push(currentChunk.join(' '));
        currentChunk = [];
      }
    }
  }
  
  if (currentChunk.length > 0) {
    if (chunks.length > 0 && currentChunk.length < 16) {
       chunks.push(currentChunk.join(' '));
    } else {
      chunks.push(currentChunk.join(' '));
    }
  }

  let veoData = "";
  let currentMs = 0; 

  const formatTime = (totalMs) => {
    const h = Math.floor(totalMs / 3600000);
    const m = Math.floor((totalMs % 3600000) / 60000);
    const s = Math.floor((totalMs % 60000) / 1000);
    const ms = totalMs % 1000;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')},${String(ms).padStart(3,'0')}`;
  };

  chunks.forEach((chunk, idx) => {
    const wordCount = chunk.split(/\s+/).length;
    const durationMs = Math.round(wordCount * 436);
    const startMs = currentMs;
    const endMs = startMs + durationMs;
    
    veoData += `${idx + 1}\n${formatTime(startMs)} --> ${formatTime(endMs)}\n${chunk}\n\n`;
    
    currentMs = endMs + 58;
  });

  return veoData;
};

const sample = `A escuridão tomou conta da cidade. Ninguém sabia o que estava acontecendo, mas o medo era palpável. As luzes piscaram e apagaram. O vento uivava nas ruas desertas. De repente, um barulho ensurdecedor quebrou o silêncio da noite, ecoando pelos prédios como um trovão rasgando o céu. Todos que estavam acordados prenderam a respiração. Aquele som não era natural, e o que viria a seguir mudaria a história para sempre.`;
console.log(generateVeoContent(sample));
