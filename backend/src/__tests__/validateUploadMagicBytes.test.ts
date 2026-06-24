import { describe, it, expect } from 'vitest';
import { validateUploadMagicBytes } from '../lib/validateUploadMagicBytes';

describe('validateUploadMagicBytes', () => {
  it('rejects buffers with unrecognized magic-byte signatures', async () => {
    const garbage = Buffer.from('this is not a valid upload file type');
    expect(await validateUploadMagicBytes(garbage)).toBe(false);
  });
});
