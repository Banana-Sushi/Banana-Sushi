/**
 * ESC/POS receipt generator for Epson TM-T88VII
 * Paper: 80mm | Font A: 48 chars per line | Encoding: UTF-8 / Code Page 16 (WPC1252)
 */

// ── ESC/POS command constants ─────────────────────────────────────────────────

const ESC = 0x1b;
const GS  = 0x1d;
const LF  = 0x0a;

/** Raw byte sequences */
const CMD = {
  INIT:           [ESC, 0x40],                    // Initialize printer
  ALIGN_LEFT:     [ESC, 0x61, 0x00],
  ALIGN_CENTER:   [ESC, 0x61, 0x01],
  ALIGN_RIGHT:    [ESC, 0x61, 0x02],
  BOLD_ON:        [ESC, 0x45, 0x01],
  BOLD_OFF:       [ESC, 0x45, 0x00],
  DOUBLE_WIDTH_ON:  [GS,  0x21, 0x10],            // x2 width only
  DOUBLE_SIZE_ON:   [GS,  0x21, 0x11],            // x2 width + height
  DOUBLE_SIZE_OFF:  [GS,  0x21, 0x00],
  LINE_SPACING_DEFAULT: [ESC, 0x32],
  LINE_SPACING_TIGHT:   [ESC, 0x33, 0x18],        // 24 dots ≈ tight
  FEED_1:         [ESC, 0x64, 0x01],              // Feed 1 line
  FEED_3:         [ESC, 0x64, 0x03],
  CUT_FULL:       [GS,  0x56, 0x00],             // Full cut
  CUT_PARTIAL:    [GS,  0x56, 0x01],             // Partial cut (recommended)
  // Code page: PC858 / WPC1252 — handles € and common Latin chars
  CODEPAGE_PC858: [ESC, 0x74, 0x13],
};

// ── Layout constants ──────────────────────────────────────────────────────────

const LINE_WIDTH = 48;
const SEPARATOR  = '─'.repeat(LINE_WIDTH); // U+2500, fallback '─' × 48

// ── Helper: encode string to Uint8Array (Latin-1 fallback for ESC/POS) ────────

function encodeText(text: string): Uint8Array {
  // ESC/POS printers with WPC1252 code page accept ISO-8859-1 range directly.
  // Characters outside that range are replaced with '?'.
  const bytes: number[] = [];
  for (const char of text) {
    const cp = char.charCodeAt(0);
    if (cp < 0x80) {
      bytes.push(cp);
    } else if (cp <= 0xff) {
      bytes.push(cp);
    } else {
      // Map common Unicode to WPC1252 equivalents
      const map: Record<number, number> = {
        0x2019: 0x92, // right single quote
        0x201c: 0x93, // left double quote
        0x201d: 0x94, // right double quote
        0x2013: 0x96, // en dash
        0x2014: 0x97, // em dash
        0x20ac: 0x80, // € euro sign
        0x2500: 0x2d, // box-drawing horizontal → '-'
      };
      bytes.push(map[cp] ?? 0x3f); // '?' for unknown
    }
  }
  return new Uint8Array(bytes);
}

function bytes(...cmds: (number[] | number)[]): Uint8Array {
  const flat: number[] = [];
  for (const c of cmds) {
    if (Array.isArray(c)) flat.push(...c);
    else flat.push(c);
  }
  return new Uint8Array(flat);
}

function text(str: string): Uint8Array {
  return encodeText(str);
}

function line(str = ''): Uint8Array {
  return new Uint8Array([...encodeText(str), LF]);
}

// ── Text layout helpers ────────────────────────────────────────────────────────

/** Pad / truncate a string to exactly `width` chars */
function pad(str: string, width: number, align: 'left' | 'right' | 'center' = 'left'): string {
  const s = str.slice(0, width); // hard truncate if too long
  const pad = width - s.length;
  if (align === 'right')  return ' '.repeat(pad) + s;
  if (align === 'center') return ' '.repeat(Math.floor(pad / 2)) + s + ' '.repeat(Math.ceil(pad / 2));
  return s + ' '.repeat(pad);
}

