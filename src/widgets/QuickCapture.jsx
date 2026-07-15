import React, { useRef, useState } from 'react';
import Frame from '../components/Frame.jsx';
import { useWindowFocus } from '../hooks.js';

export default function QuickCapture() {
  const [value, setValue] = useState('');
  const [flash, setFlash] = useState(false);
  const inputRef = useRef(null);
  const flashTimer = useRef(null);

  useWindowFocus(() => inputRef.current?.focus());

  const submit = async (e) => {
    e.preventDefault();
    const text = value.trim();
    if (!text) return;
    setValue('');
    await window.api.capture(text);
    setFlash(true);
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(false), 900);
    inputRef.current?.focus();
  };

  return (
    <Frame title="Capture">
      <form style={styles.form} onSubmit={submit}>
        <input
          ref={inputRef}
          style={styles.input}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Add to Inbox…"
          spellCheck={false}
          autoFocus
        />
        <div style={{ ...styles.hint, opacity: flash ? 1 : 0.55, color: flash ? 'var(--today)' : 'var(--muted)' }}>
          {flash ? 'Added to Inbox' : 'Enter to save'}
        </div>
      </form>
    </Frame>
  );
}

const styles = {
  form: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 10,
    padding: '4px 14px 10px',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    fontSize: 14,
    borderRadius: 8,
    border: '1px solid var(--border)',
    background: 'rgba(255,255,255,0.03)',
    color: 'var(--text)',
    WebkitUserSelect: 'text',
    userSelect: 'text',
  },
  hint: {
    fontSize: 11,
    letterSpacing: '0.04em',
    transition: 'opacity 120ms ease, color 120ms ease',
    paddingLeft: 2,
  },
};
