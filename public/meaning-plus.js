(function () {
    var POS = { noun:'posNoun', verb:'posVerb', adjective:'posAdj', adverb:'posAdv', pronoun:'posPron', preposition:'posPrep', conjunction:'posConj', interjection:'posInt', determiner:'posDet', article:'posDet' };
    function t(k){ return window.DictationI18n ? window.DictationI18n.t(k) : k; }
    function isChinese(text){ return /[\u4e00-\u9fff\u3400-\u4dbf]/.test(text); }
    function esc(s){ return String(s||'').replace(/[&<>"]/g, function(c){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]; }); }
    function speakBtn(text){ if(!text) return ''; return '<button type="button" class="speak-mini" data-speak="'+esc(text)+'">\u25b6 '+esc(t('speak'))+'</button>'; }
    function cleanWord(s){ return String(s||'').toLowerCase().replace(/[^a-z'\- ]/g,'').trim(); }
    function fetchJson(url, ms){
        ms = ms || 8000;
        var ctrl = new AbortController();
        var id = setTimeout(function(){ ctrl.abort(); }, ms);
        return fetch(url, { signal: ctrl.signal }).then(function(r){ if(!r.ok) throw new Error('bad'); return r.json(); }).finally(function(){ clearTimeout(id); });
    }
    function translate(text, sl, tl){
        var url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl='+sl+'&tl='+tl+'&dt=t&q='+encodeURIComponent(text);
        return fetchJson(url, 8000).then(function(data){ return data[0] ? data[0].map(function(row){ return row[0]; }).join('') : ''; }).catch(function(){ return ''; });
    }
    function lookupDictionaryApi(word){
        return fetchJson('https://api.dictionaryapi.dev/api/v2/entries/en/'+encodeURIComponent(word), 9000)
            .then(function(data){ return Array.isArray(data) ? data[0] : null; })
            .catch(function(){ return null; });
    }
    function lookupDatamuse(word){
        return Promise.all([
            fetchJson('https://api.datamuse.com/words?sp='+encodeURIComponent(word)+'&md=dp&max=1', 8000).catch(function(){ return []; }),
            fetchJson('https://api.datamuse.com/words?rel_syn='+encodeURIComponent(word)+'&max=8', 8000).catch(function(){ return []; }),
            fetchJson('https://api.datamuse.com/words?rel_ant='+encodeURIComponent(word)+'&max=8', 8000).catch(function(){ return []; })
        ]).then(function(res){
            var head = res[0] && res[0][0];
            var syn = (res[1]||[]).map(function(w){ return w.word; });
            var ant = (res[2]||[]).map(function(w){ return w.word; });
            if (!head && !syn.length && !ant.length) return null;
            var meanings = [];
            var tags = (head && head.tags) || [];
            var defs = (head && head.defs) || [];
            if (defs.length) {
                var groups = {};
                defs.forEach(function(line){
                    var parts = String(line).split('\t');
                    var pos = parts[0] || 'other';
                    var def = parts.slice(1).join('\t');
                    var map = { n:'noun', v:'verb', adj:'adjective', adv:'adverb', u:'other' };
                    var name = map[pos] || pos;
                    if (!groups[name]) groups[name] = [];
                    groups[name].push({ definition: def });
                });
                Object.keys(groups).forEach(function(pos){
                    meanings.push({ partOfSpeech: pos, definitions: groups[pos], synonyms: syn, antonyms: ant });
                });
            } else {
                meanings.push({ partOfSpeech: (tags[0]||'other'), definitions: [{ definition: word }], synonyms: syn, antonyms: ant });
            }
            return { word: word, meanings: meanings };
        }).catch(function(){ return null; });
    }
    function mergeEntries(a, b){
        if (a && a.meanings && a.meanings.length) {
            if (b && b.meanings && b.meanings[0]) {
                var syn = b.meanings[0].synonyms || [];
                var ant = b.meanings[0].antonyms || [];
                a.meanings.forEach(function(m){
                    m.synonyms = Array.from(new Set([].concat(m.synonyms||[], syn)));
                    m.antonyms = Array.from(new Set([].concat(m.antonyms||[], ant)));
                });
            }
            return a;
        }
        return b;
    }
    function pinyinOf(text){
        try { if (typeof window.pinyin === 'function') return window.pinyin(text,{style:window.pinyin.STYLE_TONE}).map(function(a){return a[0];}).join(' '); } catch(e){}
        return '';
    }
    function posLabel(pos){
        var key = POS[String(pos||'').toLowerCase()] || 'posOther';
        var label = t(key);
        return (window.DictationI18n && window.DictationI18n.getUi()==='zh') ? (label + ' / ' + (pos||'')) : (pos || label);
    }
    function chips(label, list){
        if (!list || !list.length) return '';
        var html = '<p class="rel"><strong>'+esc(label)+':</strong> ';
        list.slice(0,8).forEach(function(s){ html += '<button type="button" class="rel-chip speak-mini" data-speak="'+esc(s)+'">'+esc(s)+'</button> '; });
        return html + '</p>';
    }
    function renderEntry(word, entry, otherWord, zhDefs){
        var html = '<div class="meaning-head"><h3>'+esc(word)+'</h3>'+speakBtn(word)+'</div>';
        if (otherWord && otherWord !== word) html += '<p class="meaning-zh-word">'+esc(otherWord)+speakBtn(otherWord)+'</p>';
        var py = isChinese(word) ? pinyinOf(word) : '';
        if (py) html += '<p class="pinyin">'+esc(py)+'</p>';
        if (entry && entry.meanings && entry.meanings.length){
            entry.meanings.slice(0,4).forEach(function(m){
                html += '<section class="pos-block"><span class="pos-tag">'+esc(posLabel(m.partOfSpeech))+'</span>';
                (m.definitions||[]).slice(0,3).forEach(function(d, idx){
                    html += '<div class="def-row">';
                    if (d.definition) html += '<p><strong>'+esc(t('defEn'))+':</strong> '+esc(d.definition)+speakBtn(d.definition)+'</p>';
                    var zh = zhDefs && zhDefs[m.partOfSpeech+'-'+idx];
                    if (zh) html += '<p><strong>'+esc(t('defZh'))+':</strong> '+esc(zh)+speakBtn(zh)+'</p>';
                    if (d.example) html += '<p class="ex"><strong>'+esc(t('examples'))+':</strong> '+esc(d.example)+speakBtn(d.example)+'</p>';
                    html += '</div>';
                });
                var syn = [].concat(m.synonyms||[]);
                var ant = [].concat(m.antonyms||[]);
                (m.definitions||[]).forEach(function(d){ if (d.synonyms) syn = syn.concat(d.synonyms); if (d.antonyms) ant = ant.concat(d.antonyms); });
                html += chips(t('synonyms'), Array.from(new Set(syn)));
                html += chips(t('antonyms'), Array.from(new Set(ant)));
                html += '</section>';
            });
        } else {
            html += '<p>'+esc(t('noDef'))+'</p>';
            if (otherWord) html += '<p>'+esc(otherWord)+'</p>';
        }
        return html;
    }
    function speak(text){
        if (!text || !window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        var u = new SpeechSynthesisUtterance(text);
        var voices = window.speechSynthesis.getVoices() || [];
        var chinese = isChinese(text);
        var voice = voices.find(function(v){
            var l = String(v.lang||'').toLowerCase();
            return chinese ? (l.indexOf('zh')===0 || l.indexOf('yue')===0 || l.indexOf('cmn')===0) : l.indexOf('en')===0;
        });
        if (voice) { u.voice = voice; u.lang = voice.lang; }
        else u.lang = chinese ? 'zh-HK' : 'en-US';
        window.speechSynthesis.speak(u);
    }
    async function showRich(text){
        var modal = document.getElementById('meaning-modal');
        var box = document.getElementById('meaning-text');
        if (!modal || !box) return;
        box.innerHTML = '<div class="loader"></div><p>'+esc(t('looking'))+'</p>';
        modal.style.display = 'flex';
        var sourceZh = isChinese(text);
        var enWord = text;
        var zhWord = sourceZh ? text : '';
        try {
            if (sourceZh) enWord = await translate(text, 'auto', 'en') || text;
            else zhWord = await translate(text, 'en', 'zh-TW') || '';
            var key = cleanWord(enWord) || cleanWord(text) || text;
            var pair = await Promise.all([lookupDictionaryApi(key), lookupDatamuse(key)]);
            var entry = mergeEntries(pair[0], pair[1]);
            var zhDefs = {};
            if (entry && entry.meanings) {
                var jobs = [];
                entry.meanings.slice(0,4).forEach(function(m){
                    (m.definitions||[]).slice(0,3).forEach(function(d, idx){
                        if (!d.definition) return;
                        jobs.push(translate(d.definition, 'en', 'zh-TW').then(function(zh){ zhDefs[m.partOfSpeech+'-'+idx] = zh; }));
                    });
                });
                await Promise.all(jobs);
            }
            box.innerHTML = renderEntry(sourceZh ? text : key, entry, sourceZh ? enWord : zhWord, zhDefs);
        } catch (e) {
            box.innerHTML = '<p>'+esc(t('noDef'))+'</p>';
        }
    }
    function boot(){
        var box = document.getElementById('multi-input-container');
        if (box) {
            box.addEventListener('click', function(e){
                if (!e.target.matches('.search-button')) return;
                var input = e.target.closest('.input-with-button') && e.target.closest('.input-with-button').querySelector('.vocabulary-input');
                var text = input && input.value.trim();
                if (!text) return;
                e.stopImmediatePropagation();
                e.preventDefault();
                showRich(text);
            }, true);
        }
        var meaning = document.getElementById('meaning-modal');
        if (meaning) {
            meaning.addEventListener('click', function(e){
                var btn = e.target.closest('[data-speak]');
                if (btn) { e.preventDefault(); speak(btn.getAttribute('data-speak')); }
            });
        }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();
