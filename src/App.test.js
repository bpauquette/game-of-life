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

test('renders the main heading', () => {
  render(<App />);
  const heading = screen.getByText(/Game of Life/i); // adjust to text in your app
  expect(heading).toBeInTheDocument();
});

