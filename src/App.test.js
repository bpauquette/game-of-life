import { render, screen } from '@testing-library/react';
import App from './App';

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = () => {
    return {
      fillRect: jest.fn(),
      clearRect: jest.fn(),
      beginPath: jest.fn(),
      closePath: jest.fn(),
      fillStyle: '',
      stroke: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      strokeStyle: '',
      lineWidth: 1,
      arc: jest.fn(),
      fill: jest.fn(),
    };
  };
});

test('renders the app controls', () => {
  render(<App />);
  // the heading was removed; verify the app renders by checking for a control label present in the UI
  const liveCells = screen.getByText(/Live Cells/i);
  expect(liveCells).toBeInTheDocument();
});

