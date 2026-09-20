(function () {
    function paint(theme) {
        if (!theme) theme = 'default';
        document.documentElement.setAttribute('data-theme', theme);
        document.body.setAttribute('data-theme', theme);
        document.documentElement.className = 'theme-' + theme;
        try { localStorage.setItem('dictationAppTheme', theme); } catch (e) {}
        var sel = document.getElementById('theme-select');
        if (sel && sel.value !== theme) sel.value = theme;
    }
    function boot() {
        var sel = document.getElementById('theme-select');
        var saved = 'default';
        try { saved = localStorage.getItem('dictationAppTheme') || 'default'; } catch (e) {}
        paint(saved);
        if (sel) {
            sel.addEventListener('change', function () { paint(sel.value); });
        }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();
