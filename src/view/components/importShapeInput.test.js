import {
  buildImportUrlCandidates,
  extractRleFromText,
  resolveImportInput
} from './importShapeInput.js';

describe('importShapeInput', () => {
  test('maps LifeWiki page URLs to stable RLE candidates first', () => {
    const candidates = buildImportUrlCandidates('https://conwaylife.com/wiki/Gosper_glider_gun');
    expect(candidates[0]).toBe('https://unpkg.com/cellular-automata-patterns@1.0.24/patterns/conwaylife/gosperglidergun.rle');
    expect(candidates[1]).toBe('https://cdn.jsdelivr.net/npm/cellular-automata-patterns@1.0.24/patterns/conwaylife/gosperglidergun.rle');
    expect(candidates).toContain('https://conwaylife.com/wiki/Gosper_glider_gun');
  });

  test('maps GitHub blob URLs to raw GitHub URLs', () => {
    const candidates = buildImportUrlCandidates('https://github.com/example/repo/blob/main/patterns/glider.rle');
    expect(candidates[0]).toBe('https://raw.githubusercontent.com/example/repo/main/patterns/glider.rle');
    expect(candidates).toContain('https://github.com/example/repo/blob/main/patterns/glider.rle');
  });

  test('extracts an RLE block from mixed content', () => {
    const text = [
      'Some surrounding text that is not part of the pattern.',
      '#N Glider',
      '#C Comment',
      'x = 3, y = 3, rule = B3/S23',
      'bob$2bo$3o!',
      'Trailing markdown content'
    ].join('\n');
    const extracted = extractRleFromText(text);
    expect(extracted).toBe('#N Glider\n#C Comment\nx = 3, y = 3, rule = B3/S23\nbob$2bo$3o!');
  });

  test('returns pasted RLE unchanged for non-URL input', async () => {
    const rleText = '#N Glider\nx = 3, y = 3\nbob$2bo$3o!';
    const resolved = await resolveImportInput(rleText, jest.fn());
    expect(resolved).toEqual({
      rle: rleText,
      resolvedFromUrl: false,
      sourceUrl: null
    });
  });

  test('tries URL candidates until it finds valid RLE', async () => {
    const fetchMock = jest.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => ''
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        url: 'https://cdn.jsdelivr.net/npm/cellular-automata-patterns@1.0.24/patterns/conwaylife/glider.rle',
        text: async () => '#N Glider\nx = 3, y = 3, rule = B3/S23\nbob$2bo$3o!'
      });

    const result = await resolveImportInput('https://conwaylife.com/wiki/Glider', fetchMock);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://unpkg.com/cellular-automata-patterns@1.0.24/patterns/conwaylife/glider.rle',
      expect.any(Object)
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://cdn.jsdelivr.net/npm/cellular-automata-patterns@1.0.24/patterns/conwaylife/glider.rle',
      expect.any(Object)
    );
    expect(result.rle).toContain('x = 3, y = 3');
    expect(result.resolvedFromUrl).toBe(true);
  });
});
