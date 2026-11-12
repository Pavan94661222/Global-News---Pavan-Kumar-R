const preloader = document.querySelector(".preloader");

const hidePreloader = () => {
    if (preloader && preloader.parentNode) {
        preloader.remove();
    }
};

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", hidePreloader);
} else {
    hidePreloader();
}
