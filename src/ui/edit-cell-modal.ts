import { Modal, Notice, Setting } from "obsidian";
import type { App, Editor } from "obsidian";
import type { TableInfo } from "../types";
import { copyText } from "../services/clipboard-service";
import { setCellContent } from "../table/table-operations";

function parseMarkdownLink(value: string): { text: string; url: string } | null {
    const match = value.match(/^\[([^\]]*)\]\((.*)\)$/);
    if (!match) return null;

    return {
        text: match[1] ?? "",
        url: match[2] ?? ""
    };
}

export class EditCellModal extends Modal {
    private readonly editor: Editor;
    private readonly info: TableInfo;
    private readonly currentText: string;

    constructor(app: App, editor: Editor, info: TableInfo, currentText: string) {
        super(app);
        this.editor = editor;
        this.info = info;
        this.currentText = currentText;
        this.modalEl.addClass("table-cell-menu-modal");
    }

    onOpen(): void {
        this.contentEl.empty();
        this.contentEl.addClass("table-cell-menu-edit");

        const link = parseMarkdownLink(this.currentText);
        const heading = this.contentEl.createDiv({ cls: "table-cell-menu-modal-heading" });
        heading.createEl("h2", { text: link ? "Edit link" : "Edit cell" });

        if (link) {
            let linkText = link.text;
            let url = link.url;

            new Setting(this.contentEl)
                .setName("Text")
                .addText((component) => {
                    component.setValue(linkText);
                    component.onChange((value) => {
                        linkText = value;
                    });
                });

            new Setting(this.contentEl)
                .setName("URL")
                .addText((component) => {
                    component.setValue(url);
                    component.setPlaceholder("https://example.com");
                    component.onChange((value) => {
                        url = value;
                    });
                });

            const actions = this.contentEl.createDiv({ cls: "table-cell-menu-actions" });

            const open = actions.createEl("button", { text: "Open" });
            open.addEventListener("click", () => {
                if (url.trim()) window.open(url.trim(), "_blank", "noopener,noreferrer");
            });

            const copy = actions.createEl("button", { text: "Copy URL" });
            copy.addEventListener("click", () => {
                void copyText(url);
            });

            const cancel = actions.createEl("button", { text: "Cancel", cls: "mod-muted" });
            cancel.addEventListener("click", () => this.close());

            const save = actions.createEl("button", { text: "Save", cls: "mod-cta" });
            save.addEventListener("click", () => {
                setCellContent(this.editor, this.info, `[${linkText}](${url})`);
                new Notice("Cell updated.");
                this.close();
            });
        } else {
            let value = this.currentText;

            new Setting(this.contentEl)
                .setName("Content")
                .addTextArea((component) => {
                    component.setValue(value);
                    component.setPlaceholder("Enter cell content");
                    component.onChange((next) => {
                        value = next;
                    });
                    component.inputEl.rows = 4;
                });

            const actions = this.contentEl.createDiv({ cls: "table-cell-menu-actions" });

            const cancel = actions.createEl("button", { text: "Cancel", cls: "mod-muted" });
            cancel.addEventListener("click", () => this.close());

            const save = actions.createEl("button", { text: "Save", cls: "mod-cta" });
            save.addEventListener("click", () => {
                setCellContent(this.editor, this.info, value);
                new Notice("Cell updated.");
                this.close();
            });
        }
    }

    onClose(): void {
        this.contentEl.empty();
    }
}
