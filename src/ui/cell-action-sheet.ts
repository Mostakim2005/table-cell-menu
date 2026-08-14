import { Modal, Notice } from "obsidian";
import type { App, Editor } from "obsidian";
import type { TableInfo } from "../types";
import { copyText, readClipboard } from "../services/clipboard-service";
import { EditCellModal } from "./edit-cell-modal";
import {
    deleteColumn,
    deleteRow,
    duplicateColumn,
    duplicateRow,
    insertColumn,
    insertRow,
    setCellContent
} from "../table/table-operations";
import { getCellText } from "../table/table-parser";

interface Action {
    label: string;
    icon: string;
    destructive?: boolean;
    run: () => void;
}

export class CellActionSheet extends Modal {
    private readonly editor: Editor;
    private readonly info: TableInfo;

    constructor(app: App, editor: Editor, info: TableInfo) {
        super(app);
        this.editor = editor;
        this.info = info;
        this.modalEl.addClass("table-cell-menu-sheet");
    }

    onOpen(): void {
        this.contentEl.empty();
        this.contentEl.addClass("table-cell-menu-content");

        const header = this.contentEl.createDiv({ cls: "table-cell-menu-header" });
        header.createDiv({
            cls: "table-cell-menu-eyebrow",
            text: `Row ${this.info.rowIndex + 1} · Column ${this.info.columnIndex + 1}`
        });
        header.createEl("h2", { text: "Cell actions" });

        const primary = this.contentEl.createDiv({ cls: "table-cell-menu-section" });
        primary.createDiv({ cls: "table-cell-menu-section-title", text: "Cell" });

        const actions: Action[] = [
            {
                label: "Edit cell",
                icon: "✎",
                run: () => {
                    const text = getCellText(this.editor, this.info);
                    new EditCellModal(this.app, this.editor, this.info, text).open();
                }
            },
            {
                label: "Copy cell",
                icon: "⧉",
                run: () => {
                    void copyText(getCellText(this.editor, this.info));
                }
            },
            {
                label: "Cut cell",
                icon: "✂",
                run: () => {
                    void this.cutCell();
                }
            },
            {
                label: "Paste cell",
                icon: "▣",
                run: () => {
                    void this.pasteCell();
                }
            },
            {
                label: "Clear cell",
                icon: "×",
                destructive: true,
                run: () => {
                    setCellContent(this.editor, this.info, "");
                    new Notice("Cell cleared.");
                }
            }
        ];

        for (const action of actions) this.addAction(primary, action);

        const structure = this.contentEl.createDiv({ cls: "table-cell-menu-section" });
        structure.createDiv({ cls: "table-cell-menu-section-title", text: "Structure" });

        const grid = structure.createDiv({ cls: "table-cell-menu-grid" });

        const structuralActions: Action[] = [
            { label: "Row above", icon: "↑", run: () => insertRow(this.editor, this.info, true) },
            { label: "Row below", icon: "↓", run: () => insertRow(this.editor, this.info, false) },
            { label: "Column left", icon: "←", run: () => insertColumn(this.editor, this.info, true) },
            { label: "Column right", icon: "→", run: () => insertColumn(this.editor, this.info, false) },
            { label: "Duplicate row", icon: "＋", run: () => duplicateRow(this.editor, this.info) },
            { label: "Duplicate column", icon: "＋", run: () => duplicateColumn(this.editor, this.info) },
            { label: "Delete row", icon: "−", destructive: true, run: () => deleteRow(this.editor, this.info) },
            { label: "Delete column", icon: "−", destructive: true, run: () => deleteColumn(this.editor, this.info) }
        ];

        for (const action of structuralActions) this.addAction(grid, action, true);

        const close = this.contentEl.createEl("button", {
            text: "Close",
            cls: "table-cell-menu-close mod-muted"
        });
        close.addEventListener("click", () => this.close());
    }

    private addAction(parent: HTMLElement, action: Action, compact = false): void {
        const button = parent.createEl("button", {
            cls: [
                "table-cell-menu-action",
                compact ? "table-cell-menu-action-compact" : "",
                action.destructive ? "table-cell-menu-action-danger" : ""
            ].filter(Boolean)
        });

        const icon = button.createSpan({ cls: "table-cell-menu-action-icon", text: action.icon });
        icon.setAttribute("aria-hidden", "true");
        button.createSpan({ cls: "table-cell-menu-action-label", text: action.label });

        button.addEventListener("click", () => {
            this.close();
            action.run();
        });
    }

    private async cutCell(): Promise<void> {
        const text = getCellText(this.editor, this.info);
        if (!(await copyText(text))) return;

        setCellContent(this.editor, this.info, "");
        new Notice("Cell cut.");
    }

    private async pasteCell(): Promise<void> {
        const text = await readClipboard();
        if (text === null) return;

        setCellContent(this.editor, this.info, text);
        new Notice("Cell pasted.");
    }

    onClose(): void {
        this.contentEl.empty();
    }
}
