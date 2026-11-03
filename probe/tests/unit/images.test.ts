import { describe, expect, it } from 'vitest';
import { brokenImages } from '../../src/checks/images';

describe('критерий битой картинки', () => {
  it('BUG-01: незагруженная lazy-картинка (complete = false) не битая', () => {
    expect(brokenImages([{ src: '/a.svg', alt: '', complete: false, naturalWidth: 0 }])).toEqual(
      [],
    );
  });

  it('загруженная и не декодированная — битая', () => {
    const s = { src: '/b.svg', alt: '', complete: true, naturalWidth: 0 };
    expect(brokenImages([s])).toEqual([s]);
  });

  it('img без src не проверяется', () => {
    expect(brokenImages([{ src: '', alt: '', complete: true, naturalWidth: 0 }])).toEqual([]);
  });
});
