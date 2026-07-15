import React, { useEffect, useState } from 'react';

// Shared shell for every widget: draggable header + translucent panel body.
export default function Frame({ title, control, children }) {
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    window.api.getPin().then(setPinned);
    return window.api.onPinChange(setPinned); // stay in sync with the tray toggle
  }, []);

  const togglePin = async () => setPinned(await window.api.togglePin());

  return (
    <div style={styles.panel}>
      <header style={styles.header}>
        <span style={styles.title}>{title}</span>
        <div style={styles.controls}>
          {control}
          <button
            style={styles.iconBtn}
            title="Preferences"
            onClick={() => window.api.openSettings()}
          >
            <GearIcon />
          </button>
          <button
            style={{ ...styles.iconBtn, color: pinned ? 'var(--today)' : 'var(--muted)' }}
            title={pinned ? 'Unpin (allow other windows on top)' : 'Pin on top'}
            onClick={togglePin}
          >
            <PinIcon filled={pinned} />
          </button>
          <button
            style={styles.iconBtn}
            title="Hide (Ctrl+Alt+O to toggle all)"
            onClick={() => window.api.hide()}
          >
            <span style={styles.hideGlyph}>×</span>
          </button>
        </div>
      </header>
      <div style={styles.body}>{children}</div>
    </div>
  );
}

function GearIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true"
      fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function PinIcon({ filled }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true"
      fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 9V4h1a1 1 0 0 0 0-2H7a1 1 0 0 0 0 2h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z" />
    </svg>
  );
}

const styles = {
  panel: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    background: 'var(--panel)',
    border: '1px solid var(--border)',
    borderRadius: 14,
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 34,
    padding: '0 6px 0 12px',
    flexShrink: 0,
    WebkitAppRegion: 'drag',
  },
  title: {
    fontSize: 11,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--muted)',
    fontWeight: 600,
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    WebkitAppRegion: 'no-drag',
  },
  iconBtn: {
    width: 22,
    height: 22,
    borderRadius: 6,
    color: 'var(--muted)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 120ms ease, color 120ms ease',
  },
  hideGlyph: {
    fontSize: 16,
    lineHeight: 1,
  },
  body: {
    flex: 1,
    overflowY: 'auto',
    padding: '2px 0 8px',
  },
};
