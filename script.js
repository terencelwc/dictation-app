document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element Selection ---
    const themeSelect = document.getElementById('theme-select');
    const voiceSelect = document.getElementById('voice-select');
    const rateSlider = document.getElementById('rate-slider');
    const rateValueDisplay = document.getElementById('rate-value-display');
    const pitchSlider = document.getElementById('pitch-slider');
    const pitchValueDisplay = document.getElementById('pitch-value-display');
    const status = document.getElementById('status');

    const speakButton = document.getElementById('speak-button');
    const vocabularyInputArea = document.getElementById('vocabulary-input-area');
    const multiInputContainer = document.getElementById('multi-input-container');
    const addButton = document.getElementById('add-button');
    const shuffleButton = document.getElementById('shuffle-button');
    const readAllButton = document.getElementById('read-all-button');
    const exportButton = document.getElementById('export-button');
    const showAnswersButton = document.getElementById('show-answers-button');
    const resetButton = document.getElementById('reset-button');

    // --- Feedback Modal Elements ---
    const feedbackModal = document.getElementById('feedback-modal');
    const feedbackLink = document.getElementById('feedback-link');
    const closeModalBtn = document.querySelector('.modal-close-btn');
    const sendFeedbackBtn = document.getElementById('send-feedback-btn');
    const feedbackTextarea = document.getElementById('feedback-textarea');

    const meaningModal = document.getElementById('meaning-modal');
    const meaningText = document.getElementById('meaning-text');
    // --- State Management ---
    const synth = window.speechSynthesis;
    const LIST_STORAGE_KEY = 'dictationAppLists';
    const VOCAB_LIST_STORAGE_KEY = 'dictationAppVocabList';
    const THEME_STORAGE_KEY = 'dictationAppTheme';
    const RATE_STORAGE_KEY = 'dictationAppRate';
    const PITCH_STORAGE_KEY = 'dictationAppPitch';
    let voices = [];
    let lastSpokenUtterance = { text: null, onEnd: null }; // To track the last spoken item for live updates

    // --- Voice Synthesis Setup ---
    function populateVoiceList() {
        voices = synth.getVoices();
        voiceSelect.innerHTML = '';

        const supportedVoices = voices.filter(voice => voice.lang.startsWith('en-') || voice.lang.startsWith('zh-HK'));

        if (supportedVoices.length === 0) {
            status.textContent = "No English or Cantonese voices found in your browser.";
            speakButton.disabled = true;
            return;
        }

        let cantoneseVoiceFound = false;
        supportedVoices.forEach(voice => {
            const option = document.createElement('option');
            option.textContent = `${voice.name} (${voice.lang})`;
            option.setAttribute('data-lang', voice.lang);
            option.setAttribute('data-name', voice.name);

            if (!cantoneseVoiceFound && voice.lang.startsWith('zh-HK')) {
                option.selected = true;
                cantoneseVoiceFound = true;
            }
            voiceSelect.appendChild(option);
        });
    }

    function speakText(text, onEndCallback) {
        if (synth.speaking) {
            synth.cancel(); // Cancel previous speech if any
        }
        
        // Track what we are about to speak for live parameter updates
        lastSpokenUtterance = { text, onEnd: onEndCallback };

        const utterance = new SpeechSynthesisUtterance(text);
        const selectedVoiceName = voiceSelect.selectedOptions[0]?.getAttribute('data-name');
        const selectedVoice = voices.find(voice => voice.name === selectedVoiceName);
        
        if (selectedVoice) {
            utterance.voice = selectedVoice;
        }

        utterance.rate = parseFloat(rateSlider.value) || 1;
        utterance.pitch = parseFloat(pitchSlider.value) || 1;

        // Wrap onend and onerror to clear the tracking variable
        utterance.onend = () => {
            lastSpokenUtterance = { text: null, onEnd: null };
            if (onEndCallback) {
                onEndCallback();
            }
        };
        utterance.onerror = (event) => {
            // Some browsers (like Safari) can be stricter and throw errors like 'interrupted'
            // or 'canceled' during normal operation (e.g., clicking another play button quickly).
            // We will treat these as non-fatal and not reset the UI.
            const nonFatalErrors = ['canceled', 'interrupted'];
            // Make the check case-insensitive to be more robust across browsers
            if (event.error && nonFatalErrors.includes(event.error.toLowerCase())) {
                console.log(`Speech interrupted as expected: ${event.error}`);
                lastSpokenUtterance = { text: null, onEnd: null };
                return;
            }

            // For all other, unexpected errors:
            console.error('SpeechSynthesisUtterance.onerror', event);
            status.textContent = `An error occurred during speech: ${event.error}`;
            lastSpokenUtterance = { text: null, onEnd: null };
            // Do not reset the entire UI on a single speech error. Let the user continue.
        };

        synth.speak(utterance);
    }

    // --- UI State Management ---
    function setInitialUIState() {
        speakButton.style.display = 'block';
        speakButton.disabled = false;
        addButton.disabled = false;

        shuffleButton.disabled = true;
        readAllButton.disabled = true;
        showAnswersButton.disabled = true;
        exportButton.disabled = true;
        resetButton.disabled = true;
    }

    function setDictationUIState() {
        speakButton.disabled = true;
        addButton.disabled = true;

        shuffleButton.disabled = false;
        readAllButton.disabled = false;
        showAnswersButton.disabled = false;
        exportButton.disabled = false;
        resetButton.disabled = false;
    }

    function setReviewUIState() {
        speakButton.disabled = false; // Allow starting over
        addButton.disabled = false;   // Allow adding more items

        shuffleButton.disabled = true;
        readAllButton.disabled = true;
        showAnswersButton.disabled = true; // Already shown
        exportButton.disabled = false;     // Still useful
        resetButton.disabled = false;      // Still useful
    }

    // --- Vocabulary & List Management ---
    function addNewInputLine() {
        const newRow = document.createElement('div');
        newRow.className = 'input-with-button';
    
        newRow.innerHTML = `
            <textarea class="vocabulary-input" rows="1" placeholder="Enter another item..."></textarea>
            <button class="pronounce-input-button" type="button" title="Pronounce entered text">▶</button>
            <button class="search-button" type="button" title="Search meaning">🔍</button>
        `;
    
        multiInputContainer.appendChild(newRow);
        // Focus the newly created textarea
        newRow.querySelector('.vocabulary-input').focus();
    saveListToStorage();
    }

    function showAnswers() {
        const textareas = multiInputContainer.querySelectorAll('.vocabulary-input.masked');
        textareas.forEach(textarea => {
            textarea.classList.remove('masked');
            textarea.readOnly = false;
        });
        setReviewUIState();
    }

    function resetApp() {
        if (!window.confirm("Are you sure you want to reset? All entered text will be cleared.")) {
            return;
        }
        // Clear the container of all input lines
        multiInputContainer.innerHTML = '';

        // Re-create 6 default lines
        for (let i = 1; i <= 6; i++) {
            const newRow = document.createElement('div');
            newRow.className = 'input-with-button';
            newRow.innerHTML = `
                <textarea class="vocabulary-input" rows="1" placeholder="Enter item ${i}..."></textarea>
                <button class="pronounce-input-button" type="button" title="Pronounce entered text">▶</button>
                <button class="search-button" type="button" title="Search meaning">🔍</button>
            `;
            multiInputContainer.appendChild(newRow);
        }
        setInitialUIState();
        localStorage.removeItem(VOCAB_LIST_STORAGE_KEY);
    }

    // --- List Storage ---
    function saveListToStorage() {
        const allItems = Array.from(multiInputContainer.querySelectorAll('.vocabulary-input'))
            .map(textarea => textarea.value);
        localStorage.setItem(VOCAB_LIST_STORAGE_KEY, JSON.stringify(allItems));
    }

    function loadListFromStorage() {
        const savedListJSON = localStorage.getItem(VOCAB_LIST_STORAGE_KEY);
        if (!savedListJSON) return;

        const savedList = JSON.parse(savedListJSON);
        
        if (Array.isArray(savedList) && savedList.length > 0) {
            multiInputContainer.innerHTML = ''; // Clear default inputs

            // Ensure at least 6 lines are displayed
            const numLines = Math.max(savedList.length, 6);

            for (let i = 0; i < numLines; i++) {
                const itemText = savedList[i] || '';
                const newRow = document.createElement('div');
                newRow.className = 'input-with-button';
                newRow.innerHTML = `
                    <textarea class="vocabulary-input" rows="1" placeholder="Enter item ${i + 1}..."></textarea>
                    <button class="pronounce-input-button" type="button" title="Pronounce entered text">▶</button>
                    <button class="search-button" type="button" title="Search meaning">🔍</button>
                `;
                newRow.querySelector('textarea').value = itemText;
                multiInputContainer.appendChild(newRow);
            }
        }
    }

    // --- List Actions ---
    function shuffleLines() {
        const lines = Array.from(multiInputContainer.querySelectorAll('.input-with-button:not(.hidden)'));
        // Fisher-Yates shuffle algorithm
        for (let i = lines.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [lines[i], lines[j]] = [lines[j], lines[i]];
        }
        lines.forEach(line => multiInputContainer.appendChild(line));
        status.textContent = "Lines have been shuffled.";
        setTimeout(() => status.textContent = '', 2000);
    }

    function readAllItems() {
        const allItems = Array.from(multiInputContainer.querySelectorAll('.vocabulary-input'))
            .map(textarea => textarea.value.trim())
            .filter(text => text);

        if (allItems.length === 0) {
            alert('There are no items to read.');
            return;
        }

        let currentIndex = 0;
        function speakNext() {
            if (currentIndex < allItems.length) {
                const text = allItems[currentIndex];
                currentIndex++;
                speakText(text, speakNext); 
            }
        }
        speakNext();
    }

    function exportLinesAsTxt() {
        const allItems = Array.from(multiInputContainer.querySelectorAll('.vocabulary-input'))
            .map(textarea => textarea.value.trim())
            .filter(text => text);

        if (allItems.length === 0) {
            alert('There is nothing to export.');
            return;
        }

        const content = allItems.join('\r\n');

        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'dictation-list.txt';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    async function getEnglishDefinition(word) {
        // This API works best for single words. If it's a sentence, it will likely fail.
        if (word.includes(' ')) {
            return '<p>Definitions are only available for single words.</p>';
        }
        try {
            const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
            if (!response.ok) {
                return '<p>No definition found for this word.</p>';
            }
            const data = await response.json();
            
            // Format the definition data into HTML
            let html = '';
            data[0].meanings.forEach(meaning => {
                html += `<p><strong>${meaning.partOfSpeech}</strong></p><ul>`;
                meaning.definitions.slice(0, 3).forEach(def => { // Limit to 3 definitions
                    html += `<li>${def.definition}</li>`;
                });
                html += `</ul>`;
            });
            return html;
        } catch (error) {
            console.error("Dictionary API error:", error);
            return '<p>Could not retrieve definition.</p>';
        }
    }

    async function getChineseTranslation(text) {
        try {
            const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|zh-HK`);
            if (!response.ok) throw new Error('Translation service response was not ok.');
            const data = await response.json();
            if (data.responseStatus !== 200) throw new Error(data.responseDetails);
            return `<p>${data.responseData.translatedText}</p>`;
        } catch (error) {
            console.error("Translation API error:", error);
            return '<p>Could not retrieve translation.</p>';
        }
    }

    async function showMeaning(text) {
        meaningText.innerHTML = `Searching for: <strong>${text}</strong>...`;
        meaningModal.style.display = 'flex';

        const [definition, translation] = await Promise.all([
            getEnglishDefinition(text),
            getChineseTranslation(text)
        ]);

        meaningText.innerHTML = `
            <h3>${text}</h3>
            <h4>Definition (English):</h4>${definition}
            <h4>Translation (Chinese):</h4>${translation}
        `;
    }

    const closeModalMeaning = () => {
        meaningModal.style.display = 'none';
    };

    meaningModal.querySelector('.modal-close-btn').addEventListener('click', closeModalMeaning);

    meaningModal.addEventListener('click', (e) => {
        // Close only if clicking the dark overlay, not the content box
        if (e.target === meaningModal) {
            closeModalMeaning();
        }
    });


    // --- Dictation Flow ---
    function startDictation() {
        const inputDivs = multiInputContainer.querySelectorAll('.input-with-button');
        let hasEnteredText = false;

        inputDivs.forEach(div => {
            const textarea = div.querySelector('.vocabulary-input');
            const text = textarea.value.trim();

            if (text) {
                textarea.classList.add('masked');
                textarea.readOnly = true; // Prevent editing after starting
                hasEnteredText = true;
            } else {
                div.classList.add('hidden');
            }
        });

        if (!hasEnteredText) {
            alert('Please enter some text to start the dictation.');
            inputDivs.forEach(div => div.classList.remove('hidden')); // Unhide if user clicked by mistake
            return;
        }

        setDictationUIState();
    }

    // --- Rate & Pitch Management ---
    function saveRateToStorage() {
        localStorage.setItem(RATE_STORAGE_KEY, rateSlider.value);
    }

    function loadRateFromStorage() {
        const savedRate = localStorage.getItem(RATE_STORAGE_KEY) || '1.0';
        rateSlider.value = savedRate;
        rateValueDisplay.textContent = `${parseFloat(savedRate).toFixed(1)}x`;
    }

    function savePitchToStorage() {
        localStorage.setItem(PITCH_STORAGE_KEY, pitchSlider.value);
    }

    function loadPitchFromStorage() {
        const savedPitch = localStorage.getItem(PITCH_STORAGE_KEY) || '1.0';
        pitchSlider.value = savedPitch;
        pitchValueDisplay.textContent = `${parseFloat(savedPitch).toFixed(1)}`;
    }

    // --- Theme Management ---
    function applyTheme(theme) {
        document.body.dataset.theme = theme;
        localStorage.setItem(THEME_STORAGE_KEY, theme);
    }

    function loadTheme() {
        const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || 'default';
        if (themeSelect) {
            themeSelect.value = savedTheme;
        }
        applyTheme(savedTheme);
    }

    // --- Initialization and Event Listeners ---
    function init() {
        // Check for browser support
        if (!('speechSynthesis' in window)) {
            status.textContent = "Sorry, your browser doesn't support text-to-speech.";
            [speakButton, voiceSelect, addButton].forEach(el => el.disabled = true);
            return;
        }

        // Load voices
        if (synth.getVoices().length > 0) {
            populateVoiceList();
        } else {
            synth.onvoiceschanged = populateVoiceList;
        }

        loadListFromStorage();
        loadTheme();
        loadRateFromStorage();
        loadPitchFromStorage();
        setInitialUIState();

        // Attach event listeners
        addButton.addEventListener('click', addNewInputLine);
        speakButton.addEventListener('click', startDictation);
        shuffleButton.addEventListener('click', shuffleLines);
        readAllButton.addEventListener('click', readAllItems);
        showAnswersButton.addEventListener('click', showAnswers);
        exportButton.addEventListener('click', exportLinesAsTxt);
        resetButton.addEventListener('click', resetApp);

        // --- Feedback Modal Listeners ---
        feedbackLink.addEventListener('click', (e) => {
            e.preventDefault();
            feedbackModal.style.display = 'flex';
        });

        const closeModal = () => {
            feedbackModal.style.display = 'none';
        };

        closeModalBtn.addEventListener('click', closeModal);
        feedbackModal.addEventListener('click', (e) => {
            // Close only if clicking the dark overlay, not the content box
            if (e.target === feedbackModal) {
                closeModal();
            }
        });

        sendFeedbackBtn.addEventListener('click', () => {
            const feedbackText = feedbackTextarea.value.trim();
            if (!feedbackText) {
                alert('Please enter your feedback before sending.');
                return;
            }

            const recipient = 'prepb4@gmail.com';
            const subject = 'Feedback for Dictation App';
            const body = feedbackText;
            const mailtoLink = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

            // This will open the user's default email client.
            // It does not send the email automatically from the browser.
            window.location.href = mailtoLink;

            // Show thank you message and close modal
            status.textContent = "Thank you! Your email app has been opened.";
            setTimeout(() => {
                status.textContent = '';
                feedbackTextarea.value = ''; // Clear the textarea
                closeModal();
            }, 3000);
        });

        multiInputContainer.addEventListener('input', (e) => {
            if (e.target.matches('.vocabulary-input')) {
                saveListToStorage();
            }
        });


        multiInputContainer.addEventListener('keydown', (e) => {
            if (!e.target.matches('.vocabulary-input')) return;

            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault(); // Prevent new line on Enter
                
                const allInputs = Array.from(multiInputContainer.querySelectorAll('.vocabulary-input'));
                const currentIndex = allInputs.indexOf(e.target);

                if (currentIndex > -1 && currentIndex < allInputs.length - 1) {
                    allInputs[currentIndex + 1].focus();
                } else {
                    addNewInputLine();
                }
            }
        });

        multiInputContainer.addEventListener('click', (e) => { // Bug fix was here
            if (e.target.matches('.pronounce-input-button')) {
                const inputField = e.target.previousElementSibling;
                if (inputField && inputField.matches('.vocabulary-input')) {
                    const text = inputField.value.trim();
                    if (text) {
                        speakText(text, null);
                    }
                }
            } else if (e.target.matches('.search-button')) {
                // A more robust way to find the associated input field by looking for the parent container first.
                const inputField = e.target.closest('.input-with-button')?.querySelector('.vocabulary-input');
                if (inputField && inputField.matches('.vocabulary-input')) {
                    const text = inputField.value.trim();
                    if (text) {
                        showMeaning(text);
                    }
                }
            }
        });

        rateSlider.addEventListener('input', () => {
            rateValueDisplay.textContent = `${parseFloat(rateSlider.value).toFixed(1)}x`;
            saveRateToStorage();
            if (synth.speaking && lastSpokenUtterance.text) {
                speakText(lastSpokenUtterance.text, lastSpokenUtterance.onEnd);
            }
        });

        pitchSlider.addEventListener('input', () => {
            pitchValueDisplay.textContent = `${parseFloat(pitchSlider.value).toFixed(1)}`;
            savePitchToStorage();
            if (synth.speaking && lastSpokenUtterance.text) {
                speakText(lastSpokenUtterance.text, lastSpokenUtterance.onEnd);
            }
        });

        themeSelect.addEventListener('change', (e) => applyTheme(e.target.value));
    }

    init();
});