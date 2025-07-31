document.addEventListener('DOMContentLoaded', () => {
    const voiceSelect = document.getElementById('voice-select');
    const speakButton = document.getElementById('speak-button');
    const status = document.getElementById('status');
    const historyList = document.getElementById('history-list');
    const clearHistoryButton = document.getElementById('clear-history-button');
    const copyAllButton = document.getElementById('copy-all-button');
    const vocabularyInput = document.getElementById('vocabulary-input');
    const addButton = document.getElementById('add-button');
    const sentenceList = document.getElementById('sentence-list');

    const replayButton = document.getElementById('replay-button');
    const nextButton = document.getElementById('next-button');
    const playbackControls = document.getElementById('playback-controls');
    const synth = window.speechSynthesis;

    const HISTORY_STORAGE_KEY = 'dictationAppHistory';
    let voices = [];
    // History is now an array of objects: { text: "...", checked: false }
    let history = [];

    function populateVoiceList() {
        voices = synth.getVoices();
        voiceSelect.innerHTML = ''; // Clear existing options

        // Filter for English and Cantonese (zh-HK) voices
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

            // If a Cantonese voice is found, select it by default
            if (!cantoneseVoiceFound && voice.lang.startsWith('zh-HK')) {
                option.selected = true;
                cantoneseVoiceFound = true;
            }

            voiceSelect.appendChild(option);
        });
    }

    // Check for browser support
    if (!('speechSynthesis' in window)) {
        status.textContent = "Sorry, your browser doesn't support text-to-speech.";
        speakButton.disabled = true;
        voiceSelect.disabled = true;
        return;
    }

    // The list of voices is loaded asynchronously.
    // We use onvoiceschanged to know when the list is ready.
    synth.onvoiceschanged = populateVoiceList;

    // Some browsers load voices without firing the event, so we check directly.
    if (synth.getVoices().length > 0) {
        populateVoiceList();
    }

    function saveHistory() {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
    }

    function renderHistory() {
        historyList.innerHTML = ''; // Clear the visual list first
        history.forEach(item => {
            const li = createHistoryElement(item);
            historyList.appendChild(li);
        });
    }

    function createHistoryElement(item) {
        const li = document.createElement('li');

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = item.checked;
        checkbox.addEventListener('change', () => {
            item.checked = checkbox.checked;
            saveHistory();
        });

        const textSpan = document.createElement('span');
        textSpan.className = 'history-text';
        textSpan.textContent = item.text;
        textSpan.addEventListener('click', () => {
            vocabularyInput.value = item.text;
            vocabularyInput.focus();
        });

        li.appendChild(checkbox);
        li.appendChild(textSpan);
        return li;
    }

    function addHistoryItem(text) {
        // Prevent adding empty text or duplicates
        if (!text || history.some(item => item.text === text)) {
            return;
        }

        const newItem = { text: text, checked: false };
        history.unshift(newItem); // Add to the start of the data array

        // Limit history size
        if (history.length > 50) {
            history.pop();
        }

        saveHistory();

        // Add the new item to the top of the visual list
        const li = createHistoryElement(newItem);
        historyList.prepend(li);
    }

    function loadHistory() {
        const storedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
        if (storedHistory) {
            history = JSON.parse(storedHistory);
            renderHistory();
        }
    }

    speakButton.addEventListener('click', () => {
        if (synth.speaking) {
            console.error('Speech synthesis is already in progress.');
            return;
        }

        let listItems = vocabularyList.querySelectorAll('li');
        if (listItems.length === 0) {
            alert('Please add some vocabulary to the list first.');
            playbackControls.style.display = 'none';
            return;
        }

        const textsToSpeak = Array.from(listItems).map(li => li.textContent);

        // Disable buttons during speech
        speakButton.style.display = 'none';
        speakButton.disabled = true;
        showAnswersButton.disabled = true;

        function speakSequentially(texts, index = 0) {
            if (index >= texts.length) {
                // Re-enable buttons when done
                speakButton.disabled = false;
                showAnswersButton.disabled = false;
                speakButton.style.display = 'inline-block';
                return;
            }


            const text = texts[index];
            const utterance = new SpeechSynthesisUtterance(text);

            const selectedVoiceName = voiceSelect.selectedOptions[0].getAttribute('data-name');
            const selectedVoice = voices.find(voice => voice.name === selectedVoiceName);
            if (selectedVoice) {
                utterance.voice = selectedVoice;
            }

            utterance.onend = () => {
                addHistoryItem(text); // Add to history after each item is spoken
                speakSequentially(texts, index + 1); // Speak the next item
            };

            utterance.onerror = (event) => {
                console.error('SpeechSynthesisUtterance.onerror', event);
                status.textContent = `An error occurred during speech: ${event.error}`;
                speakButton.disabled = false; // Re-enable on error
                showAnswersButton.disabled = false;
            };

            synth.speak(utterance);
        }

        playbackControls.style.display = 'block';
        speakSequentially(textsToSpeak);
    });


    nextButton.addEventListener('click', () => {

    });

    addButton.addEventListener('click', () => {
        const text = vocabularyInput.value.trim();
        if (text) {
            const listItem = document.createElement('li');

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            listItem.appendChild(checkbox);

            const textSpan = document.createElement('span');
            textSpan.textContent = text;
            listItem.appendChild(textSpan);

            const playButton = document.createElement('button');
            playButton.textContent = 'Play';
            playButton.addEventListener('click', () => {
                const utterance = new SpeechSynthesisUtterance(text);
                const selectedVoiceName = voiceSelect.selectedOptions[0].getAttribute('data-name');
                const selectedVoice = voices.find(voice => voice.name === selectedVoiceName);
                if (selectedVoice) {
                    utterance.voice = selectedVoice;
                }
                synth.speak(utterance);
            });
            listItem.appendChild(playButton);

            let targetList;
            if (text.split(' ').length === 1) {
                targetList = vocabularyList;
            } else if (text.split('.').length > 1 || text.split('?').length > 1 || text.split('!').length > 1) {
                targetList = sentenceList;
            } else {
                targetList = phraseList;
            }

            targetList.appendChild(listItem);
            vocabularyInput.value = ''; // Clear the input
            listItem.classList.add('masked');

            // Show the "Show Answers" button once there are items in the list

            if (vocabularyList.children.length > 0 || phraseList.children.length > 0 || sentenceList.children.length > 0) {
                showAnswersButton.style.display = 'block';
            } else {
                showAnswersButton.style.display = 'none';
            }






            showAnswersButton.style.display = 'block';
        }
    });

    showAnswersButton.addEventListener('click', () => {
        // Implement the logic to show the answers here
        const listItems = vocabularyList.querySelectorAll('li');
        listItems.forEach(item => item.classList.remove('masked'));
        // For example, you can display a predefined set of answers
        // or fetch them from a server
        alert('Answers will be displayed here.');
        showAnswersButton.style.display = 'none';
    });


    clearHistoryButton.addEventListener('click', () => {
        if (history.length > 0 && confirm('Are you sure you want to clear the entire history? This cannot be undone.')) {
            history = [];
            saveHistory();
            renderHistory(); // This will clear the list visually
        }
    });

    copyAllButton.addEventListener('click', () => {
        if (history.length === 0) {
            alert('History is empty. There is nothing to copy.');
            return;
        }

        // Retrieve all text items from the history array, with each on a new line.
        const allText = history.map(item => item.text).join('\n');

        // Use the Clipboard API to copy the text
        navigator.clipboard.writeText(allText).then(() => {
            // Success feedback
            const originalText = copyAllButton.textContent;
            copyAllButton.textContent = 'Copied!';
            copyAllButton.disabled = true;

            setTimeout(() => {
                copyAllButton.textContent = originalText;
                copyAllButton.disabled = false;
            }, 2000); // Revert back after 2 seconds
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            alert('Could not copy text to clipboard. Please check browser permissions.');
        });
    });

    // Initial load of history from localStorage
    loadHistory();
});