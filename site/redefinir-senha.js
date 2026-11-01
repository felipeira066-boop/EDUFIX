import { supabase } from "./supabase-client.js";

const resetForm = document.querySelector("[data-new-password]");
const errorMessage = document.querySelector("[data-reset-error]");
const successMessage = document.querySelector("[data-reset-success]");

const showError = (text) => {
    errorMessage.textContent = text;
    errorMessage.hidden = false;
};

if (resetForm) {
    try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!data.session) {
            showError("Este link expirou ou já foi usado. Solicite uma nova redefinição de senha.");
        } else {
            resetForm.hidden = false;
        }
    } catch (error) {
        console.error("Não foi possível validar o link de redefinição.", error);
        showError("Não foi possível validar o link. Solicite uma nova redefinição de senha.");
    }

    resetForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const message = resetForm.querySelector("[data-form-message]");
        const button = resetForm.querySelector("[data-submit-button]");
        message.hidden = true;
        if (!resetForm.reportValidity()) return;

        button.disabled = true;
        try {
            const password = new FormData(resetForm).get("password");
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;
            resetForm.hidden = true;
            successMessage.hidden = false;
        } catch (error) {
            console.error("Não foi possível atualizar a senha.", error);
            message.textContent = error.code === "weak_password"
                ? "A senha não atende aos requisitos. Use pelo menos 12 caracteres."
                : "Não foi possível atualizar a senha. Solicite um novo link e tente novamente.";
            message.hidden = false;
        } finally {
            button.disabled = false;
        }
    });
}
