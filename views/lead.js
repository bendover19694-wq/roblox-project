import { h } from './core.js';
import { chatView } from './chat.js';

export const live = true;

let wrap = null;
let chat = null;

export function render() {
  if (wrap && wrap.isConnected) { chat.update(); return wrap; }
  chat = chatView('lead');
  wrap = h('div', { class: 'messenger solo' }, h('div', { class: 'conv' }, chat.node));
  return wrap;
}
