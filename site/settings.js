const settingsDialogMarkup = `
    <div class="settings-panel">
        <div class="settings-heading">
            <div>
                <p class="settings-eyebrow">Seu espaço, seu jeito</p>
                <h2 id="settings-title">Configurações</h2>
                <p>Personalize sua experiência de estudo.</p>
            </div>
            <button class="settings-close" id="settings-close" type="button" aria-label="Fechar configurações">×</button>
        </div>
        <div class="settings-content">
            <fieldset class="setting-group">
                <legend>Aparência</legend>
                <p class="setting-description">Escolha como você prefere ver o EDUFIX.</p>
                <div class="theme-options">
                    <label class="theme-option">
                        <input type="radio" name="theme" value="light">
                        <span class="theme-option-icon" aria-hidden="true">☀</span>
                        <span>Claro</span>
                    </label>
                    <label class="theme-option">
                        <input type="radio" name="theme" value="dark">
                        <span class="theme-option-icon" aria-hidden="true">☾</span>
                        <span>Noturno</span>
                    </label>
                    <label class="theme-option">
                        <input type="radio" name="theme" value="system">
                        <span class="theme-option-icon" aria-hidden="true">◐</span>
                        <span>Sistema</span>
                    </label>
                </div>
            </fieldset>
            <fieldset class="setting-group">
                <legend>Tamanho do texto</legend>
                <div class="text-size-options" role="group" aria-label="Tamanho do texto">
                    <button type="button" data-font-size="small" aria-pressed="false">Pequeno</button>
                    <button type="button" data-font-size="normal" aria-pressed="true">Padrão</button>
                    <button type="button" data-font-size="large" aria-pressed="false">Grande</button>
                </div>
            </fieldset>
            <div class="setting-row">
                <div>
                    <span class="setting-label">Animações</span>
                    <p class="setting-description">Movimentos suaves pela página</p>
                </div>
                <label class="switch-control">
                    <input id="motion-setting" type="checkbox" checked>
                    <span class="switch-slider" aria-hidden="true"></span>
                    <span class="visually-hidden">Ativar animações</span>
                </label>
            </div>
            <button class="settings-reset" id="settings-reset" type="button">Restaurar configurações padrão</button>
            <p class="settings-status" id="settings-status" role="status" aria-live="polite"></p>
        </div>
    </div>`;

const settingsStorageKey = "edufix.preferences";
const defaultPreferences = { theme: "light", fontSize: "normal", animations: true };
const validThemes = ["light", "dark", "system"];
const validFontSizes = ["small", "normal", "large"];
const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");

let preferences = { ...defaultPreferences };

let settingsTrigger = document.querySelector("#settings-trigger");
let settingsDialog = document.querySelector("#settings-dialog");

if (!settingsTrigger) {
    settingsTrigger = document.createElement("button");
    settingsTrigger.className = "settings-trigger settings-trigger-floating";
    settingsTrigger.id = "settings-trigger";
    settingsTrigger.type = "button";
    settingsTrigger.setAttribute("aria-haspopup", "dialog");
    settingsTrigger.setAttribute("aria-controls", "settings-dialog");
    settingsTrigger.setAttribute("aria-label", "Abrir configurações");
    settingsTrigger.innerHTML = '<span aria-hidden="true">⚙</span><span class="settings-trigger-label">Configurações</span>';
    document.body.append(settingsTrigger);
}

if (!settingsDialog) {
    settingsDialog = document.createElement("dialog");
    settingsDialog.className = "settings-dialog";
    settingsDialog.id = "settings-dialog";
    settingsDialog.setAttribute("aria-labelledby", "settings-title");
    settingsDialog.innerHTML = settingsDialogMarkup;
    document.body.append(settingsDialog);
}

const settingsStatus = document.querySelector("#settings-status");

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

settingsTrigger.addEventListener("click", () => settingsDialog.showModal());
document.querySelector("#settings-close").addEventListener("click", () => settingsDialog.close());
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

settingsDialog.querySelector("#motion-setting").addEventListener("change", (event) => {
    preferences.animations = event.target.checked;
    savePreferences();
});

document.querySelector("#settings-reset").addEventListener("click", () => {
    preferences = { ...defaultPreferences };
    savePreferences();
});

systemTheme.addEventListener("change", () => {
    if (preferences.theme === "system") {
        applyPreferences();
    }
});
