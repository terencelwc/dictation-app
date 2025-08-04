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

    // --- State Management ---
    const synth = window.speechSynthesis;
    const LIST_STORAGE_KEY = 'dictationAppLists';
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
            console.error('SpeechSynthesisUtterance.onerror', event);
            status.textContent = `An error occurred during speech: ${event.error}`;
            lastSpokenUtterance = { text: null, onEnd: null };
            updateUIForSetup(); // Reset UI on error
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

    // --- Vocabulary & List Management ---
    function addNewInputLine() {
        const newRow = document.createElement('div');
        newRow.className = 'input-with-button';
    
        newRow.innerHTML = `
            <textarea class="vocabulary-input" rows="1" placeholder="Enter another item..."></textarea>
            <button class="pronounce-input-button" type="button" title="Pronounce entered text">▶</button>
        `;
    
        multiInputContainer.appendChild(newRow);
        // Focus the newly created textarea
        newRow.querySelector('.vocabulary-input').focus();
    }

    function showAnswers() {
        const textareas = multiInputContainer.querySelectorAll('.vocabulary-input.masked');
        textareas.forEach(textarea => {
            textarea.classList.remove('masked');
            textarea.readOnly = false;
        });
        showAnswersButton.disabled = true; // Can only show answers once
    }

    function resetApp() {
        if (!window.confirm("Are you sure you want to reset? All entered text will be cleared.")) {
            return;
        }
        const inputDivs = multiInputContainer.querySelectorAll('.input-with-button');
        inputDivs.forEach(div => {
            const textarea = div.querySelector('.vocabulary-input');
            textarea.value = '';
            textarea.classList.remove('masked');
            textarea.readOnly = false;
            div.classList.remove('hidden');
        });
        setInitialUIState();
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

        multiInputContainer.addEventListener('click', (e) => {
            if (e.target.matches('.pronounce-input-button')) {
                const inputField = e.target.previousElementSibling;
                if (inputField && inputField.matches('.vocabulary-input')) {
                    const text = inputField.value.trim();
                    if (text) {
                        speakText(text, null);
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
        }
    }

    // --- List Actions ---
    function shuffleAllLists() {
        
        allLists.forEach(list => {
            const items = Array.from(list.children);
            // Fisher-Yates shuffle algorithm for an unbiased shuffle
            for (let i = items.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [items[i], items[j]] = [items[j], items[i]];
            }
            // Re-append shuffled items to the DOM
            items.forEach(item => list.appendChild(item));
        });
        saveListsToStorage(); // Persist the new order
        status.textContent = "Lists have been shuffled.";
        setTimeout(() => status.textContent = '', 2000);
    }

    function readAllItems() {
        const allItems = allLists.flatMap(list => 
            Array.from(list.children).map(li => li.querySelector('.item-text').textContent)
        );

        if (allItems.length === 0) {
            alert('There are no items to read.');
            return;
        }

        let currentIndex = 0;
        function speakNext() {
            if (currentIndex < allItems.length) {
                const text = allItems[currentIndex];
                currentIndex++;
                // Use the onEnd callback to create a chain of speech
                speakText(text, speakNext); 
            }
        }
        speakNext();
    }

    function exportListsAsTxt() {
        const data = {
            vocabulary: Array.from(vocabularyList.children).map(li => li.querySelector('.item-text').textContent),
            phrases: Array.from(phraseList.children).map(li => li.querySelector('.item-text').textContent),
            sentences: Array.from(sentenceList.children).map(li => li.querySelector('.item-text').textContent)
        };

        if (data.vocabulary.length === 0 && data.phrases.length === 0 && data.sentences.length === 0) {
            alert('There is nothing to export.');
            return;
        }

        let content = [
            '--- Vocabulary ---\r\n' + data.vocabulary.join('\r\n'),
            '--- Phrases ---\r\n' + data.phrases.join('\r\n'),
            '--- Sentences ---\r\n' + data.sentences.join('\r\n')
        ].filter(section => !section.endsWith('---\r\n')).join('\r\n\r\n');

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

    // --- Local Storage Persistence ---
    function saveListsToStorage() {
        const dataToSave = {
            vocabulary: Array.from(vocabularyList.children).map(li => li.querySelector('.item-text').textContent),
            phrases: Array.from(phraseList.children).map(li => li.querySelector('.item-text').textContent),
            sentences: Array.from(sentenceList.children).map(li => li.querySelector('.item-text').textContent)
        };
        localStorage.setItem(LIST_STORAGE_KEY, JSON.stringify(dataToSave));
    }

    function loadListsFromStorage() {
        const storedData = localStorage.getItem(LIST_STORAGE_KEY);
        if (!storedData) return;

        try {
            const data = JSON.parse(storedData);
            
            allLists.forEach(list => list.innerHTML = ''); // Clear lists before loading

            data.vocabulary?.forEach(text => vocabularyList.appendChild(createVocabularyListItem(text)));
            data.phrases?.forEach(text => phraseList.appendChild(createVocabularyListItem(text)));
            data.sentences?.forEach(text => sentenceList.appendChild(createVocabularyListItem(text)));

            // After loading, ensure the UI state is correct
            updateUIForSetup();

        } catch (e) {
            console.error("Failed to parse lists from localStorage. Clearing corrupted data.", e);
            localStorage.removeItem(LIST_STORAGE_KEY);
        }
    }

    // --- Rate Management ---
    function saveRateToStorage() {
        localStorage.setItem(RATE_STORAGE_KEY, rateSlider.value);
    }

    function loadRateFromStorage() {
        const savedRate = localStorage.getItem(RATE_STORAGE_KEY) || '1.0';
        rateSlider.value = savedRate;
        rateValueDisplay.textContent = `${parseFloat(savedRate).toFixed(1)}x`;
    }

    // --- Pitch Management ---
    function savePitchToStorage() {
        localStorage.setItem(PITCH_STORAGE_KEY, pitchSlider.value);
    }

    function loadPitchFromStorage() {
        const savedPitch = localStorage.getItem(PITCH_STORAGE_KEY) || '1.0';
        pitchSlider.value = savedPitch;
        pitchValueDisplay.textContent = `${parseFloat(savedPitch).toFixed(1)}`;
    }


    // --- Dictation Flow ---
    function startDictation() {
        // Add any pending items from the input fields before starting
        addAllVocabularyItems();

        // First, reset the visual state of all lists for the dictation
        allLists.forEach(list => {
            // Re-apply 'masked' to all items to blur them
            list.querySelectorAll('li').forEach(li => li.classList.add('masked'));
        });

        dictationItems = allLists.flatMap(list => 
            Array.from(list.children).map(li => li.querySelector('.item-text').textContent)
        );

        if (dictationItems.length === 0) {
            alert('Please add some vocabulary, phrases, or sentences to practice.');
            return;
        }


        currentDictationIndex = 0;
        updateUIForDictation();
        // The dictation will now wait for the user to press "Replay" or "Next"
    }

    function speakCurrentItem() {
        if (currentDictationIndex < 0 || currentDictationIndex >= dictationItems.length) {
            return; // Should not happen
        }
        const text = dictationItems[currentDictationIndex];
        speakText(text, () => {
            // The flow now waits for the user to click "Next"
        });
    }

    function nextItem() {
        currentDictationIndex++;
        if (currentDictationIndex < dictationItems.length) {
            speakCurrentItem();
        } else {
            endDictation();
        }
    }

    function endDictation() {
        status.textContent = "Dictation complete! Well done.";
        setTimeout(() => status.textContent = '', 3000);
        updateUIForSetup();
        revealAllAnswers(); // Automatically show all answers at the end
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
            [speakButton, voiceSelect, addButton, vocabularyInput].forEach(el => el.disabled = true);
            return;
        }

        // Load voices
        if (synth.getVoices().length > 0) {
            populateVoiceList();
        } else {
            synth.onvoiceschanged = populateVoiceList;
        }

        // Load saved theme
        loadTheme();

        // Load saved rate
        loadRateFromStorage();

        // Load saved pitch
        loadPitchFromStorage();

        // Load any saved lists from the last session
        loadListsFromStorage();

        // Attach event listeners
        addButton.addEventListener('click', addNewInputLine);

        multiInputContainer.addEventListener('keydown', (e) => {
            if (!e.target.matches('.vocabulary-input')) return;

            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault(); // Prevent new line on Enter
                
                const allInputs = Array.from(multiInputContainer.querySelectorAll('.vocabulary-input'));
                const currentIndex = allInputs.indexOf(e.target);

                if (currentIndex > -1 && currentIndex < allInputs.length - 1) {
                    // If not the last input, move to the next one
                    allInputs[currentIndex + 1].focus();
                } else {
                    // If it's the last input, add a new line, mimicking the '+' button
                    addNewInputLine();
                }
            }
        });

        multiInputContainer.addEventListener('click', (e) => {
            if (e.target.matches('.pronounce-input-button')) {
                const inputField = e.target.previousElementSibling;
                if (inputField && inputField.matches('.vocabulary-input')) {
                    const text = inputField.value.trim();
                    if (text) {
                        speakText(text, null);
                    }
                }
            }
        });

        // Use event delegation for delete buttons
        const categorizedLists = document.getElementById('categorized-lists');
        categorizedLists.addEventListener('click', (e) => {
            if (e.target.matches('.delete-item-btn')) {
                const itemToDelete = e.target.closest('li');
                if (itemToDelete) {
                    // Get the text to display in the confirmation dialog
                    const text = itemToDelete.querySelector('.item-text')?.textContent || 'this item';
                    if (window.confirm(`Are you sure you want to delete "${text}"?`)) {
                        itemToDelete.remove();
                        saveListsToStorage(); // Persist the change only if confirmed
                    }
                }
            }
        });

        speakButton.addEventListener('click', startDictation);


        replayButton.addEventListener('click', speakCurrentItem);
        clearAllButton.addEventListener('click', clearAllLists);
        shuffleButton.addEventListener('click', shuffleAllLists);
        readAllButton.addEventListener('click', readAllItems);
        exportButton.addEventListener('click', exportListsAsTxt);

        nextButton.addEventListener('click', nextItem);

        rateSlider.addEventListener('input', () => {
            // Update the display and format to one decimal place
            rateValueDisplay.textContent = `${parseFloat(rateSlider.value).toFixed(1)}x`;
            saveRateToStorage(); // Save on change

            // If speech is active, restart it with the new parameters
            if (synth.speaking && lastSpokenUtterance.text) {
                speakText(lastSpokenUtterance.text, lastSpokenUtterance.onEnd);
            }
        });

        pitchSlider.addEventListener('input', () => {
            pitchValueDisplay.textContent = `${parseFloat(pitchSlider.value).toFixed(1)}`;
            savePitchToStorage();

            // If speech is active, restart it with the new parameters
            if (synth.speaking && lastSpokenUtterance.text) {
                speakText(lastSpokenUtterance.text, lastSpokenUtterance.onEnd);
            }
        });

        themeSelect.addEventListener('change', (e) => applyTheme(e.target.value));
    }

    init();
});
    }

    function updateUIForDictation() {
        // Loop through all the items, mask entered text and hide empty lines
        const inputFields = multiInputContainer.querySelectorAll('.input-with-button');
        inputFields.forEach(input => {
          const textarea = input.querySelector('.vocabulary-input');
          const text = textarea.value.trim();
          textarea.classList.toggle('masked', !!text);
          input.classList.toggle('hidden', !text);
        });

        vocabularyInputArea.style.display = 'block';
        addButton.disabled = true; // Disable the '+' button during dictation
        speakButton.style.display = 'none';
 