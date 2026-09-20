(function () {
    var KEY = 'dictationAppUiLang';
    var STR = {
        zh: {
            title: '聽寫練習',
            subtitle: '輸入詞語，然後開始練習。',
            themeLabel: '主題',
            chipYue: '廣東話',
            chipCmn: '普通話',
            chipEn: '英語',
            voiceLabel: '語音',
            speedLabel: '速度',
            pitchLabel: '音調',
            btnStart: '開始聽寫',
            btnShuffle: '打亂',
            btnReadAll: '全部朗讀',
            btnAnswers: '顯示答案',
            btnExport: '匯出',
            btnReset: '重設',
            feedback: '意見回饋',
            feedbackTitle: '意見回饋',
            feedbackBody: '有建議或發現問題？請告訴我。',
            feedbackPh: '你的意見…',
            feedbackSend: '以電郵傳送',
            pageTitle: '聽寫練習',
            itemPh: '輸入第 {n} 項…',
            speak: '朗讀',
            posNoun: '名詞',
            posVerb: '動詞',
            posAdj: '形容詞',
            posAdv: '副詞',
            posPron: '代名詞',
            posPrep: '介詞',
            posConj: '連接詞',
            posInt: '感嘆詞',
            posDet: '限定詞',
            posOther: '其他',
            defEn: '英文解釋',
            defZh: '中文解釋',
            examples: '例句',
            synonyms: '同義詞',
            antonyms: '反義詞',
            looking: '查詞典中…',
            noDef: '找不到詳細解釋。',
            voiceHintYue: '未找到廣東話語音。請在系統安裝「中文（香港）」。',
            voiceHintCmn: '未找到普通話語音。請在系統安裝「中文（中國大陸）」。'
        },
        en: {
            title: 'Dictation Practice',
            subtitle: 'Enter words, then start your practice.',
            themeLabel: 'Theme',
            chipYue: 'Cantonese',
            chipCmn: 'Mandarin',
            chipEn: 'English',
            voiceLabel: 'Voice',
            speedLabel: 'Speed',
            pitchLabel: 'Pitch',
            btnStart: 'Start',
            btnShuffle: 'Shuffle',
            btnReadAll: 'Read all',
            btnAnswers: 'Answers',
            btnExport: 'Export',
            btnReset: 'Reset',
            feedback: 'Feedback',
            feedbackTitle: 'Send Feedback',
            feedbackBody: 'Have a suggestion or found a bug? Let me know.',
            feedbackPh: 'Your feedback…',
            feedbackSend: 'Send via Email',
            pageTitle: 'Dictation Practice',
            itemPh: 'Enter item {n}…',
            speak: 'Speak',
            posNoun: 'noun',
            posVerb: 'verb',
            posAdj: 'adjective',
            posAdv: 'adverb',
            posPron: 'pronoun',
            posPrep: 'preposition',
            posConj: 'conjunction',
            posInt: 'interjection',
            posDet: 'determiner',
            posOther: 'other',
            defEn: 'English',
            defZh: 'Chinese',
            examples: 'Examples',
            synonyms: 'Synonyms',
            antonyms: 'Antonyms',
            looking: 'Looking up…',
            noDef: 'No detailed definition found.',
            voiceHintYue: 'No Cantonese voice. Install Chinese (Hong Kong) TTS.',
            voiceHintCmn: 'No Mandarin voice. Install Chinese (China) TTS.'
        }
    };

    function getUi() {
        return localStorage.getItem(KEY) === 'en' ? 'en' : 'zh';
    }
    function t(key) {
        return (STR[getUi()] || STR.zh)[key] || key;
    }
    function apply(ui) {
        localStorage.setItem(KEY, ui);
        document.documentElement.lang = ui === 'en' ? 'en' : 'zh-HK';
        document.documentElement.setAttribute('data-ui', ui);
        document.title = t('pageTitle');
        document.querySelectorAll('[data-i18n]').forEach(function (el) {
            el.textContent = t(el.getAttribute('data-i18n'));
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
            el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
        });
        document.querySelectorAll('#theme-select option').forEach(function (opt) {
            opt.textContent = opt.getAttribute(ui === 'en' ? 'data-en' : 'data-zh') || opt.textContent;
        });
        var i = 0;
        document.querySelectorAll('#multi-input-container .vocabulary-input').forEach(function (ta) {
            i += 1;
            ta.placeholder = t('itemPh').replace('{n}', String(i));
        });
        var toggle = document.getElementById('ui-lang-toggle');
        if (toggle) toggle.setAttribute('data-ui', ui);
        document.dispatchEvent(new CustomEvent('dictation-ui-lang', { detail: { ui: ui } }));
    }
    function boot() {
        apply(getUi());
        var btn = document.getElementById('ui-lang-toggle');
        if (btn) btn.addEventListener('click', function () { apply(getUi() === 'zh' ? 'en' : 'zh'); });
        var box = document.getElementById('multi-input-container');
        if (box) {
            new MutationObserver(function () {
                var i = 0;
                box.querySelectorAll('.vocabulary-input').forEach(function (ta) {
                    i += 1;
                    ta.placeholder = t('itemPh').replace('{n}', String(i));
                });
            }).observe(box, { childList: true, subtree: true });
        }
    }
    window.DictationI18n = { getUi: getUi, t: t, apply: apply };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();
