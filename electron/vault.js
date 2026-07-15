const fs = require('fs/promises');
const path = require('path');
const chokidar = require('chokidar');

let root = null;
let watcher = null;
const cache = new Map();       // absPath -> { mtimeMs, tasks }
const selfWrites = new Map();  // absPath -> timestamp

const TASK_RE    = /^(\s*)[-*]\s+\[([ xX/-])\]\s+(.*)$/;
const DUE_EMOJI  = /📅\s*(\d{4}-\d{2}-\d{2})/;
const DUE_FIELD  = /due::\s*(\d{4}-\d{2}-\d{2})/;
const DONE_EMOJI = /\s*✅\s*\d{4}-\d{2}-\d{2}/;
const PRIORITY   = /(🔺|⏫|🔼|🔽|⏬)/;
const META       = /(📅|⏳|🛫|➕|✅)\s*\d{4}-\d{2}-\d{2}|🔺|⏫|🔼|🔽|⏬|#[\w/-]+/g;

function open(vaultPath, onChange) {
  root = vaultPath;
  cache.clear();
  if (watcher) watcher.close();

  watcher = chokidar.watch(root, {
    ignored: /(^|[\/\\])\..|node_modules/,   // skips .obsidian and .trash
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
  });

  const bump = (p) => {
    const stamp = selfWrites.get(p);
    if (stamp && Date.now() - stamp < 1500) return; // our own write, not a real change
    cache.delete(p);
    onChange();
  };
  watcher.on('add', bump).on('change', bump).on('unlink', bump);
}

async function walk(dir, out = []) {
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) await walk(full, out);
    else if (e.name.endsWith('.md')) out.push(full);
  }
  return out;
}

async function parseFile(abs) {
  const stat = await fs.stat(abs);
  const hit = cache.get(abs);
  if (hit && hit.mtimeMs === stat.mtimeMs) return hit.tasks;   // mtime cache, keeps scans cheap

  const lines = (await fs.readFile(abs, 'utf8')).split(/\r?\n/);
  const tasks = [];
  lines.forEach((raw, i) => {
    const m = raw.match(TASK_RE);
    if (!m) return;
    const [, , box, body] = m;
    const due = (body.match(DUE_EMOJI) || body.match(DUE_FIELD) || [])[1] || null;
    tasks.push({
      file: abs,
      rel: path.relative(root, abs),
      line: i,
      raw,                                    // fingerprint, used by toggleTask
      done: box.toLowerCase() === 'x',
      due,
      priority: (body.match(PRIORITY) || [])[1] || null,
      text: body.replace(META, '').trim(),    // display text, metadata stripped
    });
  });
  cache.set(abs, { mtimeMs: stat.mtimeMs, tasks });
  return tasks;
}

async function listTasks() {
  const files = await walk(root);
  const all = (await Promise.all(files.map(parseFile))).flat();
  const today = new Date().toISOString().slice(0, 10);
  return all
    .filter(t => !t.done)
    .map(t => ({
      ...t,
      urgency: !t.due ? 'none'
             : t.due < today ? 'overdue'
             : t.due === today ? 'today' : 'later',
    }))
    .sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999'));
}

async function toggleTask({ file, line, raw, done }) {
  const text = await fs.readFile(file, 'utf8');
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const lines = text.split(/\r?\n/);

  // if the line moved or changed since we read it, refuse and let the UI refresh
  if (lines[line] !== raw) return { ok: false, reason: 'stale' };

  const stamp = new Date().toISOString().slice(0, 10);
  lines[line] = done
    ? lines[line].replace(/\[ \]/, '[x]') + ` ✅ ${stamp}`
    : lines[line].replace(/\[[xX]\]/, '[ ]').replace(DONE_EMOJI, '');

  selfWrites.set(file, Date.now());
  await fs.writeFile(file, lines.join(eol), 'utf8');
  cache.delete(file);
  return { ok: true };
}

async function capture(text) {
  const target = path.join(root, 'Inbox.md');
  const stamp = new Date().toTimeString().slice(0, 5);
  let existing = '';
  try { existing = await fs.readFile(target, 'utf8'); } catch {}
  const body = `${existing.trimEnd()}${existing.trim() ? '\n' : ''}- [ ] ${text} (${stamp})\n`;
  selfWrites.set(target, Date.now());
  await fs.writeFile(target, body, 'utf8');
  return { ok: true, file: target };
}

function todayPath() {
  const d = new Date();
  const name = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.md`;
  return path.join(root, 'Daily', name);   // point this at your daily notes folder
}

async function getDaily() {
  const file = todayPath();
  try { return { file, exists: true, content: await fs.readFile(file, 'utf8') }; }
  catch { return { file, exists: false, content: '' }; }
}

async function saveDaily(content) {
  const file = todayPath();
  await fs.mkdir(path.dirname(file), { recursive: true });
  selfWrites.set(file, Date.now());
  await fs.writeFile(file, content, 'utf8');
  return { ok: true };
}

async function recent(n = 10) {
  const files = await walk(root);
  const stats = await Promise.all(files.map(async f => ({ file: f, rel: path.relative(root, f), mtime: (await fs.stat(f)).mtimeMs })));
  return stats.sort((a, b) => b.mtime - a.mtime).slice(0, n);
}

function obsidianUrl(file) {
  const rel = path.relative(root, file).replace(/\\/g, '/').replace(/\.md$/, '');
  return `obsidian://open?vault=${encodeURIComponent(path.basename(root))}&file=${encodeURIComponent(rel)}`;
}

module.exports = { open, listTasks, toggleTask, capture, getDaily, saveDaily, recent, obsidianUrl };
