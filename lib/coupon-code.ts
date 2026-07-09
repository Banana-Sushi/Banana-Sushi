const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0, O, I, L, 1

export function generateCouponCode(): string {
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}

export function generateUniqueCodes(quantity: number, existing: Set<string> = new Set()): string[] {
  const codes: string[] = [];
  const seen = new Set(existing);
  let attempts = 0;
  while (codes.length < quantity && attempts < quantity * 20) {
    const code = generateCouponCode();
    if (!seen.has(code)) {
      seen.add(code);
      codes.push(code);
    }
    attempts++;
  }
  return codes;
}
