const navbar = document.querySelector(".navbar");
const sidebar = document.getElementById("sidebar");
const btnMenu = document.getElementById("btnMenu");
const btnFechar = document.getElementById("btnFechar");

window.addEventListener("scroll", () => {
    if (navbar) {
        if (window.scrollY > 50) {
            navbar.classList.add("navbar_scrolled");
        } else {
            navbar.classList.remove("navbar_scrolled");
        }
    }
});

if (btnMenu && sidebar) {
    btnMenu.addEventListener("click", () => {
        sidebar.classList.add("sidebar_aberta");
    });
}

if (btnFechar && sidebar) {
    btnFechar.addEventListener("click", () => {
        sidebar.classList.remove("sidebar_aberta");
    });
}