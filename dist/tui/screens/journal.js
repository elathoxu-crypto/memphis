import { validateInput } from "../helpers.js";
export function renderJournalStatic() {
    let content = `{bold}{cyan}📓 Journal Entry{/cyan}{/bold}\n\n`;
    content += `Dodaj nowy wpis do pamięci.\n\n`;
    content += `{white}Naciśnij Enter, aby zacząć pisać...{/white}\n`;
    return content;
}
export function setupJournalInput(store, widgets, onDone) {
    const { inputBox, inputField, contentBox, screen } = widgets;
    setTimeout(() => {
        inputBox.show();
        inputField.options.placeholder = "Co masz na myśli?";
        inputField.focus();
        inputField.readInput((_err, value) => {
            if (validateInput(value)) {
                store.addBlock("journal", {
                    type: "journal",
                    content: value.trim(),
                    tags: [],
                });
                contentBox.setContent(`{green}✅ Wpis dodany pomyślnie!{/green}\n\nNaciśnij dowolny klawisz, aby wrócić...`);
            }
            else {
                contentBox.setContent(`{yellow}Anulowano.{/yellow}\n`);
            }
            inputBox.hide();
            screen.render();
            onDone();
        });
    }, 100);
}
//# sourceMappingURL=journal.js.map