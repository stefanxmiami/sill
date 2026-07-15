const { app } = require('electron');
const fs = require('fs');
const path = require('path');

// JSON store with dot-path get/set, persisted to userData/config.json.
// Path is resolved lazily because app.getPath is unavailable before 'ready'.
let file = null;
let data = null;

function load() {
  if (data) return;
  file = path.join(app.getPath('userData'), 'config.json');
  try {
    data = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    data = {};
  }
}

function persist() {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('config: failed to persist', err);
  }
}

function get(key) {
  load();
  if (key == null) return data;
  return key.split('.').reduce((acc, part) => (acc == null ? undefined : acc[part]), data);
}

function set(key, value) {
  load();
  const parts = key.split('.');
  const last = parts.pop();
  const target = parts.reduce((acc, part) => {
    if (acc[part] == null || typeof acc[part] !== 'object') acc[part] = {};
    return acc[part];
  }, data);
  target[last] = value;
  persist();
  return value;
}

module.exports = { get, set };