/**
 * Format a receipt item row across LINE_WIDTH chars:
 *   [name .........] [qty x price] [total]
 *   name col: dynamic, qty col: ~14, total col: 8
 */
function itemRow(name: string, qty: number, unitPrice: number, total: number): Uint8Array[] {
  const totalStr = `${total.toFixed(2)} TND`;
  const qtyStr   = `${qty} x ${unitPrice.toFixed(2)}`;
  const rightCol = totalStr.length;          // e.g. "12.00 TND" = 9
  const midCol   = qtyStr.length + 1;        // e.g. "2 x 6.00 " = 10
  const nameCol  = LINE_WIDTH - midCol - rightCol - 2; // 2 spaces padding

  const rows: Uint8Array[] = [];

  // Wrap name if longer than nameCol
  const words  = name.split(' ');
  const chunks: string[] = [];
  let   cur    = '';
  for (const w of words) {
    if ((cur + (cur ? ' ' : '') + w).length <= nameCol) {
      cur += (cur ? ' ' : '') + w;
    } else {
      if (cur) chunks.push(cur);
      cur = w.slice(0, nameCol); // hard-cut single long word
    }
  }
  if (cur) chunks.push(cur);

  // First line: name + qty + total
  const firstName = pad(chunks[0] ?? '', nameCol, 'left');
  const midPart   = pad(qtyStr, midCol, 'right');
  const rightPart = pad(totalStr, rightCol, 'right');
  rows.push(line(`${firstName} ${midPart} ${rightPart}`));

  // Continuation lines (name overflow only)
  for (let i = 1; i < chunks.length; i++) {
    rows.push(line(`  ${chunks[i]}`));
  }

  return rows;
}

/** Right-aligned label + value pair on one LINE_WIDTH line */
function summaryRow(label: string, value: string): Uint8Array {
  const right = value;
  const left  = pad(label, LINE_WIDTH - right.length - 1, 'left');
  return line(`${left} ${right}`);
}

// ── Public API ─────────────────────────────────────────────────────────────────

export interface ReceiptItem {
  name:      string;
  quantity:  number;
  unitPrice: number;
}

export interface ReceiptData {
  restaurantName: string;         // e.g. "BANANA SUSHI"
  addressLine1:   string;         // e.g. "123 Rue de la Paix"
  addressLine2?:  string;         // e.g. "75001 Paris"
  phone:          string;
  orderNumber:    string | number;
  date:           Date;
  items:          ReceiptItem[];
  subtotal:       number;
  deliveryFee?:   number;
  taxRate?:       number;         // e.g. 0.19 for 19 %
  total:          number;
  paymentMethod:  string;         // e.g. "Cash on Delivery"
  footerMessage?: string;
}

/**
 * Build a complete ESC/POS byte sequence for the receipt.
 * Returns a Uint8Array ready to write directly to the printer device / serial port.
 */
