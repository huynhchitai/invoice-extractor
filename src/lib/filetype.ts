/**
 * Magic-byte file type detection.
 * Never trust the Content-Type or file extension — always inspect raw bytes.
 *
 * Supported types:
 *   PNG   — 89 50 4E 47 (‰PNG)
 *   JPEG  — FF D8 FF
 *   WEBP  — 52 49 46 46 xx xx xx xx 57 45 42 50  (RIFF....WEBP)
 *   PDF   — 25 50 44 46 (%PDF)
 */

export type DetectedType = 'image/png' | 'image/jpeg' | 'image/webp' | 'application/pdf';

export interface FileTypeResult {
  detected: DetectedType;
  /** The canonical MIME string for sending to Vertex AI */
  mimeType: string;
}

export interface FileTypeError {
  detected: null;
  reason: 'empty' | 'too_short' | 'unknown';
}

/** Minimum bytes needed to identify any supported type */
const MIN_BYTES = 12;

/**
 * Inspect the first bytes of a buffer and return its detected MIME type,
 * or an error object if the type is unsupported / undetectable.
 */
export function detectFileType(buf: Uint8Array): FileTypeResult | FileTypeError {
  if (!buf || buf.length === 0) {
    return { detected: null, reason: 'empty' };
  }
  if (buf.length < 4) {
    return { detected: null, reason: 'too_short' };
  }

  // PNG: 89 50 4E 47
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return { detected: 'image/png', mimeType: 'image/png' };
  }

  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { detected: 'image/jpeg', mimeType: 'image/jpeg' };
  }

  // WEBP: RIFF (4 bytes) + 4-byte size + WEBP
  // Needs at least 12 bytes
  if (
    buf.length >= MIN_BYTES &&
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) {
    return { detected: 'image/webp', mimeType: 'image/webp' };
  }

  // PDF: %PDF (25 50 44 46)
  if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) {
    return { detected: 'application/pdf', mimeType: 'application/pdf' };
  }

  return { detected: null, reason: 'unknown' };
}

/** Convenience: returns true if the buffer is a supported invoice file type. */
export function isAllowedFileType(buf: Uint8Array): buf is Uint8Array {
  return detectFileType(buf).detected !== null;
}
