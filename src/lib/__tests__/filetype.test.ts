import { describe, it, expect } from 'vitest';
import { detectFileType, isAllowedFileType } from '../filetype';

// ── Helpers ──────────────────────────────────────────────────────────────────

function bytes(...hex: number[]): Uint8Array {
  return new Uint8Array(hex);
}

function pad(header: number[], totalLength = 16): Uint8Array {
  const arr = new Uint8Array(totalLength);
  header.forEach((b, i) => { arr[i] = b; });
  return arr;
}

// ── PNG ──────────────────────────────────────────────────────────────────────

describe('PNG detection', () => {
  it('detects a valid PNG magic header', () => {
    const buf = pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const result = detectFileType(buf);
    expect(result.detected).toBe('image/png');
    if (result.detected) expect(result.mimeType).toBe('image/png');
  });

  it('rejects a PNG header with one byte changed', () => {
    const buf = pad([0x89, 0x50, 0x4e, 0x48]); // last byte wrong
    expect(detectFileType(buf).detected).toBeNull();
  });
});

// ── JPEG ─────────────────────────────────────────────────────────────────────

describe('JPEG detection', () => {
  it('detects a valid JPEG magic header (FF D8 FF E0 — JFIF)', () => {
    const buf = pad([0xff, 0xd8, 0xff, 0xe0]);
    const result = detectFileType(buf);
    expect(result.detected).toBe('image/jpeg');
    if (result.detected) expect(result.mimeType).toBe('image/jpeg');
  });

  it('detects a valid JPEG magic header (FF D8 FF E1 — Exif)', () => {
    const buf = pad([0xff, 0xd8, 0xff, 0xe1]);
    expect(detectFileType(buf).detected).toBe('image/jpeg');
  });

  it('rejects a buffer that looks like JPEG but has wrong second byte', () => {
    const buf = pad([0xff, 0xd9, 0xff, 0xe0]);
    expect(detectFileType(buf).detected).toBeNull();
  });
});

// ── WEBP ─────────────────────────────────────────────────────────────────────

describe('WEBP detection', () => {
  it('detects a valid WEBP magic header (RIFF....WEBP)', () => {
    const buf = new Uint8Array(20);
    // RIFF
    [0x52, 0x49, 0x46, 0x46].forEach((b, i) => { buf[i] = b; });
    // 4-byte file size (arbitrary)
    [0x24, 0x00, 0x00, 0x00].forEach((b, i) => { buf[4 + i] = b; });
    // WEBP
    [0x57, 0x45, 0x42, 0x50].forEach((b, i) => { buf[8 + i] = b; });
    const result = detectFileType(buf);
    expect(result.detected).toBe('image/webp');
    if (result.detected) expect(result.mimeType).toBe('image/webp');
  });

  it('rejects a RIFF container that is NOT WEBP (e.g. WAV)', () => {
    const buf = new Uint8Array(20);
    [0x52, 0x49, 0x46, 0x46].forEach((b, i) => { buf[i] = b; });
    [0x00, 0x00, 0x00, 0x00].forEach((b, i) => { buf[4 + i] = b; });
    // WAVE instead of WEBP
    [0x57, 0x41, 0x56, 0x45].forEach((b, i) => { buf[8 + i] = b; });
    expect(detectFileType(buf).detected).toBeNull();
  });

  it('rejects a buffer under 12 bytes that starts with RIFF', () => {
    const buf = new Uint8Array(11);
    [0x52, 0x49, 0x46, 0x46].forEach((b, i) => { buf[i] = b; });
    // Can't check bytes[8..11] — too short
    expect(detectFileType(buf).detected).toBeNull();
  });
});

// ── PDF ──────────────────────────────────────────────────────────────────────

describe('PDF detection', () => {
  it('detects a valid PDF magic header (%PDF)', () => {
    const buf = pad([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
    const result = detectFileType(buf);
    expect(result.detected).toBe('application/pdf');
    if (result.detected) expect(result.mimeType).toBe('application/pdf');
  });

  it('rejects a buffer that starts with %PDE', () => {
    const buf = pad([0x25, 0x50, 0x44, 0x45]);
    expect(detectFileType(buf).detected).toBeNull();
  });
});

// ── Edge cases ────────────────────────────────────────────────────────────────

describe('Edge / spoofing cases', () => {
  it('returns empty error for a zero-length buffer', () => {
    const result = detectFileType(new Uint8Array(0));
    expect(result.detected).toBeNull();
    if (!result.detected) expect(result.reason).toBe('empty');
  });

  it('returns too_short for a 2-byte buffer', () => {
    const result = detectFileType(bytes(0x89, 0x50));
    expect(result.detected).toBeNull();
    if (!result.detected) expect(result.reason).toBe('too_short');
  });

  it('returns unknown for random garbage bytes', () => {
    const result = detectFileType(bytes(0xde, 0xad, 0xbe, 0xef, 0x00, 0x01, 0x02, 0x03));
    expect(result.detected).toBeNull();
    if (!result.detected) expect(result.reason).toBe('unknown');
  });

  it('rejects a PNG header whose MIME was claimed to be application/pdf (spoofed MIME)', () => {
    // The bytes say PNG, regardless of what the client sent as Content-Type
    const buf = pad([0x89, 0x50, 0x4e, 0x47]);
    const result = detectFileType(buf);
    // We detect PNG — good. If the caller only allows PDF, it should reject.
    expect(result.detected).toBe('image/png');
    // Simulate what the route does: an upload claiming "application/pdf" with PNG bytes
    // would be accepted as PNG (not PDF), and could be rejected if PDF-only is required.
    expect(result.detected).not.toBe('application/pdf');
  });

  it('rejects a text file that starts with "RIFF" but has no WEBP signature', () => {
    const buf = new Uint8Array(16).fill(0x20); // spaces
    [0x52, 0x49, 0x46, 0x46].forEach((b, i) => { buf[i] = b; });
    // bytes 8-11 are spaces, not WEBP
    expect(detectFileType(buf).detected).toBeNull();
  });

  it('isAllowedFileType returns true for known types, false otherwise', () => {
    const png = pad([0x89, 0x50, 0x4e, 0x47]);
    const junk = pad([0x00, 0x00, 0x00, 0x00]);
    expect(isAllowedFileType(png)).toBe(true);
    expect(isAllowedFileType(junk)).toBe(false);
  });
});
