import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

/**
 * Guru Brain Learn API
 * Saves new analysis patterns to the cloud brain.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { niche = 'Geral', report, metadata = {} } = req.body;

  if (!report) {
    return res.status(400).json({ error: "Report is empty" });
  }

  try {
    // 1. Get existing knowledge
    const { data: brainData, error: fetchError } = await supabase
      .from('guru_brain')
      .select('content')
      .eq('niche', niche)
      .single();

    let content = { patterns: [], total_analyses: 0 };
    if (brainData && brainData.content) {
      content = brainData.content;
    }

    // 2. Update knowledge
    content.total_analyses += 1;
    const newPattern = {
      date: new Date().toISOString().split('T')[0],
      context: metadata.channel_name || "Unknown",
      snippet: report.substring(0, 500)
    };

    content.patterns.unshift(newPattern);
    content.patterns = content.patterns.slice(0, 10); // Keep last 10 lessons

    // 3. Save back to Supabase (Upsert)
    const { error: upsertError } = await supabase
      .from('guru_brain')
      .upsert({ 
        niche: niche, 
        content: content,
        last_updated: new Date().toISOString() 
      }, { onConflict: 'niche' });

    if (upsertError) throw upsertError;

    return res.status(200).json({ 
      success: true, 
      message: "Guru Master aprendeu com sucesso com esta análise." 
    });
  } catch (err) {
    console.error('Brain Learn Error:', err);
    return res.status(500).json({ error: 'Erro ao ensinar o Guru Master.', details: err.message });
  }
}
