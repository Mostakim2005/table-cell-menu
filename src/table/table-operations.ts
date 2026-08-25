import type { Editor } from "obsidian";
import type { TableInfo } from "../types";
import {
    getTableColumnCount,
    splitTableLine,
    validateTableLines,
} from "./table-parser";

function formatLine(cells: string[], hasOuterPipes: boolean, indentation: string): string {
    const safeCells = cells.map((cell) => cell.replace(/\r?\n/g, " "));
    const body = safeCells.map((cell) => ` ${cell.trim()} `).join("|");
    return `${indentation}${hasOuterPipes ? "|" : ""}${body}${hasOuterPipes ? "|" : ""}`;
}

function readTableLines(editor: Editor, info: TableInfo): string[] {
    const lines: string[] = [];
    for (let line = info.startLine; line <= info.endLine; line++) lines.push(editor.getLine(line));
    return lines;
}

function replaceTable(editor: Editor, info: TableInfo, lines: string[]): boolean {
    if (!validateTableLines(lines)) return false;

    const from = { line: info.startLine, ch: 0 };
    const endLine = info.endLine;
    const to = { line: endLine, ch: editor.getLine(endLine).length };

    // One CodeMirror transaction gives the user a single undo step and avoids
    // leaving a partially modified table visible to other plugins.
    editor.replaceRange(lines.join("\n"), from, to);
    return true;
}

function separatorForColumn(source: string): string {
    const value = source.trim();
    const left = value.startsWith(":");
    const right = value.endsWith(":");
    if (left && right) return ":---:";
    if (left) return ":---";
    if (right) return "---:";
    return "---";
}

function validTarget(info: TableInfo, editor: Editor): boolean {
    return (
        info.startLine >= 0 &&
        info.endLine <= editor.lastLine() &&
        info.cursorLine >= info.startLine &&
        info.cursorLine <= info.endLine &&
        info.columnIndex >= 0 &&
        info.columnIndex < getTableColumnCount(info)
    );
}

export function setCellContent(editor: Editor, info: TableInfo, text: string): boolean {
    if (!validTarget(info, editor)) return false;

    const line = editor.getLine(info.cursorLine);
    const cells = splitTableLine(line);
    if (info.columnIndex >= cells.length) return false;

    cells[info.columnIndex] = text.replace(/\r?\n/g, " ");
    const lines = readTableLines(editor, info);
    lines[info.cursorLine - info.startLine] = formatLine(cells, info.hasOuterPipes, info.indentation);
    return replaceTable(editor, info, lines);
}

export function insertRow(editor: Editor, info: TableInfo, above: boolean): boolean {
    if (!validTarget(info, editor)) return false;

    const lines = readTableLines(editor, info);
    const columnCount = getTableColumnCount(info);
    if (columnCount < 1) return false;

    const empty = Array.from({ length: columnCount }, () => "");
    const insertAt = above ? info.rowIndex : info.rowIndex + 1;

    // Never insert between the header and separator.
    const safeIndex = Math.max(2, insertAt);
    lines.splice(safeIndex, 0, formatLine(empty, info.hasOuterPipes, info.indentation));
    return replaceTable(editor, info, lines);
}

export function deleteRow(editor: Editor, info: TableInfo): boolean {
    if (!validTarget(info, editor) || info.rowIndex <= 1) return false;
    const lines = readTableLines(editor, info);
    if (lines.length <= 2) return false;

    lines.splice(info.rowIndex, 1);
    return replaceTable(editor, info, lines);
}

export function duplicateRow(editor: Editor, info: TableInfo): boolean {
    if (!validTarget(info, editor) || info.rowIndex <= 1) return false;

    const lines = readTableLines(editor, info);
    lines.splice(info.rowIndex + 1, 0, lines[info.rowIndex] ?? "");
    return replaceTable(editor, info, lines);
}

export function insertColumn(editor: Editor, info: TableInfo, left: boolean): boolean {
    if (!validTarget(info, editor)) return false;

    const lines = readTableLines(editor, info);
    const insertIndex = left ? info.columnIndex : info.columnIndex + 1;

    const updated = lines.map((line, rowIndex) => {
        const cells = splitTableLine(line);
        if (rowIndex === 1) {
            const source = cells[Math.min(info.columnIndex, cells.length - 1)] ?? "---";
            cells.splice(insertIndex, 0, separatorForColumn(source));
        } else {
            cells.splice(insertIndex, 0, "");
        }
        return formatLine(cells, info.hasOuterPipes, info.indentation);
    });

    return replaceTable(editor, info, updated);
}

export function deleteColumn(editor: Editor, info: TableInfo): boolean {
    if (!validTarget(info, editor)) return false;

    const columnCount = getTableColumnCount(info);
    if (columnCount <= 1) return false;

    const lines = readTableLines(editor, info);
    const updated = lines.map((line) => {
        const cells = splitTableLine(line);
        cells.splice(info.columnIndex, 1);
        return formatLine(cells, info.hasOuterPipes, info.indentation);
    });

    return replaceTable(editor, info, updated);
}

export function duplicateColumn(editor: Editor, info: TableInfo): boolean {
    if (!validTarget(info, editor)) return false;

    const lines = readTableLines(editor, info);
    const insertIndex = info.columnIndex + 1;

    const updated = lines.map((line, rowIndex) => {
        const cells = splitTableLine(line);
        const value = cells[info.columnIndex] ?? "";
        cells.splice(insertIndex, 0, rowIndex === 1 ? separatorForColumn(value) : value);
        return formatLine(cells, info.hasOuterPipes, info.indentation);
    });

    return replaceTable(editor, info, updated);
}
