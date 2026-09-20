(function () {
    var POS = { noun:'posNoun', verb:'posVerb', adjective:'posAdj', adverb:'posAdv', pronoun:'posPron', preposition:'posPrep', conjunction:'posConj', interjection:'posInt', determiner:'posDet', article:'posDet' };
    function t(k){ return window.DictationI18n ? window.DictationI18n.t(k) : k; }
    function isChinese(text){ return /[\u4e00-\u9fff]/.test(text || ''); }
    function esc(s){ return String(s||'').replace(/[&<>"]/g, function(c){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]; }); }
    function strip(html){
        var d = document.createElement('div');
        d.innerHTML = html || '';
        return (d.textContent || d.innerText || '').replace(/\s+/g,' ').trim();
    }
    function speakBtn(text){
        if (!text) return '';
        return '<button type="button" class="speak-mini" data-speak="'+esc(text)+'">'+String.fromCharCode(9654)+' '+esc(t('speak'))+'</button>';
    }
    function fetchJson(url, ms){
        ms = ms || 8000;
        var ctrl = new AbortController();
        var timer = setTimeout(function(){ ctrl.abort(); }, ms);
        return fetch(url, { signal: ctrl.signal }).then(function(r){
            if (!r.ok) throw new Error('bad');
            return r.json();
        }).finally(function(){ clearTimeout(timer); });
    }
    function wikiSummary(lang, title){
        return fetchJson('https://'+lang+'.wikipedia.org/api/rest_v1/page/summary/'+encodeURIComponent(title), 8000)
            .then(function(d){ return (d && d.extract) ? d.extract : ''; })
            .catch(function(){ return ''; });
    }
    function wikiLangTitle(fromLang, title, toLang){
        var url = 'https://'+fromLang+'.wikipedia.org/w/api.php?action=query&titles='+encodeURIComponent(title)+'&prop=langlinks&lllang='+toLang+'&format=json&origin=*';
        return fetchJson(url, 8000).then(function(d){
            var pages = d && d.query && d.query.pages;
            if (!pages) return '';
            var first = pages[Object.keys(pages)[0]];
            return (first && first.langlinks && first.langlinks[0] && first.langlinks[0]['*']) || '';
        }).catch(function(){ return ''; });
    }
    function moedict(word){
        return fetchJson('https://www.moedict.tw/uni/'+encodeURIComponent(word)+'.json', 8000).then(function(d){
            var defs = [];
            var py = '';
            ((d && d.heteronyms) || []).forEach(function(h){
                if (!py && h.pinyin) py = h.pinyin;
                (h.definitions || []).forEach(function(item){
                    if (item.def) defs.push({ pos: item.type || '', zh: item.def, example: (item.example && item.example[0]) || (item.quote && item.quote[0]) || '' });
                });
            });
            return defs.length ? { pinyin: py, defs: defs } : null;
        }).catch(function(){ return null; });
    }
    function wiktionary(word){
        return fetchJson('https://en.wiktionary.org/api/rest_v1/page/definition/'+encodeURIComponent(word), 8000).then(function(d){
            var out = [];
            Object.keys(d || {}).forEach(function(lang){
                (d[lang] || []).forEach(function(block){
                    (block.definitions || []).slice(0,3).forEach(function(item){
                        var text = strip(item.definition || '');
                        if (text) out.push({ lang: lang, pos: block.partOfSpeech || '', en: text });
                    });
                });
            });
            return out;
        }).catch(function(){ return []; });
    }
    function dictionaryApi(word){
        return fetchJson('https://api.dictionaryapi.dev/api/v2/entries/en/'+encodeURIComponent(word), 8000)
            .then(function(data){ return Array.isArray(data) ? data[0] : null; })
            .catch(function(){ return null; });
    }
    function datamuse(word){
        return Promise.all([
            fetchJson('https://api.datamuse.com/words?rel_syn='+encodeURIComponent(word)+'&max=6', 7000).catch(function(){ return []; }),
            fetchJson('https://api.datamuse.com/words?rel_ant='+encodeURIComponent(word)+'&max=6', 7000).catch(function(){ return []; })
        ]).then(function(res){
            return {
                syn: (res[0]||[]).map(function(w){ return w.word; }),
                ant: (res[1]||[]).map(function(w){ return w.word; })
            };
        }).catch(function(){ return { syn:[], ant:[] }; });
    }
    function posLabel(pos){
        if (!pos) return '';
        var key = POS[String(pos).toLowerCase()] || 'posOther';
        var zh = t(key);
        return zh + ' / ' + pos;
    }
    function chips(label, list){
        if (!list || !list.length) return '';
        var html = '<p class="rel"><strong>'+esc(label)+'</strong> ';
        list.slice(0,6).forEach(function(s){ html += '<button type="button" class="rel-chip speak-mini" data-speak="'+esc(s)+'">'+esc(s)+'</button> '; });
        return html + '</p>';
    }
    function block(kind, title, rows){
        if (!rows || !rows.length) return '';
        var html = '<section class="lang-block '+kind+'"><h4>'+esc(title)+'</h4>';
        rows.forEach(function(row){
            html += '<div class="def-row">';
            if (row.pos) html += '<span class="pos-tag">'+esc(posLabel(row.pos))+'</span>';
            html += '<p>'+esc(row.text)+speakBtn(row.text)+'</p>';
            if (row.example) html += '<p class="ex">'+esc(t('examples'))+': '+esc(row.example)+speakBtn(row.example)+'</p>';
            html += '</div>';
        });
        return html + '</section>';
    }
    function speak(text){
        if (!text || !window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        var u = new SpeechSynthesisUtterance(text);
        var voices = window.speechSynthesis.getVoices() || [];
        var zh = isChinese(text);
        var voice = voices.find(function(v){
            var l = String(v.lang||'').toLowerCase();
            return zh ? (l.indexOf('zh')===0 || l.indexOf('yue')===0 || l.indexOf('cmn')===0) : l.indexOf('en')===0;
        });
        if (voice) { u.voice = voice; u.lang = voice.lang; }
        else u.lang = zh ? 'zh-HK' : 'en-GB';
        window.speechSynthesis.speak(u);
    }
    async function showRich(text){
        var modal = document.getElementById('meaning-modal');
        var box = document.getElementById('meaning-text');
        if (!modal || !box) return;
        box.innerHTML = '<p>'+esc(t('looking'))+'</p>';
        modal.style.display = 'flex';
        var word = String(text||'').trim();
        var zhWord = isChinese(word) ? word : '';
        var enWord = isChinese(word) ? '' : word;
        try {
            var jobs = [
                zhWord ? moedict(zhWord) : Promise.resolve(null),
                wiktionary(word),
                enWord ? dictionaryApi(enWord) : Promise.resolve(null),
                wikiSummary(isChinese(word) ? 'zh' : 'en', word),
                wikiLangTitle(isChinese(word) ? 'zh' : 'en', word, isChinese(word) ? 'en' : 'zh')
            ];
            var res = await Promise.all(jobs);
            var moe = res[0];
            var wikt = res[1] || [];
            var dict = res[2];
            var wikiA = res[3] || '';
            var otherTitle = res[4] || '';
            if (isChinese(word) && otherTitle) enWord = otherTitle;
            if (!isChinese(word) && otherTitle) zhWord = otherTitle;
            var wikiB = '';
            if (otherTitle) wikiB = await wikiSummary(isChinese(word) ? 'en' : 'zh', otherTitle);
            var related = enWord ? await datamuse(enWord.toLowerCase()) : { syn:[], ant:[] };

            var zhRows = [];
            var enRows = [];
            if (moe && moe.defs) {
                moe.defs.slice(0,3).forEach(function(d){ zhRows.push({ pos: d.pos, text: d.zh, example: d.example }); });
            }
            if (wikiA && isChinese(word)) zhRows.push({ pos: '', text: wikiA });
            if (wikiB && !isChinese(word)) zhRows.push({ pos: '', text: wikiB });
            if (wikiA && !isChinese(word)) enRows.push({ pos: '', text: wikiA });
            if (wikiB && isChinese(word)) enRows.push({ pos: '', text: wikiB });

            wikt.forEach(function(item){
                if (item.lang === 'zh' || isChinese(item.en)) zhRows.push({ pos: item.pos, text: item.en });
                else enRows.push({ pos: item.pos, text: item.en });
            });
            if (dict && dict.meanings) {
                dict.meanings.slice(0,3).forEach(function(m){
                    (m.definitions||[]).slice(0,2).forEach(function(d){
                        if (d.definition) enRows.push({ pos: m.partOfSpeech, text: d.definition, example: d.example || '' });
                    });
                });
            }

            function uniq(rows){
                var seen = {};
                return rows.filter(function(r){
                    var k = (r.text||'').slice(0,80);
                    if (!k || seen[k]) return false;
                    seen[k] = 1;
                    return true;
                }).slice(0,4);
            }
            zhRows = uniq(zhRows);
            enRows = uniq(enRows);

            var html = '<div class="meaning-head"><h3>'+esc(word)+'</h3>'+speakBtn(word)+'</div>';
            if (moe && moe.pinyin) html += '<p class="pinyin">'+esc(moe.pinyin)+'</p>';
            if (zhWord && zhWord !== word) html += '<p class="other-word">'+esc(zhWord)+speakBtn(zhWord)+'</p>';
            if (enWord && enWord !== word) html += '<p class="other-word">'+esc(enWord)+speakBtn(enWord)+'</p>';
            html += block('zh', t('defZh'), zhRows);
            html += block('en', t('defEn'), enRows);
            html += chips(t('synonyms'), related.syn);
            html += chips(t('antonyms'), related.ant);
            if (!zhRows.length && !enRows.length) html += '<p>'+esc(t('noDef'))+'</p>';
            box.innerHTML = html;
        } catch (e) {
            box.innerHTML = '<p>'+esc(t('noDef'))+'</p>';
        }
    }
    function boot(){
        var box = document.getElementById('multi-input-container');
        if (box) {
            box.addEventListener('click', function(e){
                if (!e.target.matches('.search-button')) return;
                var wrap = e.target.closest('.input-with-button');
                var input = wrap && wrap.querySelector('.vocabulary-input');
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
