// Kirundi Contribution App - JavaScript Logic
// Global variables
let phrasesToTranslate = [];
let userTranslations = [];
let userNewSentences = [];
let userHardSentences = [];
let progress = 0;
let mediumProgress = 0;
const batchSize = 20;

// Medium Level variables
let frenchPrompts = [];
let existingKirundiPhrases = new Set();
let userMediumTranslations = [];

// LocalStorage keys
const SUBMITTED_PHRASES_KEY = 'mySubmittedPhrases';
const SUBMITTED_FRENCH_PHRASES_KEY = 'submittedFrenchPhrases';

/**
 * LocalStorage Logic for Easy Mode:
 * 
 * PROBLEM: Users would see the same sentences again if they played before their translations were merged.
 * 
 * SOLUTION: Track submitted phrases in browser localStorage
 * 
 * WORKFLOW:
 * 1. When user downloads translations (downloadTranslations()):
 *    - Extract Kirundi phrases from userTranslations array
 *    - Save them to localStorage under 'mySubmittedPhrases' key
 * 
 * 2. When user starts Easy Mode (initEasyMode() -> loadTranslationData()):
 *    - Load submitted phrases from localStorage
 *    - Filter phrasesToTranslate array to exclude already submitted phrases
 *    - User only sees new, unsubmitted phrases
 * 
 * DEBUG FUNCTIONS:
 * - getSubmittedPhrasesCount(): Shows how many phrases user has submitted
 * - clearSubmittedPhrases(): Resets localStorage (for testing)
 */

