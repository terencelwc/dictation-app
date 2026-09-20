(function () {
    var currentText = '';
    var paused = false;
    function isChinese(text) { return /[\u4e00-\u9fff]/.test(text || ''); }
    function synth() { return window.speechSynthesis; }
    function voices() {
        try { return synth().getVoices() || []; } catch (e) { return []; }
    }
    function pick(text) {
        var list = voices();
        var sel = document.getElementById('voice-select');
        var opt = sel && sel.selectedOptions && sel.selectedOptions[0];
        var name = opt && opt.getAttribute('data-name');
        var lang = opt && opt.getAttribute('data-lang');
        var zh = isChinese(text);
        var voice = list.find(function (v) { return name && v.name === name; });
        if (voice) {
            var vl = String(voice.lang || '').toLowerCase();
            var voiceZh = vl.indexOf('zh') === 0 || vl.indexOf('yue') === 0 || vl.indexOf('cmn') === 0;
            if (voiceZh !== zh) voice = null;
        }
        if (!voice) {
            voice = list.find(function (v) {
                var l = String(v.lang || '').toLowerCase();
                var n = String(v.name || '').toLowerCase();
                if (zh) return l.indexOf('zh-hk') === 0 || l.indexOf('yue') === 0 || n.indexOf('hong kong') >= 0 || n.indexOf('cantonese') >= 0 || n.indexOf('香港') >= 0 || n.indexOf('sin') >= 0;
                return l.indexOf('en') === 0;
            }) || list.find(function (v) {
                var l = String(v.lang || '').toLowerCase();
                return zh ? (l.indexOf('zh') === 0 || l.indexOf('yue') === 0) : l.indexOf('en') === 0;
            });
        }
        return { voice: voice, lang: (voice && voice.lang) || lang || (zh ? 'zh-HK' : 'en-GB') };
    }
    function stopAll() {
        try { if (synth()) synth().cancel(); } catch (e) {}
        currentText = '';
        paused = false;
    }
    function start(text, onEnd) {
        var s = synth();
        if (!s) return;
        try { s.cancel(); } catch (e) {}
        var rateEl = document.getElementById('rate-slider');
        var pitchEl = document.getElementById('pitch-slider');
        var u = new SpeechSynthesisUtterance(String(text));
        var chosen = pick(text);
        if (chosen.voice) u.voice = chosen.voice;
        u.lang = chosen.lang;
        u.rate = parseFloat(rateEl && rateEl.value) || 1;
        u.pitch = parseFloat(pitchEl && pitchEl.value) || 1;
        u.volume = 1;
        u.onend = function () {
            currentText = '';
            paused = false;
            if (typeof onEnd === 'function') onEnd();
        };
        u.onerror = function () {
            currentText = '';
            paused = false;
        };
        currentText = String(text);
        paused = false;
        function go() {
            try { if (s.paused) s.resume(); } catch (e) {}
            s.speak(u);
        }
        setTimeout(go, 40);
    }
    function toggle(text, onEnd) {
        if (!text || !synth()) return;
        var s = synth();
        var same = currentText === String(text);
        if (same && paused) {
            paused = false;
            try { s.resume(); } catch (e) {}
            if (!s.speaking) start(text, onEnd);
            return;
        }
        if (same && (s.speaking || s.pending)) {
            try { s.pause(); } catch (e) {}
            paused = true;
            setTimeout(function () {
                if (paused && s.speaking && !s.paused) stopAll();
            }, 120);
            return;
        }
        start(text, onEnd);
    }
    function unlock() {
        try {
            var s = synth();
            if (!s) return;
            s.getVoices();
        } catch (e) {}
    }
    function shouldStopForLeave(e) {
        if (!e || !e.target) return false;
        if (e.target.id === 'meaning-modal' || e.target.id === 'feedback-modal') return true;
        if (e.target.closest && e.target.closest('.modal-close-btn')) return true;
        return false;
    }
    document.addEventListener('touchstart', unlock, true);
    document.addEventListener('click', function (e) {
        unlock();
        if (shouldStopForLeave(e)) {
            stopAll();
            return;
        }
        var play = e.target.closest && e.target.closest('.pronounce-input-button');
        if (play) {
            var wrap = play.closest('.input-with-button');
            var input = wrap && wrap.querySelector('.vocabulary-input');
            var text = input && input.value.trim();
            if (text) {
                e.preventDefault();
                e.stopImmediatePropagation();
                toggle(text);
            }
            return;
        }
        var mini = e.target.closest && e.target.closest('[data-speak]');
        if (mini) {
            var said = mini.getAttribute('data-speak');
            if (said) {
                e.preventDefault();
                e.stopImmediatePropagation();
                toggle(said);
            }
        }
    }, true);
    document.addEventListener('visibilitychange', function () {
        if (document.hidden) stopAll();
    });
    window.addEventListener('pagehide', stopAll);
    window.addEventListener('beforeunload', stopAll);
    window.DictationSpeak = toggle;
    window.DictationSpeakStop = stopAll;
})();
