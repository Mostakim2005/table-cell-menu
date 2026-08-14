import type { Editor } from "obsidian";
import type { TableCell, TableInfo, TableRow } from "../types";

function splitTableLine(line: string): TableCell[] {
    const cells: TableCell[] = [];
    let start = 0;
    let escaped = false;
    let cellStart = 0;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (escaped) {
            escaped = false;
            continue;
        }

        if (char === "\\") {
            escaped = true;
            continue;
        }

        if (char === "|") {
            cells.push({
                index: cells.length,
                content: line.slice(cellStart, i).trim(),
                start: cellStart,
                end: i
            });
            cellStart = i + 1;
        }
    }

    cells.push({
        index: cells.length,
        content: line.slice(cellStart).trim(),
        start: cellStart,
        end: line.length
    });

    const trimmed = line.trim();
    const hasLeadingPipe = trimmed.startsWith("|");
    const hasTrailingPipe = trimmed.endsWith("|");

    let result = cells;

    if (hasLeadingPipe && result.length > 0) result = result.slice(1);
    if (hasTrailingPipe && result.length > 0) result = result.slice(0, -1);

    return result.map((cell, index) => ({ ...cell, index }));
}

function isSeparatorCell(value: string): boolean {
    return /^:?-{1,}:?$/.test(value.trim());
}

function isSeparatorLine(line: string): boolean {
    const cells = splitTableLine(line);
    return cells.length > 0 && cells.every((cell) => isSeparatorCell(cell.content));
}

function hasTablePipe(line: string): boolean {
    let escaped = false;

    for (const char of line) {
        if (escaped) {
            escaped = false;
            continue;
        }

        if (char === "\\") {
            escaped = true;
            continue;
        }

        if (char === "|") return true;
    }

    return false;
}

function getIndentation(line: string): string {
    return line.match(/^\s*/)?.[0] ?? "";
}

function getRow(editor: Editor, line: number): TableRow {
    const text = editor.getLine(line);
    return {
        line,
        cells: splitTableLine(text),
        isSeparator: isSeparatorLine(text)
    };
}

function findTableBounds(editor: Editor, lineNumber: number): { start: number; end: number } | null {
    if (!hasTablePipe(editor.getLine(lineNumber))) return null;

    let start = lineNumber;
    while (start > 0 && hasTablePipe(editor.getLine(start - 1))) start--;

    let end = lineNumber;
    while (end < editor.lastLine() && hasTablePipe(editor.getLine(end + 1))) end++;

    if (end - start < 1) return null;

    if (!isSeparatorLine(editor.getLine(start + 1))) {
        return null;
    }

    return { start, end };
}

function findColumnAtCharacter(line: string, cells: TableCell[], character: number): number {
    if (cells.length === 0) return -1;

    for (const cell of cells) {
        if (character >= cell.start && character <= cell.end) {
            return cell.index;
        }
    }

    if (character < cells[0].start) return 0;
    return cells.length - 1;
}

export function getTableInfoAtPosition(editor: Editor, lineNumber: number, character: number): TableInfo | null {
    const bounds = findTableBounds(editor, lineNumber);
    if (!bounds) return null;

    const rows: TableRow[] = [];
    for (let line = bounds.start; line <= bounds.end; line++) {
        rows.push(getRow(editor, line));
    }

    const currentRow = rows[lineNumber - bounds.start];
    if (!currentRow || currentRow.isSeparator) return null;

    const columnIndex = findColumnAtCharacter(
        editor.getLine(lineNumber),
        currentRow.cells,
        character
    );

    if (columnIndex < 0 || columnIndex >= currentRow.cells.length) return null;

    const header = editor.getLine(bounds.start);
    const trimmedHeader = header.trim();

    return {
        startLine: bounds.start,
        endLine: bounds.end,
        headerLine: bounds.start,
        separatorLine: bounds.start + 1,
        cursorLine: lineNumber,
        cursorColumn: character,
        rowIndex: lineNumber - bounds.start,
        columnIndex,
        hasOuterPipes: trimmedHeader.startsWith("|") && trimmedHeader.endsWith("|"),
        indentation: getIndentation(header),
        rows
    };
}

export function getCellText(editor: Editor, info: TableInfo): string {
    const row = info.rows[info.rowIndex];
    return row?.cells[info.columnIndex]?.content ?? "";
}
