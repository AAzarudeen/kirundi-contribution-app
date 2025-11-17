// Kirundi Contribution App - JavaScript Logic
// Global variables
let phrasesToTranslate = [];
let userTranslations = [];
let userNewSentences = [];
let userHardSentences = [];
let progress = 0;
let mediumProgress = 0;
const batchSize = 20;

// Language toggle variables
let currentLanguage = 'en'; // Default to English

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

        // Do NOT use any fallback demo data.
        // Instead, show a friendly, bilingual error UI and prevent the game from starting.
        phrasesToTranslate = [];

        // Hide loading spinner and game UI if visible
        hideElement('loading-easy');
        hideElement('game-ui');

        // Show dedicated Easy Level error container if it exists
        const easyError = document.getElementById('easy-error');
        if (easyError) {
            // Always hide completion UI if showing error
            const completionUI = document.getElementById('completion-ui');
            if (completionUI) completionUI.classList.add('hidden');
            easyError.classList.remove('hidden');
        } else {
            // Fallback: simple alert if the container is missing
            const isFrench = (typeof currentLanguage !== 'undefined' && currentLanguage === 'fr');
            const message = isFrench
                ? "Erreur lors du chargement des données en direct depuis Hugging Face. Veuillez vérifier votre connexion Internet, puis réessayer depuis le menu principal."
                : "Error loading live data from Hugging Face. Please check your internet connection, then try again from the main menu.";
            alert(message);
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
    
    // Reset correction box for new phrase
    resetCorrectionBox();
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

    // Get original and corrected Kirundi
    const originalKirundi = phrasesToTranslate[progress];
    const correctionBox = document.getElementById('correction-box');
    const correctedKirundi = correctionBox.value.trim() || originalKirundi; // Use correction if available, otherwise original
    
    // Add translation to array with three pieces of information
    userTranslations.push({
        original_kirundi: originalKirundi,
        corrected_kirundi: correctedKirundi,
        french_translation: frenchInput
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
    resetCorrectionBox();
}

// Toggle correction box visibility
function toggleCorrectionBox() {
    const correctionContainer = document.getElementById('correction-container');
    const correctionBox = document.getElementById('correction-box');
    const currentPhrase = document.getElementById('kirundi-phrase').textContent;
    
    if (correctionContainer.classList.contains('hidden')) {
        // Show correction box
        correctionContainer.classList.remove('hidden');
        correctionBox.value = currentPhrase; // Pre-fill with original phrase
        correctionBox.focus();
        
        // Update button text
        const reportText = document.getElementById('report-problem-text');
        if (currentLanguage === 'fr') {
            reportText.textContent = 'Annuler la correction';
        } else {
            reportText.textContent = 'Cancel correction';
        }
    } else {
        // Hide correction box
        correctionContainer.classList.add('hidden');
        
        // Reset button text
        const reportText = document.getElementById('report-problem-text');
        if (currentLanguage === 'fr') {
            reportText.textContent = 'Signaler un problème';
        } else {
            reportText.textContent = 'Report a problem';
        }
    }
}

// Reset correction box when moving to next phrase
function resetCorrectionBox() {
    const correctionContainer = document.getElementById('correction-container');
    const correctionBox = document.getElementById('correction-box');
    const reportText = document.getElementById('report-problem-text');
    
    // Hide correction box
    correctionContainer.classList.add('hidden');
    correctionBox.value = '';
    
    // Reset button text
    if (currentLanguage === 'fr') {
        reportText.textContent = 'Signaler un problème';
    } else {
        reportText.textContent = 'Report a problem';
    }
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

        // Hide loading and game UI
        hideElement('loading-medium');
        hideElement('medium-game-ui');

        // Show Medium error UI if present
        const mediumError = document.getElementById('medium-error');
        if (mediumError) {
            mediumError.classList.remove('hidden');
        } else {
            // Fallback: bilingual alert
            const isFrench = (typeof currentLanguage !== 'undefined' && currentLanguage === 'fr');
            const message = isFrench
                ? "Erreur de chargement du mode Moyen. Nous n'avons pas pu charger les phrases françaises pour le mode Moyen. Veuillez vérifier votre connexion Internet, puis revenir au menu principal pour réessayer."
                : "Unable to load Medium Mode. We could not load the French prompts for Medium Mode. Please check your internet connection, then return to the main menu and try again.";
            alert(message);
        }
        // Do not call backToMainMenu automatically; let user choose.
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
        const errorMessage = currentLanguage === 'fr' ? 
            'Veuillez entrer une traduction kirundi.' : 
            'Please enter a Kirundi translation.';
        showMediumError(errorMessage);
        return;
    }

    // Critical: Check for duplicates against existing database (if available)
    if (existingKirundiPhrases.size > 0 && existingKirundiPhrases.has(kirundiTranslation)) {
        const errorMessage = currentLanguage === 'fr' ? 
            'Cette traduction kirundi est déjà dans notre base de données! Merci!' : 
            'This Kirundi translation is already in our database! Thank you!';
        showMediumError(errorMessage);
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

// --- API Submission Functions ---

function showSuccessOverlay(message) {
    document.getElementById('success-title').textContent = currentLanguage === 'fr'
        ? 'Merci🙏🏾 pour votre contribution!'
        : 'Thank you🙏🏾 for your contribution!';
    document.getElementById('success-message').textContent = message || (currentLanguage === 'fr'
        ? 'Vos données ont été soumises avec succès. Murakoze cane🙏🏾!'
        : 'Your data has been submitted successfully. Murakoze cane🙏🏾!');
    document.getElementById('success-main-menu-btn').textContent = currentLanguage === 'fr'
        ? 'Retour au Menu Principal'
        : 'Back to Main Menu';
    document.getElementById('success-overlay').classList.remove('hidden');
}

function closeSuccessOverlay() {
    document.getElementById('success-overlay').classList.add('hidden');
    backToMainMenu();
}


async function submitEasyTranslations() {
    const submitButton = document.getElementById('submit-easy-button');
    if (submitButton) submitButton.disabled = true;
    submitButton.textContent = currentLanguage === 'fr' ? 'Soumission... veuillez patienter...' : 'Submitting... please wait...';

    const payload = {
        mode: "easy",
        data: userTranslations
    };

    try {
        await fetch("https://script.google.com/macros/s/AKfycbznLwjbFfbf0UXxino2uA_i34YU629FgkY7CBsvgY9agJJbgzA3-8kbnEpTk52d9a-V/exec", {
            method: "POST",
            mode: 'no-cors', // This is correct
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(payload)
        });
        
        // --- THIS IS THE FIX ---
        // We no longer wait for a response. We ASSUME success.
        
        // Save to localStorage
        const submittedKirundiPhrases = userTranslations.map(translation => translation.original_kirundi);
        saveSubmittedPhrases(submittedKirundiPhrases);
        // Show success overlay
        showSuccessOverlay(currentLanguage === 'fr' ? 'Vos traductions ont été soumises. Murakoze cane🙏🏾!' : 'Your translations have been submitted. Murakoze cane🙏🏾!');
        // --- END OF FIX ---
        
    } catch (e) {
        // This will now ONLY catch a total network failure
        console.error("Submission failed:", e);
        alert(currentLanguage === 'fr' ? 'Échec de la soumission! Veuillez réessayer.' : 'Submission failed! Please try again.');
        submitButton.textContent = currentLanguage === 'fr' ? 'Soumettre les traductions' : 'Submit Translations';
        submitButton.disabled = false;
    }
}

async function submitMediumTranslations() {
    const submitButton = document.getElementById('submit-medium-button');
    if (submitButton) submitButton.disabled = true;
    submitButton.textContent = currentLanguage === 'fr' ? 'Soumission... veuillez patienter...' : 'Submitting... please wait...';

    const payload = {
        mode: "medium",
        data: userMediumTranslations
    };
    try {
        await fetch("https://script.google.com/macros/s/AKfycbznLwjbFfbf0UXxino2uA_i34YU629FgkY7CBsvgY9agJJbgzA3-8kbnEpTk52d9a-V/exec", {
            method: "POST",
            mode: 'no-cors', // This is correct
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(payload)
        });

        // --- THIS IS THE FIX ---
        // We no longer wait for a response. We ASSUME success.
        
        // Save to localStorage
        const submittedFrenchPhrases = userMediumTranslations.map(translation => translation.french);
        saveSubmittedFrenchPhrases(submittedFrenchPhrases);
        // Show success overlay
        showSuccessOverlay(currentLanguage === 'fr' ? 'Vos nouvelles phrases ont été soumises. Murakoze cane🙏🏾!' : 'Your new sentences have been submitted. Murakoze cane🙏🏾!');
        // --- END OF FIX ---
        
    } catch (e) {
        // This will now ONLY catch a total network failure
        console.error("Submission failed:", e);
        alert(currentLanguage === 'fr' ? 'Échec de la soumission! Veuillez réessayer.' : 'Submission failed! Please try again.');
        submitButton.textContent = currentLanguage === 'fr' ? 'Soumettre les traductions' : 'Submit Translations';
        submitButton.disabled = false;
    }
}

// Hard Level Submission - Test with minimal data
async function submitHardSentences() {
    const submitButton = document.getElementById('submit-hard-button');
    if (submitButton) submitButton.disabled = true;
    submitButton.textContent = currentLanguage === 'fr' ? 'Soumission... veuillez patienter...' : 'Submitting... please wait...';

    // Test with minimal data
    const testData = [{
        kirundi: "test kirundi",
        french: "test french"
    }];

    const payload = {
        mode: "medium",
        data: testData
    };

    console.log('Sending test payload:', JSON.stringify(payload, null, 2));

    try {
        const response = await fetch("https://script.google.com/macros/s/AKfycbznLwjbFfbf0UXxino2uA_i34YU629FgkY7CBvgY9agJJbgzA3-8kbnEpTk52d9a-V/exec", {
            method: "POST",
            mode: 'no-cors',
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(payload)
        });

        console.log('Test request sent (cannot verify response due to CORS)');
        
        // For now, still save the actual user data to localStorage
        const formattedData = userHardSentences.map(sentence => ({
            kirundi: sentence.kirundi,
            french: sentence.french
        }));
        
        const submittedFrenchPhrases = formattedData.map(translation => translation.french);
        saveSubmittedFrenchPhrases(submittedFrenchPhrases);
        
        const message = currentLanguage === 'fr' 
            ? 'Données enregistrées localement. Vérifiez votre feuille Google pour la soumission.' 
            : 'Data saved locally. Please check your Google Sheet for submission.';
        showSuccessOverlay(message);
        
        resetHardMode();
        
    } catch (e) {
        console.error("Submission failed:", e);
        // Save to localStorage even if the request fails
        const formattedData = userHardSentences.map(sentence => ({
            kirundi: sentence.kirundi,
            french: sentence.french
        }));
        const submittedFrenchPhrases = formattedData.map(translation => translation.french);
        saveSubmittedFrenchPhrases(submittedFrenchPhrases);
        
        const message = currentLanguage === 'fr' 
            ? 'Données enregistrées localement. Erreur de soumission au serveur.' 
            : 'Data saved locally. Server submission error.';
        showSuccessOverlay(message);
        resetHardMode();
    } finally {
        if (submitButton) {
            submitButton.textContent = currentLanguage === 'fr' ? 'Soumettre les phrases' : 'Submit Sentences';
            submitButton.disabled = false;
        }
    }
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
    if (userTranslations.length === 0) {
        alert('No data to download!');
        return;
    }

    // Create CSV content with three columns
    let csvContent = 'Original_Kirundi,Corrected_Kirundi,French_Translation\n';
    
    userTranslations.forEach(item => {
        // Escape quotes and wrap in quotes if necessary
        const originalKirundi = `"${item.original_kirundi.replace(/"/g, '""')}"`;
        const correctedKirundi = `"${item.corrected_kirundi.replace(/"/g, '""')}"`;
        const frenchTranslation = `"${item.french_translation.replace(/"/g, '""')}"`;
        csvContent += `${originalKirundi},${correctedKirundi},${frenchTranslation}\n`;
    });

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'Kirundi_To_French.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Save submitted Kirundi phrases to localStorage to prevent re-showing them
    const submittedKirundiPhrases = userTranslations.map(translation => translation.original_kirundi);
    saveSubmittedPhrases(submittedKirundiPhrases);

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
}

function downloadHardSentences() {
    downloadCSV(userHardSentences, 'my_new_sentences.csv');

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
        const errorMessage = currentLanguage === 'fr' ? 
            'Les champs Kirundi et Français doivent être remplis.' : 
            'Both Kirundi and French fields must be filled.';
        showHardError(errorMessage);
        return;
    }
    
    const wordCount = kirundiText.split(/\s+/).length;
    if (wordCount < 4) {
        const errorMessage = currentLanguage === 'fr' ? 
            'La phrase kirundi doit contenir au moins 4 mots.' : 
            'Kirundi sentence must contain at least 4 words.';
        showHardError(errorMessage);
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
    const counterElement = document.getElementById('sentence-counter');
    if (currentLanguage === 'fr') {
        counterElement.textContent = 
            `Vous avez ajouté ${userHardSentences.length} phrase${userHardSentences.length !== 1 ? 's' : ''}.`;
    } else {
        counterElement.textContent = 
            `You have added ${userHardSentences.length} sentence${userHardSentences.length !== 1 ? 's' : ''}.`;
    }
}

function resetHardMode() {
    userHardSentences = [];
    document.getElementById('hard-new-kirundi').value = '';
    document.getElementById('hard-new-french').value = '';
        updateHardSentenceCounter();
    hideElement('hard-error-message');
    hideElement('hard-success-message');
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

// Language Toggle Function
function toggleLanguage() {
    try {
        console.log('Language toggle clicked. Current language:', currentLanguage);
        
        currentLanguage = currentLanguage === 'en' ? 'fr' : 'en';
        console.log('New language:', currentLanguage);
        
        updateLanguageUI();
        translateInterface();
        
        console.log('Language toggle completed successfully');
    } catch (error) {
        console.error('Error in toggleLanguage:', error);
    }
}

function updateLanguageUI() {
    const flagElement = document.getElementById('language-flag');
    const textElement = document.getElementById('language-text');
    
    if (currentLanguage === 'fr') {
        flagElement.textContent = '🇬🇧';
        textElement.textContent = 'EN';
    } else {
        flagElement.textContent = '🇫🇷';
        textElement.textContent = 'FR';
    }
}

function translateInterface() {
    try {
        // Hide any inappropriate success messages during translation
        const successElements = ['hard-success-message', 'medium-success-message', 'success-message'];
        successElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.classList.add('hidden');
        });
        
        console.log('Translation function started for language:', currentLanguage);
    } catch (error) {
        console.error('Error in translateInterface:', error);
        return;
    }
    
    const translations = {
        en: {
            // Medium Level - Live data error
            mediumErrorTitle: 'Unable to load Medium Mode',
            mediumErrorMessage: 'We could not load the French prompts for Medium Mode. Please check your internet connection, then return to the main menu and try again.',
            mediumErrorCta: '← Back to main menu',
            title: 'Ijwi ry\'Ikirundi AI',
            subtitle: 'Contribution Hub',
            mission: 'Help us build the future of Kirundi language AI through community collaboration',
            preserving: 'Preserving Heritage',
            building: 'Building Future',
            empowering: 'Empowering Community',
            easyLevel: 'Easy Level: Translate Kirundi To French',
            easyDesc: 'Translate Kirundi sentences to French',
            mediumLevel: 'Medium Level: Translate French to Kirundi',
            mediumDesc: 'Translate French sentences to Kirundi',
            hardLevel: 'Hard Level: Add New Sentences',
            hardDesc: 'Create original Kirundi-French sentence pairs',
            skipHelp: 'Don\'t know the answer?',
            skipText: 'No problem! Click "Skip" or press',
            skipAction: 'to move to the next',
            // Main menu
            chooseLevel: 'Choose Your Contribution Level',
            selectType: 'Select the type of contribution you\'d like to make to help build our Kirundi AI dataset',
            // Game interface
            backToMenu: '← Back to Menu',
            skip: '⏭️ Skip',
            submitTranslation: 'Submit Translation →',
            progress: 'Progress',
            shortcuts: '💡 Shortcuts: Ctrl+Enter to submit • Escape to skip',
            // Easy Level
            easyTitle: 'Easy Level: Translation Game',
            kirundiPhrase: 'Kirundi Phrase:',
            frenchTranslation: 'Your French Translation:',
            // Easy Level - Placeholders
            easyPlaceholder: 'Type your French translation here...',
            // Medium Level
            mediumTitle: 'Medium Level: Translate French to Kirundi',
            mediumDesc2: 'Translate French sentences to Kirundi. Your translations will be checked against our database to avoid duplicates.',
            frenchSentence: 'French Sentence:',
            kirundiTranslation: 'Your Kirundi Translation:',
            // Medium Level - Placeholders
            mediumPlaceholder: 'Type your Kirundi translation here...',
            // Hard Level
            hardTitle: 'Hard Level: Add New Sentences',
            hardDesc2: 'Create new Kirundi-French sentence pairs. Make sure your Kirundi sentences are meaningful and contain at least 4 words.',
            sentenceCounter: 'You have added 0 sentences.',
            newKirundiSentence: 'New Kirundi Sentence:',
            frenchTranslationLabel: 'French Translation:',
            addSentence: 'Add Sentence',
            downloadMySentences: 'Download My Sentences',
            // Hard Level - Placeholders
            kirundiPlaceholder: 'Enter a new Kirundi sentence...',
            frenchPlaceholder: 'Enter a new French sentence...',
            // Easy Level - Completion
            congratulations: 'Congratulations!',
            completedBatch: 'You\'ve completed a batch of translations!',
            downloadCsv: 'Download Kirundi_To_French.csv',
            // Easy Level - Messages
            easyErrorMessage: 'Please enter a translation before continuing.',
            fetchingLiveData: 'Fetching live data from Hugging Face...',
            loadingUntranslated: 'Loading untranslated phrases from the official dataset',
            // WhatsApp Sharing
            sendCsvFile: '📱 Send CSV File',
            whatsappInstructions: 'Click to open WhatsApp, then attach your CSV file:',
            whatsappWarning: '⚠️ You\'ll need to manually attach the CSV file after WhatsApp opens',
            openWhatsappChat: '💬 Open WhatsApp Chat',
            // Medium Level - Additional
            translationAdded: 'Translation added successfully!',
            excellentWork: 'Excellent Work!',
            completedFrenchBatch: 'You\'ve completed a batch of French to Kirundi translations!',
            downloadMediumCsv: 'Download French_To_Kirundi.csv',
            // Medium Level - Loading & Messages
            loadingMediumData: 'Loading French prompts and checking database...',
            preparingSession: 'Preparing your translation session',
            mediumErrorMessage: 'Please enter a translation before continuing.',
            // Hard Level - Messages
            sentencePairAdded: 'Sentence pair added successfully!',
            hardErrorMessage: 'Both Kirundi and French fields must be filled.',
            // Footer
            footerDescription: 'Preserving and advancing the Kirundi language through artificial intelligence and community collaboration.',
            footerBuilt: 'Built with ❤️ for the Kirundi community',
            poweredBy: 'Powered by Ijwi Ry\'Ikirundi AI Team',
            // Easy Level - Live data error
            easyErrorTitle: 'Unable to load live data',
            easyErrorMessage: 'We could not load Kirundi sentences from the live Hugging Face dataset. Please check your internet connection, then return to the main menu and try again.',
            easyErrorCta: '← Back to main menu',
            // Page title
            pageTitle: 'Ijwi ry\'Ikirundi AI: Contribution Hub',
            // Report Problem Feature
            reportProblem: 'Report a problem with this sentence',
            reportHelpText: 'Click if you find errors in the Kirundi sentence',
            cancelCorrection: 'Cancel correction',
            correctionLabel: 'Correct the Kirundi sentence:',
            correctionPlaceholder: 'Fix any errors in the Kirundi sentence...',
            correctionHelp: 'Help:',
            correctionInstructions: 'Fix any spelling, grammar, or other errors in the Kirundi sentence above.'
        },
        fr: {
            // Medium Level - Live data error
            mediumErrorTitle: 'Erreur de chargement du mode Moyen',
            mediumErrorMessage: 'Nous n\'avons pas pu charger les phrases françaises pour le mode Moyen. Veuillez vérifier votre connexion Internet, puis revenir au menu principal pour réessayer.',
            mediumErrorCta: '← Retour au menu principal',
            title: 'Ijwi ry\'Ikirundi AI',
            subtitle: 'Hub de Contribution',
            mission: 'Aidez-nous à construire l\'avenir de l\'IA en langue kirundi grâce à la collaboration communautaire',
            preserving: 'Préserver l\'Héritage',
            building: 'Construire l\'Avenir',
            empowering: 'Autonomiser la Communauté',
            easyLevel: 'Niveau Facile: Traduire Kirundi vers Français',
            easyDesc: 'Traduisez les phrases kirundi en français',
            mediumLevel: 'Niveau Moyen: Traduire Français vers Kirundi',
            mediumDesc: 'Traduisez les phrases françaises en kirundi',
            hardLevel: 'Niveau Difficile: Ajouter de Nouvelles Phrases',
            hardDesc: 'Créez des paires de phrases kirundi-français originales',
            skipHelp: 'Vous ne connaissez pas la réponse?',
            skipText: 'Pas de problème! Cliquez sur "Ignorer" ou appuyez sur',
            skipAction: 'pour passer à la',
            // Main menu
            chooseLevel: 'Choisissez Votre Niveau de Contribution',
            selectType: 'Sélectionnez le type de contribution que vous souhaitez apporter pour aider à construire notre jeu de données Kirundi IA',
            // Game interface
            backToMenu: '← Retour au Menu',
            skip: '⏭️ Ignorer',
            submitTranslation: 'Soumettre la Traduction →',
            progress: 'Progrès',
            shortcuts: '💡 Raccourcis: Ctrl+Entrée pour soumettre • Échap pour ignorer',
            // Easy Level
            easyTitle: 'Niveau Facile: Jeu de Traduction',
            kirundiPhrase: 'Phrase Kirundi:',
            frenchTranslation: 'Votre Traduction Française:',
            // Easy Level - Placeholders
            easyPlaceholder: 'Tapez votre traduction française ici...',
            // Medium Level
            mediumTitle: 'Niveau Moyen: Traduire Français vers Kirundi',
            mediumDesc2: 'Traduisez les phrases françaises en kirundi. Vos traductions seront vérifiées dans notre base de données pour éviter les doublons.',
            frenchSentence: 'Phrase Française:',
            kirundiTranslation: 'Votre Traduction Kirundi:',
            // Medium Level - Placeholders
            mediumPlaceholder: 'Tapez votre traduction en kirundi ici...',
            // Hard Level
            hardTitle: 'Niveau Difficile: Ajouter de Nouvelles Phrases',
            hardDesc2: 'Créez de nouvelles paires de phrases kirundi-français. Assurez-vous que vos phrases kirundi sont significatives et contiennent au moins 4 mots.',
            sentenceCounter: 'Vous avez ajouté 0 phrases.',
            newKirundiSentence: 'Nouvelle Phrase Kirundi:',
            frenchTranslationLabel: 'Traduction Française:',
            addSentence: 'Ajouter une Phrase',
            downloadMySentences: 'Télécharger Mes Phrases',
            // Hard Level - Placeholders
            kirundiPlaceholder: 'Entrez une nouvelle phrase kirundi...',
            frenchPlaceholder: 'Entrez une nouvelle phrase française...',
            // Easy Level - Completion
            congratulations: 'Félicitations!',
            completedBatch: 'Vous avez terminé un lot de traductions!',
            downloadCsv: 'Télécharger Kirundi_To_French.csv',
            // Easy Level - Messages
            easyErrorMessage: 'Veuillez entrer une traduction avant de continuer.',
            fetchingLiveData: 'Récupération des données en direct depuis Hugging Face...',
            loadingUntranslated: 'Chargement des phrases non traduites du jeu de données officiel',
            // WhatsApp Sharing
            sendCsvFile: '📱 Envoyer le Fichier CSV',
            whatsappInstructions: 'Cliquez pour ouvrir WhatsApp, puis joignez votre fichier CSV:',
            whatsappWarning: '⚠️ Vous devrez joindre manuellement le fichier CSV après l\'ouverture de WhatsApp',
            openWhatsappChat: '💬 Ouvrir le Chat WhatsApp',
            // Medium Level - Additional
            translationAdded: 'Traduction ajoutée avec succès!',
            excellentWork: 'Excellent Travail!',
            completedFrenchBatch: 'Vous avez terminé un lot de traductions français vers kirundi!',
            downloadMediumCsv: 'Télécharger French_To_Kirundi.csv',
            // Medium Level - Loading & Messages
            loadingMediumData: 'Chargement des phrases françaises et vérification de la base de données...',
            preparingSession: 'Préparation de votre session de traduction',
            mediumErrorMessage: 'Veuillez entrer une traduction avant de continuer.',
            // Hard Level - Messages
            sentencePairAdded: 'Paire de phrases ajoutée avec succès!',
            hardErrorMessage: 'Les champs Kirundi et Français doivent être remplis.',
            // Footer
            footerDescription: 'Préserver et faire progresser la langue kirundi grâce à l\'intelligence artificielle et à la collaboration communautaire.',
            footerBuilt: 'Construit avec ❤️ pour la communauté Kirundi',
            poweredBy: 'Propulsé par l\'Équipe Ijwi Ry\'Ikirundi AI',
            // Easy Level - Live data error
            easyErrorTitle: 'Erreur de chargement des données',
            easyErrorMessage: 'Nous n\'avons pas pu charger les phrases kirundi en direct depuis Hugging Face. Veuillez vérifier votre connexion Internet, puis revenir au menu principal pour réessayer.',
            easyErrorCta: '← Retour au menu principal',
            // Page title
            pageTitle: 'Ijwi ry\'Ikirundi AI: Hub de Contribution',
            // Report Problem Feature
            reportProblem: 'Signaler un problème avec cette phrase',
            reportHelpText: 'Cliquez si vous trouvez des erreurs dans la phrase kirundi',
            cancelCorrection: 'Annuler la correction',
            correctionLabel: 'Corriger la phrase kirundi:',
            correctionPlaceholder: 'Corrigez les erreurs dans la phrase kirundi...',
            correctionHelp: 'Aide:',
            correctionInstructions: 'Corrigez les fautes d\'orthographe, de grammaire ou autres erreurs dans la phrase kirundi ci-dessus.'
        }
    };
    
    const t = translations[currentLanguage];
    
    // Update main interface elements
    const elements = {
        'subtitle': t.subtitle,
        'mission-text': t.mission,
        'preserving-text': t.preserving,
        'building-text': t.building,
        'empowering-text': t.empowering,
        'footer-description': t.footerDescription,
        'footer-built': t.footerBuilt,
        'fetching-live-data': t.fetchingLiveData,
        'loading-untranslated': t.loadingUntranslated,
        'loading-medium-data': t.loadingMediumData,
        'preparing-session': t.preparingSession,
        'easy-error-text': t.easyErrorMessage,
        'easy-progress-label': t.progress,
        'medium-progress-label': t.progress,
        'medium-success-text': t.translationAdded,
        // Easy Level - Error UI
        'easy-error-title': t.easyErrorTitle,
        'easy-error-message': t.easyErrorMessage,
        'easy-error-cta': t.easyErrorCta,
        // Medium Level - Error UI
        'medium-error-title': t.mediumErrorTitle,
        'medium-error-message': t.mediumErrorMessage,
        'medium-error-cta': t.mediumErrorCta,
        // Report Problem Feature
        'report-problem-text': t.reportProblem,
        'report-help-text': t.reportHelpText,
        'correction-label': t.correctionLabel,
        'correction-help': t.correctionHelp,
        'correction-instructions': t.correctionInstructions
    };
    
    // Special handling for error messages that might be dynamically generated
    const errorElements = {
        'error-message': t.easyErrorMessage,
        'medium-error-message': t.mediumErrorMessage,
        'hard-error-message': t.hardErrorMessage
    };
    
    // Update error messages if they exist and contain the expected text
    Object.keys(errorElements).forEach(id => {
        const element = document.getElementById(id);
        if (element && errorElements[id]) {
            // Check if element contains error text and update accordingly (bidirectional)
            if (id === 'error-message' && (element.textContent.includes('Please enter a translation') || element.textContent.includes('Veuillez entrer une traduction'))) {
                element.textContent = errorElements[id];
            } else if (id === 'medium-error-message' && (element.textContent.includes('Please enter a translation') || element.textContent.includes('Veuillez entrer une traduction'))) {
                element.textContent = errorElements[id];
            } else if (id === 'hard-error-message' && (element.textContent.includes('Both Kirundi and French fields') || element.textContent.includes('Les champs Kirundi et Français'))) {
                element.textContent = errorElements[id];
            }
        }
    });
    
    // Special handling for "Powered by" element to preserve HTML formatting
    const poweredByElement = document.getElementById('powered-by');
    if (poweredByElement) {
        if (currentLanguage === 'fr') {
            poweredByElement.innerHTML = 'Propulsé par <span class="font-poppins text-green-400 font-bold text-lg">l\'Équipe Ijwi Ry\'Ikirundi AI</span>';
        } else {
            poweredByElement.innerHTML = 'Powered by <span class="font-poppins text-green-400 font-bold text-lg">Ijwi Ry\'Ikirundi AI Team</span>';
        }
    }
    
    // Update elements if they exist
    Object.keys(elements).forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = elements[id];
        }
    });
    
    // Update main menu elements
    const mainMenuElements = document.querySelectorAll('[data-translate]');
    mainMenuElements.forEach(element => {
        const key = element.getAttribute('data-translate');
        if (t[key]) {
            element.textContent = t[key];
        }
    });
    
    // Update buttons and labels by text content - improved bidirectional translation
    const buttonMappings = [
        // Back to Menu buttons
        { selector: 'button', containsEn: '← Back to Menu', containsFr: '← Retour au Menu', newText: t.backToMenu },
        // Skip buttons
        { selector: 'button', containsEn: '⏭️ Skip', containsFr: '⏭️ Ignorer', newText: t.skip },
        // Submit buttons
        { selector: 'button', containsEn: 'Submit Translation', containsFr: 'Soumettre la Traduction', newText: t.submitTranslation },
        // Add sentence buttons
        { selector: 'button', containsEn: 'Add Sentence', containsFr: 'Ajouter une Phrase', newText: t.addSentence },
        // Download buttons
        { selector: 'button', containsEn: 'Download My Sentences', containsFr: 'Télécharger Mes Phrases', newText: t.downloadMySentences },
        { selector: 'button', containsEn: 'Download Kirundi_To_French.csv', containsFr: 'Télécharger Kirundi_To_French.csv', newText: t.downloadCsv },
        { selector: 'button', containsEn: 'Download French_To_Kirundi.csv', containsFr: 'Télécharger French_To_Kirundi.csv', newText: t.downloadMediumCsv },
        { selector: 'button', containsEn: '💬 Open WhatsApp Chat', containsFr: '💬 Ouvrir le Chat WhatsApp', newText: t.openWhatsappChat },
        // Labels
        { selector: 'label', containsEn: 'Kirundi Phrase:', containsFr: 'Phrase Kirundi:', newText: t.kirundiPhrase },
        { selector: 'label', containsEn: 'Your French Translation:', containsFr: 'Votre Traduction Française:', newText: t.frenchTranslation },
        { selector: 'label', containsEn: 'French Sentence:', containsFr: 'Phrase Française:', newText: t.frenchSentence },
        { selector: 'label', containsEn: 'Your Kirundi Translation:', containsFr: 'Votre Traduction Kirundi:', newText: t.kirundiTranslation },
        { selector: 'label', containsEn: 'New Kirundi Sentence:', containsFr: 'Nouvelle Phrase Kirundi:', newText: t.newKirundiSentence },
        { selector: 'label', containsEn: 'French Translation:', containsFr: 'Traduction Française:', newText: t.frenchTranslationLabel },
        // Headers
        { selector: 'h2', containsEn: 'Easy Level: Translation Game', containsFr: 'Niveau Facile: Jeu de Traduction', newText: t.easyTitle },
        { selector: 'h2', containsEn: 'Medium Level: Translate French to Kirundi', containsFr: 'Niveau Moyen: Traduire Français vers Kirundi', newText: t.mediumTitle },
        { selector: 'h2', containsEn: 'Hard Level: Add New Sentences', containsFr: 'Niveau Difficile: Ajouter de Nouvelles Phrases', newText: t.hardTitle },
        // Completion messages
        { selector: 'h3', containsEn: 'Congratulations!', containsFr: 'Félicitations!', newText: t.congratulations },
        { selector: 'h3', containsEn: 'Excellent Work!', containsFr: 'Excellent Travail!', newText: t.excellentWork },
        { selector: 'p', containsEn: 'You\'ve completed a batch of translations!', containsFr: 'Vous avez terminé un lot de traductions!', newText: t.completedBatch },
        { selector: 'p', containsEn: 'You\'ve completed a batch of French to Kirundi translations!', containsFr: 'Vous avez terminé un lot de traductions français vers kirundi!', newText: t.completedFrenchBatch },
        // WhatsApp elements
        { selector: 'h4', containsEn: '📱 Send CSV File', containsFr: '📱 Envoyer le Fichier CSV', newText: t.sendCsvFile },
        { selector: 'p', containsEn: 'Click to open WhatsApp, then attach your CSV file:', containsFr: 'Cliquez pour ouvrir WhatsApp, puis joignez votre fichier CSV:', newText: t.whatsappInstructions },
        { selector: 'p', containsEn: '⚠️ You\'ll need to manually attach the CSV file after WhatsApp opens', containsFr: '⚠️ Vous devrez joindre manuellement le fichier CSV après l\'ouverture de WhatsApp', newText: t.whatsappWarning },
        // Loading messages
        { selector: 'p', containsEn: 'Loading French prompts and checking database...', containsFr: 'Chargement des phrases françaises et vérification de la base de données...', newText: t.loadingMediumData },
        { selector: 'p', containsEn: 'Preparing your translation session', containsFr: 'Préparation de votre session de traduction', newText: t.preparingSession }
    ];
    
    buttonMappings.forEach(mapping => {
        const elements = document.querySelectorAll(mapping.selector);
        elements.forEach(element => {
            // Check if element contains either English or French text
            const containsEnglish = mapping.containsEn && element.textContent.includes(mapping.containsEn);
            const containsFrench = mapping.containsFr && element.textContent.includes(mapping.containsFr);
            
            if (containsEnglish || containsFrench) {
                element.textContent = mapping.newText;
            }
        });
    });
    
    // Update shortcuts text
    const shortcutsElements = document.querySelectorAll('.text-sm.text-gray-600');
    shortcutsElements.forEach(element => {
        if (element.textContent.includes('Shortcuts:') || element.textContent.includes('Raccourcis:')) {
            element.innerHTML = t.shortcuts;
        }
    });
    
    // Update placeholders
    const placeholderMappings = [
        { id: 'french-input', placeholder: t.easyPlaceholder },
        { id: 'kirundi-translation', placeholder: t.mediumPlaceholder },
        { id: 'hard-new-kirundi', placeholder: t.kirundiPlaceholder },
        { id: 'hard-new-french', placeholder: t.frenchPlaceholder },
        { id: 'correction-box', placeholder: t.correctionPlaceholder }
    ];
    
    placeholderMappings.forEach(mapping => {
        const element = document.getElementById(mapping.id);
        if (element && mapping.placeholder) {
            element.placeholder = mapping.placeholder;
        }
    });
    
    // Update dynamic sentence counter for Hard Level
    const sentenceCounterElement = document.getElementById('sentence-counter');
    if (sentenceCounterElement && currentLanguage === 'fr') {
        const count = sentenceCounterElement.textContent.match(/\d+/);
        if (count) {
            sentenceCounterElement.textContent = `Vous avez ajouté ${count[0]} phrase${count[0] !== '1' ? 's' : ''}.`;
        }
    } else if (sentenceCounterElement && currentLanguage === 'en') {
        const count = sentenceCounterElement.textContent.match(/\d+/);
        if (count) {
            sentenceCounterElement.textContent = `You have added ${count[0]} sentence${count[0] !== '1' ? 's' : ''}.`;
        }
    }
    
    // Update button texts
    const buttons = document.querySelectorAll('.level-button-text');
    buttons.forEach((button, index) => {
        if (index === 0) button.textContent = t.easyLevel;
        if (index === 1) button.textContent = t.mediumLevel;
        if (index === 2) button.textContent = t.hardLevel;
    });
    
    // Update descriptions
    const descriptions = document.querySelectorAll('.level-description');
    descriptions.forEach((desc, index) => {
        if (index === 0) desc.textContent = t.easyDesc;
        if (index === 1) desc.textContent = t.mediumDesc;
        if (index === 2) desc.textContent = t.hardDesc;
    });
    
    // Update skip help text
    const skipHelps = document.querySelectorAll('.skip-help-text');
    skipHelps.forEach(help => {
        const parts = help.innerHTML.split('<kbd');
        if (parts.length > 1) {
            help.innerHTML = `<span class="font-medium">💡 ${t.skipHelp}</span> ${t.skipText} <kbd${parts[1].split('</kbd>')[0]}</kbd> ${t.skipAction} ${currentLanguage === 'en' ? 'phrase.' : 'phrase suivante.'}`;
        }
    });
}

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    // App is ready
    console.log('Kirundi Contribution App loaded successfully!');
    updateLanguageUI();
});
