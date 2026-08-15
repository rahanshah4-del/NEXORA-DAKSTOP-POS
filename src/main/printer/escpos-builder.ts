/**
 * escpos-builder.ts — Pure ESC/POS command builder.
 *
 * Builds a byte Buffer of ESC/POS commands. No I/O — just returns a Buffer.
 * 58mm = 32 chars/line, 80mm = 48 chars/line at standard font.
 */

const ESC = 0x1b;
const GS = 0x1d;

// ── Internal helpers ──

function cmd(...bytes: number[]): Buffer { return Buffer.from(bytes); }

function pad(text: string, width: number, alignRight = false): string {
  if (text.length > width) return text.slice(0, width);
  return alignRight ? text.padStart(width, ' ') : text;
}

function twoCol(left: string, right: string, width: number): string {
  const avail = width - (left.length + right.length);
  if (avail < 0) {
    const trunc = left.slice(0, Math.max(0, width - right.length - 1)) + ' ';
    return trunc + right.padStart(width - trunc.length, ' ');
  }
  return left + ' '.repeat(avail) + right;
}

function padCenter(text: string, width: number): string {
  if (text.length >= width) return text.slice(0, width);
  const sp = Math.floor((width - text.length) / 2);
  return ' '.repeat(Math.max(0, sp)) + text;
}

// ── Builder class ──

export class EscposBuilder {
  private chunks: Buffer[] = [];
  private _width: number;

  constructor(paperWidth: number) {
    this._width = paperWidth <= 58 ? 32 : 48;
  }

  get width(): number { return this._width; }

  // ── Raw ──
  raw(...bytes: number[]): this { this.chunks.push(cmd(...bytes)); return this; }

  /** ESC @ — reset printer */
  init(): this { return this.raw(ESC, 0x40); }

  // ── Text style ──
  boldOn(): this  { return this.raw(ESC, 0x45, 0x01); }
  boldOff(): this { return this.raw(ESC, 0x45, 0x00); }

  /** Double width + double height */
  doubleOn(): this  { return this.raw(GS, 0x21, 0x11); }
  doubleOff(): this { return this.raw(GS, 0x21, 0x00); }

  doubleWidthOn(): this  { return this.raw(ESC, 0x21, 0x20); }
  doubleWidthOff(): this { return this.raw(ESC, 0x21, 0x00); }

  // ── Alignment ──
  alignLeft(): this   { return this.raw(ESC, 0x61, 0x00); }
  alignCenter(): this { return this.raw(ESC, 0x61, 0x01); }
  alignRight(): this  { return this.raw(ESC, 0x61, 0x02); }

  // ── Text output ──
  line(text: string): this {
    const s = text.length > this._width ? text.slice(0, this._width) : text;
    this.chunks.push(Buffer.from(s + '\n', 'ascii'));
    return this;
  }

  centered(text: string): this {
    const s = text.length > this._width ? text.slice(0, this._width) : text;
    const sp = Math.floor((this._width - s.length) / 2);
    this.chunks.push(Buffer.from(' '.repeat(Math.max(0, sp)) + s + '\n', 'ascii'));
    return this;
  }

  row(left: string, right: string): this {
    return this.line(twoCol(left, right, this._width));
  }

  boldLine(text: string): this {
    this.boldOn(); this.line(text); this.boldOff(); return this;
  }

  boldCentered(text: string): this {
    this.boldOn(); this.centered(text); this.boldOff(); return this;
  }

  boldRow(left: string, right: string): this {
    this.boldOn(); this.row(left, right); this.boldOff(); return this;
  }

  // ── Spacing & separators ──
  feed(n = 1): this {
    for (let i = 0; i < n; i++) this.chunks.push(Buffer.from('\n', 'ascii'));
    return this;
  }

  dashedLine(): this { return this.line('-'.repeat(this._width)); }

  /** Thick separator using '=' characters (bold by default) */
  thickLine(): this {
    this.boldOn(); this.line('='.repeat(this._width)); this.boldOff(); return this;
  }

  cut(): this {
    this.feed(3);
    this.chunks.push(cmd(GS, 0x56, 0x01));
    return this;
  }

  // ── Table helpers (for reports) ──

  /**
   * Print a tabular row. `cols` is an array of [label, widthPct].
   * Each column is padded/truncated to its percentage of the paper width.
   * e.g. tableRow([['Date', 25], ['Orders', 15], ['Revenue', 60]])
   */
  tableRow(cols: [string, number][]): this {
    const totalPct = cols.reduce((s, [, w]) => s + w, 0);
    let line = '';
    for (const [text, pct] of cols) {
      const colW = Math.floor(this._width * pct / totalPct);
      line += text.length > colW ? text.slice(0, colW - 1) + ' ' : text.padEnd(colW, ' ');
    }
    return this.line(line.trimEnd());
  }

  // ── Build ──
  build(): Buffer { return Buffer.concat(this.chunks); }

  // ── Static .txt renderer for test-mode verification ──

  static buildTextReceipt(paperWidth: number, content: ReceiptSection[]): string {
    const w = paperWidth <= 58 ? 32 : 48;
    const lines: string[] = [];

    for (const s of content) {
      switch (s.type) {
        case 'headline':
          lines.push('='.repeat(w));
          lines.push(padCenter(s.text?.toUpperCase() || '', w));
          lines.push('='.repeat(w));
          break;
        case 'bold-centered':
          lines.push(padCenter((s.text || '').toUpperCase(), w));
          break;
        case 'centered':
          lines.push(padCenter(s.text || '', w));
          break;
        case 'subtitle':
          lines.push(padCenter(s.text || '', w));
          break;
        case 'line':
          lines.push(s.text || '');
          break;
        case 'row':
          lines.push(twoCol(s.left || '', s.right || '', w));
          break;
        case 'bold-row':
          lines.push(twoCol(s.left || '', s.right || '', w));
          break;
        case 'separator':
          lines.push('-'.repeat(w));
          break;
        case 'thick-separator':
          lines.push('='.repeat(w));
          break;
        case 'blank':
          lines.push('');
          break;
        case 'section-header':
          lines.push('-'.repeat(w));
          lines.push(twoCol(s.left || '', s.right || '', w));
          lines.push('-'.repeat(w));
          break;
        case 'item':
          lines.push('  ' + (s.text || ''));
          if (s.subtext) lines.push('     [' + s.subtext + ']');
          break;
        case 'item-row':
          lines.push(twoCol('     ' + (s.qty || '') + ' x ' + (s.price || ''),
            pad(s.lineTotal || '', 8, true), w));
          break;
        case 'total-line':
          lines.push('='.repeat(w));
          lines.push(twoCol(s.left || '', s.right || '', w));
          lines.push('='.repeat(w));
          break;
        case 'table-row':
          lines.push(s.text || '');
          break;
        case 'double-separator':
          lines.push('='.repeat(w));
          break;
      }
    }
    return lines.join('\n') + '\n';
  }
}

// ── Receipt section descriptor (for .txt rendering) ──

export interface ReceiptSection {
  type: 'headline' | 'bold-centered' | 'centered' | 'subtitle' | 'line' | 'row'
    | 'bold-row' | 'separator' | 'thick-separator' | 'blank' | 'section-header'
    | 'item' | 'item-row' | 'total-line' | 'table-row' | 'double-separator';
  text?: string;
  subtext?: string;
  left?: string;
  right?: string;
  qty?: string;
  price?: string;
  lineTotal?: string;
}
