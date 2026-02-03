import { jest } from '@jest/globals';

jest.mock('../model/hashlife/adapter.js', () => {
  const { fn } = require('jest-mock');
  const adapter = {
    run: fn(),
    cancel: fn(),
    clearCache: fn(),
    onProgress: fn()
  };
  return { __esModule: true, default: adapter };
});

describe('GameModel hashlife batching', () => {
  test('uses generationBatchSize when stepping hashlife', async () => {
    const { default: hashlifeAdapter } = await import('../model/hashlife/adapter.js');
    const { GameModel } = await import('../model/GameModel.js');
    hashlifeAdapter.run.mockResolvedValue({ cells: [{ x: 1, y: 1 }], generations: 4 });

    const model = new GameModel();
    model.setCellAliveModel(0, 0, true);
    model.setEngineMode('hashlife');
    model.setGenerationBatchSize(4);

    await model.step(1);

    expect(hashlifeAdapter.run).toHaveBeenCalled();
    const [, gensArg] = hashlifeAdapter.run.mock.calls[0];
    expect(gensArg).toBe(4);
    expect(model.generation).toBe(4);
    expect(model.isCellAlive(1, 1)).toBe(true);
  });
});
