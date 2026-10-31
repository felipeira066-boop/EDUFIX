(() => {
    const body = document.body;
    const root = document.documentElement;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let savedMotionDisabled = false;
    let navigating = false;

    try {
        const preferences = JSON.parse(localStorage.getItem("edufix.preferences") ?? "null");
        savedMotionDisabled = preferences?.animations === false;
    } catch (error) {
        console.error("Não foi possível carregar a preferência de animações.", error);
    }

    const animationsDisabled = () => {
        if (reducedMotion.matches) {
            return true;
        }

        return root.dataset.motion
            ? root.dataset.motion === "reduced"
            : savedMotionDisabled;
    };

    const initializeMotion = () => {
        if (animationsDisabled()) {
            return;
        }

        const transition = document.createElement("div");
        transition.className = "bauhaus-transition";
        transition.setAttribute("aria-hidden", "true");

        const loader = document.createElement("div");
        loader.className = "bauhaus-loader";
        for (const shape of ["circle", "square", "arch"]) {
            const element = document.createElement("span");
            element.className = `bauhaus-shape bauhaus-shape-${shape}`;
            loader.append(element);
        }
        transition.append(loader);
        body.append(transition);
        body.classList.add("motion-enabled");

        window.setTimeout(() => body.classList.add("motion-ready"), 560);
    };

    document.addEventListener("DOMContentLoaded", initializeMotion, { once: true });

    document.addEventListener("click", (event) => {
        if (navigating || animationsDisabled() || !(event.target instanceof Element)) {
            return;
        }

        const link = event.target.closest("a[href]");
        if (!link || link.target || link.hasAttribute("download") || event.defaultPrevented ||
            event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
            return;
        }

        const destination = new URL(link.href, window.location.href);
        if (destination.origin !== window.location.origin ||
            (destination.pathname === window.location.pathname && destination.search === window.location.search)) {
            return;
        }

        event.preventDefault();
        navigating = true;
        body.classList.add("motion-leaving");
        window.setTimeout(() => window.location.assign(destination.href), 260);
    });
})();
