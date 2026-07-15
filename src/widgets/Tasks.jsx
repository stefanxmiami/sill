import React, { useState } from 'react';
import Frame from '../components/Frame.jsx';
import EmptyVault from '../components/EmptyVault.jsx';
import Inline from '../inline.jsx';
import { useVaultData } from '../hooks.js';

const SPINE = {
  overdue: 'var(--overdue)',
  today: 'var(--today)',
  later: 'var(--later)',
  none: 'transparent',
};

const GROUPS = [
  { key: 'overdue', label: 'Overdue' },
  { key: 'today', label: 'Today' },
  { key: 'later', label: 'Upcoming' },
  { key: 'none', label: 'No date' },
];

export default function Tasks() {
  const { data, error, reload } = useVaultData(() => window.api.listTasks());
  // ids of tasks optimistically marked done, hidden until the next refetch confirms
  const [pending, setPending] = useState(() => new Set());

  if (error) return <Frame title="Tasks"><EmptyVault /></Frame>;

  const tasks = (data || []).filter((t) => !pending.has(keyOf(t)));
  const grouped = GROUPS.map((g) => ({
    ...g,
    items: tasks.filter((t) => t.urgency === g.key),
  })).filter((g) => g.items.length);

  const toggle = async (task) => {
    const id = keyOf(task);
    setPending((prev) => new Set(prev).add(id)); // optimistic: drop it now
    const res = await window.api.toggleTask({ ...task, done: true });
    if (!res || !res.ok) {
      // stale line or write failure: revert and pull fresh state
      setPending((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
    reload();
  };

  return (
    <Frame
      title="Tasks"
      control={<Count n={tasks.length} />}
    >
      {data && !grouped.length && <p style={styles.empty}>Nothing due. Clear.</p>}
      {grouped.map((g) => (
        <section key={g.key} style={styles.group}>
          <div style={styles.groupLabel}>{g.label}</div>
          {g.items.map((t) => (
            <Row key={keyOf(t)} task={t} onToggle={() => toggle(t)} />
          ))}
        </section>
      ))}
    </Frame>
  );
}

function Row({ task, onToggle }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      style={{ ...styles.row, background: hover ? 'rgba(255,255,255,0.03)' : 'transparent' }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <span style={{ ...styles.spine, background: SPINE[task.urgency] }} />
      <button style={styles.checkbox} onClick={onToggle} title="Complete">
        <span style={styles.checkInner} />
      </button>
      <span style={styles.text}><Inline text={task.text} /></span>
      {task.due && (
        <span className="mono" style={styles.due}>
          {formatDue(task.due, task.urgency)}
        </span>
      )}
    </div>
  );
}

function Count({ n }) {
  return <span className="mono" style={styles.count}>{n}</span>;
}

const keyOf = (t) => `${t.file}:${t.line}`;

function formatDue(due, urgency) {
  if (urgency === 'today') return 'today';
  // show MM-DD, the year is noise at a glance
  return due.slice(5);
}

const styles = {
  count: { color: 'var(--muted)', paddingRight: 4 },
  empty: { color: 'var(--muted)', fontSize: 12, padding: '20px 14px' },
  group: { marginTop: 6 },
  groupLabel: {
    fontSize: 10,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--muted)',
    padding: '4px 14px 2px',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '5px 12px 5px 0',
    position: 'relative',
    transition: 'background 120ms ease',
  },
  spine: {
    width: 2,
    alignSelf: 'stretch',
    borderRadius: 1,
    flexShrink: 0,
  },
  checkbox: {
    width: 15,
    height: 15,
    marginLeft: 10,
    borderRadius: 4,
    border: '1.5px solid var(--muted)',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'border-color 120ms ease',
  },
  checkInner: { width: 7, height: 7, borderRadius: 2 },
  text: {
    flex: 1,
    fontSize: 13,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  due: { color: 'var(--muted)', flexShrink: 0 },
};
