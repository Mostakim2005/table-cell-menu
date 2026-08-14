import { App, PluginSettingTab, Setting } from "obsidian";
import type TableCellMenuPlugin from "./main";

export interface TableCellMenuSettings {
    showActionSheet: boolean;
}

export const DEFAULT_SETTINGS: TableCellMenuSettings = {
    showActionSheet: true
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

export function normalizeSettings(data: unknown): TableCellMenuSettings {
    if (!isRecord(data)) {
        return { ...DEFAULT_SETTINGS };
    }

    return {
        showActionSheet:
            typeof data.showActionSheet === "boolean"
                ? data.showActionSheet
                : DEFAULT_SETTINGS.showActionSheet
    };
}

export class TableCellMenuSettingTab extends PluginSettingTab {
    constructor(
        app: App,
        private readonly plugin: TableCellMenuPlugin
    ) {
        super(app, plugin);
    }

    getSettingDefinitions() {
        return [
            {
                name: "Enable table cell menu",
                desc: "Show the mobile-friendly action sheet when you open a table cell context menu.",
                control: {
                    type: "toggle",
                    key: "showActionSheet"
                }
            }
        ];
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        new Setting(containerEl)
            .setName("Enable table cell menu")
            .setDesc(
                "Show the mobile-friendly action sheet when you open a table cell context menu."
            )
            .addToggle((toggle) => {
                toggle
                    .setValue(this.plugin.settings.showActionSheet)
                    .onChange(async (value) => {
                        this.plugin.settings.showActionSheet = value;
                        await this.plugin.saveSettings();
                    });
            });
    }
}
