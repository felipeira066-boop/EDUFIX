const authForm = document.querySelector("[data-auth-form]");

if (authForm) {
    const message = authForm.querySelector("[data-form-message]");
    const submitButton = authForm.querySelector("[data-submit-button]");
    const mode = authForm.dataset.authMode;
    const endpoint = mode === "register" ? "/api/auth/register" : "/api/auth/login";
    const submitLabel = submitButton.textContent;
    const captchaContainer = authForm.querySelector("[data-captcha-container]");
    const captchaToken = authForm.querySelector("[data-captcha-token]");
    let captchaWidgetId;

    const configureCaptcha = async () => {
        submitButton.disabled = true;
        try {
            const response = await fetch("/api/auth/captcha-config", { credentials: "same-origin" });
            if (!response.ok) {
                throw new Error(`A configuração do CAPTCHA não pôde ser carregada (HTTP ${response.status}).`);
            }

            const config = await response.json();
            if (!config.enabled || !config.siteKey) {
                captchaContainer.dataset.state = "error";
                captchaContainer.dataset.message = "O CAPTCHA ainda não está configurado. Defina as chaves do Google reCAPTCHA no servidor.";
                return;
            }

            await new Promise((resolve, reject) => {
                if (window.grecaptcha?.render) {
                    resolve();
                    return;
                }
                const script = document.createElement("script");
                script.src = "https://www.google.com/recaptcha/api.js?render=explicit";
                script.async = true;
                script.defer = true;
                script.onload = resolve;
                script.onerror = () => reject(new Error("Não foi possível carregar o Google reCAPTCHA."));
                document.head.append(script);
            });

            captchaWidgetId = window.grecaptcha.render(captchaContainer, {
                sitekey: config.siteKey,
                callback: (token) => {
                    captchaToken.value = token;
                    submitButton.disabled = false;
                    captchaContainer.removeAttribute("data-state");
                    message.hidden = true;
                },
                "expired-callback": () => {
                    captchaToken.value = "";
                    submitButton.disabled = true;
                },
                "error-callback": () => {
                    captchaToken.value = "";
                    submitButton.disabled = true;
                    showMessage("Não foi possível carregar a verificação. Atualize a página e tente novamente.");
                }
            });
        } catch (error) {
            console.error("Não foi possível preparar o CAPTCHA.", error);
            captchaContainer.dataset.state = "error";
            captchaContainer.dataset.message = "A verificação de segurança está indisponível. Atualize a página e tente novamente.";
        }
    };

    const showMessage = (text, isSuccess = false) => {
        message.textContent = text;
        message.dataset.success = String(isSuccess);
        message.hidden = false;
    };

    const describeFailure = (body, status) => {
        if (status === 401) {
            return "E-mail ou senha incorretos. Confira seus dados e tente novamente.";
        }

        if (status === 409) {
            return "Já existe uma conta com esses dados. Tente entrar ou use outro e-mail.";
        }

        if (status === 429) {
            return "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.";
        }

        if (status === 503) {
            return "O cadastro e o login estão temporariamente indisponíveis. Tente novamente mais tarde.";
        }

        const validationErrors = Object.values(body?.errors ?? {}).flat();
        if (validationErrors.length > 0) {
            return validationErrors.join(" ");
        }

        return body?.detail ?? body?.title ?? "Não foi possível concluir. Tente novamente.";
    };

    authForm.addEventListener("input", () => {
        message.hidden = true;
    });

    authForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        message.hidden = true;

        if (!authForm.reportValidity()) {
            return;
        }

        if (!captchaToken.value) {
            showMessage("Confirme a verificação de segurança para continuar.");
            return;
        }

        const formData = new FormData(authForm);
        const payload = Object.fromEntries(formData.entries());
        submitButton.disabled = true;
        submitButton.textContent = mode === "register" ? "Criando conta..." : "Entrando...";

        try {
            const response = await fetch(endpoint, {
                method: "POST",
                credentials: "same-origin",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const contentType = response.headers.get("content-type") ?? "";
            const body = contentType.includes("json") ? await response.json() : null;

            if (!response.ok) {
                showMessage(describeFailure(body, response.status));
                if (captchaWidgetId !== undefined) {
                    window.grecaptcha.reset(captchaWidgetId);
                    captchaToken.value = "";
                    submitButton.disabled = true;
                }
                return;
            }

            showMessage("Pronto! Abrindo sua jornada...", true);
            window.location.assign("/inicio");
        } catch (error) {
            console.error("A solicitação de autenticação falhou.", error);
            showMessage("Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.");
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = submitLabel;
        }
    });

    configureCaptcha();

    fetch("/api/auth/me", { credentials: "same-origin" })
        .then(async (response) => {
            if (response.status === 401) {
                return;
            }

            if (!response.ok) {
                throw new Error(`A verificação da sessão falhou (HTTP ${response.status}).`);
            }

            window.location.replace("/");
        })
        .catch((error) => {
            console.error("Não foi possível verificar a sessão atual.", error);
            showMessage("Não foi possível verificar sua sessão. Atualize a página e tente novamente.");
        });
}
