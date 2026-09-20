(function () {
    var POS = { noun:'posNoun', verb:'posVerb', adjective:'posAdj', adverb:'posAdv', pronoun:'posPron', preposition:'posPrep', conjunction:'posConj', interjection:'posInt', determiner:'posDet', article:'posDet' };
    function t(key){ return window.DictationI18n ? window.DictationI18n.t(key) : key; }
    function isChinese(text){ return /[\u4e00-\u9fff\u3400-\u4dbf]/.test(text); }
    function esc(s){ return String(s||'').replace(/[&<>"]/g, function(c){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]; }); }
    function speakBtn(text){ if(!text) return ''; return '<button type="button" class="speak-mini" data-speak="'+esc(text)+'">\u25b6 '+esc(t('speak'))+'</button>'; }
    function fetchTimeout(url, ms){ ms=ms||6000; var ctrl=new AbortController(); var id=setTimeout(function(){ ctrl.abort(); }, ms); return fetch(url,{signal:ctrl.signal}).finally(function(){ clearTimeout(id); }); }
    function translate(text, sl, tl){
        var url='https://translate.googleapis.com/translate_a/single?client=gtx&sl='+sl+'&tl='+tl+'&dt=t&q='+encodeURIComponent(text);
        return fetchTimeout(url).then(function(r){ return r.json(); }).then(function(data){ return data[0]?data[0].map(function(row){ return row[0]; }).join(''):''; }).catch(function(){ return ''; });
    }
    function lookupEn(word){
        return fetchTimeout('https://api.dictionaryapi.dev/api/v2/entries/en/'+encodeURIComponent(word))
            .then(function(r){ if(!r.ok) return null; return r.json(); })
            .then(function(data){ return Array.isArray(data)&&data[0]?data[0]:null; })
            .catch(function(){ return null; });
    }
    function pinyinOf(text){
        try { if(typeof window.pinyin==='function') return window.pinyin(text,{style:window.pinyin.STYLE_TONE}).map(function(a){ return a[0]; }).join(' '); } catch(e){}
        return '';
    }
    function posLabel(pos){
        var key=POS[String(pos||'').toLowerCase()]||'posOther';
        var label=t(key);
        if(window.DictationI18n && window.DictationI18n.getUi()==='zh') return label+' '+(pos||'');
        return pos||label;
    }
    function renderEntry(word, entry, otherWord, zhDefs){
        var html='<div class="meaning-head"><h3>'+esc(word)+'</h3>'+speakBtn(word)+'</div>';
        if(otherWord && otherWord!==word) html+='<p class="meaning-zh-word">'+esc(otherWord)+speakBtn(otherWord)+'</p>';
        var py=isChinese(word)?pinyinOf(word):'';
        if(py) html+='<p class="pinyin">'+esc(py)+'</p>';
        if(entry && Array.isArray(entry.meanings)){
            entry.meanings.slice(0,4).forEach(function(m){
                html+='<section class="pos-block"><h4>'+esc(posLabel(m.partOfSpeech))+'</h4>';
                (m.definitions||[]).slice(0,3).forEach(function(d,idx){
                    html+='<div class="def-row"><p><strong>'+esc(t('defEn'))+':</strong> '+esc(d.definition)+speakBtn(d.definition)+'</p>';
                    var zh=zhDefs && zhDefs[m.partOfSpeech+'-'+idx];
                    if(zh) html+='<p><strong>'+esc(t('defZh'))+':</strong> '+esc(zh)+speakBtn(zh)+'</p>';
                    if(d.example) html+='<p class="ex"><strong>'+esc(t('examples'))+':</strong> '+esc(d.example)+speakBtn(d.example)+'</p>';
                    html+='</div>';
                });
                var syn=[].concat(m.synonyms||[]), ant=[].concat(m.antonyms||[]);
                (m.definitions||[]).forEach(function(d){ if(d.synonyms) syn=syn.concat(d.synonyms); if(d.antonyms) ant=ant.concat(d.antonyms); });
                syn=Array.from(new Set(syn)).slice(0,8);
                ant=Array.from(new Set(ant)).slice(0,8);
                if(syn.length){ html+='<p class="rel"><strong>'+esc(t('synonyms'))+':</strong> '; syn.forEach(function(s){ html+='<button type="button" class="rel-chip speak-mini" data-speak="'+esc(s)+'">'+esc(s)+'</button> '; }); html+='</p>'; }
                if(ant.length){ html+='<p class="rel"><strong>'+esc(t('antonyms'))+':</strong> '; ant.forEach(function(s){ html+='<button type="button" class="rel-chip speak-mini" data-speak="'+esc(s)+'">'+esc(s)+'</button> '; }); html+='</p>'; }
                html+='</section>';
            });
        } else if(zhDefs && zhDefs.fallback){
            html+='<p>'+esc(zhDefs.fallback)+speakBtn(zhDefs.fallback)+'</p>';
        } else {
            html+='<p>'+esc(t('noDef'))+'</p>';
        }
        return html;
    }
    function speak(text){
        if(!text||!window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        var u=new SpeechSynthesisUtterance(text);
        var voices=window.speechSynthesis.getVoices()||[];
        var chinese=isChinese(text);
        var voice;
        if(chinese) voice=voices.find(function(v){ var l=String(v.lang||'').toLowerCase(); return l.indexOf('zh')===0||l.indexOf('yue')===0||l.indexOf('cmn')===0; });
        else voice=voices.find(function(v){ return String(v.lang||'').toLowerCase().indexOf('en')===0; });
        if(voice){ u.voice=voice; u.lang=voice.lang; } else u.lang=chinese?'zh-HK':'en-US';
        window.speechSynthesis.speak(u);
    }
    async function showRich(text){
        var modal=document.getElementById('meaning-modal');
        var box=document.getElementById('meaning-text');
        if(!modal||!box) return;
        box.innerHTML='<div class="loader"></div><p>'+esc(t('looking'))+'</p>';
        modal.style.display='flex';
        var sourceZh=isChinese(text), enWord=text, zhWord=sourceZh?text:'';
        try {
            if(sourceZh) enWord=await translate(text,'auto','en')||text;
            else zhWord=await translate(text,'en','zh-TW')||'';
            var entry=await lookupEn(enWord.split(/\s+/)[0]);
            var zhDefs={};
            if(entry&&entry.meanings){
                var jobs=[];
                entry.meanings.slice(0,4).forEach(function(m){
                    (m.definitions||[]).slice(0,3).forEach(function(d,idx){
                        jobs.push(translate(d.definition,'en','zh-TW').then(function(zh){ zhDefs[m.partOfSpeech+'-'+idx]=zh; }));
                    });
                });
                await Promise.all(jobs);
            } else if(sourceZh) zhDefs.fallback=enWord;
            else if(zhWord) zhDefs.fallback=zhWord;
            box.innerHTML=renderEntry(sourceZh?text:enWord, entry, sourceZh?enWord:zhWord, zhDefs);
        } catch(e){
            box.innerHTML='<p>'+esc(t('noDef'))+'</p>';
        }
    }
    function boot(){
        var box=document.getElementById('multi-input-container');
        if(box){
            box.addEventListener('click', function(e){
                if(!e.target.matches('.search-button')) return;
                var input=e.target.closest('.input-with-button') && e.target.closest('.input-with-button').querySelector('.vocabulary-input');
                var text=input&&input.value.trim();
                if(!text) return;
                e.stopImmediatePropagation(); e.preventDefault();
                showRich(text);
            }, true);
        }
        var meaning=document.getElementById('meaning-modal');
        if(meaning){
            meaning.addEventListener('click', function(e){
                var btn=e.target.closest('[data-speak]');
                if(btn){ e.preventDefault(); speak(btn.getAttribute('data-speak')); }
            });
        }
    }
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();
