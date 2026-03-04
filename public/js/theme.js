(function () {
    var key = "restobook-theme";
    var root = document.documentElement;
    var button = document.getElementById("theme-toggle");

    function applyLabel() {
        if (!button) return;
        var dark = root.getAttribute("data-theme") === "dark";
        button.textContent = dark ? "โหมดสว่าง" : "โหมดมืด";
    }

    function applySavedTheme() {
        var saved = localStorage.getItem(key);
        if (saved === "dark") {
            root.setAttribute("data-theme", "dark");
        } else {
            root.removeAttribute("data-theme");
        }
        applyLabel();
    }

    applySavedTheme();

    if (button) {
        button.addEventListener("click", function () {
            var dark = root.getAttribute("data-theme") === "dark";
            if (dark) {
                root.removeAttribute("data-theme");
                localStorage.setItem(key, "light");
            } else {
                root.setAttribute("data-theme", "dark");
                localStorage.setItem(key, "dark");
            }
            applyLabel();
        });
    }
})();
