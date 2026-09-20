(function () {
    var currentText = '';
    var paused = false;
    var finished = false;
    var activeBtn = null;
    var queue = [];
    var playToken = 0;
    var ICON_PLAY = '\u25B6\uFE0F';
    var ICON_PAUSE = '\u23F8\uFE0F';
    var ICON_REPLAY = '\u21A9\uFE0F';
    function isChinese(text) { return /[\u4e00-\u9fff]/.test(text || ''); }
    function synth() { return window.speechSynthesis; }
    function isExplainIcon(btn) {
        return !!(btn && btn.matches && btn.matches('#meaning-modal button.speak-mini[data-speak]:not(.rel-chip)'));
    }
    function setIcon(btn, icon) {
        if (!isExplainIcon(btn)) return;
        btn.textContent = icon;
    }
    function markIdle(btn) { setIcon(btn, ICON_PLAY); }
    function markPlaying(btn) { setIcon(btn, ICON_PAUSE); }
    function markPaused(btn) { setIcon(btn, ICON_PLAY); }
    function markReplay(btn) { setIcon(btn, ICON_REPLAY); }
    function resetOtherButtons() {
        document.querySelectorAll('#meaning-modal button.speak-mini[data-speak]:not(.rel-chip)').forEach(function (btn) {
            if (btn !== activeBtn) markIdle(btn);
        });
    }
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
    function hardStop() {
        var s = synth();
        if (!s) return;
        try { s.cancel(); } catch (e) {}
        try {
            var mute = new SpeechSynthesisUtterance('.');
            mute.volume = 0;
            mute.rate = 2;
            s.speak(mute);
            s.cancel();
        } catch (e) {}
    }
    function stopAll() {
        playToken += 1;
        queue = [];
        hardStop();
        currentText = '';
        paused = false;
        finished = false;
        var btn = activeBtn;
        activeBtn = null;
        if (btn) markIdle(btn);
        resetOtherButtons();
    }
    function chunks(text) {
        var src = String(text || '').trim();
        if (src.length <= 160) return [src];
        var parts = src.split(/([.!?\u3002\uff01\uff1f]\s*)/);
        var out = [];
        var buf = '';
        for (var i = 0; i < parts.length; i++) {
            var piece = parts[i];
            if (!piece) continue;
            if ((buf + piece).length > 160 && buf) {
                out.push(buf.trim());
                buf = piece;
            } else buf += piece;
        }
        if (buf.trim()) out.push(buf.trim());
        return out.length ? out : [src];
    }
    function speakNext(token, onEnd) {
        if (token !== playToken || paused) return;
        var part = queue.shift();
        if (!part) {
            finished = true;
            paused = false;
            if (activeBtn) markReplay(activeBtn);
            if (typeof onEnd === 'function') onEnd();
            return;
        }
        var s = synth();
        if (!s) return;
        var rateEl = document.getElementById('rate-slider');
        var pitchEl = document.getElementById('pitch-slider');
        var u = new SpeechSynthesisUtterance(part);
        var chosen = pick(part);
        if (chosen.voice) u.voice = chosen.voice;
        u.lang = chosen.lang;
        u.rate = parseFloat(rateEl && rateEl.value) || 1;
        u.pitch = parseFloat(pitchEl && pitchEl.value) || 1;
        u.volume = 1;
        u.onend = function () { speakNext(token, onEnd); };
        u.onerror = function () { speakNext(token, onEnd); };
        try { if (s.paused) s.resume(); } catch (e) {}
        s.speak(u);
    }
    function start(text, onEnd) {
        hardStop();
        playToken += 1;
        var token = playToken;
        currentText = String(text);
        paused = false;
        finished = false;
        queue = chunks(text);
        resetOtherButtons();
        if (activeBtn) markPlaying(activeBtn);
        setTimeout(function () { speakNext(token, onEnd); }, 30);
    }
    function toggle(text, onEnd, btn) {
        if (!text || !synth()) return;
        var s = synth();
        var same = currentText === String(text);
        if (isExplainIcon(btn)) activeBtn = btn;
        if (same && finished) { start(text, onEnd); return; }
        if (same && paused) {
            paused = false;
            finished = false;
            if (activeBtn) markPlaying(activeBtn);
            try { s.resume(); } catch (e) {}
            if (!s.speaking && queue.length) speakNext(playToken, onEnd);
            else if (!s.speaking) start(text, onEnd);
            return;
        }
        if (same && (s.speaking || s.pending || queue.length)) {
            paused = true;
            try { s.pause(); } catch (e) {}
            if (activeBtn) markPaused(activeBtn);
            setTimeout(function () {
                if (!paused) return;
                if (s.speaking && !s.paused) {
                    hardStop();
                    queue = [];
                    finished = true;
                    if (activeBtn) markReplay(activeBtn);
                }
            }, 80);
            return;
        }
        start(text, onEnd);
    }
    function unlock() {
        try { if (synth()) synth().getVoices(); } catch (e) {}
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
        if (shouldStopForLeave(e)) { stopAll(); return; }
        var play = e.target.closest && e.target.closest('.pronounce-input-button');
        if (play) {
            var wrap = play.closest('.input-with-button');
            var input = wrap && wrap.querySelector('.vocabulary-input');
            var text = input && input.value.trim();
            if (text) {
                e.preventDefault();
                e.stopImmediatePropagation();
                toggle(text, null, null);
            }
            return;
        }
        var mini = e.target.closest && e.target.closest('#meaning-modal [data-speak]');
        if (mini) {
            var said = mini.getAttribute('data-speak');
            if (said) {
                e.preventDefault();
                e.stopImmediatePropagation();
                toggle(said, null, mini);
            }
        }
    }, true);
    document.addEventListener('visibilitychange', function () { if (document.hidden) stopAll(); });
    window.addEventListener('pagehide', stopAll);
    window.addEventListener('beforeunload', stopAll);
    window.DictationSpeak = function (text, onEnd) { toggle(text, onEnd, activeBtn); };
    window.DictationSpeakStop = stopAll;
})();
