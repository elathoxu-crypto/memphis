import readline from "node:readline";
/**
 * Prompt for sensitive input (e.g., passwords) without echoing characters.
 * Works in TTY terminals. For non-interactive use, prefer --password-stdin or --password-env.
 */
export async function promptHidden(prompt) {
    if (!process.stdin.isTTY || !process.stdout.isTTY) {
        throw new Error("Cannot prompt for password: not a TTY");
    }
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: true,
    });
    // Mask typed characters
    rl.stdoutMuted = true;
    const originalWrite = rl._writeToOutput?.bind(rl);
    rl._writeToOutput = (stringToWrite) => {
        if (rl.stdoutMuted) {
            // Preserve newlines/backspaces in a reasonable way
            if (stringToWrite.trim() === "") {
                rl.output.write(stringToWrite);
            }
            else {
                rl.output.write("*");
            }
            return;
        }
        if (originalWrite)
            return originalWrite(stringToWrite);
        rl.output.write(stringToWrite);
    };
    try {
        const answer = await new Promise((resolve) => {
            rl.question(prompt, (ans) => resolve(ans));
        });
        rl.stdoutMuted = false;
        rl.output.write("\n");
        return answer;
    }
    finally {
        rl.close();
    }
}
/** Read entire stdin (trim end) for non-interactive secrets. */
export async function readStdinTrimmed() {
    const chunks = [];
    for await (const chunk of process.stdin) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString("utf-8").trim();
}
//# sourceMappingURL=prompt.js.map