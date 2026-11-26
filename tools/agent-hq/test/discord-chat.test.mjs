import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simplify, group } from '../discord-chat.mjs';

const msg = (id, author, content, at, extra = {}) => ({ id, type: 0, timestamp: at, content, author: { id: author, username: author }, mentions: [], embeds: [], attachments: [], ...extra });

test('simplify: mentions become names, markdown and links shrink, HQ machine posts fold', () => {
  const m = simplify(msg('1', 'v', '<@42> **look** at `x` https://github.com/a/b/pull/1', '2026-11-25T10:00:00Z', { mentions: [{ id: '42', global_name: 'Ditto' }] }));
  assert.equal(m.text, '@Ditto look at x github.com/…');
  assert.equal(m.kind, 'chat');
  assert.equal(simplify(msg('2', 'bot', 'HQ1 {"type":"chat"}', '2026-11-25T10:00:00Z')).kind, 'sync');
  assert.equal(simplify(msg('3', 'bot', '**Agent HQ update** `abc` on main', '2026-11-25T10:00:00Z')).kind, 'update');
});

test('simplify: long posts are shortened with the full text kept', () => {
  const long = 'First sentence is here. ' + 'word '.repeat(80);
  const m = simplify(msg('4', 'v', long, '2026-11-25T10:00:00Z'));
  assert.ok(m.text.length <= 230, m.text);
  assert.ok(m.text.endsWith('…'));
  assert.ok(m.full.length > m.text.length);
});

test('group: one person within 5 minutes is one item; sync runs collapse', () => {
  const s = [
    simplify(msg('1', 'v', 'hi', '2026-11-25T10:00:00Z')),
    simplify(msg('2', 'v', 'you there', '2026-11-25T10:02:00Z')),
    simplify(msg('3', 'b', 'HQ1 {}', '2026-11-25T10:03:00Z')),
    simplify(msg('4', 'b', 'HQ1 {}', '2026-11-25T10:03:30Z')),
    simplify(msg('5', 'v', 'later', '2026-11-25T10:20:00Z')),
  ];
  const g = group(s);
  assert.equal(g.length, 3);
  assert.equal(g[0].lines.length, 2);
  assert.equal(g[1].kind, 'sync');
  assert.equal(g[1].count, 2);
  assert.equal(g[2].lines[0].text, 'later');
});

test('group: the same words sent again by the same sender fold into one line with a count', () => {
  const g = group([0, 1, 2].map((i) => simplify(msg(String(i), 'bot', 'waits for OK', `2026-11-25T10:0${i}:00Z`))));
  assert.equal(g.length, 1);
  assert.equal(g[0].lines.length, 1);
  assert.equal(g[0].lines[0].n, 3);
});
