import pandas as pd
import os
import shutil
import logging
import argparse
import glob
import re

# --- Configuration ---
# Set up logging to see what's happening
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.FileHandler("merge.log"), logging.StreamHandler()]
)

# --- NORMALIZATION FUNCTION ---
def normalize_text(text):
    """
    Cleans text for a robust comparison (lowercase, no punctuation).
    """
    if pd.isna(text):
        return ""
    text = str(text).lower()
    # Remove punctuation (keeps letters, numbers, and spaces)
    text = re.sub(r'[^\w\s]', '', text)
    # Squeeze multiple whitespace characters into one
    text = re.sub(r'\s+', ' ', text)
    return text.strip()
# ------------------------------------

# --- Main Functions ---

def load_main_metadata(filepath):
    """
    Loads the main metadata.csv file and returns a DataFrame
    and a Set of all *normalized* Kirundi transcriptions.
    """
    try:
        # Use 'python' engine and 'on_bad_lines' to handle ALL file errors
        main_df = pd.read_csv(filepath, engine='python', on_bad_lines='warn')
        
    except FileNotFoundError:
        logging.error(f"FATAL: Main metadata file not found at '{filepath}'")
        logging.error("Please make sure the path in the 'main()' function is correct.")
        return None, None
    except Exception as e:
        logging.error(f"FATAL: Could not read main metadata.csv. Error: {e}")
        return None, None

    # --- UPGRADED LOGIC ---
    # Create a new, temporary column with the normalized text
    main_df['normalized_kirundi'] = main_df['Kirundi_Transcription'].apply(normalize_text)
    
    # Create a set of all existing *normalized* Kirundi phrases for duplicate checking
    existing_kirundi_normalized = set(main_df['normalized_kirundi'].dropna())
    
    logging.info(f"Loaded {len(main_df)} rows and {len(existing_kirundi_normalized)} unique normalized Kirundi phrases from master file.")
    return main_df, existing_kirundi_normalized

