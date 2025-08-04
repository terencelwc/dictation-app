document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element Selection ---
    const themeSelect = document.getElementById('theme-select');
    const voiceSelect = document.getElementById('voice-select');
    const rateSlider = document.getElementById('rate-slider');
    const rateValueDisplay = document.getElementById('rate-value-display');
    const pitchSlider = document.getElementById('pitch-slider');
    const pitchValueDisplay = document.getElementById('pitch-value-display');
    const status = document.getElementById('status');
    const addButton = document.getElementById('add-button');
    
    const vocabularyList = document.getElementById('vocabulary-list');
    const phraseList = document.getElementById('phrase-list');
    const sentenceList = document.getElementById('sentence-list');
    const allLists = [vocabularyList, phraseList, sentenceList];

    const speakButton = document.getElementById('speak-button');
    const showAnswersButton = document.getElementById('show-answers-button');
    
    const playbackControls = document.getElementById('playback-controls');
    const replayButton = document.getElementById('replay-button');
    const nextButton = document.getElementById('next-button');

    const vocabularyInputArea = document.getElementById('vocabulary-input-area');
    const multiInputContainer = document.getElementById('multi-input-container');
    const clearAllButton = document.getElementById('clear-all-button');

    // --- State Management ---
    const synth = window.speechSynthesis;
    const LIST_STORAGE_KEY = 'dictationAppLists';
    const THEME_STORAGE_KEY = 'dictationAppTheme';
    const RATE_STORAGE_KEY = 'dictationAppRate';
    const PITCH_STORAGE_KEY = 'dictationAppPitch';
    let voices = [];
    let dictationItems = [];
    let currentDictationIndex = -1;

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
        
        const utterance = new SpeechSynthesisUtterance(text);
        const selectedVoiceName = voiceSelect.selectedOptions[0]?.getAttribute('data-name');
        const selectedVoice = voices.find(voice => voice.name === selectedVoiceName);
        
        if (selectedVoice) {
            utterance.voice = selectedVoice;
        }

        utterance.rate = parseFloat(rateSlider.value) || 1;
        utterance.pitch = parseFloat(pitchSlider.value) || 1;
        utterance.onend = onEndCallback;
        utterance.onerror = (event) => {
            console.error('SpeechSynthesisUtterance.onerror', event);
            status.textContent = `An error occurred during speech: ${event.error}`;
            updateUIForSetup(); // Reset UI on error
        };

        synth.speak(utterance);
    }

    // --- UI State Management ---
    function updateUIForSetup() {
        playbackControls.style.display = 'none';
        vocabularyInputArea.style.display = 'block';
        speakButton.style.display = 'block';
        speakButton.disabled = false;
        showAnswersButton.style.display = hasItemsInLists() ? 'block' : 'none';
    }

    function updateUIForDictation() {
        playbackControls.style.display = 'flex'; // Use flex for better alignment
        vocabularyInputArea.style.display = 'none';
        speakButton.style.display = 'none';
        showAnswersButton.style.display = 'none';
    }

    // --- Vocabulary & List Management ---
    function hasItemsInLists() {
        return allLists.some(list => list.children.length > 0);
    }

    function addAllVocabularyItems() {
        const inputFields = multiInputContainer.querySelectorAll('.vocabulary-input');
        let itemsAdded = false;

        inputFields.forEach(input => {
            const text = input.value.trim();
            if (text) {
                const listItem = createVocabularyListItem(text);
                
                // Categorize the item
                const words = text.split(/\s+/);
                let targetList;
                if (words.length <= 2) {
                    targetList = vocabularyList;
                } else if (/[.?!]/.test(text)) {
                    targetList = sentenceList;
                } else {
                    targetList = phraseList;
                }

                targetList.appendChild(listItem);
                itemsAdded = true;
            }
        });

        if (itemsAdded) {
            saveListsToStorage();
            inputFields.forEach(input => input.value = ''); // Clear all fields
            inputFields[0].focus(); // Focus the first field
            showAnswersButton.style.display = 'block';
        }
    }

    function createVocabularyListItem(text) {
        const li = document.createElement('li');
        li.className = 'masked'; // Mask by default
        li.textContent = text; // Keep it simple, will be revealed later

        // We can add more controls here later if needed, like a delete button
        return li;
    }

    function revealAllAnswers() {
        allLists.forEach(list => {
            list.querySelectorAll('li.masked').forEach(item => {
                item.classList.remove('masked');
            });
        });
        showAnswersButton.style.display = 'none';
    }

    function revealNextAnswer() {
        // Find the very first element that is still masked across all lists.
        // querySelector is perfect here as it stops at the first match.
        const nextItemToReveal = document.querySelector('.item-list li.masked');

        if (nextItemToReveal) {
            nextItemToReveal.classList.remove('masked');
        }

        // After revealing, check if any more masked items are left.
        // If not, hide the button because the job is done.
        if (!document.querySelector('.item-list li.masked')) {
            showAnswersButton.style.display = 'none';
        }
    }

    function clearAllLists() {
        allLists.forEach(list => list.innerHTML = ''); // Clear the DOM lists
        localStorage.removeItem(LIST_STORAGE_KEY); // Clear the stored data
        dictationItems = []; // Clear current dictation items, if any
        currentDictationIndex = -1;
        updateUIForSetup();
    }

    // --- Local Storage Persistence ---
    function saveListsToStorage() {
        const dataToSave = {
            vocabulary: Array.from(vocabularyList.children).map(li => li.textContent),
            phrases: Array.from(phraseList.children).map(li => li.textContent),
            sentences: Array.from(sentenceList.children).map(li => li.textContent)
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
        dictationItems = allLists.flatMap(list => 
            Array.from(list.children).map(li => li.textContent)
        );

        if (dictationItems.length === 0) {
            alert('Please add some vocabulary, phrases, or sentences to practice.');
            return;
        }

        // Shuffle the items for a random order
        dictationItems.sort(() => Math.random() - 0.5);

        currentDictationIndex = 0;
        updateUIForDictation();
        speakCurrentItem();
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
        addButton.addEventListener('click', addAllVocabularyItems);

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
                    // If it's the last input, trigger the add button
                    addButton.click();
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

        speakButton.addEventListener('click', startDictation);
        showAnswersButton.addEventListener('click', revealNextAnswer);

        replayButton.addEventListener('click', speakCurrentItem);
        clearAllButton.addEventListener('click', clearAllLists);

        nextButton.addEventListener('click', nextItem);

        rateSlider.addEventListener('input', () => {
            // Update the display and format to one decimal place
            rateValueDisplay.textContent = `${parseFloat(rateSlider.value).toFixed(1)}x`;
            saveRateToStorage(); // Save on change
        });

        pitchSlider.addEventListener('input', () => {
            pitchValueDisplay.textContent = `${parseFloat(pitchSlider.value).toFixed(1)}`;
            savePitchToStorage();
        });

        themeSelect.addEventListener('change', (e) => applyTheme(e.target.value));
    }

    init();
});