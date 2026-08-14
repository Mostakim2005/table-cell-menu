import type { Editor, EditorPosition } from "obsidian";

export interface TableCell {
    index: number;
    content: string;
    start: number;
    end: number;
}

export interface TableRow {
    line: number;
    cells: TableCell[];
    isSeparator: boolean;
}

export interface TableInfo {
    startLine: number;
    endLine: number;
    headerLine: number;
    separatorLine: number;
    cursorLine: number;
    cursorColumn: number;
    rowIndex: number;
    columnIndex: number;
    hasOuterPipes: boolean;
    indentation: string;
    rows: TableRow[];
}

export interface TableContext {
    editor: Editor;
    info: TableInfo;
    position: EditorPosition;
}
