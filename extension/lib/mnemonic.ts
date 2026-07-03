import { WORDLIST, WORDSET } from './wordlist-id';

export const MNEMONIC_WORDS = 12;

// 12 words, each an independent uniform draw from the 2048-word list.
// 12 × 11 bits = 132 bits of entropy — exceeds the 128-bit target.
// ponytail: no BIP39 checksum; validation = every word is in the list + count.
export function generateMnemonic(): string {
  const words: string[] = [];
  const buf = new Uint8Array(2);
  for (let i = 0; i < MNEMONIC_WORDS; i++) {
    crypto.getRandomValues(buf);
    // 16-bit draw masked to 11 bits — 2048 = 2^11, so the mask is exact (no modulo bias).
    const idx = ((buf[0] << 8) | buf[1]) & 0x7ff;
    words.push(WORDLIST[idx]);
  }
  return words.join(' ');
}

export function normalizeMnemonic(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function validateMnemonic(input: string): { ok: boolean; reason?: string } {
  const normalized = normalizeMnemonic(input);
  const words = normalized.split(' ').filter(Boolean);
  if (words.length !== MNEMONIC_WORDS) {
    return { ok: false, reason: `Harus ${MNEMONIC_WORDS} kata, ditemukan ${words.length}.` };
  }
  for (const w of words) {
    if (!WORDSET.has(w)) return { ok: false, reason: `Kata tidak dikenal: "${w}".` };
  }
  return { ok: true };
}

// Build a downloadable .txt backup of the Secret Key.
export function mnemonicToTextFile(mnemonic: string): string {
  const header = [
    'Syncty — Secret Key (12 kata)',
    'Simpan di tempat aman. Siapa pun yang memiliki kunci ini',
    'dapat membaca bookmark Anda. Kunci ini tidak bisa dipulihkan jika hilang.',
    '',
  ].join('\n');
  return `${header}${mnemonic}\n`;
}
