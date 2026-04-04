import os
import json
import logging
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
KNOWLEDGE_FILE = os.path.join(BASE_DIR, 'knowledge_base.json')

logger = logging.getLogger("GuruBrain")

def load_knowledge():
    if os.path.exists(KNOWLEDGE_FILE):
        try:
            with open(KNOWLEDGE_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error loading knowledge brain: {e}")
            return {}
    return {}

def save_knowledge(data):
    try:
        with open(KNOWLEDGE_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
        return True
    except Exception as e:
        logger.error(f"Error saving knowledge brain: {e}")
        return False

def learn_from_analysis(niche, report_text, metadata=None):
    """
    Simulated pattern extraction from AI report.
    In a real surgical scenario, we would parse for specific keywords, 
    successful hooks, and target countries.
    """
    brain = load_knowledge()
    
    if niche not in brain:
        brain[niche] = {
            "patterns": [],
            "total_analyses": 0,
            "last_updated": ""
        }
    
    brain[niche]["total_analyses"] += 1
    brain[niche]["last_updated"] = datetime.now().isoformat()
    
    # We store short summaries or key findings
    # For now, we extract first 200 chars or summary lines
    finding = {
        "date": datetime.now().strftime("%Y-%m-%d"),
        "context": metadata.get("channel_name", "Unknown") if metadata else "Unknown",
        "snippet": report_text[:500] # Storing a strategic snippet
    }
    
    # Keep only the last 10 'lessons' per niche to avoid context bloat
    brain[niche]["patterns"].insert(0, finding)
    brain[niche]["patterns"] = brain[niche]["patterns"][:10]
    
    save_knowledge(brain)
    return True

def get_niche_experience(niche):
    """
    Returns a summarized string of previous findings for a specific niche
    to be injected into the next AI prompt.
    """
    brain = load_knowledge()
    if niche not in brain or not brain[niche]["patterns"]:
        return "Nenhum aprendizado prévio para este nicho ainda. Começando análise do zero."
    
    experience = f"GURU MASTER LOG (Aprendizado Acumulado: {brain[niche]['total_analyses']} análises):\n"
    for i, p in enumerate(brain[niche]["patterns"][:3]): # Top 3 most recent
        experience += f"- [Análise {i+1}]: {p['snippet'][:200]}...\n"
    
    return experience
