import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

/**
 * Guru Brain Context API
 * Returns previously learned patterns for a specific niche.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { niche = 'Geral' } = req.query;

  try {
    const { data: brainData, error } = await supabase
      .from('guru_brain')
      .select('content')
      .eq('niche', niche)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = No rows found
      throw error;
    }

    if (!brainData || !brainData.content || !brainData.content.patterns) {
      return res.status(200).json({ 
        experience: "Nenhum aprendizado prévio para este nicho ainda. Começando análise do zero." 
      });
    }

    const { patterns, total_analyses } = brainData.content;
    let experience = `GURU MASTER LOG (Aprendizado Acumulado: ${total_analyses} análises):\n`;
    
    // Pegar as 3 análises mais recentes para dar contexto à IA
    patterns.slice(0, 3).forEach((p, i) => {
      experience += `- [Análise ${i + 1}]: ${p.snippet.substring(0, 200)}...\n`;
    });

    return res.status(200).json({ experience });
  } catch (err) {
    console.error('Brain Context Error:', err);
    return res.status(500).json({ error: 'Erro ao acessar o cérebro central.', details: err.message });
  }
}
