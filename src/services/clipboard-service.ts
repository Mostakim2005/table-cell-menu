import { Notice } from "obsidian";

export async function copyText(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        new Notice("Cell copied.");
        return true;
    } catch {
        new Notice("Could not copy to the clipboard.");
        return false;
    }
}

export async function readClipboard(): Promise<string | null> {
    try {
        const text = await navigator.clipboard.readText();
        if (!text) {
            new Notice("Clipboard is empty.");
            return null;
        }
        return text;
    } catch {
        new Notice("Could not read the clipboard.");
        return null;
    }
}
