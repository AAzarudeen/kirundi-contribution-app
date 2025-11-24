import os
import argparse
import re
from datasets import load_dataset

# --- Configuration ---
PROMPTS_FILE = "french_prompts.txt"
MIN_WORDS = 3  # "Ça va bien ?" (3 mots)
MAX_WORDS = 12 # Phrases courtes pour le jeu

def normalize_sentence(sentence):
    """Nettoie la phrase pour éviter les doublons."""
    sentence = sentence.lower()
    # On garde les accents français
    sentence = re.sub(r"[^a-zàâçéèêëîïôûùüÿñæœ\s]", "", sentence)
    sentence = re.sub(r"\s+", " ", sentence).strip()
    return sentence

def load_existing_prompts(filepath):
    if not os.path.exists(filepath):
        return set()
    with open(filepath, "r", encoding="utf-8") as f:
        return {normalize_sentence(line) for line in f}

def is_valid_sentence(sentence, existing_prompts_normalized):
    # 1. Vérifications de base
    if not sentence: 
        return False
    
    # 2. Filtrer les caractères bizarres ou le "vieux" français
    if sentence.count(';') > 1: 
        return False
    if "<" in sentence or ">" in sentence: # Filtrer les balises HTML éventuelles
        return False

    # 3. Compter les mots
    word_count = len(sentence.split())
    if not (MIN_WORDS <= word_count <= MAX_WORDS):
        return False

    # 4. Doublons
    normalized = normalize_sentence(sentence)
    if not normalized or normalized in existing_prompts_normalized:
        return False

    return True

def get_modern_sentences(num_needed, existing_prompts_normalized):
    """
    Télécharge des phrases depuis le dataset OPUS-100 (Helsinki-NLP).
    Contient Tatoeba, OpenSubtitles, etc.
    """
    print("Chargement du dataset Helsinki-NLP/opus-100 (En-Fr)...")
    
    # CORRECTION MAJEURE : On utilise opus-100 qui est moderne et sûr.
    # Plus besoin de trust_remote_code car c'est un format standard.
    dataset = load_dataset(
        "Helsinki-NLP/opus-100", 
        "en-fr", 
        split="train", 
        streaming=True
    )
    
    new_sentences = []
    
    print(f"Recherche de {num_needed} phrases modernes...")
    
    for item in dataset:
        if len(new_sentences) >= num_needed:
            break
            
        # Récupérer la phrase française
        try:
            french_sentence = item['translation']['fr']
        except KeyError:
            continue
        
        if is_valid_sentence(french_sentence, existing_prompts_normalized):
            new_sentences.append(french_sentence)
            existing_prompts_normalized.add(normalize_sentence(french_sentence))
            
            if len(new_sentences) % 10 == 0:
                print(f"Trouvé {len(new_sentences)}/{num_needed} phrases...")

    return new_sentences

def main(num_prompts):
    print(f"Lecture des prompts existants dans '{PROMPTS_FILE}'...")
    existing_prompts = load_existing_prompts(PROMPTS_FILE)
    print(f"{len(existing_prompts)} prompts existants trouvés.")

    new_prompts = get_modern_sentences(num_prompts, existing_prompts)

    if new_prompts:
        print(f"\nAjout de {len(new_prompts)} nouvelles phrases modernes à '{PROMPTS_FILE}'...")
        with open(PROMPTS_FILE, "a", encoding="utf-8") as f:
            for prompt in new_prompts:
                f.write(prompt + "\n")
        print("Terminé ! C'est dans la boîte.")
    else:
        print("Aucune nouvelle phrase trouvée (vérifiez votre connexion).")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Générateur de prompts modernes pour le Kirundi.")
    parser.add_argument("--num", type=int, default=50, help="Nombre de phrases à ajouter")
    args = parser.parse_args()
    
    main(args.num)