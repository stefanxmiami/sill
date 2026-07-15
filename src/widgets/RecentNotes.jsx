import React, { useState } from 'react';
import Frame from '../components/Frame.jsx';
import EmptyVault from '../components/EmptyVault.jsx';
import { useVaultData } from '../hooks.js';

export default function RecentNotes() {
  const { data, error } = useVaultData(() => window.api.recent());

  if (error) return <Frame title="Recent"><EmptyVault /></Frame>;

  const notes = data || [];

  return (
    <Frame title="Recent">
      {data && !notes.length && <p style={styles.empty}>No notes yet.</p>}
      {notes.map((n) => (
        <Row key={n.file} note={n} />
      ))}
    </Frame>
  );
}

function Row({ note }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      style={{ ...styles.row, background: hover ? 'rgba(255,255,255,0.03)' : 'transparent' }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => window.api.openNote(note.file)}
      title={note.rel}
    >
      <span style={styles.name}>{name(note.rel)}</span>
      <span className="mono" style={styles.time}>{ago(note.mtime)}</span>
    </button>
  );
}

function name(rel) {
  const base = rel.split(/[\\/]/).pop();
  return base.replace(/\.md$/, '');
}

function ago(mtime) {
  const mins = Math.floor((Date.now() - mtime) / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

const styles = {
  empty: { color: 'var(--muted)', fontSize: 12, padding: '20px 14px' },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    width: '100%',
    padding: '7px 14px',
    textAlign: 'left',
    transition: 'background 120ms ease',
  },
  name: {
    flex: 1,
    fontSize: 13,
    color: 'var(--text)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  time: { color: 'var(--muted)', flexShrink: 0 },
};