// LocalStorage helper functions
function getSubmittedPhrases() {
    try {
        const stored = localStorage.getItem(SUBMITTED_PHRASES_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.error('Error loading submitted phrases from localStorage:', error);
        return [];
    }
}

function saveSubmittedPhrases(newPhrases) {
    try {
        // Get existing submitted phrases
        const existingPhrases = getSubmittedPhrases();
        
        // Add new phrases to the list (avoid duplicates)
        const allPhrases = [...existingPhrases];
        newPhrases.forEach(phrase => {
            if (!allPhrases.includes(phrase)) {
                allPhrases.push(phrase);
            }
        });
        
        // Save back to localStorage
        localStorage.setItem(SUBMITTED_PHRASES_KEY, JSON.stringify(allPhrases));
        console.log(`Saved ${newPhrases.length} new phrases to localStorage. Total: ${allPhrases.length}`);
        
        return allPhrases;
    } catch (error) {
        console.error('Error saving submitted phrases to localStorage:', error);
        return [];
    }
}

// Debug function to clear submitted phrases (for testing/reset)
function clearSubmittedPhrases() {
    try {
        localStorage.removeItem(SUBMITTED_PHRASES_KEY);
        console.log('Cleared all submitted phrases from localStorage');
        return true;
    } catch (error) {
        console.error('Error clearing submitted phrases:', error);
        return false;
    }
}

// Debug function to show submitted phrases count
function getSubmittedPhrasesCount() {
    const phrases = getSubmittedPhrases();
    console.log(`You have submitted ${phrases.length} phrases so far`);
    return phrases.length;
}

// LocalStorage helper functions for French phrases (Medium Level)
function getSubmittedFrenchPhrases() {
    try {
        const stored = localStorage.getItem(SUBMITTED_FRENCH_PHRASES_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.error('Error loading submitted French phrases from localStorage:', error);
        return [];
    }
}

function saveSubmittedFrenchPhrases(newFrenchPhrases) {
    try {
        // Get existing submitted French phrases
        const existingPhrases = getSubmittedFrenchPhrases();
        
        // Add new phrases to the list (avoid duplicates)
        const allPhrases = [...existingPhrases];
        newFrenchPhrases.forEach(phrase => {
            if (!allPhrases.includes(phrase)) {
                allPhrases.push(phrase);
            }
        });
        
        // Save back to localStorage
        localStorage.setItem(SUBMITTED_FRENCH_PHRASES_KEY, JSON.stringify(allPhrases));
        console.log(`Saved ${newFrenchPhrases.length} new French phrases to localStorage. Total: ${allPhrases.length}`);
        
        return allPhrases;
    } catch (error) {
        console.error('Error saving submitted French phrases to localStorage:', error);
        return [];
    }
}

// Utility function to show/hide elements
function showElement(id) {
    document.getElementById(id).classList.remove('hidden');
}

function hideElement(id) {
    document.getElementById(id).classList.add('hidden');
}

// Main menu functions
function showComingSoon() {
    alert('Hard Level is coming soon! Turiko turabitegura.');
}

function backToMainMenu() {
    // Hide all mode UIs
    hideElement('easy-mode');
    hideElement('medium-mode');
    hideElement('hard-mode');
    
    // Show main menu
    showElement('main-menu');
    
    // Reset states
    resetEasyMode();
    resetMediumMode();
    resetHardMode();
}

// Easy Mode Functions
async function initEasyMode() {
    hideElement('main-menu');
    showElement('easy-mode');
    showElement('loading-easy');
    hideElement('game-ui');
    hideElement('completion-ui');

    try {
        // Show user's progress
        const submittedCount = getSubmittedPhrasesCount();
        if (submittedCount > 0) {
            console.log(`Welcome back! You have already submitted ${submittedCount} phrases.`);
        }
        
        // Load and process data
        await loadTranslationData();
        
        // Initialize game state
        progress = 0;
        userTranslations = [];
        
        // Start the game
        hideElement('loading-easy');
        showElement('game-ui');
        showNextEasyPhrase();
        
    } catch (error) {
        console.error('Error loading data:', error);
        alert('Error loading live translation data from Hugging Face. Please check your internet connection and try again.');
        backToMainMenu();
    }
}

async function loadTranslationData() {
    try {
        // Fetch live data from Hugging Face dataset
        const huggingFaceUrl = 'https://huggingface.co/datasets/samandari/Kirundi_Open_Speech_Dataset/raw/main/metadata.csv';
        console.log('Fetching live data from Hugging Face...');
        
        const response = await fetch(huggingFaceUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
        }
        
        const csvText = await response.text();
        console.log('Successfully fetched live dataset');
        
        // Parse CSV to find untranslated rows
        phrasesToTranslate = parseUntranslatedRows(csvText);
        
        // Filter out already submitted phrases
        const submittedPhrases = getSubmittedPhrases();
        const originalCount = phrasesToTranslate.length;
        phrasesToTranslate = phrasesToTranslate.filter(phrase => !submittedPhrases.includes(phrase));
        
        console.log(`Found ${originalCount} untranslated phrases, ${originalCount - phrasesToTranslate.length} already submitted`);
        console.log(`${phrasesToTranslate.length} new phrases available for translation`);
        
        // Shuffle the array for variety
        shuffleArray(phrasesToTranslate);
        
        if (phrasesToTranslate.length === 0) {
            throw new Error('No new untranslated phrases found - you have already submitted all available phrases!');
        }
        
    } catch (error) {
        console.error('Error loading live data:', error);
        // Fallback to sample data for demo/offline use
        console.warn('Using sample data for demonstration');
        phrasesToTranslate = [
            "Muraho, amakuru?",
            "Ndagukunda cyane.",
            "Ubu ni ukwezi gute?",
            "Ndashaka kurya ibiryo.",
            "Ejo hazaza imvura.",
            "Tugende ku isoko.",
            "Ni ukwezi kwa kane.",
            "Ndashaka amazi.",
            "Uyu munsi ni mwiza.",
            "Ndagiye ku kazi.",
            "Ubu ni saa zingahe?",
            "Ndashaka gusinzira.",
            "Tugende mu ishuri.",
            "Ni iyihe tariki?",
            "Ndashaka kuvuga n'umunyeshuri.",
            "Uyu mwaka ni mwiza.",
            "Ndagiye mu bitaro.",
            "Tugende ku cyumba.",
            "Ni ryari tuzongera kubonana?",
            "Ndashaka kwiga Igifaransa."
        ];
        
        // Filter out already submitted phrases from sample data too
        const submittedPhrases = getSubmittedPhrases();
        const originalCount = phrasesToTranslate.length;
        phrasesToTranslate = phrasesToTranslate.filter(phrase => !submittedPhrases.includes(phrase));
        
        console.log(`Sample data: ${originalCount} phrases, ${originalCount - phrasesToTranslate.length} already submitted`);
        console.log(`${phrasesToTranslate.length} new sample phrases available for translation`);
        
        shuffleArray(phrasesToTranslate);
        
        if (phrasesToTranslate.length === 0) {
            console.warn('All sample phrases have been submitted. Please check your internet connection to load new phrases.');
        }
    }
}

function parseUntranslatedRows(csvText) {
    const lines = csvText.split('\n');
    if (lines.length === 0) return [];
    
    // Parse header to find column indices
    const headers = parseCSVLine(lines[0]);
    const kirundiIndex = headers.findIndex(h => 
        h.trim().toLowerCase().includes('kirundi') && 
        h.trim().toLowerCase().includes('transcription')
    );
    const frenchIndex = headers.findIndex(h => 
        h.trim().toLowerCase().includes('french') && 
        h.trim().toLowerCase().includes('translation')
    );
    
    if (kirundiIndex === -1) {
        console.error('Could not find kirundi_transcription column');
        return [];
    }
    
    if (frenchIndex === -1) {
        console.error('Could not find french_translation column');
        return [];
    }
    
    console.log(`Found columns: kirundi at index ${kirundiIndex}, french at index ${frenchIndex}`);
    
    const untranslatedPhrases = [];
    
    // Process each data row
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const columns = parseCSVLine(line);
        
        // Check if we have enough columns
        if (columns.length <= Math.max(kirundiIndex, frenchIndex)) continue;
        
        const kirundiText = columns[kirundiIndex]?.trim();
        const frenchText = columns[frenchIndex]?.trim();
        
        // Find rows where kirundi has text but french is empty
        if (kirundiText && kirundiText.length > 0 && (!frenchText || frenchText.length === 0)) {
            untranslatedPhrases.push(kirundiText);
        }
    }
    
    return untranslatedPhrases;
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                // Escaped quote
                current += '"';
                i++; // Skip next quote
            } else {
                // Toggle quote state
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            // End of field
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    
    // Add the last field
    result.push(current);
    
    return result;
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function showNextEasyPhrase() {
    if (progress >= Math.min(batchSize, phrasesToTranslate.length)) {
        showCompletion();
        return;
    }

    // Update progress
    updateProgress();
    
    // Show current phrase
    document.getElementById('kirundi-phrase').textContent = phrasesToTranslate[progress];
    
    // Clear input
    document.getElementById('french-input').value = '';
    document.getElementById('french-input').focus();
    
    // Hide error message
    hideElement('error-message');
}

function updateProgress() {
    const progressPercent = (progress / Math.min(batchSize, phrasesToTranslate.length)) * 100;
    document.getElementById('progress-bar').style.width = progressPercent + '%';
    document.getElementById('progress-text').textContent = `${progress} / ${Math.min(batchSize, phrasesToTranslate.length)}`;
}

function nextEasyPhrase() {
    const frenchInput = document.getElementById('french-input').value.trim();
    
    if (!frenchInput) {
        showElement('error-message');
        return;
    }

    // Add translation to array
    userTranslations.push({
        kirundi: phrasesToTranslate[progress],
        french: frenchInput
    });

    progress++;
    showNextEasyPhrase();
}

function skipEasyPhrase() {
    // Simply move to the next phrase without saving anything
    progress++;
    showNextEasyPhrase();
    
    // Hide any error messages
    hideElement('error-message');
    
    console.log(`Skipped phrase: "${phrasesToTranslate[progress - 1]}"`);
}

function showCompletion() {
    hideElement('game-ui');
    showElement('completion-ui');
}

function resetEasyMode() {
    progress = 0;
    userTranslations = [];
    hideElement('error-message');
    hideElement('whatsapp-section');
    document.getElementById('french-input').value = '';
}

// Medium Mode Functions (French to Kirundi Translation)
async function initMediumMode() {
    hideElement('main-menu');
    showElement('medium-mode');
    showElement('loading-medium');
    hideElement('medium-game-ui');
    hideElement('medium-completion-ui');

    try {
        // Show user's progress for French phrases
        const submittedFrenchCount = getSubmittedFrenchPhrases().length;
        if (submittedFrenchCount > 0) {
            console.log(`Welcome back! You have already submitted ${submittedFrenchCount} French translations.`);
        }

        // Load data in parallel
        await loadMediumData();

        // Initialize game state
        mediumProgress = 0;
        userMediumTranslations = [];

        // Start the game
        hideElement('loading-medium');
        showElement('medium-game-ui');
        showNextFrenchSentence();

    } catch (error) {
        console.error('Error initializing Medium Mode:', error);
        alert('Error loading Medium Mode. Please try again.');
        backToMainMenu();
    }
}

async function loadMediumData() {
    try {
        // Try to load French prompts from file, with fallback to embedded data
        let frenchPromptsLoaded = false;
        
        try {
            const frenchResponse = await fetch('./french_prompts.txt');
            if (frenchResponse.ok) {
                const frenchText = await frenchResponse.text();
                frenchPrompts = frenchText.split('\n').filter(line => line.trim() !== '');
                console.log(`Loaded ${frenchPrompts.length} French prompts from file`);
                frenchPromptsLoaded = true;
            }
        } catch (fileError) {
            console.warn('Could not load french_prompts.txt (CORS/file access issue), using fallback data');
        }
        
        // Fallback French prompts if file loading failed
        if (!frenchPromptsLoaded) {
            frenchPrompts = [
                "Bonjour, comment allez-vous?",
                "Je vous aime beaucoup.",
                "Quel mois sommes-nous?",
                "Je veux manger de la nourriture.",
                "Il va pleuvoir demain.",
                "Allons au marché.",
                "Nous sommes en avril.",
                "Je veux de l'eau.",
                "Cette journée est belle.",
                "Je vais au travail.",
                "Quelle heure est-il?",
                "Je veux dormir.",
                "Allons à l'école.",
                "Quelle est la date?",
                "Je veux parler avec l'étudiant.",
                "Cette année est belle.",
                "Je vais à l'hôpital.",
                "Allons dans la chambre.",
                "Quand nous reverrons-nous?",
                "Je veux apprendre le français.",
                "La maison est grande.",
                "Mon frère est intelligent.",
                "Elle cuisine très bien.",
                "Les enfants jouent dehors.",
                "Le soleil brille aujourd'hui.",
                "J'ai faim maintenant.",
                "Nous devons partir tôt.",
                "Il fait froid ce matin.",
                "Ma sœur étudie beaucoup.",
                "Le livre est sur la table.",
                "Je cherche mes clés.",
                "L'eau est très propre.",
                "Nous aimons la musique.",
                "Il travaille dans un bureau.",
                "Elle porte une robe rouge.",
                "Les oiseaux chantent bien.",
                "Je bois du thé chaud.",
                "Nous regardons la télévision.",
                "Il pleut très fort.",
                "Ma mère prépare le dîner.",
                "Les fleurs sont belles.",
                "Je lis un bon livre.",
                "Nous marchons lentement.",
                "Il conduit une voiture.",
                "Elle écrit une lettre.",
                "Les étoiles brillent la nuit.",
                "Je nettoie ma chambre.",
                "Nous plantons des arbres.",
                "Il répare la bicyclette.",
                "Elle chante une chanson."
            ];
            console.log(`Using ${frenchPrompts.length} fallback French prompts`);
        }
        
        // Load remote Kirundi data for duplicate checking
        try {
            const metadataResponse = await fetch('https://huggingface.co/datasets/samandari/Kirundi_Open_Speech_Dataset/raw/main/metadata.csv');
            
            if (metadataResponse.ok) {
                const csvText = await metadataResponse.text();
                existingKirundiPhrases = new Set();
                const lines = csvText.split('\n');
                
                if (lines.length > 1) {
                    // Parse header to find kirundi_transcription column
                    const headers = parseCSVLine(lines[0]);
                    const kirundiIndex = headers.findIndex(h => 
                        h.toLowerCase().includes('kirundi') && h.toLowerCase().includes('transcription')
                    );
                    
                    if (kirundiIndex !== -1) {
                        // Extract all Kirundi transcriptions
                        for (let i = 1; i < lines.length; i++) {
                            if (lines[i].trim()) {
                                const row = parseCSVLine(lines[i]);
                                if (row[kirundiIndex] && row[kirundiIndex].trim()) {
                                    existingKirundiPhrases.add(row[kirundiIndex].trim());
                                }
                            }
                        }
                    }
                }
                console.log(`Loaded ${existingKirundiPhrases.size} existing Kirundi phrases for duplicate checking`);
            } else {
                throw new Error(`Failed to fetch metadata: ${metadataResponse.status}`);
            }
        } catch (metadataError) {
            console.warn('Could not load remote Kirundi data for duplicate checking:', metadataError);
            console.warn('Duplicate checking will be disabled for this session');
            existingKirundiPhrases = new Set(); // Empty set, no duplicate checking
        }
        
        // Filter French prompts to exclude already submitted ones
        const submittedFrenchPhrases = getSubmittedFrenchPhrases();
        const originalCount = frenchPrompts.length;
        frenchPrompts = frenchPrompts.filter(phrase => !submittedFrenchPhrases.includes(phrase));
        
        console.log(`French prompts: ${originalCount} total, ${originalCount - frenchPrompts.length} already submitted`);
        console.log(`${frenchPrompts.length} new French prompts available for translation`);
        
        // Shuffle for variety
        shuffleArray(frenchPrompts);
        
        if (frenchPrompts.length === 0) {
            throw new Error('No new French prompts available - you have already submitted all available phrases!');
        }
        
    } catch (error) {
        console.error('Error loading Medium Mode data:', error);
        throw error;
    }
}

function showNextFrenchSentence() {
    if (mediumProgress >= batchSize || mediumProgress >= frenchPrompts.length) {
        completeMediumMode();
        return;
    }

    const currentFrench = frenchPrompts[mediumProgress];
    document.getElementById('french-sentence').textContent = currentFrench;
    document.getElementById('kirundi-translation').value = '';

    // Update progress
    updateMediumProgress();

    // Hide messages
    hideElement('medium-error-message');
    hideElement('medium-success-message');
}

function submitMediumTranslation() {
    const kirundiTranslation = document.getElementById('kirundi-translation').value.trim();

    if (!kirundiTranslation) {
        showMediumError('Please enter a Kirundi translation.');
        return;
    }

    // Critical: Check for duplicates against existing database (if available)
    if (existingKirundiPhrases.size > 0 && existingKirundiPhrases.has(kirundiTranslation)) {
        showMediumError('This Kirundi translation is already in our database! Thank you!');
        return;
    }

    // Add the translation
    const currentFrench = frenchPrompts[mediumProgress];
    userMediumTranslations.push({
        french: currentFrench,
        kirundi: kirundiTranslation
    });

    // Show success message
    showElement('medium-success-message');
    setTimeout(() => hideElement('medium-success-message'), 1500);

    // Move to next
    mediumProgress++;
    setTimeout(() => showNextFrenchSentence(), 1000);
}

function skipMediumSentence() {
    mediumProgress++;
    showNextFrenchSentence();
}

function updateMediumProgress() {
    const progressPercent = (mediumProgress / batchSize) * 100;
    document.getElementById('medium-progress-bar').style.width = `${progressPercent}%`;
    document.getElementById('medium-progress-text').textContent = `${mediumProgress} / ${batchSize}`;
}

function completeMediumMode() {
    hideElement('medium-game-ui');
    showElement('medium-completion-ui');
}

function showMediumError(message) {
    const errorElement = document.getElementById('medium-error-message');
    errorElement.textContent = message;
    showElement('medium-error-message');

    // Hide after 5 seconds
    setTimeout(() => hideElement('medium-error-message'), 5000);
}

function resetMediumMode() {
    mediumProgress = 0;
    userMediumTranslations = [];
    frenchPrompts = [];
    existingKirundiPhrases = new Set();
    hideElement('medium-error-message');
    hideElement('medium-success-message');
    hideElement('whatsapp-section-medium');
    document.getElementById('kirundi-translation').value = '';
}

// Download Functions
function downloadCSV(dataArray, filename) {
    if (dataArray.length === 0) {
        alert('No data to download!');
        return;
    }

    // Create CSV content
    let csvContent = 'Kirundi_Transcription,French_Translation\n';
    
    dataArray.forEach(item => {
        // Escape quotes and wrap in quotes if necessary
        const kirundi = `"${item.kirundi.replace(/"/g, '""')}"`;
        const french = `"${item.french.replace(/"/g, '""')}"`;
        csvContent += `${kirundi},${french}\n`;
    });

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

function downloadTranslations() {
    downloadCSV(userTranslations, 'Kirundi_To_French.csv');
    
    // Save submitted Kirundi phrases to localStorage to prevent re-showing them
    const submittedKirundiPhrases = userTranslations.map(translation => translation.kirundi);
    saveSubmittedPhrases(submittedKirundiPhrases);
    
    // Show WhatsApp share section after download
    setTimeout(() => {
        showElement('whatsapp-section');
    }, 1000); // Small delay to let download complete
}

function downloadMediumTranslations() {
    // Create CSV content with French and Kirundi columns
    if (userMediumTranslations.length === 0) {
        alert('No translations to download!');
        return;
    }

    let csvContent = 'Kirundi_Transcription,French_Translation\n';
    
    userMediumTranslations.forEach(item => {
        // Escape quotes and wrap in quotes if necessary
        const kirundi = `"${item.kirundi.replace(/"/g, '""')}"`;
        const french = `"${item.french.replace(/"/g, '""')}"`;
        csvContent += `${kirundi},${french}\n`;
    });

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'French_To_Kirundi.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    // Save submitted French phrases to localStorage to prevent re-showing them
    const submittedFrenchPhrases = userMediumTranslations.map(translation => translation.french);
    saveSubmittedFrenchPhrases(submittedFrenchPhrases);
    
    // Show WhatsApp share section after download
    setTimeout(() => {
        showElement('whatsapp-section-medium');
    }, 1000); // Small delay to let download complete
}

function downloadHardSentences() {
    downloadCSV(userHardSentences, 'my_new_sentences.csv');
    
    // Show WhatsApp share section after download
    setTimeout(() => {
        showElement('whatsapp-section-hard');
    }, 1000); // Small delay to let download complete
}

function shareToWhatsApp() {
    const phoneNumber = '25777568903'; // WhatsApp number without + sign
    const translationCount = userTranslations.length;
    
    // Create a simple short message
    const message = `Hi! I completed ${translationCount} Kirundi translations. Sending CSV file now 📎`;

    // Encode the message for URL
    const encodedMessage = encodeURIComponent(message);
    
    // Create WhatsApp URL
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
    
    // Open WhatsApp in a new tab/window
    window.open(whatsappUrl, '_blank');
    
    console.log(`Opening WhatsApp to send ${translationCount} translations to +${phoneNumber}`);
}

function shareMediumToWhatsApp() {
    const phoneNumber = '25777568903'; // WhatsApp number without + sign
    const translationCount = userMediumTranslations.length;
    
    // Create a simple short message for French to Kirundi translations
    const message = `Hi! I completed ${translationCount} French to Kirundi translations. Sending CSV file now 📎`;

    // Encode the message for URL
    const encodedMessage = encodeURIComponent(message);
    
    // Create WhatsApp URL
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
    
    // Open WhatsApp in a new tab/window
    window.open(whatsappUrl, '_blank');
    
    console.log(`Opening WhatsApp to send ${translationCount} French to Kirundi translations to +${phoneNumber}`);
}

function shareHardSentencesToWhatsApp() {
    const phoneNumber = '25777568903'; // WhatsApp number without + sign
    const sentenceCount = userHardSentences.length;
    
    // Create a simple short message for new sentences
    const message = `Hi! I created ${sentenceCount} new Kirundi sentences. Sending CSV file now 📎`;

    // Encode the message for URL
    const encodedMessage = encodeURIComponent(message);
    
    // Create WhatsApp URL
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
    
    // Open WhatsApp in a new tab/window
    window.open(whatsappUrl, '_blank');
    
    console.log(`Opening WhatsApp to send ${sentenceCount} new sentences to +${phoneNumber}`);
}

// Hard Mode Functions (Add New Sentences)
function initHardMode() {
    hideElement('main-menu');
    showElement('hard-mode');
    resetHardMode();
}

function addHardSentence() {
    const kirundiText = document.getElementById('hard-new-kirundi').value.trim();
    const frenchText = document.getElementById('hard-new-french').value.trim();
    
    // Validation
    if (!kirundiText || !frenchText) {
        showHardError('Both Kirundi and French fields must be filled.');
        return;
    }
    
    const wordCount = kirundiText.split(/\s+/).length;
    if (wordCount < 4) {
        showHardError('Kirundi sentence must contain at least 4 words.');
        return;
    }
    
    // Add to array
    userHardSentences.push({
        kirundi: kirundiText,
        french: frenchText
    });
    
    // Clear inputs
    document.getElementById('hard-new-kirundi').value = '';
    document.getElementById('hard-new-french').value = '';
    
    // Update UI
    updateHardSentenceCounter();
    document.getElementById('download-hard-sentences').disabled = false;
    
    // Show success message
    showElement('hard-success-message');
    setTimeout(() => hideElement('hard-success-message'), 3000);
    
    // Hide error message if visible
    hideElement('hard-error-message');
}

function showHardError(message) {
    const errorElement = document.getElementById('hard-error-message');
    errorElement.textContent = message;
    showElement('hard-error-message');
    
    // Hide after 5 seconds
    setTimeout(() => hideElement('hard-error-message'), 5000);
}

function updateHardSentenceCounter() {
    document.getElementById('sentence-counter').textContent = 
        `You have added ${userHardSentences.length} sentence${userHardSentences.length !== 1 ? 's' : ''}.`;
}

function resetHardMode() {
    userHardSentences = [];
    document.getElementById('hard-new-kirundi').value = '';
    document.getElementById('hard-new-french').value = '';
    document.getElementById('download-hard-sentences').disabled = true;
    updateHardSentenceCounter();
    hideElement('hard-error-message');
    hideElement('hard-success-message');
    hideElement('whatsapp-section-hard');
}

// Keyboard shortcuts
document.addEventListener('keydown', function(event) {
    // Easy mode shortcuts
    if (!document.getElementById('easy-mode').classList.contains('hidden')) {
        if (event.key === 'Enter' && event.ctrlKey) {
            nextEasyPhrase();
        } else if (event.key === 'Escape') {
            skipEasyPhrase();
        }
    }
    
    // Medium mode shortcuts (French to Kirundi)
    if (!document.getElementById('medium-mode').classList.contains('hidden')) {
        if (event.key === 'Enter' && event.ctrlKey) {
            submitMediumTranslation();
        } else if (event.key === 'Escape') {
            skipMediumSentence();
        }
    }
    
    // Hard mode shortcuts (Add new sentences)
    if (!document.getElementById('hard-mode').classList.contains('hidden')) {
        if (event.key === 'Enter' && event.ctrlKey) {
            addHardSentence();
        }
    }
});

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    // App is ready
    console.log('Kirundi Contribution App loaded successfully!');
});
