import { MarkdownView, Plugin } from "obsidian";
import {
    DEFAULT_SETTINGS,
    TableCellMenuSettings,
    TableCellMenuSettingTab
} from "./settings";
import { getTableInfoAtPosition } from "./table/table-parser";
import { CellActionSheet } from "./ui/cell-action-sheet";

export default class TableCellMenuPlugin extends Plugin {
    settings: TableCellMenuSettings = { ...DEFAULT_SETTINGS };

    async onload(): Promise<void> {
        await this.loadSettings();

        this.addSettingTab(new TableCellMenuSettingTab(this.app, this));

        this.registerDomEvent(document, "contextmenu", (event) => {
            this.handleContextMenu(event);
        });
    }

    async loadSettings(): Promise<void> {
        const data = await this.loadData();

        this.settings = {
            ...DEFAULT_SETTINGS,
            ...(data && typeof data === "object" ? data : {})
        };
    }

    async saveSettings(): Promise<void> {
        await this.saveData(this.settings);
    }

    private handleContextMenu(event: MouseEvent): void {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);

        if (!view || view.getMode() !== "source") {
            return;
        }

        const target = event.target;

        if (!(target instanceof HTMLElement)) {
            return;
        }

        const editor = view.editor;
        const cursor = editor.getCursor();
        const line = editor.getLine(cursor.line);

        if (!line.includes("|")) {
            return;
        }

        const info = getTableInfoAtPosition(
            editor,
            cursor.line,
            cursor.ch
        );

        if (!info) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        new CellActionSheet(
            this.app,
            editor,
            info
        ).open();
    }
}