export function buildReceipt(data: ReceiptData): Uint8Array {
  const parts: Uint8Array[] = [];

  const push = (...chunks: Uint8Array[]) => parts.push(...chunks);
  const cmd  = (...c: number[][]) => push(bytes(...c.flat()));

  // ── 1. Init ────────────────────────────────────────────────────────────────
  cmd(CMD.INIT, CMD.CODEPAGE_PC858, CMD.LINE_SPACING_DEFAULT);
  push(bytes(LF)); // top margin

  // ── 2. Restaurant name — centered, bold, double size ───────────────────────
  cmd(CMD.ALIGN_CENTER, CMD.BOLD_ON, CMD.DOUBLE_SIZE_ON);
  // Double-width means each char takes 2 positions → max 24 chars
  const title = data.restaurantName.slice(0, 24).toUpperCase();
  push(line(title));
  cmd(CMD.DOUBLE_SIZE_OFF, CMD.BOLD_OFF);

  // ── 3. Address & phone — centered ─────────────────────────────────────────
  cmd(CMD.ALIGN_CENTER);
  push(line(data.addressLine1));
  if (data.addressLine2) push(line(data.addressLine2));
  push(line(`Tel: ${data.phone}`));
  push(bytes(LF));

  // ── 4. Separator ───────────────────────────────────────────────────────────
  cmd(CMD.ALIGN_LEFT);
  push(line('-'.repeat(LINE_WIDTH)));

  // ── 5. Order info ──────────────────────────────────────────────────────────
  const dateStr = data.date.toLocaleDateString('fr-TN', {
    day:   '2-digit',
    month: '2-digit',
    year:  'numeric',
  });
  const timeStr = data.date.toLocaleTimeString('fr-TN', {
    hour:   '2-digit',
    minute: '2-digit',
  });

  push(line(`Order #: ${String(data.orderNumber).padStart(6, '0')}`));
  push(line(`Date   : ${dateStr}  ${timeStr}`));
  push(line('-'.repeat(LINE_WIDTH)));

  // ── 6. Column headers ──────────────────────────────────────────────────────
  cmd(CMD.BOLD_ON);
  // header: "ITEM                     QTY x PRICE   TOTAL"
  // fixed widths matching itemRow() calculation
  const dummyTotal = '00.00 TND'; // 9 chars — establish column width
  const dummyQty   = 'QTY x PRICE';
  const rightCol   = dummyTotal.length;
  const midCol     = dummyQty.length + 1;
  const nameCol    = LINE_WIDTH - midCol - rightCol - 2;
  const header     = `${pad('ITEM', nameCol)} ${pad('QTY x PRICE', midCol, 'right')} ${pad('TOTAL', rightCol, 'right')}`;
  push(line(header));
  cmd(CMD.BOLD_OFF);
  push(line('-'.repeat(LINE_WIDTH)));

  // ── 7. Items ───────────────────────────────────────────────────────────────
  for (const item of data.items) {
    const total = item.quantity * item.unitPrice;
    const rows  = itemRow(item.name, item.quantity, item.unitPrice, total);
    rows.forEach(r => push(r));
  }
  push(line('-'.repeat(LINE_WIDTH)));

  // ── 8. Totals block (right-aligned) ───────────────────────────────────────
  cmd(CMD.ALIGN_LEFT);
  push(summaryRow('Subtotal', `${data.subtotal.toFixed(2)} TND`));

  if (data.deliveryFee !== undefined && data.deliveryFee > 0) {
    push(summaryRow('Delivery fee', `${data.deliveryFee.toFixed(2)} TND`));
  } else if (data.deliveryFee === 0) {
    push(summaryRow('Delivery fee', 'FREE'));
  }

  if (data.taxRate && data.taxRate > 0) {
    const tax = data.subtotal * data.taxRate;
    push(summaryRow(`Tax (${(data.taxRate * 100).toFixed(0)}%)`, `${tax.toFixed(2)} TND`));
  }

  push(line('-'.repeat(LINE_WIDTH)));

  // Grand total — bold
  cmd(CMD.BOLD_ON);
  push(summaryRow('TOTAL', `${data.total.toFixed(2)} TND`));
  cmd(CMD.BOLD_OFF);

  push(line('-'.repeat(LINE_WIDTH)));
  push(summaryRow('Payment', data.paymentMethod));
  push(bytes(LF));

  // ── 9. Footer — centered ───────────────────────────────────────────────────
  cmd(CMD.ALIGN_CENTER);
  const footer = data.footerMessage ?? 'Thank you for your order!';
  push(line(footer));
  push(line(''));
  push(line('www.sushibanana.de'));
  push(bytes(LF, LF, LF));

  // ── 10. Partial cut ────────────────────────────────────────────────────────
  cmd(CMD.CUT_PARTIAL);

  // ── Merge all parts ────────────────────────────────────────────────────────
  const total = parts.reduce((acc, p) => acc + p.length, 0);
  const out   = new Uint8Array(total);
  let   offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

/**
 * Convert receipt bytes to a hex string for debugging or logging.
 * e.g.  1b 40 1b 61 01 ...
 */
export function receiptToHex(receipt: Uint8Array): string {
  return Array.from(receipt)
    .map(b => b.toString(16).padStart(2, '0'))
    .join(' ');
}

/**
 * Convert receipt bytes to a Base64 string (useful for API transport).
 */
export function receiptToBase64(receipt: Uint8Array): string {
  let binary = '';
  for (const byte of receipt) binary += String.fromCharCode(byte);
  return Buffer.from(binary, 'binary').toString('base64');
}
