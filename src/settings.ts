import { App, PluginSettingTab, Setting } from "obsidian";
import type TableCellMenuPlugin from "./main";

export interface TableCellMenuSettings {
    showActionSheet: boolean;
}

export const DEFAULT_SETTINGS: TableCellMenuSettings = {
    showActionSheet: true
};

export class TableCellMenuSettingTab extends PluginSettingTab {
    plugin: TableCellMenuPlugin;

    constructor(app: App, plugin: TableCellMenuPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        new Setting(containerEl)
            .setName("Action sheet")
            .setDesc("Use the mobile-friendly action sheet for table cell actions.")
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
