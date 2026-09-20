(function () {
    var OFFSET_KEY = 'dictationQuoteOffset';
    var ZH = [
        { t: '只要功夫深，鐵棒磨成針。', a: '講話' },
        { t: '書山有路勤為徑，學海無涯苦作舟。', a: '韓愈' },
        { t: '千里之行，始於足下。', a: '老子' },
        { t: '不積跬步，無以至千里。', a: '荀子' },
        { t: '學而時習之，不亦說乎。', a: '孔子' },
        { t: '溫故而知新。', a: '孔子' },
        { t: '敏而好學，不恥下問。', a: '孔子' },
        { t: '三人行，必有我師焉。', a: '孔子' },
        { t: '學而不思則罔，思而不學則殆。', a: '孔子' },
        { t: '知之者不如好之者，好之者不如樂之者。', a: '孔子' },
        { t: '天行健，君子以自強不息。', a: '易經' },
        { t: '少壯不努力，老大徒傷悲。', a: '長歌行' },
        { t: '讀書破萬卷，下筆如有神。', a: '杜甫' },
        { t: '欲窮千里目，更上一層樓。', a: '王之渚' },
        { t: '寶劍鋒從磨礦出，梅花香自苦寒來。', a: '講話' },
        { t: '業精於勤，荒於嬚。', a: '韓愈' },
        { t: '一分耕耘，一分收穫。', a: '講話' },
        { t: '世上無難事，只怕有心人。', a: '講話' },
        { t: '熟能生巧。', a: '講話' },
        { t: '滴水穿石。', a: '講話' },
        { t: '有志者事竟成。', a: '《後漢書》' },
        { t: '失敗乃成功之母。', a: '講話' },
        { t: '天生我材必有用。', a: '李白' },
        { t: '己所不欲，勿施於人。', a: '孔子' },
        { t: '工欲善其事，必先利其器。', a: '孔子' },
        { t: '海納百川，有容乃大。', a: '林則徐' },
        { t: '靜以修身，儉以養德。', a: '諸葛亮' },
        { t: '一日之計在於晨。', a: '講話' },
        { t: '明日復明日，明日何其多。', a: '錢福' },
        { t: '積少成多。', a: '講話' },
        { t: '每讀一個字，就多開一扇門。', a: '鼓勵' }
    ];
    var EN = [
        { t: 'The secret of getting ahead is getting started.', a: 'Mark Twain' },
        { t: 'Practice makes progress.', a: 'Proverb' },
        { t: 'Little by little, one travels far.', a: 'J. R. R. Tolkien' },
        { t: 'It always seems impossible until it is done.', a: 'Nelson Mandela' },
        { t: 'Believe you can and you are halfway there.', a: 'Theodore Roosevelt' },
        { t: 'The expert in anything was once a beginner.', a: 'Proverb' },
        { t: 'Fall seven times, stand up eight.', a: 'Japanese proverb' },
        { t: 'Today a reader, tomorrow a leader.', a: 'Margaret Fuller' },
        { t: 'Learning never exhausts the mind.', a: 'Leonardo da Vinci' },
        { t: 'Strive for progress, not perfection.', a: 'Proverb' },
        { t: 'A journey of a thousand miles begins with a single step.', a: 'Lao Tzu' },
        { t: 'Success is the sum of small efforts, repeated.', a: 'Robert Collier' },
        { t: 'You miss 100% of the shots you do not take.', a: 'Wayne Gretzky' },
        { t: 'The beautiful thing about learning is that no one can take it away from you.', a: 'B. B. King' },
        { t: 'Courage does not always roar.', a: 'Mary Anne Radmacher' },
        { t: 'Done is better than perfect.', a: 'Sheryl Sandberg' },
        { t: 'Stars cannot shine without darkness.', a: 'Proverb' },
        { t: 'Keep going. You are doing great.', a: 'Encouragement' },
        { t: 'Every word you learn is a door you open.', a: 'Encouragement' },
        { t: 'Small steps every day become a long road.', a: 'Encouragement' },
        { t: 'Read. Write. Try again.', a: 'Encouragement' },
        { t: 'Mistakes are proof that you are trying.', a: 'Proverb' },
        { t: 'Knowledge is power.', a: 'Francis Bacon' },
        { t: 'The more that you read, the more things you will know.', a: 'Dr. Seuss' },
        { t: 'What we learn with pleasure we never forget.', a: 'Alfred Mercier' },
        { t: 'Start where you are. Use what you have.', a: 'Arthur Ashe' },
        { t: 'A little progress each day adds up to big results.', a: 'Satya Nani' },
        { t: 'You do not have to be great to start, but you have to start to be great.', a: 'Zig Ziglar' },
        { t: 'Education is the most powerful weapon you can use to change the world.', a: 'Nelson Mandela' },
        { t: 'Well done is better than well said.', a: 'Benjamin Franklin' },
        { t: 'Be curious. Keep practising.', a: 'Encouragement' }
    ];

    function dayIndex() {
        var now = new Date();
        var start = new Date(now.getFullYear(), 0, 0);
        return Math.floor((now - start) / 86400000);
    }
    function getOffset() {
        var n = parseInt(sessionStorage.getItem(OFFSET_KEY) || '0', 10);
        return isNaN(n) ? 0 : n;
    }
    function setOffset(n) {
        sessionStorage.setItem(OFFSET_KEY, String(n));
    }
    function list() {
        var ui = (window.DictationI18n && DictationI18n.getUi()) || 'zh';
        return ui === 'en' ? EN : ZH;
    }
    function render() {
        var arr = list();
        var i = ((dayIndex() + getOffset()) % arr.length + arr.length) % arr.length;
        var q = arr[i];
        var text = document.getElementById('daily-quote-text');
        var by = document.getElementById('daily-quote-by');
        if (!text || !q) return;
        var ui = (window.DictationI18n && DictationI18n.getUi()) || 'zh';
        text.textContent = ui === 'en' ? ('“' + q.t + '”') : ('「' + q.t + '」');
        by.textContent = q.a ? ('— ' + q.a) : '';
    }
    function boot() {
        var prev = document.getElementById('quote-prev');
        var next = document.getElementById('quote-next');
        if (prev) prev.addEventListener('click', function () { setOffset(getOffset() - 1); render(); });
        if (next) next.addEventListener('click', function () { setOffset(getOffset() + 1); render(); });
        document.addEventListener('dictation-ui-lang', render);
        render();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();
