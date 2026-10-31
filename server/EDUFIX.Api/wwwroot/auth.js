const authForm = document.querySelector("[data-auth-form]");

if (authForm) {
    const message = authForm.querySelector("[data-form-message]");
    const submitButton = authForm.querySelector("[data-submit-button]");
    const mode = authForm.dataset.authMode;
    const endpoint = mode === "register" ? "/api/auth/register" : "/api/auth/login";
    const submitLabel = submitButton.textContent;

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
