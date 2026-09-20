/* Voice list follows UI language: zh = Cantonese/Mandarin, en = English only. */
(function () {
    var LANG_PREF_KEY = 'dictationAppLangPref';
    var VOICE_PREF_KEY = 'dictationAppVoiceName';
    var blacklisted = new Set(['Albert','Bahh','Bells','Boing','Bubbles','Cellos','Deranged','Eddy','Flo','Good News','Hysterical','Jester','Organ','Pipe Organ','Rocko','Superstar','Trinoids','Whisper','Zarvox']);
    function ready(fn){ if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',fn); else fn(); }
    function normLang(lang){ return String(lang||'').toLowerCase().replace('_','-'); }
    function isCantonese(v){ var l=normLang(v.lang), n=String(v.name||'').toLowerCase(); return l.startsWith('zh-hk')||l.startsWith('yue')||n.includes('cantonese')||n.includes('hong kong')||n.includes('香港')||n.includes('粵')||n.includes('粤')||n.includes('sinji')||n.includes('sin-ji')||n.includes('sin ji'); }
    function isEnglish(v){ return normLang(v.lang).startsWith('en'); }
    function isMandarin(v){ var l=normLang(v.lang), n=String(v.name||'').toLowerCase(); if(isCantonese(v)) return false; return l.startsWith('zh-cn')||l.startsWith('zh-tw')||l.startsWith('cmn')||n.includes('普通话')||n.includes('國語')||n.includes('国语')||n.includes('ting')||n.includes('婷婷'); }
    function kindOf(v){ if(isCantonese(v)) return 'yue'; if(isEnglish(v)) return 'en'; if(isMandarin(v)) return 'cmn'; return 'other'; }
    function uiLang(){ return (window.DictationI18n && window.DictationI18n.getUi()) || localStorage.getItem('dictationAppUiLang') || 'zh'; }
    ready(function(){
        var synth=window.speechSynthesis, voiceSelect=document.getElementById('voice-select'), status=document.getElementById('status');
        if(!synth||!voiceSelect) return;
        function allowedPrefs(){ return uiLang()==='en' ? ['en'] : ['yue','cmn']; }
        function currentPref(){ var a=allowedPrefs(), s=localStorage.getItem(LANG_PREF_KEY); return a.indexOf(s)!==-1 ? s : a[0]; }
        function updateChips(pref){
            var zh=uiLang()!=='en';
            var yue=document.getElementById('lang-yue'), cmn=document.getElementById('lang-cmn'), en=document.getElementById('lang-en');
            if(yue) yue.style.display=zh?'':'none';
            if(cmn) cmn.style.display=zh?'':'none';
            if(en) en.style.display=zh?'none':'';
            document.querySelectorAll('.lang-chip').forEach(function(btn){ btn.classList.toggle('active', btn.dataset.lang===pref); });
        }
        function updateHint(yueList,cmnList){
            var hint=document.getElementById('voice-hint'); if(!hint) return;
            var t=window.DictationI18n?window.DictationI18n.t:function(k){return k;};
            var pref=currentPref();
            if(pref==='yue'&&!yueList.length) hint.textContent=t('voiceHintYue');
            else if(pref==='cmn'&&!cmnList.length) hint.textContent=t('voiceHintCmn');
            else hint.textContent='';
        }
        function addOption(parent,voice,selectedName){
            var option=document.createElement('option');
            option.textContent=voice.name+' ('+voice.lang+')';
            option.setAttribute('data-lang',voice.lang);
            option.setAttribute('data-name',voice.name);
            option.value=voice.name;
            if(selectedName&&voice.name===selectedName) option.selected=true;
            parent.appendChild(option);
        }
        function selectPref(pref){
            localStorage.setItem(LANG_PREF_KEY,pref);
            var options=Array.from(voiceSelect.querySelectorAll('option'));
            if(!options.length) return;
            var match=options.find(function(o){ return kindOf({name:o.getAttribute('data-name'),lang:o.getAttribute('data-lang')})===pref; });
            (match||options[0]).selected=true;
            localStorage.setItem(VOICE_PREF_KEY, voiceSelect.selectedOptions[0]&&voiceSelect.selectedOptions[0].getAttribute('data-name')||'');
            updateChips(pref);
        }
        function populate(){
            var voices=synth.getVoices()||[];
            voiceSelect.innerHTML='';
            if(!voices.length){ if(status) status.textContent=uiLang()==='en'?'Loading voices…':'正在載入語音…'; return false; }
            var usable=voices.filter(function(v){ return !blacklisted.has(v.name); });
            var yue=usable.filter(isCantonese), en=usable.filter(isEnglish), cmn=usable.filter(isMandarin);
            var pref=currentPref(), savedName=localStorage.getItem(VOICE_PREF_KEY);
            function group(label,list){ if(!list.length) return; var g=document.createElement('optgroup'); g.label=label; list.forEach(function(v){ addOption(g,v,savedName); }); voiceSelect.appendChild(g); }
            if(uiLang()==='en') group('English',en);
            else { group('廣東話', yue); group('普通話', cmn); }
            if(!voiceSelect.options.length) usable.slice(0,20).forEach(function(v){ addOption(voiceSelect,v,null); });
            if(status) status.textContent='';
            updateHint(yue,cmn);
            selectPref(pref);
            return true;
        }
        populate();
        synth.onvoiceschanged=populate;
        var tries=0, timer=setInterval(function(){ tries+=1; if(populate()||tries>=15) clearInterval(timer); },400);
        function bindChip(id,pref){ var el=document.getElementById(id); if(!el) return; el.addEventListener('click', function(){ localStorage.setItem(LANG_PREF_KEY,pref); populate(); selectPref(pref); }); }
        bindChip('lang-yue','yue'); bindChip('lang-cmn','cmn'); bindChip('lang-en','en');
        voiceSelect.addEventListener('change', function(){ localStorage.setItem(VOICE_PREF_KEY, voiceSelect.selectedOptions[0]&&voiceSelect.selectedOptions[0].getAttribute('data-name')||''); });
        document.addEventListener('dictation-ui-lang', function(ev){
            var ui=ev.detail&&ev.detail.ui;
            if(ui==='en') localStorage.setItem(LANG_PREF_KEY,'en');
            else if(localStorage.getItem(LANG_PREF_KEY)==='en') localStorage.setItem(LANG_PREF_KEY,'yue');
            populate();
        });
    });
})();
