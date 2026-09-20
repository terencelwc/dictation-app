(function () {
    function isChinese(text) { return /[\u4e00-\u9fff]/.test(text || ''); }
    function voices() {
        try { return window.speechSynthesis.getVoices() || []; } catch (e) { return []; }
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
    function speak(text, onEnd) {
        if (!text || !window.speechSynthesis) return;
        var synth = window.speechSynthesis;
        var rateEl = document.getElementById('rate-slider');
        var pitchEl = document.getElementById('pitch-slider');
        var u = new SpeechSynthesisUtterance(String(text));
        var chosen = pick(text);
        if (chosen.voice) u.voice = chosen.voice;
        u.lang = chosen.lang;
        u.rate = parseFloat(rateEl && rateEl.value) || 1;
        u.pitch = parseFloat(pitchEl && pitchEl.value) || 1;
        u.volume = 1;
        if (typeof onEnd === 'function') u.onend = onEnd;
        u.onerror = function () { if (typeof onEnd === 'function') onEnd(); };
        function go() {
            try { if (synth.paused) synth.resume(); } catch (e) {}
            synth.speak(u);
            try { if (synth.paused) synth.resume(); } catch (e) {}
        }
        try {
            if (synth.speaking || synth.pending) {
                synth.cancel();
                setTimeout(go, 60);
            } else {
                go();
            }
        } catch (e) {
            setTimeout(go, 60);
        }
    }
    function unlock() {
        try {
            var s = window.speechSynthesis;
            if (!s) return;
            s.getVoices();
            if (s.paused) s.resume();
        } catch (e) {}
    }
    document.addEventListener('touchstart', unlock, true);
    document.addEventListener('click', unlock, true);
    window.DictationSpeak = speak;
})();
