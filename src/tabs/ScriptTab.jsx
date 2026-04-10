import React, { useState } from 'react';
import { stackPush } from '../utils/stackUtils';
import { Wand2, Type, Layout, Target, FileText, Download, FileJson, File as FilePdf, Settings, BookOpen, Copy, Check, Sparkles, Languages, Gauge, Heart, Zap } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import jsPDF from 'jspdf';
import { motion, AnimatePresence } from 'framer-motion';
import { useSystemStatus } from '../contexts/SystemStatusContext';
import { resolveApiUrl } from '../utils/apiUtils';
import { callGemini, callGPT, callGrok } from '../utils/aiUtils';
import { t } from '../utils/i18n';

const DNA_OPTIONS = [
  "Linear Tradicional", "Jornada do Herói", "O Grande Mistério", "Ponto vs Contraponto",
  "Pirâmide Invertida", "Cinematográfico Visceral", "Lista em Contagem Regressiva", 
  "A Grande Mentira", "Problema e Solução", "Antes e Depois", "O Método Científico",
  "Narrativa Imersiva (Você)", "Análise de Caso Real", "Círculo Narrativo", 
  "Fatos Curiosos em Cadeia", "Perspectiva em Primeira Pessoa", "Análise de Portfólio Real",
  "O Caminho da Liberdade Financeira", "Raio-X do Mercado", "Ensinamento Financeiro Estruturado",
  "Teoria da Conspiração", "Desconstrução de Mitos", "Revelação em Camadas (Iceberg)", 
  "A Receita do Desastre", "Efeito Borboleta (Causas)", "Dossiê Investigativo", 
  "Verdade Chocante de Início", "Choque de Expectativas", "A Queda do Império", 
  "Desabafo Visceral", "Guia Definitivo Passo-a-passo", "Futuro e Previsões", 
  "Ponto de Inflexão (A Virada)", "Debate Múltiplas Visões", "Micro-Histórias Conectadas",
  "Investigação Cinematográfica", "Reconstrução Histórica (Timeline)", "O Lado Oculto (Deep Dive)"
];

const ALMA_OPTIONS = [
  "Amigável e Casual", "Sarcástica e Ácida", "Acolhedora e Empática", "Épica e Cinematográfica",
  "Misteriosa e Sombria", "Didática e Leve", "Autoritária e Confiante", "Inspiradora e Poética",
  "Cética e Provocadora", "Entusiasta e Vibrante", "Zen e Relaxante", "Confessional e Íntima",
  "Reflexão Bíblica Profunda", "Análise Teológica Contempl.", "Ensinamentos Bíblicos Aprof.",
  "Estudo Devocional Narrado", "Educacional Espiritual", "Pragmática e Analítica",
  "Visionária e Estratégica", "Paternalista e Educativa", "Investigadora Obcecada", 
  "Jornalística e Urgente", "Sombria e Macabra (Dark)", "Fria e Calculista",
  "Mentora Severa (Hard Truth)", "Sátira e Cinismo", "Altamente Eufórica", 
  "Questionadora Inquisitiva", "Melancólica e Nostálgica", "Especialista Tech", 
  "Conselheiro Sussurrado", "Persuasão Magnética", "Transformacional Raiz",
  "Sabedoria Anciã", "Razão Minimalista", "Documental Frio e Analítico", 
  "Autoridade Histórica Clássica", "Reportagem Investigativa Densa"
];

const CTA_OPTIONS = [
  "Viral (Engajamento)", "Conversão (Inscrição)", "Venda (Produto)", "Curiosidade (Próximo Vídeo)",
  "Desafio (Interação)", "Comunidade (Membro)", "Espiritual (Reflexão)", "Sutil (Invisível)", "Sem CTA"
];

const NICHO_OPTIONS = [
  "Documentário", "História", "Finanças", "Mistérios", "Crimes reais", "Espiritualidade",
  "Motivação", "Educação", "Curiosidades", "Histórias emocionantes", "Relacionamentos",
  "Saúde", "Tecnologia", "Outro"
];

const IDIOMA_OPTIONS = [
  "Português (BR)", "Português (PT)", "Inglês", "Espanhol", "Francês", "Alemão", 
  "Italiano", "Japonês", "Chinês", "Russo", "Árabe", "Coreano", "Hindi"
];

const FORMATO_OPTIONS = ["Por Partes", "Texto Corrido", "Lista"];

const NATUREZA_OPTIONS = ["Dados Reais (usar pesquisa web)", "Ficção (criatividade pura)"];

const SAFETY_OPTIONS = ["Formato Seguro (Safety)", "Formato Meio Seguro (Médio Risco)", "Formato Livre (Sem Filtro)"];
const INTELLECT_OPTIONS = ["Pouco Intelectual", "Médio Intelectual", "Intelectual Alto"];
const FORMALITY_OPTIONS = ["Baixo", "Médio", "Alto"];

