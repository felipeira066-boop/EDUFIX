import { requireProfile, signOut } from "./account.js";
import { supabase } from "./supabase-client.js";

const shopGrid = document.querySelector("#shop-grid");
const products = [
    { id: "skin-aurora", name: "Skin Aurora", description: "Uma nova aparência para acompanhar sua jornada.", icon: "🌌", category: "Cosmético", price: 150 },
    { id: "extra-life", name: "Vida extra", description: "Guarde uma vida para usar quando precisar.", icon: "💚", category: "Vantagem", price: 100 },
    { id: "double-xp", name: "XP em dobro", description: "Item de experiência dupla para suas próximas atividades.", icon: "⚡", category: "Impulso", price: 200 },
    { id: "coin-bonus", name: "Bônus de moedas", description: "Um pequeno impulso para sua próxima compra.", icon: "🪙", category: "Bônus", price: 75 }
];

if (shopGrid) {
    const balance = document.querySelector("#coin-balance");
    const message = document.querySelector("#shop-message");
    const inventoryList = document.querySelector("#inventory-list");
    const userLabel = document.querySelector("#shop-user");
    const logoutButton = document.querySelector("#logout-button");
    let shopState;
    let currentUserId;

    const showMessage = (text, success = false) => {
        message.textContent = text;
        message.dataset.success = String(success);
        message.hidden = false;
    };

    const renderInventory = () => {
        const entries = shopState.inventory
            .map((item) => {
                const product = products.find((candidate) => candidate.id === item.product_id);
                return product ? { ...product, quantity: item.quantity } : null;
            })
            .filter(Boolean);

        if (entries.length === 0) {
            const empty = document.createElement("p");
            empty.className = "inventory-empty";
            empty.textContent = "Seu inventário está vazio. Escolha um item para começar.";
            inventoryList.replaceChildren(empty);
            return;
        }

        inventoryList.replaceChildren(...entries.map((item) => {
            const row = document.createElement("div");
            row.className = "inventory-row";
            const icon = document.createElement("span");
            icon.setAttribute("aria-hidden", "true");
            icon.textContent = item.icon;
            const name = document.createElement("strong");
            name.textContent = item.name;
            const quantity = document.createElement("span");
            quantity.className = "inventory-quantity";
            quantity.textContent = `x${item.quantity}`;
            row.append(icon, name, quantity);
            return row;
        }));
    };

    const renderShop = () => {
        balance.textContent = shopState.coins.toLocaleString("pt-BR");
        shopGrid.replaceChildren(...products.map((product) => {
            const card = document.createElement("article");
            card.className = "shop-card";

            const icon = document.createElement("span");
            icon.className = "shop-item-icon";
            icon.setAttribute("aria-hidden", "true");
            icon.textContent = product.icon;

            const category = document.createElement("p");
            category.className = "shop-category";
            category.textContent = product.category;

            const title = document.createElement("h3");
            title.textContent = product.name;

            const description = document.createElement("p");
            description.className = "shop-description";
            description.textContent = product.description;

            const button = document.createElement("button");
            button.className = "shop-buy";
            button.type = "button";
            button.disabled = shopState.coins < product.price;
            const label = document.createElement("span");
            label.textContent = "Resgatar";
            const price = document.createElement("span");
            price.textContent = `🪙 ${product.price}`;
            button.append(label, price);
            button.addEventListener("click", () => purchase(product.id, button));
            card.append(icon, category, title, description, button);
            return card;
        }));
        renderInventory();
        document.querySelector("[data-ad-slot]").hidden = shopState.hasStudyPass;
    };

    const loadShop = async (userId) => {
        const [profileResult, inventoryResult] = await Promise.all([
            supabase.from("profiles").select("coins, has_study_pass").eq("user_id", userId).single(),
            supabase.from("user_inventory").select("product_id, quantity").eq("user_id", userId)
        ]);
        if (profileResult.error) throw profileResult.error;
        if (inventoryResult.error) throw inventoryResult.error;

        shopState = {
            coins: profileResult.data.coins,
            hasStudyPass: profileResult.data.has_study_pass,
            inventory: inventoryResult.data
        };
        renderShop();
    };

    const purchase = async (productId, button) => {
        message.hidden = true;
        button.disabled = true;
        let purchaseCompleted = false;

        try {
            const { error } = await supabase.rpc("purchase_product", { p_product_id: productId });
            if (error) {
                if (error.message.includes("insufficient_coins")) {
                    showMessage("Você não tem moedas suficientes para este item.");
                    return;
                }
                throw error;
            }

            purchaseCompleted = true;
            showMessage("Item adicionado ao inventário!", true);
            await loadShop(currentUserId);
        } catch (error) {
            console.error("Não foi possível concluir a compra do item.", error);
            showMessage(purchaseCompleted
                ? "Compra concluída, mas não foi possível atualizar o saldo. Atualize a página."
                : "Não foi possível resgatar o item. Tente novamente.");
        } finally {
            button.disabled = false;
        }
    };

    const initializeShop = async () => {
        try {
            const account = await requireProfile({ planRequired: true });
            if (!account) return;
            currentUserId = account.user.id;
            userLabel.textContent = `Olá, ${account.profile.display_name}`;
            await loadShop(currentUserId);
        } catch (error) {
            console.error("Não foi possível carregar a loja.", error);
            showMessage("Não foi possível carregar a loja. Confira sua conexão e atualize a página.");
        }
    };

    logoutButton.addEventListener("click", async () => {
        logoutButton.disabled = true;
        try {
            await signOut();
        } catch (error) {
            console.error("Não foi possível encerrar a sessão.", error);
            showMessage("Não foi possível sair. Tente novamente.");
            logoutButton.disabled = false;
        }
    });

    void initializeShop();
}
