import type { Editor } from "obsidian";
import type { TableCell, TableInfo, TableRow } from "../types";

function scanCells(line: string): TableCell[] {
    const raw: TableCell[] = [];
    let escaped = false;
    let start = 0;
    let index = 0;

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
            raw.push({
                index: index++,
                content: line.slice(start, i).trim(),
                start,
                end: i
            });
            start = i + 1;
        }
    }

    raw.push({
        index: index++,
        content: line.slice(start).trim(),
        start,
        end: line.length
    });

    const trimmed = line.trim();
    let cells = raw;
    if (trimmed.startsWith("|")) cells = cells.slice(1);
    if (trimmed.endsWith("|")) cells = cells.slice(0, -1);

    return cells.map((cell, i) => ({ ...cell, index: i }));
}

export function splitTableLine(line: string): string[] {
    return scanCells(line).map((cell) => cell.content);
}

export function isSeparatorCell(value: string): boolean {
    return /^:?-{3,}:?$/.test(value.trim());
}

export function isSeparatorLine(line: string): boolean {
    const cells = scanCells(line);
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
        cells: scanCells(text),
        isSeparator: isSeparatorLine(text)
    };
}

function findTableBounds(editor: Editor, lineNumber: number): { start: number; end: number } | null {
    if (lineNumber < 0 || lineNumber > editor.lastLine()) return null;
    if (!hasTablePipe(editor.getLine(lineNumber))) return null;

    let start = lineNumber;
    while (start > 0 && hasTablePipe(editor.getLine(start - 1))) start--;

    let end = lineNumber;
    while (end < editor.lastLine() && hasTablePipe(editor.getLine(end + 1))) end++;

    // A Markdown table needs a header row and a separator row.
    if (end - start < 1 || !isSeparatorLine(editor.getLine(start + 1))) return null;

    // Stop malformed "pipe blocks" from being treated as tables.
    const headerCells = scanCells(editor.getLine(start));
    const separatorCells = scanCells(editor.getLine(start + 1));
    if (!headerCells.length || headerCells.length !== separatorCells.length) return null;

    return { start, end };
}

function findColumnAtCharacter(cells: TableCell[], character: number): number {
    if (!cells.length) return -1;
    for (const cell of cells) {
        if (character >= cell.start && character <= cell.end) return cell.index;
    }
    const firstCell = cells[0];
    if (!firstCell) return -1;
    return character < firstCell.start ? 0 : cells.length - 1;
}

/**
 * Resolve a table cell from an editor position. This intentionally depends on
 * the supplied position rather than the editor's current cursor, so callers
 * can resolve a context-menu target without requiring a prior click.
 */
export function getTableInfoAtPosition(editor: Editor, lineNumber: number, character: number): TableInfo | null {
    const bounds = findTableBounds(editor, lineNumber);
    if (!bounds) return null;

    const rows: TableRow[] = [];
    for (let line = bounds.start; line <= bounds.end; line++) rows.push(getRow(editor, line));

    const currentRow = rows[lineNumber - bounds.start];
    if (!currentRow || currentRow.isSeparator) return null;

    const columnIndex = findColumnAtCharacter(currentRow.cells, Math.max(0, character));
    if (columnIndex < 0 || columnIndex >= currentRow.cells.length) return null;

    const header = editor.getLine(bounds.start);
    const trimmedHeader = header.trim();

    return {
        startLine: bounds.start,
        endLine: bounds.end,
        headerLine: bounds.start,
        separatorLine: bounds.start + 1,
        cursorLine: lineNumber,
        cursorColumn: Math.max(0, character),
        rowIndex: lineNumber - bounds.start,
        columnIndex,
        hasOuterPipes: trimmedHeader.startsWith("|") && trimmedHeader.endsWith("|"),
        indentation: getIndentation(header),
        rows
    };
}

export function getCellText(editor: Editor, info: TableInfo): string {
    return info.rows[info.rowIndex]?.cells[info.columnIndex]?.content ?? "";
}

export function getTableColumnCount(info: TableInfo): number {
    return info.rows[0]?.cells.length ?? 0;
}

export function validateTableLines(lines: string[]): boolean {
    if (lines.length < 2) return false;
    const headerLine = lines[0];
    const separatorLine = lines[1];
    if (headerLine === undefined || separatorLine === undefined) return false;
    const header = scanCells(headerLine);
    const separator = scanCells(separatorLine);
    if (!header.length || header.length !== separator.length) return false;
    if (!separator.every((cell) => isSeparatorCell(cell.content))) return false;

    for (const line of lines) {
        if (scanCells(line).length !== header.length) return false;
    }
    return true;
}
