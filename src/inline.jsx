import React from 'react';

// Minimal inline-markdown renderer for task text. Handles the common Obsidian
// inline formats and nothing block-level (no lists/headings — task text is one line).
// Underscore emphasis is intentionally NOT supported, so file_names and snake_case
// aren't mangled into italics.
const RULES = [
  { re: /`([^`]+)`/, tag: 'code' },
  { re: /\*\*([\s\S]+?)\*\*/, tag: 'strong', recurse: true },
  { re: /~~([\s\S]+?)~~/, tag: 'del', recurse: true },
  { re: /\*(?!\s)([\s\S]*?[^\s])\*/, tag: 'em', recurse: true },
  { re: /\[\[([^\]]+?)\]\]/, tag: 'wikilink' },
  { re: /\[([^\]]+?)\]\(([^)]+?)\)/, tag: 'link' },
];

function parse(text, keyPrefix) {
  const nodes = [];
  let rest = text;
  let k = 0;
  while (rest.length) {
    let best = null;
    for (const rule of RULES) {
      const m = rule.re.exec(rest);
      if (m && (best === null || m.index < best.index)) best = { m, rule };
    }
    if (!best) {
      nodes.push(rest);
      break;
    }
    const { m, rule } = best;
    if (m.index > 0) nodes.push(rest.slice(0, m.index));
    const key = `${keyPrefix}-${k++}`;

    if (rule.tag === 'code') {
      nodes.push(<code key={key} style={styles.code}>{m[1]}</code>);
    } else if (rule.tag === 'wikilink') {
      nodes.push(<span key={key} style={styles.link}>{m[1].split('|').pop()}</span>);
    } else if (rule.tag === 'link') {
      nodes.push(<span key={key} style={styles.link}>{m[1]}</span>);
    } else {
      const Tag = rule.tag; // strong | em | del
      nodes.push(<Tag key={key}>{parse(m[1], key)}</Tag>);
    }
    rest = rest.slice(m.index + m[0].length);
  }
  return nodes;
}

export default function Inline({ text }) {
  return <>{parse(text || '', 'm')}</>;
}

const styles = {
  code: {
    fontFamily: 'var(--mono)',
    fontSize: '0.92em',
    background: 'rgba(255,255,255,0.06)',
    padding: '0 4px',
    borderRadius: 4,
  },
  link: {
    textDecoration: 'underline',
    textDecorationColor: 'var(--muted)',
    textUnderlineOffset: 2,
  },
};
