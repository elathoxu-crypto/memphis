/**
 * TUI Confirmation Dialog
 *
 * Usage:
 *   const confirmed = await confirm(screen, "Delete all data?", "This cannot be undone");
 *   if (confirmed) { ... }
 */

import blessed from "blessed";

export interface ConfirmOptions {
  title?: string;
  message: string;
  details?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

/**
 * Show confirmation dialog and return true/false
 */
export async function confirm(
  screen: blessed.Widgets.Screen,
  options: ConfirmOptions
): Promise<boolean> {
  return new Promise((resolve) => {
    const dialogWidth = 60;
    const dialogHeight = options.details ? 10 : 7;
    const dialogLeft = Math.floor((screen.width as number - dialogWidth) / 2);
    const dialogTop = Math.floor((screen.height as number - dialogHeight) / 2);

    // Dialog box
    const dialog = blessed.box({
      parent: screen,
      top: dialogTop,
      left: dialogLeft,
      width: dialogWidth,
      height: dialogHeight,
      tags: true,
      border: { type: "line" },
      style: {
        fg: "white",
        bg: "red",
        border: { fg: "red" },
      },
      content: buildDialogContent(options),
    });

    // Buttons container
    const buttonBox = blessed.box({
      parent: dialog,
      bottom: 1,
      left: 0,
      width: "100%",
      height: 1,
      align: "center",
    });

    // Confirm button
    const confirmBtn = blessed.button({
      parent: buttonBox,
      left: 10,
      width: 12,
      height: 1,
      content: options.confirmLabel || "  Confirm",
      style: {
        fg: "white",
        bg: "red",
        bold: true,
        focus: { bg: "brightRed" },
      },
    });

    // Cancel button
    const cancelBtn = blessed.button({
      parent: buttonBox,
      left: 28,
      width: 12,
      height: 1,
      content: options.cancelLabel || "  Cancel",
      style: {
        fg: "white",
        bg: "blue",
        bold: true,
        focus: { bg: "brightBlue" },
      },
    });

    // Focus handling
    confirmBtn.focus();

    // Key bindings
    confirmBtn.key(["enter", "space"], () => {
      dialog.destroy();
      screen.render();
      resolve(true);
    });

    cancelBtn.key(["enter", "space", "escape"], () => {
      dialog.destroy();
      screen.render();
      resolve(false);
    });

    // Tab to switch focus
    confirmBtn.key(["tab"], () => cancelBtn.focus());
    cancelBtn.key(["tab"], () => confirmBtn.focus());

    // Click handling
    confirmBtn.on("click", () => {
      dialog.destroy();
      screen.render();
      resolve(true);
    });

    cancelBtn.on("click", () => {
      dialog.destroy();
      screen.render();
      resolve(false);
    });

    // Escape to cancel
    dialog.key(["escape", "q"], () => {
      dialog.destroy();
      screen.render();
      resolve(false);
    });

    screen.render();
  });
}

/**
 * Show alert dialog (informational)
 */
export async function alert(
  screen: blessed.Widgets.Screen,
  message: string,
  title?: string
): Promise<void> {
  return new Promise((resolve) => {
    const dialogWidth = 50;
    const dialogHeight = 5;
    const dialogLeft = Math.floor((screen.width as number - dialogWidth) / 2);
    const dialogTop = Math.floor((screen.height as number - dialogHeight) / 2);

    const dialog = blessed.box({
      parent: screen,
      top: dialogTop,
      left: dialogLeft,
      width: dialogWidth,
      height: dialogHeight,
      tags: true,
      border: { type: "line" },
      style: {
        fg: "white",
        bg: "blue",
        border: { fg: "blue" },
      },
      content: `{bold}${title || "Info"}{/bold}\n\n${message}`,
    });

    dialog.key(["enter", "space", "escape", "q"], () => {
      dialog.destroy();
      screen.render();
      resolve();
    });

    dialog.focus();
    screen.render();
  });
}

/**
 * Build dialog content string
 */
function buildDialogContent(options: ConfirmOptions): string {
  let content = `{bold}${options.title || "⚠️  Confirm Action"}{/bold}\n\n`;
  content += options.message;

  if (options.details) {
    content += `\n\n{gray-fg}${options.details}{/gray-fg}`;
  }

  return content;
}