def process_submissions(main_df, existing_kirundi_normalized, submissions_dir, processed_dir):
    """
    Scans the submissions directory and processes all contribution files.
    """
    submission_files = glob.glob(os.path.join(submissions_dir, '*.csv'))
    
    if not submission_files:
        logging.info(f"No new submission files found in '{submissions_dir}'")
        return main_df

    new_rows_list = []
    updated_count = 0
    new_count = 0
    new_row_index_counter = len(main_df) + 2 

    for filepath in submission_files:
        filename = os.path.basename(filepath)
        logging.info(f"Processing file: {filename}")

        try:
            sub_df = pd.read_csv(filepath, encoding='utf-8-sig')
            sub_df.columns = [col.strip() for col in sub_df.columns]

            # --- 1. Logic for "Medium Level" (French_To_Kirundi) ---
            # These files add BRAND NEW rows. They have 2 columns.
            if filename.startswith("French_To_Kirundi"):
                
                if "Kirundi_Transcription" not in sub_df.columns or "French_Translation" not in sub_df.columns:
                    logging.warning(f"SKIPPING: File {filename} has incorrect headers. Moving to processed.")
                    shutil.move(filepath, os.path.join(processed_dir, filename))
                    continue

                for index, row in sub_df.iterrows():
                    kirundi_raw = row['Kirundi_Transcription']
                    french = row['French_Translation']

                    if pd.isna(kirundi_raw) or pd.isna(french):
                        continue 

                    kirundi_normalized = normalize_text(kirundi_raw)

                    if kirundi_normalized and kirundi_normalized not in existing_kirundi_normalized:
                        new_row = {
                            'file_path': '',
                            'Kirundi_Transcription': kirundi_raw.strip(), # Save the *original* raw text
                            'French_Translation': french.strip(),
                            'speaker_id': '',
                            'Age': '',
                            'Gender': ''
                        }
                        new_rows_list.append(new_row)
                        existing_kirundi_normalized.add(kirundi_normalized) # Add normalized to set
                        logging.info(f"ADDING new row {new_row_index_counter}: '{kirundi_raw.strip()}'")
                        new_row_index_counter += 1
                        new_count += 1
                    else:
                        logging.warning(f"DUPLICATE (skipping): '{kirundi_raw}' from {filename} already exists in master.")
            
            # --- 2. Logic for "Easy Level" (Kirundi_To_French) ---
            # These files UPDATE existing rows. They have 3 columns.
            elif filename.startswith("Kirundi_To_French"):
                
                if "Corrected_Kirundi" not in sub_df.columns or "Original_Kirundi" not in sub_df.columns:
                    logging.warning(f"SKIPPING: File {filename} is an old version or has incorrect headers. Moving to processed.")
                    shutil.move(filepath, os.path.join(processed_dir, filename))
                    continue

                for index, row in sub_df.iterrows():
                    # Get all 3 columns.
                    original_kirundi_raw = row['Original_Kirundi']
                    corrected_kirundi_raw = row['Corrected_Kirundi']
                    french = row['French_Translation']

                    if pd.isna(corrected_kirundi_raw) or pd.isna(french):
                        continue 
                    
                    original_normalized = normalize_text(original_kirundi_raw)
                    
                    # --- NEW, MORE DETAILED LOGIC ---
                    
                    # 1. First, find all rows that match the original Kirundi text
                    kirundi_mask = (main_df['normalized_kirundi'] == original_normalized)
                    
                    if not kirundi_mask.any():
                        # Case 1: Kirundi text not found in master file.
                        logging.warning(f"SKIPPING: Original text '{original_kirundi_raw}' from {filename} no longer exists in master file.")
                        continue # Go to the next row in the submission file

                    # 2. If we're here, text was found. Now, check if it needs translation.
                    translation_mask = (main_df['French_Translation'].isna())
                    final_mask = kirundi_mask & translation_mask

                    if final_mask.any():
                        # Case 2: Match found, and it needs translation. (The "good" path)
                        indices_to_update = main_df.index[final_mask]
                        for idx in indices_to_update:
                            
                            original_from_master = main_df.loc[idx, 'Kirundi_Transcription']
                            corrected_from_sub = corrected_kirundi_raw.strip()
                            french_from_sub = french.strip()

                            # Update BOTH the Kirundi text and the French translation
                            main_df.loc[idx, 'Kirundi_Transcription'] = corrected_from_sub
                            main_df.loc[idx, 'French_Translation'] = french_from_sub
                            main_df.loc[idx, 'normalized_kirundi'] = normalize_text(corrected_from_sub)
                            
                            logging.info(f"UPDATED row {idx + 2}:")
                            if normalize_text(original_from_master) != normalize_text(corrected_from_sub):
                                logging.info(f"  -> OLD text:    '{original_from_master}'")
                                logging.info(f"  -> NEW text:    '{corrected_from_sub}'")
                            else:
                                logging.info(f"  -> Text:        '{original_from_master}' (unchanged)")
                            logging.info(f"  -> Added French:  '{french_from_sub}'")
                            
                            updated_count += 1
                    else:
                        # Case 3: Match found, but it's *already translated*.
                        # This is the new log you wanted.
                        matched_indices = main_df.index[kirundi_mask].tolist()
                        matched_rows = [str(i + 2) for i in matched_indices] # Add 2 for 1-based CSV line number
                        logging.warning(f"SKIPPING: Original text '{original_kirundi_raw}' from {filename} is already translated in master file at row(s): {', '.join(matched_rows)}")
                    
                    # --- END OF NEW LOGIC ---

            # --- 3. Move the processed file ---
            shutil.move(filepath, os.path.join(processed_dir, filename))

        except Exception as e:
            logging.error(f"Failed to process {filename}. Error: {e}. Moving to processed.")
            try:
                shutil.move(filepath, os.path.join(processed_dir, filename))
            except Exception as move_e:
                logging.error(f"FATAL: Could not move {filename}. Error: {move_e}")
                
    # --- 4. Add all new rows to the main DataFrame ---
    if new_rows_list:
        new_rows_df = pd.DataFrame(new_rows_list, columns=main_df.columns)
        main_df = pd.concat([main_df, new_rows_df], ignore_index=True)

    # --- 5. Clean up ---
    if 'normalized_kirundi' in main_df.columns:
        main_df = main_df.drop(columns=['normalized_kirundi'])

    logging.info(f"--- Merge Complete ---")
    logging.info(f"Updated {updated_count} existing rows (corrections/translations).")
    logging.info(f"Added {new_count} new sentences.")
    
    return main_df

def main():
    base_dir = os.path.abspath(os.path.dirname(__file__))
    
    # --- ‼️ YOU MUST EDIT THIS LINE ‼️ ---
    # Put the full path to your metadata.csv file here.
    main_metadata_path = "../Kirundi_Dataset/metadata.csv"
    # --- ‼️ --------------------------- ‼️ ---

    submissions_path = os.path.join(base_dir, 'submissions')
    processed_path = os.path.join(base_dir, 'processed_submissions')

    if not os.path.exists(submissions_path):
        os.makedirs(submissions_path)
        logging.info(f"Created submissions directory at: {submissions_path}")
        logging.info("Please add your contributor CSV files to this folder and run again.")
        return
    if not os.path.exists(processed_path):
        os.makedirs(processed_path)
        logging.info(f"Created processed_submissions directory at: {processed_path}")

    main_df, existing_kirundi_normalized = load_main_metadata(main_metadata_path)
    
    if main_df is None:
        return

    final_df = process_submissions(main_df, existing_kirundi_normalized, submissions_path, processed_path)

    try:
        final_df.to_csv(main_metadata_path, index=False)
        logging.info(f"SUCCESS! Your main file '{main_metadata_path}' has been saved.")
    except Exception as e:
        logging.error(f"FATAL: Could not save the final metadata file. Error: {e}")

if __name__ == "__main__":
    main()