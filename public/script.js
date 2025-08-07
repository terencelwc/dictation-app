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

    // --- Meaning & Translation ---
    function isChinese(text) {
        // Use a more comprehensive regex for CJK Unified Ideographs
        return /[\u4e00-\u9fff\u3400-\u4dbf]/.test(text);
    }

    async function getEnglishDefinition(word) {
        // This API works best for single words. If it's a sentence, it will likely fail.
        if (word.includes(' ')) {
            return '<p>Definitions are only available for single words.</p>';
        }
        try {
            const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
            if (!response.ok || response.status === 404) {
                return '<p>No definition found for this word.</p>';
            }
            const data = await response.json();

            if (!Array.isArray(data) || data.length === 0) {
              return '<p>No definition found for this word.</p>';
            }

            // Parse the definition data into HTML
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
            console.error("Dictionary API error:", error, word);
            // If the dictionary API fails, provide a link to an online dictionary as a fallback
            return `<p>Could not retrieve definition. Try searching <a href="https://www.merriam-webster.com/dictionary/${encodeURIComponent(word)}" target="_blank">Merriam-Webster</a>.</p>`;
        }
    }

    async function getTranslation(text, langpair) {
        // Using Google Translate's unofficial API for robust translation.
        let [sourceLang, targetLang] = langpair.split('|');
        // For Chinese input, it's more reliable to let the API auto-detect the language
        // rather than forcing a specific dialect like 'zh-HK', which can be unreliable.
        if (sourceLang.startsWith('zh')) {
            sourceLang = 'auto';
        }
        // Using 'gtx' client which is sometimes more lenient for cross-origin requests.
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
        
        try {
            const response = await fetchWithTimeout(url);
            if (!response.ok) throw new Error('Translation service response was not ok.');
            const data = await response.json();
            
            // The result is nested in the response array.
            const translatedText = data[0] ? data[0].map(item => item[0]).join('') : '';
            return translatedText ? `<p>${translatedText}</p>` : '<p>No translation could be found for the input text.</p>';
        } catch (error) {
            console.error("Google Translation API error:", error);
            return `<p>Could not retrieve translation for '${text}'. The service may be temporarily unavailable.</p>`;
        }
    }


    async function fetchWithTimeout(url, timeout = 5000) {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        try {
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(id);
            return response;
        } catch (error) {
            clearTimeout(id);
            throw error;
        }
    }

    function waitForPinyin(timeout = 7000) {
        return new Promise((resolve, reject) => {
            // If the library is already available, resolve immediately.
            if (typeof window.pinyin === 'function') {
                return resolve();
            }

            const startTime = Date.now();
            const interval = setInterval(() => {
                if (typeof window.pinyin === 'function') {
                    clearInterval(interval);
                    return resolve();
                }
                if (Date.now() - startTime > timeout) {
                    clearInterval(interval);
                    reject(new Error("Pinyin library load timed out."));
                }
            }, 100);
        });
    }

    async function showMeaning(text) {
        meaningText.innerHTML = '<div class="loader"></div>';
        meaningModal.style.display = 'flex';

        try {
            const isInputChinese = isChinese(text);

            if (isInputChinese) {
                let pinyinText = '<i>Pinyin not available.</i>'; // Default/fallback value.
                try {
                    // Wait for the pinyin library to ensure it's loaded before use.
                    await waitForPinyin();
                    // 1. Get Pinyin immediately. It's a local operation and should be fast.
                    pinyinText = window.pinyin(text, { style: window.pinyin.STYLE_TONE }).map(arr => arr[0]).join(' ');
                } catch (pinyinError) {
                    console.error("Could not generate Pinyin:", pinyinError);
                    // If pinyin fails, we use the fallback text and continue to translation.
                }

                // 2. Display Pinyin first to give immediate feedback while translation is loading.
                meaningText.innerHTML = `
                    <h3>${text}</h3>
                    <h4>Pinyin (Pronunciation):</h4><p>${pinyinText}</p>
                    <h4>Translation (English):</h4><p><i>Translating...</i></p>
                `;

                // 3. Now, get the translation.
                const translation = await getTranslation(text, 'zh-HK|en');

                // 4. Update the UI with the translation once it's available.
                meaningText.innerHTML = `
                    <h3>${text}</h3>
                    <h4>Pinyin (Pronunciation):</h4><p>${pinyinText}</p>
                    <h4>Translation (English):</h4>${translation}
                `;
            } else {
                // Input is English: Get definition and Chinese translation.
                // Use Promise.allSettled to avoid one failed API call from breaking the other.
                const results = await Promise.allSettled([
                    getEnglishDefinition(text),
                    getTranslation(text, 'en|zh-HK')
                ]);

                const definition = results[0].status === 'fulfilled' ? results[0].value : `<p>Could not retrieve definition.</p>`;
                const translation = results[1].status === 'fulfilled' ? results[1].value : `<p>Could not retrieve translation.</p>`;

                meaningText.innerHTML = `
                    <h3>${text}</h3>
                    <h4>Definition (English):</h4>${definition}
                    <h4>Translation (Chinese):</h4>${translation}
                `;
            }
        } catch (error) {
            console.error("Failed to show meaning:", error);
            meaningText.innerHTML = `<p>An unexpected error occurred while looking up '${text}'. Please try again.</p>`;
        }
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

       // Load voices and populate the list
        function loadVoices() {
            populateVoiceList();
        }
        
        if (synth.onvoiceschanged !== undefined) {
            synth.onvoiceschanged = loadVoices;
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
                // Find the textarea associated with the clicked button
                const inputField = e.target.previousElementSibling.previousElementSibling;
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
    populateVoiceList();
});