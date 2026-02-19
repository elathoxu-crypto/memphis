import { truncate, validateInput } from "../helpers.js";
export function renderOpenClaw(bridge) {
    const agents = bridge.getAgents();
    const messages = bridge.getMessages();
    let content = `{bold}{cyan}🦞 OpenClaw – Współpraca agentów{/cyan}{/bold}\n\n`;
    content += `{white}Status mostu:{/white}\n`;
    content += `  Podłączeni agenci: ${agents.length}\n`;
    content += `  Wymienione wiadomości: ${messages.length}\n\n`;
    content += `{bold}Agenci:{/bold}\n`;
    if (agents.length === 0) {
        content += `  {yellow}Brak podłączonych agentów.{/yellow}\n`;
    }
    else {
        for (const agent of agents) {
            content += `  {cyan}• ${agent.name}{/cyan}\n`;
            content += `    Status: ${agent.status}\n`;
            content += `    CPU share: ${agent.computeShare}%\n`;
            content += `    Możliwości: ${agent.capabilities.join(", ")}\n\n`;
        }
    }
    if (messages.length > 0) {
        content += `{bold}Ostatnie wiadomości:{/bold}\n`;
        for (const msg of messages.slice(-3)) {
            content += `  ${msg.from} → ${msg.to}: ${truncate(msg.content, 50)}\n`;
        }
        content += "\n";
    }
    content += `{white}[Enter] Wyślij wiadomość | [n] Negocjuj CPU | [r] Logi dziennika{/white}\n`;
    return content;
}
export function setupOpenClawInput(store, bridge, widgets, onDone) {
    const { inputBox, inputField, contentBox, screen } = widgets;
    const finish = () => {
        inputBox.hide();
        screen.render();
        onDone();
    };
    setTimeout(() => {
        inputBox.show();
        inputField.options.placeholder = "[Enter]=wiadomość | [n]=negocjuj | [r]=logi:";
        inputField.focus();
        inputField.readInput((_err, value) => {
            const input = (value ?? "").trim().toLowerCase();
            if (input === "n") {
                inputField.setValue("");
                inputField.options.placeholder = "Udział CPU w % (np. 40):";
                screen.render();
                inputField.readInput((_e2, shareVal) => {
                    if (validateInput(shareVal)) {
                        const share = parseInt(shareVal.trim(), 10);
                        if (isNaN(share)) {
                            contentBox.setContent(`{red}❌ Nieprawidłowa wartość: "${shareVal}"{/red}\n`);
                        }
                        else {
                            const result = bridge.negotiateComputeShare("openclaw-001", share);
                            const agents = bridge.getAgents();
                            const agent = agents.find(a => a.id === "openclaw-001");
                            contentBox.setContent(result.success
                                ? `{green}✅ Udział CPU ustalony na ${agent?.computeShare}%{/green}\n\nNaciśnij dowolny klawisz...`
                                : `{red}❌ Negocjacja nieudana: ${result.message}{/red}\n`);
                        }
                    }
                    finish();
                });
                return;
            }
            if (input === "r") {
                const logs = store.readChain("journal");
                const recent = logs.slice(-20).reverse();
                let out = `{bold}{cyan}📜 Logi dziennika (ostatnie 20){/cyan}{/bold}\n\n`;
                if (recent.length === 0) {
                    out += `{yellow}Brak wpisów.{/yellow}\n`;
                }
                else {
                    for (const block of recent) {
                        out += `{cyan}[${block.index}]{/cyan} ${block.timestamp}\n`;
                        out += `   ${truncate(block.data?.content ?? "", 80)}\n\n`;
                    }
                }
                out += `\n{white}Naciśnij dowolny klawisz...{/white}`;
                contentBox.setContent(out);
                finish();
                return;
            }
            // Send message via bridge
            if (validateInput(value)) {
                bridge.sendMessage("openclaw-001", value.trim()).then(response => {
                    contentBox.setContent(`{bold}Wysłano: "${truncate(value.trim(), 40)}"{/bold}\n\n` +
                        `{cyan}Odpowiedź agenta:{/cyan}\n\n${response.content}\n\n` +
                        `{white}Naciśnij dowolny klawisz...{/white}`);
                    finish();
                });
            }
            else {
                finish();
            }
        });
    }, 100);
}
//# sourceMappingURL=openclaw.js.map