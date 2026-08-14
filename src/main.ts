import { MarkdownView, Plugin } from "obsidian";
import type { Menu } from "obsidian";
import { CellActionSheet } from "./ui/cell-action-sheet";
import { getTableInfoAtPosition } from "./table/table-parser";

export default class TableCellMenuPlugin extends Plugin {
    onload(): void {
        this.registerDomEvent(document, "contextmenu", (event) => {
            this.handleContextMenu(event);
        });
    }

    private handleContextMenu(event: MouseEvent): void {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!view || view.getMode() !== "source") return;

        const target = event.target;
        if (!(target instanceof HTMLElement)) return;

        const editor = view.editor;
        const cursor = editor.getCursor();
        const line = editor.getLine(cursor.line);

        if (!line.includes("|")) return;

        const info = getTableInfoAtPosition(editor, cursor.line, cursor.ch);
        if (!info) return;

        event.preventDefault();
        event.stopPropagation();

        new CellActionSheet(this.app, editor, info).open();
    }
}
