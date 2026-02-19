import { encrypt } from "../../utils/crypto.js";
import { validateInput } from "../helpers.js";
export function renderVaultStatic() {
    let content = `{bold}{cyan}🔐 Vault – Zaszyfrowane sekrety{/cyan}{/bold}\n\n`;
    content += `Bezpieczne przechowywanie kluczy API i sekretów.\n`;
    content += `Szyfrowanie: AES-256-GCM + PBKDF2 (100 000 iteracji).\n\n`;
    content += `{white}Naciśnij Enter, aby dodać nowy sekret...{/white}\n`;
    return content;
}
export function setupVaultInput(store, widgets, onDone) {
    const { inputBox, inputField, contentBox, screen } = widgets;
    const abort = () => {
        inputBox.hide();
        screen.render();
        onDone();
    };
    setTimeout(() => {
        inputBox.show();
        inputField.options.placeholder = "Nazwa sekretu (np. openrouter):";
        inputField.focus();
        inputField.readInput((_e1, keyName) => {
            if (!validateInput(keyName))
                return abort();
            inputField.setValue("");
            inputField.options.placeholder = "Wartość sekretu:";
            screen.render();
            inputField.readInput((_e2, secretValue) => {
                if (!validateInput(secretValue))
                    return abort();
                inputField.setValue("");
                inputField.options.placeholder = "Hasło główne:";
                screen.render();
                inputField.readInput((_e3, password) => {
                    if (!validateInput(password))
                        return abort();
                    try {
                        const encrypted = encrypt(secretValue.trim(), password.trim());
                        store.addBlock("vault", {
                            type: "vault",
                            content: keyName.trim(),
                            tags: ["secret", keyName.trim()],
                            encrypted,
                            key_id: keyName.trim(),
                        });
                        contentBox.setContent(`{green}✅ Sekret "${keyName.trim()}" dodany pomyślnie!{/green}\n\nNaciśnij dowolny klawisz, aby wrócić...`);
                    }
                    catch (err) {
                        contentBox.setContent(`{red}❌ Błąd szyfrowania: ${err}{/red}\n\nNaciśnij dowolny klawisz, aby wrócić...`);
                    }
                    abort();
                });
            });
        });
    }, 100);
}
//# sourceMappingURL=vault.js.map