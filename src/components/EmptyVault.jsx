import React from 'react';

// Shown when no vault is selected (or the current one can't be read).
export default function EmptyVault() {
  return (
    <div style={styles.wrap}>
      <span style={styles.msg}>No vault selected</span>
      <button style={styles.btn} onClick={() => window.api.pickVault()}>
        Choose vault folder
      </button>
    </div>
  );
}

const styles = {
  wrap: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 20,
  },
  msg: { color: 'var(--muted)', fontSize: 12 },
  btn: {
    padding: '7px 14px',
    borderRadius: 8,
    border: '1px solid var(--border)',
    color: 'var(--text)',
    fontSize: 12,
    transition: 'background 120ms ease',
  },
};
