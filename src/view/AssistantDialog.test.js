import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AssistantDialog from './AssistantDialog.js';
import { chatWithAssistant } from '../utils/backendApi.js';

jest.mock('../utils/backendApi.js', () => ({
  chatWithAssistant: jest.fn(),
}));

describe('AssistantDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('sends a message and renders assistant reply', async () => {
    let resolveChat;
    chatWithAssistant.mockImplementationOnce(
      () => new Promise((resolve) => { resolveChat = resolve; })
    );
    render(<AssistantDialog open={true} onClose={jest.fn()} />);

    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Hi there' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(chatWithAssistant).toHaveBeenCalledTimes(1));
    resolveChat({ reply: 'Hello from assistant' });
    await screen.findByText('Hello from assistant');
  });

  test('renders fallback assistant message on request failure', async () => {
    let rejectChat;
    chatWithAssistant.mockImplementationOnce(
      () => new Promise((_, reject) => { rejectChat = reject; })
    );
    render(<AssistantDialog open={true} onClose={jest.fn()} />);

    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Question' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    rejectChat(new Error('Service unavailable'));
    await screen.findByText('Service unavailable');
    expect(
      screen.getByText('I could not process that request. Please try again in a moment.')
    ).toBeInTheDocument();
  });

  test('clear removes conversation when not sending', async () => {
    chatWithAssistant.mockResolvedValueOnce({ reply: 'Done' });
    render(<AssistantDialog open={true} onClose={jest.fn()} />);

    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Question' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await screen.findByText('Done');

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.queryByText('Done')).not.toBeInTheDocument();
  });

  test('enter key sends when shift is not pressed', async () => {
    chatWithAssistant.mockResolvedValueOnce({ reply: 'Keyboard send' });
    render(<AssistantDialog open={true} onClose={jest.fn()} />);

    const field = screen.getByLabelText('Message');
    fireEvent.change(field, { target: { value: 'From keyboard' } });
    fireEvent.keyDown(field, { key: 'Enter', shiftKey: false, preventDefault: jest.fn() });

    await screen.findByText('Keyboard send');
    expect(chatWithAssistant).toHaveBeenCalledTimes(1);
  });
});
