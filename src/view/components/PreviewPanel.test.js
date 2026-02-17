import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PreviewPanel from './PreviewPanel.js';
import { transformShape, rotateShape } from '../../model/shapeTransforms.js';

jest.mock('../../model/shapeTransforms.js', () => ({
  transformShape: jest.fn((cells) => cells),
  rotateShape: jest.fn((cells) => cells)
}));

describe('PreviewPanel', () => {
  const basePreview = {
    name: 'My Shape!! 42--',
    description: 'See https://example.com and http://example.org now',
    cells: [{ x: 0, y: 0 }, [1, 2], null]
  };

  let ctx;

  beforeEach(() => {
    jest.clearAllMocks();
    ctx = {
      clearRect: jest.fn(),
      fillRect: jest.fn(),
      strokeRect: jest.fn(),
      set fillStyle(value) { this._fillStyle = value; },
      get fillStyle() { return this._fillStyle; },
      set strokeStyle(value) { this._strokeStyle = value; },
      get strokeStyle() { return this._strokeStyle; },
      set lineWidth(value) { this._lineWidth = value; },
      get lineWidth() { return this._lineWidth; }
    };
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('renders empty container when preview is absent', () => {
    render(<PreviewPanel preview={null} />);
    expect(screen.queryByTestId('hover-preview-panel')).toBeNull();
  });

  test('renders slugged thumbnail URL and clickable links', () => {
    render(<PreviewPanel preview={basePreview} colorSchemeKey="neon" />);

    const image = screen.getByRole('img', { name: 'My Shape!! 42--' });
    expect(image.getAttribute('src')).toContain('/thumbnails/128/neon/my-shape-42.png');

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute('href', 'https://example.com');
    expect(links[1]).toHaveAttribute('href', 'http://example.org');
  });

  test('uses canvas fallback and draws cells when image is unavailable', async () => {
    render(
      <PreviewPanel
        preview={basePreview}
        imgError={true}
        colorScheme={{ cellColor: '#f00' }}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('hover-preview-panel').querySelector('canvas')).toBeTruthy();
      expect(ctx.clearRect).toHaveBeenCalled();
      expect(ctx.fillRect).toHaveBeenCalledTimes(3);
      expect(ctx.strokeRect).toHaveBeenCalled();
    });
  });

  test('calls setImgError on thumbnail load failure', () => {
    const setImgError = jest.fn();
    render(
      <PreviewPanel
        preview={basePreview}
        imgError={false}
        setImgError={setImgError}
      />
    );

    const image = screen.getByRole('img', { name: 'My Shape!! 42--' });
    fireEvent.error(image);
    expect(setImgError).toHaveBeenCalledWith(true);
  });

  test('adds transformed recent shape using transform and mapped rotation angle', () => {
    transformShape.mockReturnValueOnce([{ x: 9, y: 9 }]);
    rotateShape.mockReturnValueOnce([{ x: 7, y: 7 }]);
    const onAddRecent = jest.fn();

    render(
      <PreviewPanel
        preview={basePreview}
        transformIndex={1}
        rotationAngle={90}
        imgError={true}
        onAddRecent={onAddRecent}
      />
    );

    fireEvent.click(screen.getByTestId('add-transformed-recent'));

    expect(transformShape).toHaveBeenCalledWith(basePreview.cells, 'flipH');
    expect(rotateShape).toHaveBeenCalledWith([{ x: 9, y: 9 }], 270);
    expect(onAddRecent).toHaveBeenCalledWith(expect.objectContaining({
      name: 'My Shape!! 42-- (flipH rot90)',
      cells: [{ x: 7, y: 7 }]
    }));
  });
});
