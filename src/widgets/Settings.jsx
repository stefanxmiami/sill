import React, { useState } from 'react';
import { useWindowFocus } from '../hooks.js';

const LABEL = { tasks: 'Tasks', daily: 'Daily Note', capture: 'Quick Capture', recent: 'Recent Notes' };

export default function Settings() {
  const [s, setS] = useState(null);
  const [needsRelaunch, setNeedsRelaunch] = useState(false);

  const read = async () => setS(await window.api.readSettings());
  useWindowFocus(read); // re-sync whenever the window regains focus (e.g. tray edits)

  if (!s) return <div style={styles.panel} />;

  const patch = (next) => setS((cur) => ({ ...cur, ...next }));

  const changeVault = async () => {
    const p = await window.api.pickVault();
    if (p) patch({ vaultPath: p });
  };

  const toggleEnabled = async (id) => {
    const on = s.enabled.includes(id);
    const enabled = on ? s.enabled.filter((x) => x !== id) : [...s.enabled, id];
    patch({ enabled });
    await window.api.setEnabled(enabled);
  };

  const togglePin = async (id) => {
    const flag = !s.pins[id];
    patch({ pins: { ...s.pins, [id]: flag } });
    await window.api.setPin(id, flag);
  };

  const toggleAcrylic = async () => {
    const flag = !s.acrylic;
    patch({ acrylic: flag });
    await window.api.setAcrylic(flag);
    setNeedsRelaunch(true);
  };

  const toggleLogin = async () => {
    const flag = !s.openAtLogin;
    patch({ openAtLogin: flag });
    await window.api.setLogin(flag);
  };

  return (
    <div style={styles.panel}>
      <header style={styles.header}>
        <span style={styles.headerTitle}>Preferences</span>
        <button style={styles.close} title="Close" onClick={() => window.api.hide()}>×</button>
      </header>

      <div style={styles.body}>
        <Section title="Vault">
          <div style={styles.vaultRow}>
            <span style={styles.vaultPath} title={s.vaultPath || ''}>
              {s.vaultPath || 'No vault selected'}
            </span>
            <button style={styles.btn} onClick={changeVault}>Change…</button>
          </div>
        </Section>

        <Section title="Widgets">
          <div style={styles.tableHead}>
            <span style={{ flex: 1 }} />
            <span style={styles.colHead}>Show</span>
            <span style={styles.colHead}>Pin</span>
          </div>
          {s.widgets.map((id) => (
            <div key={id} style={styles.wRow}>
              <span style={styles.wName}>{LABEL[id] || id}</span>
              <div style={styles.col}><Check on={s.enabled.includes(id)} onClick={() => toggleEnabled(id)} /></div>
              <div style={styles.col}><Check on={!!s.pins[id]} accent onClick={() => togglePin(id)} /></div>
            </div>
          ))}
        </Section>

        <Section title="Appearance">
          <Row
            label="Wallpaper blur (acrylic)"
            hint="Real Win11 blur instead of flat transparency. Needs a relaunch."
            control={<Switch on={s.acrylic} onClick={toggleAcrylic} />}
          />
          {needsRelaunch && (
            <button style={{ ...styles.btn, marginTop: 8 }} onClick={() => window.api.relaunch()}>
              Relaunch to apply
            </button>
          )}
        </Section>

        <Section title="Startup">
          <Row
            label="Start with Windows"
            hint="Launch the widgets automatically when you log in. (Installed app only.)"
            control={<Switch on={s.openAtLogin} onClick={toggleLogin} />}
          />
        </Section>

        <div style={styles.footer}>
          <button style={styles.btnPrimary} onClick={() => window.api.showAll()}>Show all widgets</button>
          <span style={styles.hint}>Toggle all: Ctrl+Alt+O · Capture: Ctrl+Alt+C</span>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section style={styles.section}>
      <div style={styles.sectionTitle}>{title}</div>
      {children}
    </section>
  );
}

function Row({ label, hint, control }) {
  return (
    <div style={styles.row}>
      <div style={styles.rowText}>
        <span style={styles.rowLabel}>{label}</span>
        {hint && <span style={styles.rowHint}>{hint}</span>}
      </div>
      {control}
    </div>
  );
}

function Switch({ on, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 36, height: 20, borderRadius: 10, flexShrink: 0, position: 'relative',
        background: on ? 'var(--today)' : 'rgba(255,255,255,0.12)',
        transition: 'background 120ms ease',
      }}
      title={on ? 'On' : 'Off'}
    >
      <span style={{
        position: 'absolute', top: 2, left: on ? 18 : 2, width: 16, height: 16, borderRadius: '50%',
        background: '#0E0F12', transition: 'left 120ms ease',
      }} />
    </button>
  );
}

function Check({ on, accent, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 16, height: 16, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: `1.5px solid ${on ? (accent ? 'var(--today)' : 'var(--text)') : 'var(--muted)'}`,
        background: on ? (accent ? 'var(--today)' : 'var(--text)') : 'transparent',
        transition: 'all 120ms ease',
      }}
    >
      {on && (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#0E0F12" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      )}
    </button>
  );
}

const styles = {
  panel: {
    display: 'flex', flexDirection: 'column', width: '100%', height: '100%',
    background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    height: 38, padding: '0 8px 0 16px', flexShrink: 0, WebkitAppRegion: 'drag',
    borderBottom: '1px solid var(--border)',
  },
  headerTitle: { fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600 },
  close: {
    width: 24, height: 24, borderRadius: 6, color: 'var(--muted)', fontSize: 18, lineHeight: 1,
    display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitAppRegion: 'no-drag',
  },
  body: { flex: 1, overflowY: 'auto', padding: '4px 16px 16px' },
  section: { padding: '14px 0', borderBottom: '1px solid var(--border)' },
  sectionTitle: { fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 },
  vaultRow: { display: 'flex', alignItems: 'center', gap: 10 },
  vaultPath: {
    flex: 1, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text)',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', direction: 'rtl', textAlign: 'left',
  },
  tableHead: { display: 'flex', alignItems: 'center', paddingBottom: 6 },
  colHead: { width: 44, textAlign: 'center', fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' },
  wRow: { display: 'flex', alignItems: 'center', padding: '6px 0' },
  wName: { flex: 1, fontSize: 13, color: 'var(--text)' },
  col: { width: 44, display: 'flex', justifyContent: 'center' },
  row: { display: 'flex', alignItems: 'center', gap: 12, padding: '4px 0' },
  rowText: { flex: 1, display: 'flex', flexDirection: 'column', gap: 2 },
  rowLabel: { fontSize: 13, color: 'var(--text)' },
  rowHint: { fontSize: 11, color: 'var(--muted)', lineHeight: 1.35 },
  btn: {
    padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', color: 'var(--text)',
    fontSize: 12, whiteSpace: 'nowrap', transition: 'background 120ms ease',
  },
  btnPrimary: {
    padding: '9px 14px', borderRadius: 8, border: '1px solid var(--border)',
    background: 'rgba(255,255,255,0.05)', color: 'var(--text)', fontSize: 13, width: '100%',
    transition: 'background 120ms ease',
  },
  footer: { paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' },
  hint: { fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)' },
};
