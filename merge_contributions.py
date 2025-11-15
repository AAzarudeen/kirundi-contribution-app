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

# --- NEW NORMALIZATION FUNCTION ---
def normalize_text(text):
    """
    Cleans text for a robust comparison.
    1. Converts to lowercase.
    2. Removes all punctuation and special characters.
    3. Trims whitespace from ends.
    4. Squeezes multiple spaces down to one.
    """
    if pd.isna(text):
        return ""
    text = str(text).lower()
    # Remove punctuation (keeps letters, numbers, and spaces)
    # This regex is broad and removes quotes, commas, periods, etc.
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

            if "Kirundi_Transcription" not in sub_df.columns or "French_Translation" not in sub_df.columns:
                logging.warning(f"SKIPPING: File {filename} has incorrect headers. Moving to processed.")
                shutil.move(filepath, os.path.join(processed_dir, filename))
                continue

            # --- 1. Logic for "Medium Level" (French_To_Kirundi) ---
            if filename.startswith("French_To_Kirundi"):
                for index, row in sub_df.iterrows():
                    kirundi_raw = row['Kirundi_Transcription']
                    french = row['French_Translation']

                    if pd.isna(kirundi_raw) or pd.isna(french):
                        continue 

                    # --- UPGRADED LOGIC ---
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
            elif filename.startswith("Kirundi_To_French"):
                for index, row in sub_df.iterrows():
                    kirundi_raw = row['Kirundi_Transcription']
                    french = row['French_Translation']

                    if pd.isna(kirundi_raw) or pd.isna(french):
                        continue 
                    
                    # --- UPGRADED LOGIC ---
                    kirundi_normalized = normalize_text(kirundi_raw)
                    
                    # Find the row in the *main* dataframe to update
                    # by matching the *normalized* text
                    mask = (
                        (main_df['normalized_kirundi'] == kirundi_normalized) &
                        (main_df['French_Translation'].isna())
                    )
                    
                    if mask.any():
                        indices_to_update = main_df.index[mask]
                        for idx in indices_to_update:
                            main_df.loc[idx, 'French_Translation'] = french.strip()
                            # Get the original (non-normalized) text for the log
                            original_text = main_df.loc[idx, 'Kirundi_Transcription']
                            logging.info(f"UPDATED row {idx + 2}: Set translation for '{original_text}'")
                            updated_count += 1
                    else:
                        logging.warning(f"SKIPPING: '{kirundi_raw}' from {filename} is already translated or doesn't exist.")

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
    # Drop the temporary 'normalized_kirundi' column before saving
    if 'normalized_kirundi' in main_df.columns:
        main_df = main_df.drop(columns=['normalized_kirundi'])

    logging.info(f"--- Merge Complete ---")
    logging.info(f"Updated {updated_count} existing translations.")
    logging.info(f"Added {new_count} new sentences.")
    
    return main_df

def main():
    # --- Setup ---
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