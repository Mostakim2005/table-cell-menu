import type { Editor } from "obsidian";
import type { TableInfo } from "../types";

function splitLine(line: string): string[] {
    const values: string[] = [];
    let current = "";
    let escaped = false;

    for (const char of line) {
        if (escaped) {
            current += char;
            escaped = false;
            continue;
        }

        if (char === "\\") {
            current += char;
            escaped = true;
            continue;
        }

        if (char === "|") {
            values.push(current.trim());
            current = "";
        } else {
            current += char;
        }
    }

    values.push(current.trim());

    const trimmed = line.trim();
    if (trimmed.startsWith("|")) values.shift();
    if (trimmed.endsWith("|")) values.pop();

    return values;
}

function formatLine(cells: string[], hasOuterPipes: boolean, indentation: string): string {
    const body = cells.map((cell) => ` ${cell} `).join("|");
    return `${indentation}${hasOuterPipes ? "|" : ""}${body}${hasOuterPipes ? "|" : ""}`;
}

function replaceLine(editor: Editor, line: number, text: string): void {
    const old = editor.getLine(line);
    editor.replaceRange(text, { line, ch: 0 }, { line, ch: old.length });
}

function replaceLines(editor: Editor, start: number, end: number, lines: string[]): void {
    const from = { line: start, ch: 0 };
    const last = editor.getLine(end);
    const to = { line: end, ch: last.length };
    editor.replaceRange(lines.join("\n"), from, to);
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

function buildTableLines(editor: Editor, info: TableInfo): string[] {
    const lines: string[] = [];
    for (let line = info.startLine; line <= info.endLine; line++) {
        lines.push(editor.getLine(line));
    }
    return lines;
}

export function setCellContent(editor: Editor, info: TableInfo, text: string): void {
    const line = editor.getLine(info.cursorLine);
    const cells = splitLine(line);

    if (info.columnIndex < 0 || info.columnIndex >= cells.length) return;

    cells[info.columnIndex] = text.replace(/\n/g, " ");
    replaceLine(editor, info.cursorLine, formatLine(cells, info.hasOuterPipes, info.indentation));
}

export function insertRow(editor: Editor, info: TableInfo, above: boolean): void {
    const sourceRow = editor.getLine(info.cursorLine);
    const columnCount = splitLine(sourceRow).length;
    const empty = Array.from({ length: columnCount }, () => "");
    const line = above ? info.cursorLine : info.cursorLine + 1;
    const text = formatLine(empty, info.hasOuterPipes, info.indentation);
    editor.replaceRange(`${text}\n`, { line, ch: 0 });
}

export function deleteRow(editor: Editor, info: TableInfo): void {
    if (info.cursorLine <= info.headerLine + 1) return;
    const line = info.cursorLine;
    const lastLine = editor.getLine(line).length;

    if (line === editor.lastLine()) {
        editor.replaceRange("", { line, ch: 0 }, { line, ch: lastLine });
    } else {
        editor.replaceRange("", { line, ch: 0 }, { line: line + 1, ch: 0 });
    }
}

export function duplicateRow(editor: Editor, info: TableInfo): void {
    const source = editor.getLine(info.cursorLine);
    editor.replaceRange(`${source}\n`, { line: info.cursorLine, ch: 0 });
}

export function insertColumn(editor: Editor, info: TableInfo, left: boolean): void {
    const insertIndex = left ? info.columnIndex : info.columnIndex + 1;
    const lines = buildTableLines(editor, info);

    const updated = lines.map((line, rowIndex) => {
        const cells = splitLine(line);
        if (rowIndex === 1) {
            const separator = separatorForColumn(cells[Math.min(info.columnIndex, cells.length - 1)] ?? "---");
            cells.splice(insertIndex, 0, separator);
        } else {
            cells.splice(insertIndex, 0, "");
        }
        return formatLine(cells, info.hasOuterPipes, info.indentation);
    });

    replaceLines(editor, info.startLine, info.endLine, updated);
}

export function deleteColumn(editor: Editor, info: TableInfo): void {
    const lines = buildTableLines(editor, info);
    const updated = lines.map((line) => {
        const cells = splitLine(line);
        if (info.columnIndex < cells.length) cells.splice(info.columnIndex, 1);
        return formatLine(cells, info.hasOuterPipes, info.indentation);
    });

    replaceLines(editor, info.startLine, info.endLine, updated);
}

export function duplicateColumn(editor: Editor, info: TableInfo): void {
    const lines = buildTableLines(editor, info);
    const insertIndex = info.columnIndex + 1;

    const updated = lines.map((line, rowIndex) => {
        const cells = splitLine(line);
        const value = cells[info.columnIndex] ?? "";

        if (rowIndex === 1) {
            cells.splice(insertIndex, 0, separatorForColumn(value));
        } else {
            cells.splice(insertIndex, 0, value);
        }

        return formatLine(cells, info.hasOuterPipes, info.indentation);
    });

    replaceLines(editor, info.startLine, info.endLine, updated);
}
