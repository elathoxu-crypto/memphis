import readline from "node:readline";

function ensureTTY(kind: string) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error(`Cannot prompt for ${kind}: not a TTY`);
  }
}

function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });
}

/** Prompt for plain text input (echo on). */
export async function promptLine(prompt: string): Promise<string> {
  ensureTTY("input");
  const rl = createInterface();
  try {
    return await new Promise<string>((resolve) => rl.question(prompt, resolve));
  } finally {
    rl.close();
  }
}

/** Prompt for a yes/no answer (default provided). */
export async function promptYesNo(prompt: string, defaultYes = false): Promise<boolean> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return defaultYes;
  }
  const answer = (await promptLine(prompt)).trim().toLowerCase();
  if (!answer) return defaultYes;
  return ["y", "yes"].includes(answer);
}

/**
 * Prompt for sensitive input (e.g., passwords) without echoing characters.
 * Works in TTY terminals. For non-interactive use, prefer --password-stdin or --password-env.
 */
export async function promptHidden(prompt: string): Promise<string> {
  ensureTTY("password");

  const rl = createInterface() as readline.Interface & { stdoutMuted?: boolean; _writeToOutput?: (s: string) => void; output: any };

  // Mask typed characters
  rl.stdoutMuted = true;
  const originalWrite = (rl as any)._writeToOutput?.bind(rl);

  (rl as any)._writeToOutput = (stringToWrite: string) => {
    if (rl.stdoutMuted) {
      // Preserve newlines/backspaces in a reasonable way
      if (stringToWrite.trim() === "") {
        rl.output.write(stringToWrite);
      } else {
        rl.output.write("*");
      }
      return;
    }
    if (originalWrite) return originalWrite(stringToWrite);
    rl.output.write(stringToWrite);
  };

  try {
    const answer = await new Promise<string>((resolve) => {
      rl.question(prompt, (ans) => resolve(ans));
    });
    rl.stdoutMuted = false;
    rl.output.write("\n");
    return answer;
  } finally {
    rl.close();
  }
}

/** Read entire stdin (trim end) for non-interactive secrets. */
export async function readStdinTrimmed(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf-8").trim();
}
