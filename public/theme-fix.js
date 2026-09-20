(function () {
    var ART = {
        'art-sunrise': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/Monet_-_Impression%2C_Sunrise.jpg/1280px-Monet_-_Impression%2C_Sunrise.jpg',
        'art-lilies': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/Water_Lilies_%28Monet%2C_1919%29.JPG/1280px-Water_Lilies_%28Monet%2C_1919%29.JPG',
        'art-starry': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/1280px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg',
        'art-sun': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/72/Vincent_van_Gogh_-_Zonnebloemen_-_Google_Art_Project.jpg/960px-Vincent_van_Gogh_-_Zonnebloemen_-_Google_Art_Project.jpg',
        'art-pearl': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Girl_with_a_Pearl_Earring.jpg/960px-Girl_with_a_Pearl_Earring.jpg',
        'art-wave': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/The_Great_Wave_off_Kanagawa.jpg/1280px-The_Great_Wave_off_Kanagawa.jpg',
        'art-kiss': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c8/Klimt_-_The_Kiss.jpg/960px-Klimt_-_The_Kiss.jpg',
        'art-venus': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Sandro_Botticelli_-_La_nascita_di_Venere_-_Google_Art_Project_-_edited.jpg/1280px-Sandro_Botticelli_-_La_nascita_di_Venere_-_Google_Art_Project_-_edited.jpg',
        'art-cezanne': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a7/Montagne_Sainte-Victoire%2C_par_Paul_C%C3%A9zanne_109.jpg/960px-Montagne_Sainte-Victoire%2C_par_Paul_C%C3%A9zanne_109.jpg'
    };
    function applyArt(theme) {
        var url = ART[theme];
        var html = document.documentElement;
        var body = document.body;
        if (url) {
            var img = 'url("' + url + '")';
            html.style.backgroundImage = img;
            body.style.backgroundImage = img;
            body.style.backgroundSize = 'cover';
            body.style.backgroundPosition = 'center center';
            body.style.backgroundRepeat = 'no-repeat';
            body.style.backgroundAttachment = 'scroll';
            html.style.backgroundColor = '#2a2a2a';
            body.style.backgroundColor = '#2a2a2a';
        } else {
            html.style.backgroundImage = '';
            body.style.backgroundImage = '';
            html.style.backgroundColor = '';
            body.style.backgroundColor = '';
            body.style.backgroundSize = '';
            body.style.backgroundPosition = '';
            body.style.backgroundRepeat = '';
            body.style.backgroundAttachment = '';
        }
    }
    function paint(theme) {
        if (!theme) theme = 'default';
        document.documentElement.setAttribute('data-theme', theme);
        document.body.setAttribute('data-theme', theme);
        document.documentElement.className = 'theme-' + theme;
        applyArt(theme);
        try { localStorage.setItem('dictationAppTheme', theme); } catch (e) {}
        var sel = document.getElementById('theme-select');
        if (sel && sel.value !== theme) sel.value = theme;
    }
    function boot() {
        var sel = document.getElementById('theme-select');
        var saved = 'default';
        try { saved = localStorage.getItem('dictationAppTheme') || 'default'; } catch (e) {}
        paint(saved);
        if (sel) sel.addEventListener('change', function () { paint(sel.value); });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();
