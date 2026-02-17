import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { chatWithAssistant } from '../utils/backendApi.js';

const SYSTEM_PROMPT = [
  'You are a concise Game of Life assistant.',
  'Provide practical answers about Conway patterns, rules, and usage in this app.',
  'If unsure, say so clearly.'
].join(' ');

function formatDisplayedMessage(message, idx) {
  return (
    <Box
      key={`${message.role}-${idx}`}
      sx={{
        alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
        bgcolor: message.role === 'user' ? 'primary.main' : 'action.hover',
        color: message.role === 'user' ? 'primary.contrastText' : 'text.primary',
        px: 1.25,
        py: 0.75,
        borderRadius: 1,
        maxWidth: '88%'
      }}
    >
      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{message.content}</Typography>
    </Box>
  );
}

export default function AssistantDialog({ open, onClose }) {
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState([]);

  const canSend = input.trim().length > 0 && !sending;
  const payloadMessages = useMemo(() => {
    const prior = messages.map((item) => ({ role: item.role, content: item.content }));
    return [{ role: 'system', content: SYSTEM_PROMPT }, ...prior];
  }, [messages]);

  const handleSend = async () => {
    const userText = input.trim();
    if (!userText || sending) return;

    const nextUserMessage = { role: 'user', content: userText };
    const updatedMessages = [...messages, nextUserMessage];
    setMessages(updatedMessages);
    setInput('');
    setError('');
    setSending(true);

    try {
      const response = await chatWithAssistant(
        [...payloadMessages, { role: 'user', content: userText }],
        { timeoutMs: 15000, temperature: 0.2, maxOutputTokens: 400 }
      );
      setMessages((prev) => [...prev, { role: 'assistant', content: response.reply }]);
    } catch (err) {
      const message = err?.message || 'Unable to contact AI assistant right now.';
      setError(message);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'I could not process that request. Please try again in a moment.'
        }
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (canSend) handleSend();
    }
  };

  const handleClear = () => {
    if (sending) return;
    setMessages([]);
    setError('');
    setInput('');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>AI Assistant</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.25}>
          <Alert severity="warning" variant="outlined">
            AI responses may be inaccurate. Do not share passwords or sensitive personal information.
          </Alert>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              minHeight: 220,
              maxHeight: 320,
              overflowY: 'auto',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              p: 1
            }}
          >
            {messages.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                Ask about patterns, oscillators, gliders, or simulation behavior.
              </Typography>
            )}
            {messages.map(formatDisplayedMessage)}
          </Box>
          {error ? <Alert severity="error">{error}</Alert> : null}
          <TextField
            multiline
            minRows={3}
            maxRows={6}
            label="Message"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
            placeholder="Ask the assistant..."
          />
          {sending ? <Typography variant="body2">Sending...</Typography> : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClear} disabled={sending || messages.length === 0}>Clear</Button>
        <Button onClick={onClose} disabled={sending}>Close</Button>
        <Button variant="contained" onClick={handleSend} disabled={!canSend}>Send</Button>
      </DialogActions>
    </Dialog>
  );
}

AssistantDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired
};
