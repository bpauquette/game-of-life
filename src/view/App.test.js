import { render } from '@testing-library/react';
import App from './App';

// Use testing-library's render which already wraps updates in act
test('renders without crashing', () => {
  const { container } = render(<App />);
  expect(container).toBeInTheDocument();
});
