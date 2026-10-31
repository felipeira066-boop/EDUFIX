const settingsDialog = document.querySelector("#settings-dialog");
const settingsTrigger = document.querySelector("#settings-trigger");
const settingsStatus = document.querySelector("#settings-status");
const settingsStorageKey = "edufix.preferences";
const defaultPreferences = { theme: "light", fontSize: "normal", animations: true };
const validThemes = ["light", "dark", "system"];
const validFontSizes = ["small", "normal", "large"];
const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");

let preferences = { ...defaultPreferences };

if (settingsDialog && settingsStatus) {
    try {
        const savedPreferences = localStorage.getItem(settingsStorageKey);

        if (savedPreferences) {
            const parsedPreferences = JSON.parse(savedPreferences);
            preferences = {
                theme: validThemes.includes(parsedPreferences.theme) ? parsedPreferences.theme : defaultPreferences.theme,
                fontSize: validFontSizes.includes(parsedPreferences.fontSize) ? parsedPreferences.fontSize : defaultPreferences.fontSize,
                animations: typeof parsedPreferences.animations === "boolean"
                    ? parsedPreferences.animations
                    : defaultPreferences.animations
            };
        }
    } catch (error) {
        console.error("Não foi possível carregar as configurações salvas.", error);
        settingsStatus.textContent = "Não foi possível carregar suas preferências salvas.";
    }

    const applyPreferences = () => {
        const resolvedTheme = preferences.theme === "system"
            ? (systemTheme.matches ? "dark" : "light")
            : preferences.theme;
        document.documentElement.dataset.theme = resolvedTheme;
        document.documentElement.dataset.fontSize = preferences.fontSize;
        document.documentElement.dataset.motion = preferences.animations ? "full" : "reduced";

        const themeColor = document.querySelector('meta[name="theme-color"]');
        if (themeColor) {
            themeColor.content = resolvedTheme === "dark" ? "#17231f" : "#f7f8f1";
        }

        const selectedTheme = settingsDialog.querySelector(`input[name="theme"][value="${preferences.theme}"]`);
        if (selectedTheme) {
            selectedTheme.checked = true;
        }

        settingsDialog.querySelectorAll("[data-font-size]").forEach((button) => {
            button.setAttribute("aria-pressed", String(button.dataset.fontSize === preferences.fontSize));
        });

        const motionSetting = settingsDialog.querySelector("#motion-setting");
        if (motionSetting) {
            motionSetting.checked = preferences.animations;
        }
    };

    const savePreferences = () => {
        applyPreferences();

        try {
            localStorage.setItem(settingsStorageKey, JSON.stringify(preferences));
            settingsStatus.textContent = "Preferências salvas neste dispositivo.";
        } catch (error) {
            console.error("Não foi possível salvar as configurações.", error);
            settingsStatus.textContent = "Preferência aplicada, mas não foi possível salvá-la neste navegador.";
        }
    };

    applyPreferences();

    settingsTrigger?.addEventListener("click", () => settingsDialog.showModal());
    document.querySelector("#settings-close")?.addEventListener("click", () => settingsDialog.close());
    settingsDialog.addEventListener("click", (event) => {
        if (event.target === settingsDialog) {
            settingsDialog.close();
        }
    });

    settingsDialog.querySelectorAll('input[name="theme"]').forEach((input) => {
        input.addEventListener("change", () => {
            preferences.theme = input.value;
            savePreferences();
        });
    });

    settingsDialog.querySelectorAll("[data-font-size]").forEach((button) => {
        button.addEventListener("click", () => {
            preferences.fontSize = button.dataset.fontSize;
            savePreferences();
        });
    });

    settingsDialog.querySelector("#motion-setting")?.addEventListener("change", (event) => {
        preferences.animations = event.target.checked;
        savePreferences();
    });

    document.querySelector("#settings-reset")?.addEventListener("click", () => {
        preferences = { ...defaultPreferences };
        savePreferences();
    });

    systemTheme.addEventListener("change", () => {
        if (preferences.theme === "system") {
            applyPreferences();
        }
    });
}

const accountNavigation = document.querySelector(".nav-links");
const sessionStatus = document.querySelector("#session-status");

if (accountNavigation && window.location.protocol !== "file:") {
    fetch("/api/auth/me", { credentials: "same-origin" })
        .then(async (response) => {
            if (response.status === 401) {
                return;
            }

            if (!response.ok) {
                throw new Error(`A verificação da sessão falhou (HTTP ${response.status}).`);
            }

            const user = await response.json();
            const loginLink = accountNavigation.querySelector('a[href="/login.html"]');
            const registerLink = accountNavigation.querySelector('a[href="/cadastro.html"]');
            const studyLink = accountNavigation.querySelector(".study-link");

            loginLink?.remove();
            registerLink?.remove();
            accountNavigation.classList.add("session-active");

            if (studyLink) {
                studyLink.textContent = user.gradeBand ? "Minhas matérias" : "Escolher meu plano";
            }

            for (const journeyLink of document.querySelectorAll('a[href="/cadastro.html"]')) {
                journeyLink.href = "/inicio";
                journeyLink.innerHTML = 'Continuar minha jornada <span aria-hidden="true">→</span>';
            }

            const greeting = document.createElement("span");
            greeting.className = "nav-greeting";
            greeting.textContent = `Olá, ${user.displayName}`;

            const logoutButton = document.createElement("button");
            logoutButton.className = "button button-small logout-button";
            logoutButton.type = "button";
            logoutButton.textContent = "Sair";
            logoutButton.addEventListener("click", async () => {
                logoutButton.disabled = true;

                try {
                    const logoutResponse = await fetch("/api/auth/logout", {
                        method: "POST",
                        credentials: "same-origin"
                    });

                    if (!logoutResponse.ok) {
                        throw new Error(`Não foi possível encerrar a sessão (HTTP ${logoutResponse.status}).`);
                    }

                    window.location.assign("/");
                } catch (error) {
                    console.error("Não foi possível encerrar a sessão.", error);
                    sessionStatus.textContent = "Não foi possível sair. Tente novamente.";
                    logoutButton.disabled = false;
                }
            });

            accountNavigation.insertBefore(greeting, sessionStatus);
            accountNavigation.insertBefore(logoutButton, sessionStatus);
        })
        .catch((error) => {
            console.error("Não foi possível carregar a sessão atual.", error);
        });
}