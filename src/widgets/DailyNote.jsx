import React, { useEffect, useRef, useState } from 'react';
import Frame from '../components/Frame.jsx';
import EmptyVault from '../components/EmptyVault.jsx';
import { useVaultData } from '../hooks.js';

export default function DailyNote() {
  const { data, error } = useVaultData(() => window.api.getDaily());
  const [value, setValue] = useState('');
  const [saved, setSaved] = useState(true);
  const timer = useRef(null);
  const dirty = useRef(false);

  // sync from disk only when the user isn't mid-edit, so external changes
  // don't clobber unsaved keystrokes
  useEffect(() => {
    if (data && !dirty.current) setValue(data.content);
  }, [data]);

  if (error) return <Frame title={title()}><EmptyVault /></Frame>;

  const onChange = (e) => {
    const next = e.target.value;
    setValue(next);
    dirty.current = true;
    setSaved(false);
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      await window.api.saveDaily(next);
      dirty.current = false;
      setSaved(true);
    }, 800);
  };

  return (
    <Frame title={title()} control={<Dot saved={saved} />}>
      <textarea
        style={styles.area}
        value={value}
        onChange={onChange}
        placeholder="Today…"
        spellCheck={false}
      />
    </Frame>
  );
}

function Dot({ saved }) {
  return (
    <span
      title={saved ? 'Saved' : 'Saving…'}
      style={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        marginRight: 6,
        background: saved ? 'var(--later)' : 'var(--today)',
        transition: 'background 120ms ease',
      }}
    />
  );
}

function title() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const styles = {
  area: {
    width: '100%',
    height: '100%',
    resize: 'none',
    padding: '4px 14px 10px',
    fontSize: 13,
    lineHeight: 1.55,
    color: 'var(--text)',
    background: 'transparent',
    fontFamily: 'var(--sans)',
    WebkitUserSelect: 'text',
    userSelect: 'text',
  },
};