export const ScriptTab = ({ setActiveTab }) => {
  const { configs } = useSystemStatus();
  const [titulo, setTitulo] = useState('');
  // ... (other state stays the same)
  const [dna, setDna] = useState('Jornada do Herói');
  const [alma, setAlma] = useState('Épica e Cinematográfica');
  const [cta, setCta] = useState('Viral (Engajamento)');
  const [nicho, setNicho] = useState('Documentário');
  const [idioma, setIdioma] = useState('Português (BR)');
  const [formato, setFormato] = useState('Texto Corrido');
  const [natureza, setNatureza] = useState('Dados Reais (usar pesquisa web)');
  const [safety, setSafety] = useState('Formato Seguro (Safety)');
  const [intellect, setIntellect] = useState('Médio Intelectual');
  const [formality, setFormality] = useState('Médio');
  const [tamanho, setTamanho] = useState(5000);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedScript, setGeneratedScript] = useState(null);
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    if (!generatedScript) return;
    try {
      await navigator.clipboard.writeText(generatedScript.content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGeneratedScript(null);
    
    setTimeout(async () => {
      try {
        const promptParam = `Você é um MESTRE ROTEIRISTA DE ELITE — um sistema especializado na criação de roteiros para vídeos que dominam o algoritmo, prendem a atenção e emocionam profundamente. Você escreve como os maiores criadores de conteúdo do mundo: com precisão cirúrgica, ritmo magnético e impacto emocional devastador.

MISSÃO ABSOLUTA: Criar um roteiro de locução que seja tão poderoso que o ouvinte seja incapaz de parar de escutar. Cada frase deve puxar a próxima. Cada parágrafo deve criar uma micro-tensão que exige resolução.

!!! IDIOMA INVIOLÁVEL: TODO O ROTEIRO DEVE SER ESCRITO EXCLUSIVAMENTE EM ${idioma.toUpperCase()}. ZERO EXCEÇÕES. !!!

--- PARÂMETROS DO ROTEIRO ---
Tema/Assunto: ${titulo || 'Vídeo Viral'}
DNA Narrativo: ${dna}
Alma/Tom: ${alma}
CTA: ${cta}
Nicho: ${nicho}
Natureza do Conteúdo: ${natureza}
Filtro de Segurança: ${safety}
Nível de Intelectualidade: ${intellect}
Formalidade: ${formality}
Formato: ${formato}
Tamanho-alvo: ${tamanho} caracteres

---
## LEI 1 — O GANCHO DE ABERTURA (OBRIGATÓRIO E IMPLACÁVEL)
As primeiras 3 frases determinam se o vídeo vive ou morre. O gancho deve:
- Começar no MEIO DA AÇÃO, de uma revelação, de uma contradição ou de uma pergunta que cria vazio cognitivo imediato
- NUNCA começar com apresentação, saudação ou contexto genérico
- Usar uma das técnicas: [Verdade Chocante | Paradoxo Impossível | Promessa Específica | Cena In Medias Res | Pergunta que Machuca]
- Ser curto e violento: máximo 3 frases. Depois disso, o ouvinte já deve estar completamente dentro da história.

EXEMPLOS DO QUE NÃO FAZER (proibido):
❌ "Você sabia que..." / "Hoje vou te falar sobre..." / "Bem-vindo ao canal" / "Neste vídeo" / "Vamos descobrir juntos" / "Imagine por um momento" / "Em um mundo onde" / "Prepare-se para" / "O que você está prestes a ouvir" / "Isso vai te surpreender" / "Nunca vi nada igual" / "Incrível" / "Fascinante" / "Surpreendente" / "Chocante" (como adjetivo genérico) / "Mergulhe conosco" / "Venha comigo nessa jornada"

---
## LEI 2 — APLICAÇÃO CONCRETA DO DNA: "${dna}"
${dna === 'Jornada do Herói' ? `Estruture como: Mundo Comum → Chamado → Recusa → Travessia → Provas → Transformação → Retorno. O ouvinte DEVE se identificar como o herói da história.` :
dna === 'O Grande Mistério' ? `Abra com um mistério irresistível. Cada parágrafo revela UMA camada, mas cria DUAS novas perguntas. A resolução só chega nos últimos 15% do roteiro.` :
dna === 'Pirâmide Invertida' ? `Comece pela conclusão mais impactante. Depois justifique em ordem decrescente de impacto. O ouvinte sabe o fim mas precisa entender o "por quê".` :
dna === 'Verdade Chocante de Início' ? `Abra com um fato ou declaração que viola completamente a crença do ouvinte. Construa provas ao longo do roteiro. Termine com a implicação pessoal dessa verdade.` :
dna === 'Problema e Solução' ? `Descreva o problema com intensidade emocional máxima — o ouvinte deve sentir dor. A solução só aparece após construir tensão suficiente. Termine com transformação concreta.` :
dna === 'Dossiê Investigativo' ? `Fale como um detetive montando um caso. Cite evidências, fontes, datas. Construa uma linha do tempo até a revelação final que conecta todos os pontos.` :
dna === 'Revelação em Camadas (Iceberg)' ? `Mostre apenas a ponta do iceberg no início. A cada parágrafo, mergulhe mais fundo. O roteiro termina na camada mais profunda e perturbadora da verdade.` :
dna === 'Teoria da Conspiração' ? `Conecte pontos que parecem não relacionados. Use "e se?" estrategicamente. Crie paranoia intelectual sem afirmar like verdade — insinue, questione, provoque.` :
dna === 'Narrativa Imersiva (Você)' ? `Use "você" em vez de "eles". O ouvinte É o protagonista. Cada evento acontece COM ele. Isso cria empatia e retenção máximas.` :
dna === 'Choque de Expectativas' ? `Estabeleça uma premissa clara nos primeiros 20%. Quebre essa premissa completamente no meio. Termine com uma reviravolta que recontextualiza tudo.` :
dna === 'Lista em Contagem Regressiva' ? `Use tensão crescente: a contagem vai do item menos ao mais impactante. Cada item deve ser mais revelador que o anterior. O número 1 deve ser inesquecível.` :
dna === 'Círculo Narrativo' ? `Comece e termine no mesmo ponto — mas após a jornada, aquele ponto inicial tem significado completamente diferente. O ouvinte deve perceber a transformação ao chegar ao fim.` :
`Aplique a estrutura "${dna}" com maestria. Cada parágrafo deve ter uma função narrativa clara: criar tensão, revelação ou transformação emocional.`}

---
## LEI 3 — CONTROLE DE RITMO OBRIGATÓRIO
Alterne sistematicamente entre frases curtas e longas para criar cadência hipnótica:
- Frase curta (impacto): 3 a 8 palavras — para choque, pausa dramática, revelação
- Frase longa (imersão): 20 a 40 palavras — para construção de atmosphera, contexto, emoção
- NUNCA coloque mais de 3 frases longas seguidas
- NUNCA coloque mais de 4 frases curtas seguidas sem uma transição
- Use ponto final como arma — não como convenção gramatical

---
## LEI 4 — ARCO EMOCIONAL ESTRUTURADO
O roteiro deve ter picos emocionais calculados:
- 0–15%: Gancho + tensão inicial (curiosidade/choque)
- 15–40%: Aprofundamento + dor/identificação emocional
- 40–70%: Revelação progressiva + escalada de intensidade
- 70–85%: Clímax emocional ou revelação principal
- 85–100%: Resolução + CTA orgânica + fechamento memorável
Não deixe o ritmo emocional ficar plano. Se passou 3 parágrafos sem uma micro-revelação ou virada, adicione uma.

---
## LEI 5 — TOM E ALMA: "${alma}"
${alma === 'Épica e Cinematográfica' ? `Escreva como se fosse a narração de um trailer de filme épico. Linguagem grandiosa mas precisa. Imagens mentais poderosas. Frases que parecem gravadas em pedra.` :
alma === 'Sarcástica e Ácida' ? `Usa ironia como bisturi, não como marreta. O sarcasmo deve ser inteligente, não agressivo. O ouvinte sorri e pensa ao mesmo tempo.` :
alma === 'Misteriosa e Sombria' ? `Tom de sussurro. Cada palavra carrega peso. O silêncio entre as frases existe. Use linguagem que sugere mais do que explica.` :
alma === 'Investigadora Obcecada' ? `Você está obcecado com a verdade. Cada detalhe importa. Fala rápido, com urgência. O ouvinte sente que está dentro de uma investigação real.` :
alma === 'Jornalística e Urgente' ? `Direto ao ponto. Fatos concretos. Datas, números, nomes. O urgência está na estrutura, não nas palavras. Cada frase é uma notícia.` :
alma === 'Confessional e Íntima' ? `Fala baixinho. Como se contasse um segredo. Primeira pessoa. Vulnerabilidade real. O ouvinte sente que está dentro da sua cabeça.` :
alma === 'Inspiradora e Poética' ? `Linguagem que eleva. Metáforas precisas. Ritmo que soa como música. O ouvinte deve se sentir maior após ouvir.` :
alma === 'Autoritária e Confiante' ? `Sem hedges, sem "talvez", sem "pode ser". Você sabe. E o ouvinte precisa saber que você sabe. Cada frase é uma afirmação.` :
`Aplique o tom "${alma}" de forma consistente e intensa em cada linha. O tom deve ser reconhecível na primeira frase.`}

---
## LEI 6 — CTA: "${cta}"
${cta === 'Sem CTA' ? `Não inclua nenhuma chamada para ação. O roteiro termina organicamente com a conclusão narrativa.` :
cta === 'Sutil (Invisível)' ? `A CTA deve estar tão integrada na narrativa que o ouvinte não percebe que é uma CTA. Não use verbos de comando direto.` :
cta === 'Viral (Engajamento)' ? `Insira a CTA entre 70–80% do roteiro (não no final). Deve fazer o ouvinte querer compartilhar por emoção, não por obrigação. Ex: "Se alguém que você ama precisa ouvir isso..."` :
cta === 'Curiosidade (Próximo Vídeo)' ? `No final, crie uma pergunta ou revelação incompleta que só pode ser respondida no próximo conteúdo. Deixe o ouvinte com fome, não com saciedade.` :
`Insira a CTA de forma completamente orgânica. Deve surgir da narrativa, não interrompê-la. Nunca use frases como "não se esqueça de curtir" ou "ativa o sininho".`}

---
## LEI 7 — NÍVEL INTELECTUAL: "${intellect}"
${intellect === 'Pouco Intelectual' ? `Vocabulário simples. Analogias do cotidiano. Sem jargões. O mais complexo possível dentro da clareza absoluta. O ouvinte de 15 anos deve entender.` :
intellect === 'Médio Intelectual' ? `Vocabulário rico mas acessível. Analogias elaboradas. Alguns conceitos técnicos explicados brevemente. Referências culturais reconhecíveis.` :
`Vocabulário denso e preciso. Conceitos complexos tratados com profundidade. Referências intelectuais, históricas ou científicas. O ouvinte deve sentir que aprendeu algo genuinamente novo.`}

---
## LEI 8 — NATUREZA DO CONTEÚDO: "${natureza}"
${natureza === 'Dados Reais (usar pesquisa web)' ? `Use dados, fatos, datas, nomes e estatísticas VEROSSÍMEIS e plausíveis. Nunca invente dados impossíveis. Os fatos devem ser específicos o suficiente para parecerem verificados.` :
`Universo totalmente ficcional. Liberdade criativa máxima. Crie personagens, situações e universos que nunca existiram mas que parecem absolutamente reais e viscerais.`}

---
## LEI 9 — FILTRO DE SEGURANÇA: "${safety}"
${safety === 'Formato Seguro (Safety)' ? `Linguagem completamente adequada para todas as idades e plataformas. Sem violência, sem temas sensíveis, sem conteúdo que possa gerar demonetização.` :
safety === 'Formato Meio Seguro (Médio Risco)' ? `Pode abordar temas adultos, morte, crime, trauma — mas com linguagem controlada. Sem explícito. Pode gerar tensão sem ser gráfico.` :
`Sem censura narrativa. Pode ser visceral, perturbador, provocativo. A verdade nua e crua, sem suavização.`}

---
## FORMATO DE ENTREGA: "${formato.toUpperCase()}"
${formato === 'Por Partes' ? `Pense em blocos narrativos internos para manter a coesão, mas entregue TODO o texto corrido, sem qualquer marcação, título ou divisão visível.` :
formato === 'Lista' ? `Estrutura numerada dinâmica (1., 2., 3...). Cada item deve ter abertura impactante, desenvolvimento e mini-fechamento. O tema central une todos.` :
`Texto 100% corrido e fluido, pronto para o narrador ler sem pausas não-planejadas.`}

---
## PROIBIÇÕES ABSOLUTAS (violação = reescrever tudo)
- ZERO marcações: sem [Cena], sem [Música], sem [Narrador], sem títulos, sem negrito, sem itálico
- ZERO clichês de IA: "Você sabia que", "Hoje vou te falar", "Bem-vindo", "Neste vídeo", "Vamos explorar", "Imagine por um momento", "Em um mundo onde", "Prepare-se para", "O que você está prestes a ouvir", "Venha comigo nessa jornada", "Mergulhe", "Fascinante", "Incrível", "Surpreendente" (como adjetivo vazio), "Chocante" (sem substância), "Em conclusão", "Em resumo", "Para finalizar"
- ZERO apresentações de canal ou criador
- ZERO linguagem passiva quando a ativa é possível
- ZERO metáforas clichê: "viagem no tempo", "luz no fim do túnel", "dois lados da moeda"

---
## AUTORREVISÃO ANTES DE ENTREGAR
Antes de finalizar, verifique internamente:
1. ✅ O gancho das primeiras 3 frases prende sem apresentação?
2. ✅ O DNA "${dna}" está aplicado estruturalmente, não apenas mencionado?
3. ✅ O ritmo varia entre frases curtas e longas sistematicamente?
4. ✅ Existem pelo menos 3 picos emocionais distintos ao longo do texto?
5. ✅ A CTA está orgânica e no momento certo?
6. ✅ Nenhum clichê da lista proibida foi usado?
7. ✅ O tom "${alma}" é reconhecível e consistente do início ao fim?
Se alguma verificação falhar, reescreva esse trecho antes de entregar.

---
## ENTREGA FINAL
Escreva APENAS o texto da locução em ${idioma.toUpperCase()}, pronto para gravar. Sem introduções, sem explicações, sem comentários. Comece IMEDIATAMENTE com o gancho.
`;

        const activeAi = configs.active_ai;
        let scriptContent = "";
        let validScript = false;
        let attempts = 0;
        const MAX_ATTEMPTS = 5;

        // Calculando Metas e Palavras
        const numPalavras = Math.floor(tamanho / 6);
        let dynamicPrompt = promptParam.replace(
           `Roteiro adequado para \${tamanho} caracteres.`,
           `Roteiro adequado para ${tamanho} caracteres (aproximadamente ${numPalavras} palavras).`
        );
        let currentPrompt = dynamicPrompt;
        let isContinuation = false;

        while (!validScript && attempts < MAX_ATTEMPTS) {
          attempts++;
          
          if (isContinuation) {
             const deficit = tamanho - scriptContent.length;
             const excerpt = scriptContent.length > 500 ? scriptContent.substring(scriptContent.length - 500) : scriptContent;
             currentPrompt = `!!! CRITICAL: STICK TO ${idioma.toUpperCase()} LANGUAGE AND "${formato.toUpperCase()}" FORMAT !!!
Continue exatamente o roteiro abaixo, sem títulos de introdução e sem explicações.
Garanta total COESÃO e CONTINUIDADE com o que já foi escrito. Não repita informações.
Aja como se estivesse apenas digitando a continuação direta das próximas frases da locução.
Gere mais conteúdo até bater a marca de adicionar +${deficit} caracteres na história total.
ÚLTIMO TRECHO:
"...${excerpt}"

CONTINUE IMEDIATAMENTE A PARTIR DAQUI EM ${idioma.toUpperCase()} (apenas texto narrado):`;
          }

          let responseText = "";

            const gptKey = localStorage.getItem('guru_gpt_key')?.trim();
            const geminiKey = localStorage.getItem('guru_gemini_key')?.trim();
            
            // Smart Fallback within the generation loop
            try {
               if (!gptKey || gptKey.includes('YOUR_')) throw new Error("GPT key missing");
               responseText = await callGPT(gptKey, currentPrompt);
            } catch (gptError) {
               console.warn("GPT script generation failed, trying Gemini fallback:", gptError);
               if (geminiKey && geminiKey.length > 5) {
                 responseText = await callGemini(geminiKey, currentPrompt);
               } else {
                 throw new Error("Saldo do GPT insuficiente e Gemini não configurado.");
               }
            }

            // Agrega o texto da IA (limpando o marcador de continuação se ela escrever algo indesejado)
            if (isContinuation) {
                responseText = responseText.replace(/CONTINUE.*/gi, '').trim(); // Algumas IAs ecoam o comando
                scriptContent += " " + responseText;
            } else {
                scriptContent = responseText;
            }

          // Verificação Matemática de Margem
          const margin = 2000;
          const minLen = Math.max(0, tamanho - margin);
          const maxLen = tamanho + margin;
          
          if (scriptContent.length > maxLen) {
              // Cortar o excesso de forma semântica (no último ponto final válido dentro do tamanho)
              const overflowPos = maxLen;
              let sliceText = scriptContent.substring(0, overflowPos);
              const lastDot = Math.max(sliceText.lastIndexOf('. '), sliceText.lastIndexOf('!'), sliceText.lastIndexOf('?'));
              if (lastDot > 0) {
                  scriptContent = sliceText.substring(0, lastDot + 1);
              } else {
                  scriptContent = sliceText;
              }
              validScript = true;
          } else if (scriptContent.length < minLen) {
              // Pedir para continuar na proxima iteracao do while
              isContinuation = true;
              console.warn(`Tentativa ${attempts}: Roteiro com ${scriptContent.length} caracteres. Ainda faltam ${tamanho - scriptContent.length}. Continuando geração...`);
          } else {
              // Está dentro da margem exata
              validScript = true;
          }
        }

        const newProject = {
          id: Date.now().toString(),
          title: titulo || 'Roteiro Gerado pela IA',
          niche: nicho,
          date: new Date().toLocaleString(),
          length: scriptContent.length,
          content: scriptContent
        };

        // LIFO stack: newest first, max 6 — 7th oldest auto-ejected
        stackPush('guru_scripts', newProject);
        
        setGeneratedScript(newProject);
        setTitulo(''); // Limpar o campo de titulo para nova geração
        
        // Redirecionar para a aba de roteiros prontos imediatamente
        setActiveTab('ready-scripts');
      } catch (error) {
        console.error("Erro na API geradora:", error);
        alert(`Não foi possível conectar com a IA.\n\nDetalhe do Erro: ${error.message || error}\n\n1. Verifique se colou a chave inteira nas configurações.`);
      } finally {
        setIsGenerating(false);
      }
    }, 500); // Small initial delay for UI animation to kick in
  };

  const transferToFlow = () => {
    if (!generatedScript) return;
    // Simple logic to convert script to prompts: use sentences or paragraphs
    localStorage.setItem('guru_flow_transfer', generatedScript.content);
    setActiveTab('whisk');
  };

  const clearCurrentScript = () => {
    setGeneratedScript(null);
    setTitulo('');
  };

  const handleDownloadTxt = () => {
    if (!generatedScript) return;
    const blob = new Blob([generatedScript.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${generatedScript.title.replace(/ /g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadSrt = () => {
    if (!generatedScript) return;
    // VERY simple mock SRT generator
    const lines = generatedScript.content.split('\n').filter(l => l.trim().length > 0 && !l.startsWith('['));
    let srtData = "";
    lines.forEach((line, idx) => {
      srtData += `${idx + 1}\n`;
      srtData += `00:00:${String(idx*2).padStart(2,'0')},000 --> 00:00:${String((idx*2)+2).padStart(2,'0')},000\n`;
      srtData += `${line}\n\n`;
    });
    const blob = new Blob([srtData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${generatedScript.title.replace(/ /g, '_')}.srt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = () => {
    if (!generatedScript) return;
    const doc = new jsPDF();
    doc.setFontSize(16);
    // basic text splitting for PDF
    const splitText = doc.splitTextToSize(generatedScript.content, 180);
    doc.text(splitText, 15, 20);
    doc.save(`${generatedScript.title.replace(/ /g, '_')}.pdf`);
  };

  const OptionGrid = ({ options, selected, onSelect, color }) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onSelect(opt)}
          className={`px-3 py-2.5 rounded-lg text-[11px] font-bold transition-all duration-300 border flex flex-col items-center justify-center gap-1 text-center h-full
            ${selected === opt 
              ? `bg-${color}/20 text-${color} border-${color} shadow-[0_0_15px_rgba(0,0,0,0.2)] ring-1 ring-${color}/50 scale-[1.02]` 
              : 'bg-white/5 text-gray-400 border-white/5 hover:border-white/20 hover:text-white hover:bg-white/10'
            }
          `}
        >
          <span className="leading-tight">{opt}</span>
        </button>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row h-full w-full max-w-[1600px] mx-auto gap-6 overflow-y-auto lg:overflow-hidden">
      {/* Left Column - Form & Configurations */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-full lg:w-7/12 flex flex-col h-auto lg:h-full overflow-y-visible lg:overflow-y-auto pr-0 lg:pr-8 custom-scrollbar capitalize"
      >
        <header className="mb-6 md:mb-8">
          <h2 className="text-2xl md:text-4xl font-black text-white flex items-center gap-2 md:gap-3 tracking-tight">
            <div className="w-12 h-12 md:w-16 md:h-16 rounded-full p-0.5 bg-gradient-to-br from-neon-cyan to-blue-600 shadow-[0_0_30px_rgba(0,243,255,0.3)] overflow-hidden border border-white/10 shrink-0">
              <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover rounded-full" />
            </div>
            {t('script.title')}
          </h2>
          <p className="text-gray-400 mt-2 font-medium text-sm md:text-base border-l-2 border-neon-pink pl-3 ml-2">{t('script.subtitle')}</p>
        </header>

        <div className="space-y-6 md:space-y-8 pb-10">
          
          {/* CAMPO 1 */}
          <div className="glass-card p-6 border border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-neon-cyan/5 rounded-full blur-[50px] pointer-events-none group-hover:bg-neon-cyan/10 transition-colors" />
            <label className="text-[10px] font-black text-gray-500 mb-3 flex items-center gap-2 uppercase tracking-[0.2em]">
              <Type className="w-3 h-3 text-neon-cyan" /> {t('script.field_title')}
            </label>
            <input 
              type="text"
              className="w-full bg-dark/40 border border-white/5 rounded-lg p-4 text-white text-lg focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/20 transition-all placeholder:text-gray-700"
              placeholder={t('script.field_title_placeholder')}
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
            />
          </div>

          {/* CAMPO 2 */}
          <div className="glass-card p-6 border border-white/5 relative overflow-hidden group">
             <label className="text-[10px] font-black text-gray-500 mb-4 flex items-center gap-2 uppercase tracking-[0.2em]">
              <Layout className="w-3 h-3 text-neon-purple" /> {t('script.field_dna')}
            </label>
            <OptionGrid options={DNA_OPTIONS} selected={dna} onSelect={setDna} color="neon-purple" />
          </div>

          {/* CAMPO 3 */}
          <div className="glass-card p-6 border border-white/5 relative overflow-hidden group">
            <label className="text-[10px] font-black text-gray-500 mb-4 flex items-center gap-2 uppercase tracking-[0.2em]">
              <Target className="w-3 h-3 text-neon-pink" /> {t('script.field_alma')}
            </label>
            <OptionGrid options={ALMA_OPTIONS} selected={alma} onSelect={setAlma} color="neon-pink" />
          </div>

          {/* CAMPO 4 */}
          <div className="glass-card p-6 border border-white/5 relative overflow-hidden group">
            <label className="text-[10px] font-black text-gray-500 mb-4 flex items-center gap-2 uppercase tracking-[0.2em]">
              <Languages className="w-3 h-3 text-green-400" /> {t('script.field_cta')}
            </label>
            <OptionGrid options={CTA_OPTIONS} selected={cta} onSelect={setCta} color="green-400" />
          </div>

          {/* CONFIGURAÇÕES SECUNDÁRIAS */}
          <div className="glass-card p-6 bg-black/20 border border-white/5">
            <h3 className="text-sm font-black text-white mb-6 flex items-center gap-2 border-b border-white/5 pb-4 uppercase tracking-widest">
              <Settings className="w-4 h-4 text-gray-500" /> {t('script.sec_configs')}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">{t('script.niche')}</label>
                <select className="w-full bg-dark/40 border border-white/5 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-white/20" value={nicho} onChange={e=>setNicho(e.target.value)}>
                  {NICHO_OPTIONS.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">{t('script.lang')}</label>
                <select className="w-full bg-dark/40 border border-white/5 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-white/20" value={idioma} onChange={e=>setIdioma(e.target.value)}>
                  {IDIOMA_OPTIONS.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">{t('script.format')}</label>
                <select className="w-full bg-dark/40 border border-white/5 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-white/20" value={formato} onChange={e=>setFormato(e.target.value)}>
                  {FORMATO_OPTIONS.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">{t('script.nature')}</label>
                <select className="w-full bg-dark/40 border border-white/5 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-white/20" value={natureza} onChange={e=>setNatureza(e.target.value)}>
                  {NATUREZA_OPTIONS.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-neon-cyan uppercase tracking-widest block mb-2">Filtro de Segurança</label>
                <select className="w-full bg-dark/40 border border-neon-cyan/20 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-neon-cyan/50" value={safety} onChange={e=>setSafety(e.target.value)}>
                  {SAFETY_OPTIONS.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-neon-purple uppercase tracking-widest block mb-2">Intelectualidade</label>
                <select className="w-full bg-dark/40 border border-neon-purple/20 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-neon-purple/50" value={intellect} onChange={e=>setIntellect(e.target.value)}>
                  {INTELLECT_OPTIONS.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-green-400 uppercase tracking-widest block mb-2">Formalidade</label>
                <select className="w-full bg-dark/40 border border-green-500/20 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-green-500/50" value={formality} onChange={e=>setFormality(e.target.value)}>
                  {FORMALITY_OPTIONS.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            </div>

            {/* SLIDER TAMANHO */}
            <div className="mt-8 pt-6 border-t border-white/5">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                   <Gauge className="w-4 h-4 text-neon-cyan" />
                   <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">{t('script.size')}</label>
                </div>
                <span className="text-[10px] font-black font-mono text-neon-cyan bg-neon-cyan/10 px-2.5 py-1 rounded-full border border-neon-cyan/20">
                   {tamanho} {t('script.chars')}
                </span>
              </div>
              <input 
                type="range" 
                min="1000" 
                max="35000" 
                step="500"
                value={tamanho}
                onChange={(e) => setTamanho(Number(e.target.value))}
                className="w-full h-1.5 bg-dark rounded-lg appearance-none cursor-pointer accent-neon-cyan"
              />
              <div className="flex justify-between text-[10px] font-bold text-gray-600 mt-2 uppercase tracking-tighter">
                <span>{t('script.short')}</span>
                <span>{t('script.long')}</span>
              </div>
            </div>
          </div>

          <button 
            onClick={handleGenerate}
            disabled={isGenerating || !titulo}
            className={`w-full py-5 rounded-xl flex items-center justify-center gap-3 font-black text-lg transition-all duration-500 transform active:scale-[0.98] relative overflow-hidden group
              ${isGenerating || !titulo
                ? 'bg-white/5 text-gray-600 border border-white/5 cursor-not-allowed'
                : 'bg-white text-dark shadow-[0_10px_30px_rgba(255,255,255,0.1)] hover:shadow-[0_15px_40px_rgba(0,243,255,0.2)] hover:-translate-y-1'
              }
            `}
          >
            {isGenerating ? (
              <span className="flex items-center gap-3">
                <Wand2 className="w-6 h-6 animate-spin text-neon-cyan" /> {t('script.generating')}
              </span>
            ) : (
              <>
                <Wand2 className={`w-6 h-6 ${!titulo ? 'text-gray-600' : 'text-neon-purple'}`} /> {t('script.generate')}
                <div className="absolute inset-0 bg-gradient-to-r from-neon-cyan/0 via-white/20 to-neon-purple/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none" />
              </>
            )}
          </button>
        </div>
      </motion.div>

      {/* Right Column - Preview & Output */}
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-full lg:w-5/12 h-[600px] lg:h-full flex flex-col pb-6 lg:pb-0 font-sans"
      >
          <div className="glass-card flex flex-col h-full relative overflow-hidden border border-white/10 shadow-2xl">
            {/* Ambient Background Glow inside the card */}
            <div className="absolute top-0 right-0 w-full h-64 bg-gradient-to-b from-neon-cyan/5 to-transparent pointer-events-none" />
            
            <div className="p-6 md:p-8 border-b border-white/5 bg-black/20 flex justify-between items-center z-10 backdrop-blur-md">
              <h3 className="text-sm font-black text-white flex items-center gap-2 uppercase tracking-widest">
                <BookOpen className="text-neon-cyan w-4 h-4" /> {t('script.viewer_title')}
              </h3>
              {generatedScript && (
                <span className="text-[10px] bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded font-black uppercase tracking-widest">{t('script.ready')}</span>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 md:p-10 relative z-10 bg-dark/20 custom-scrollbar">
              {isGenerating ? (
                <LoadingSpinner message={t('script.generating')} size="lg" fullHeight />
              ) : generatedScript ? (
                <div className="animate-fade-in">
                  <div className="mb-6 bg-black/40 p-5 rounded-2xl border border-white/5">
                     <h4 className="text-xl font-black text-white mb-3 leading-tight tracking-tight">{generatedScript.title}</h4>
                     <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-widest">
                       <span className="bg-neon-cyan/10 border border-neon-cyan/20 px-2.5 py-1.5 rounded-lg text-neon-cyan flex items-center">{generatedScript.niche}</span>
                       <span className="bg-neon-purple/10 border border-neon-purple/20 px-2.5 py-1.5 rounded-lg text-neon-purple flex items-center">{dna}</span>
                       <div className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg flex flex-col justify-center leading-tight">
                          <span className="text-[9px] text-gray-500 mb-0.5">{generatedScript.date ? generatedScript.date.split(',')[0] : ''}</span>
                          <span className="text-white font-bold text-xs">{generatedScript.date && generatedScript.date.includes(',') ? generatedScript.date.split(',')[1].trim() : ''}</span>
                       </div>
                       <div className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg flex flex-col justify-center items-center leading-tight min-w-[60px]">
                          <span className="text-white font-black text-sm">{generatedScript.content.length}</span>
                          <span className="text-[9px] text-gray-500">CHARS</span>
                       </div>
                     </div>
                  </div>
                  <div className="font-mono text-[14px] text-gray-300 whitespace-pre-wrap leading-relaxed px-2">
                    {generatedScript.content}
                  </div>
                </div>
              ) : (
                <p className="text-gray-600/40 italic h-full flex items-center justify-center text-center text-sm font-bold p-12 leading-loose uppercase tracking-[0.1em]">
                  {t('script.empty_hint')}
                </p>
              )}
            </div>
            
            <div className="p-6 md:p-10 bg-black/40 border-t border-white/5 z-10 sticky bottom-0 backdrop-blur-xl flex flex-col gap-4">
              {generatedScript && (
                <button 
                  onClick={clearCurrentScript}
                  className="w-full py-3 rounded-xl bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan hover:bg-neon-cyan/20 transition-all font-black uppercase tracking-widest flex items-center justify-center gap-2 text-[10px]"
                >
                  <Sparkles className="w-3 h-3" /> {t('script.new_script')}
                </button>
              )}
              <div className="flex justify-between gap-3">
                <button 
                  onClick={handleDownloadTxt}
                  disabled={!generatedScript} 
                  className="flex-1 py-3 rounded-xl bg-white/5 border border-white/5 text-gray-400 hover:text-white hover:border-white/20 hover:bg-white/10 transition-all font-black uppercase tracking-widest disabled:opacity-30 flex items-center justify-center gap-2 text-[9px]"
                >
                  <Download className="w-3 h-3 text-neon-cyan" /> {t('script.download_txt')}
                </button>
                <button 
                  onClick={handleDownloadSrt}
                  disabled={!generatedScript} 
                  className="flex-1 py-3 rounded-xl bg-white/5 border border-white/5 text-gray-400 hover:text-white hover:border-white/20 hover:bg-white/10 transition-all font-black uppercase tracking-widest disabled:opacity-30 flex items-center justify-center gap-2 text-[9px]"
                >
                  <FileJson className="w-3 h-3 text-neon-purple" /> {t('script.download_srt')}
                </button>
              </div>
              {generatedScript && (
                <button 
                  onClick={handleCopy}
                  className={`w-full py-4 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all relative overflow-hidden text-[10px] active:scale-95
                    ${isCopied 
                    ? 'bg-green-500/20 border border-green-500 text-green-400' 
                    : 'bg-white text-dark shadow-xl hover:bg-white/90'
                  }`}
                >
                  {isCopied ? (
                    <>
                      <Check className="w-4 h-4" /> {t('script.copied')}
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" /> {t('script.copy_full')}
                    </>
                  )}
                </button>
              )}
              {generatedScript && (
                <button 
                  onClick={transferToFlow}
                  className="w-full py-4 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all bg-gradient-to-r from-neon-cyan to-blue-600 text-white shadow-[0_0_20px_rgba(0,243,255,0.2)] hover:scale-[1.02] text-[10px]"
                >
                  <Zap className="w-4 h-4 fill-current" /> {t('whisk.btn_start')} (Auto Flow)
                </button>
              )}
            </div>
          </div>
      </motion.div>
    </div>
  );
};
