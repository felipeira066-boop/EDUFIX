import { supabase } from "./supabase-client.js";

const resetForm = document.querySelector("[data-password-reset]");

if (resetForm) {
    const emailInput = resetForm.querySelector("#email");
    const message = resetForm.querySelector("[data-form-message]");
    const submitButton = resetForm.querySelector("[data-submit-button]");
    const successMessage = document.querySelector("[data-reset-success]");

    resetForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        message.hidden = true;
        if (!resetForm.reportValidity()) return;

        submitButton.disabled = true;
        submitButton.textContent = "Enviando...";
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(
                emailInput.value.trim(),
                { redirectTo: `${window.location.origin}/redefinir-senha.html` });
            if (error) throw error;

            resetForm.hidden = true;
            document.querySelector(".auth-footnote").hidden = true;
            successMessage.hidden = false;
        } catch (error) {
            console.error("Não foi possível solicitar a redefinição de senha.", error);
            message.textContent = "Não foi possível enviar o e-mail. Confira o endereço e tente novamente.";
            message.hidden = false;
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = "Enviar link";
        }
    });
}
