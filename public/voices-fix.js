/* Overrides default voice curation: Cantonese default + English. */
(function () {
    const LANG_PREF_KEY = 'dictationAppLangPref';
    const VOICE_PREF_KEY = 'dictationAppVoiceName';
    const blacklisted = new Set([
        'Albert', 'Bahh', 'Bells', 'Boing', 'Bubbles', 'Cellos', 'Deranged',
        'Eddy', 'Flo', 'Good News', 'Hysterical', 'Jester', 'Organ', 'Pipe Organ',
        'Rocko', 'Superstar', 'Trinoids', 'Whisper', 'Zarvox'
    ]);

    function ready(fn) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', fn);
        } else {
            fn();
        }
    }

    function normLang(lang) {
        return String(lang || '').toLowerCase().replace('_', '-');
    }

    function isCantonese(v) {
        const l = normLang(v.lang);
        const n = String(v.name || '').toLowerCase();
        return l.startsWith('zh-hk') || l.startsWith('yue') ||
            n.includes('cantonese') || n.includes('hong kong') ||
            n.includes('香港') || n.includes('粵') || n.includes('粤') ||
            n.includes('sinji') || n.includes('sin-ji') || n.includes('sin ji');
    }

    function isEnglish(v) {
        return normLang(v.lang).startsWith('en');
    }

    function isMandarin(v) {
        const l = normLang(v.lang);
        const n = String(v.name || '').toLowerCase();
        if (isCantonese(v)) return false;
        return l.startsWith('zh-cn') || l.startsWith('zh-tw') || l.startsWith('cmn') ||
            n.includes('普通话') || n.includes('國語') || n.includes('国语') ||
            n.includes('ting') || n.includes('婷婷');
    }

    function kindOf(v) {
        if (isCantonese(v)) return 'yue';
        if (isEnglish(v)) return 'en';
        if (isMandarin(v)) return 'cmn';
        return 'other';
    }

    ready(function () {
        const synth = window.speechSynthesis;
        const voiceSelect = document.getElementById('voice-select');
        const status = document.getElementById('status');
        if (!synth || !voiceSelect) return;

        if (!localStorage.getItem(LANG_PREF_KEY)) {
            localStorage.setItem(LANG_PREF_KEY, 'yue');
        }

        function updateChips(pref) {
            document.querySelectorAll('.lang-chip').forEach(function (btn) {
                btn.classList.toggle('active', btn.dataset.lang === pref);
            });
        }

        function updateHint(hasYue) {
            const hint = document.getElementById('voice-hint');
            if (!hint) return;
            hint.textContent = hasYue ? '' :
                '未找到廣東話語音。Android：設定 → 無障礙 → 文字轉語音 → 安裝「中文（香港）」。iPad：設定 → 輔助使用 → 口述內容 → 聲音 → 加入廣東話。 / No Cantonese voice on this phone. Install Chinese (Hong Kong) TTS.';
        }

        function addOption(parent, voice, selectedName) {
            const option = document.createElement('option');
            option.textContent = voice.name + ' (' + voice.lang + ')';
            option.setAttribute('data-lang', voice.lang);
            option.setAttribute('data-name', voice.name);
            option.value = voice.name;
            if (selectedName && voice.name === selectedName) option.selected = true;
            parent.appendChild(option);
        }

        function selectPref(pref) {
            const options = Array.from(voiceSelect.querySelectorAll('option'));
            if (!options.length) return;
            const match = options.find(function (o) {
                return kindOf({ name: o.getAttribute('data-name'), lang: o.getAttribute('data-lang') }) === pref;
            });
            (match || options[0]).selected = true;
            localStorage.setItem(VOICE_PREF_KEY, voiceSelect.selectedOptions[0] && voiceSelect.selectedOptions[0].getAttribute('data-name') || '');
        }

        function populate() {
            const voices = synth.getVoices() || [];
            voiceSelect.innerHTML = '';

            if (!voices.length) {
                if (status) status.textContent = '正在載入語音 Loading TTS voices…';
                return false;
            }

            const usable = voices.filter(function (v) { return !blacklisted.has(v.name); });
            const yue = usable.filter(isCantonese);
            const en = usable.filter(isEnglish);
            const cmn = usable.filter(isMandarin);
            const pref = localStorage.getItem(LANG_PREF_KEY) || 'yue';
            const savedName = localStorage.getItem(VOICE_PREF_KEY);
            const savedKind = savedName ? kindOf({ name: savedName, lang: '' }) : '';
            const keepSaved = savedName && (pref === 'en' ? savedKind === 'en' : pref === 'yue' ? (isCantonese({ name: savedName, lang: '' }) || yue.some(function (v) { return v.name === savedName; })) : false);

            function group(label, list) {
                if (!list.length) return;
                const g = document.createElement('optgroup');
                g.label = label;
                list.forEach(function (v) { addOption(g, v, keepSaved ? savedName : null); });
                voiceSelect.appendChild(g);
            }

            group('廣東話 Cantonese', yue);
            group('英語 English', en);
            group('普通話 Mandarin（備用）', cmn);

            if (!voiceSelect.options.length) {
                usable.slice(0, 20).forEach(function (v) { addOption(voiceSelect, v, null); });
            }

            if (status) status.textContent = '';
            updateHint(yue.length > 0);
            selectPref(pref);
            updateChips(pref);
            return true;
        }

        populate();
        synth.onvoiceschanged = populate;
        var tries = 0;
        var timer = setInterval(function () {
            tries += 1;
            if (populate() || tries >= 15) clearInterval(timer);
        }, 400);

        document.getElementById('lang-yue') && document.getElementById('lang-yue').addEventListener('click', function () {
            localStorage.setItem(LANG_PREF_KEY, 'yue');
            updateChips('yue');
            selectPref('yue');
        });
        document.getElementById('lang-en') && document.getElementById('lang-en').addEventListener('click', function () {
            localStorage.setItem(LANG_PREF_KEY, 'en');
            updateChips('en');
            selectPref('en');
        });
        voiceSelect.addEventListener('change', function () {
            localStorage.setItem(VOICE_PREF_KEY, voiceSelect.selectedOptions[0] && voiceSelect.selectedOptions[0].getAttribute('data-name') || '');
        });
    });
})();
