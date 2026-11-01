import { supabase } from "./supabase-client.js";
import { redirectToJourney } from "./account.js";

const authForm = document.querySelector("[data-auth-form]");

if (authForm) {
    const message = authForm.querySelector("[data-form-message]");
    const submitButton = authForm.querySelector("[data-submit-button]");
    const mode = authForm.dataset.authMode;
    const submitLabel = submitButton.textContent;

    const showMessage = (text, isSuccess = false) => {
        message.textContent = text;
        message.dataset.success = String(isSuccess);
        message.hidden = false;
    };

    const describeFailure = (error) => {
        if (error.status === 429) {
            return "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.";
        }
        if (error.code === "weak_password") {
            return "A senha não atende aos requisitos. Use pelo menos 12 caracteres.";
        }
        if (error.code === "invalid_credentials") {
            return "E-mail ou senha incorretos. Confira seus dados e tente novamente.";
        }
        if (error.code === "user_already_exists" || error.code === "email_exists") {
            return "Já existe uma conta com esse e-mail. Tente entrar.";
        }
        return "Não foi possível concluir. Confira seus dados e tente novamente.";
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
        const email = String(formData.get("email")).trim();
        const password = String(formData.get("password"));
        submitButton.disabled = true;
        submitButton.textContent = mode === "register" ? "Criando conta..." : "Entrando...";

        try {
            if (mode === "register") {
                const displayName = String(formData.get("displayName")).trim();
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { display_name: displayName },
                        emailRedirectTo: `${window.location.origin}/login.html`
                    }
                });
                if (error) {
                    throw error;
                }

                if (!data.session) {
                    showMessage("Conta criada! Confirme seu e-mail pelo link enviado para ativá-la.", true);
                    return;
                }
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) {
                    throw error;
                }
            }

            showMessage("Pronto! Abrindo sua jornada...", true);
            await redirectToJourney();
        } catch (error) {
            console.error("A solicitação de autenticação falhou.", error);
            showMessage(describeFailure(error));
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = submitLabel;
        }
    });

    supabase.auth.getSession()
        .then(({ data, error }) => {
            if (error) {
                throw error;
            }
            if (data.session) {
                return redirectToJourney();
            }
        })
        .catch((error) => {
            console.error("Não foi possível verificar a sessão atual.", error);
            showMessage("Não foi possível verificar sua sessão. Atualize a página e tente novamente.");
        });
}
