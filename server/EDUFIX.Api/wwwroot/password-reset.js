const resetForm = document.querySelector("[data-password-reset]");

if (resetForm) {
    const emailStep = resetForm.querySelector("[data-email-step]");
    const codeStep = resetForm.querySelector("[data-code-step]");
    const emailInput = resetForm.querySelector("#email");
    const codeInput = resetForm.querySelector("#code");
    const passwordInput = resetForm.querySelector("#password");
    const message = resetForm.querySelector("[data-form-message]");
    const submitButton = resetForm.querySelector("[data-submit-button]");
    const resendButton = resetForm.querySelector("[data-resend-button]");
    const successMessage = document.querySelector("[data-reset-success]");
    let step = "email";

    const showMessage = (text, isSuccess = false) => {
        message.textContent = text;
        message.dataset.success = String(isSuccess);
        message.hidden = false;
    };

    const describeFailure = (body, status) => {
        if (status === 429) {
            return "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.";
        }

        if (status === 503) {
            return body?.detail ?? "O serviço está temporariamente indisponível. Tente novamente mais tarde.";
        }

        const validationErrors = Object.values(body?.errors ?? {}).flat();
        if (validationErrors.length > 0) {
            return validationErrors.join(" ");
        }

        return body?.detail ?? body?.title ?? "Não foi possível concluir. Tente novamente.";
    };

    const postJson = async (endpoint, payload) => {
        const response = await fetch(endpoint, {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const contentType = response.headers.get("content-type") ?? "";
        const body = contentType.includes("json") ? await response.json() : null;

        if (!response.ok) {
            throw { body, status: response.status };
        }

        return body;
    };

    const requestCode = async () => {
        if (!emailInput.reportValidity()) {
            return;
        }

        submitButton.disabled = true;
        resendButton.disabled = true;
        submitButton.textContent = "Enviando...";
        message.hidden = true;

        try {
            const body = await postJson("/api/auth/password-reset/request", {
                email: emailInput.value
            });
            step = "code";
            emailStep.hidden = true;
            codeStep.hidden = false;
            codeInput.disabled = false;
            passwordInput.disabled = false;
            resendButton.hidden = false;
            submitButton.textContent = "Redefinir senha";
            showMessage(body.message);
        } catch (error) {
            if (error instanceof TypeError) {
                console.error("A solicitação do código de recuperação falhou.", error);
                showMessage("Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.");
            } else {
                showMessage(describeFailure(error.body, error.status));
            }
        } finally {
            submitButton.disabled = false;
            resendButton.disabled = false;
            submitButton.textContent = step === "email" ? "Enviar código" : "Redefinir senha";
        }
    };

    const completeReset = async () => {
        if (!resetForm.reportValidity()) {
            return;
        }

        submitButton.disabled = true;
        resendButton.disabled = true;
        submitButton.textContent = "Redefinindo...";
        message.hidden = true;

        try {
            await postJson("/api/auth/password-reset/complete", {
                email: emailInput.value,
                code: codeInput.value,
                password: passwordInput.value
            });
            resetForm.hidden = true;
            document.querySelector(".auth-footnote").hidden = true;
            successMessage.hidden = false;
        } catch (error) {
            if (error instanceof TypeError) {
                console.error("A redefinição da senha falhou.", error);
                showMessage("Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.");
            } else {
                showMessage(describeFailure(error.body, error.status));
            }
        } finally {
            submitButton.disabled = false;
            resendButton.disabled = false;
            submitButton.textContent = "Redefinir senha";
        }
    };

    resetForm.addEventListener("input", () => {
        message.hidden = true;
    });

    resetForm.addEventListener("submit", (event) => {
        event.preventDefault();
        if (step === "email") {
            void requestCode();
        } else {
            void completeReset();
        }
    });

    resendButton.addEventListener("click", () => {
        void requestCode();
    });
}
