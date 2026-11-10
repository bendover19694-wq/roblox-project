// Full-screen image viewer. openLightbox(images, index): images are paths ("uploads/a.png"),
// URLs, or {src, title}. Keys: + zoom in, - zoom out, 0 fit, arrows previous/next, Esc close.
import { h, ic, mediaUrl } from './core.js';

let current = null;

const urlOf = (src) => (/^(https?:)?\/\//i.test(src) || src.startsWith('/') || src.startsWith('data:') ? src : mediaUrl(src));

export function closeLightbox() { current?.close(); }

export function openLightbox(images, index = 0) {
  const items = (Array.isArray(images) ? images : [images]).filter(Boolean)
    .map((i) => (typeof i === 'string' ? { src: i, title: '' } : { src: i.src || i.mediaPath || i.path, title: i.title || i.alt || '' }))
    .filter((i) => i.src);
  if (!items.length) return;
  closeLightbox();

  let i = Math.min(Math.max(0, index), items.length - 1);
  let scale = 1; let x = 0; let y = 0;
  const img = h('img', { class: 'lb-img', alt: '', draggable: 'false' });
  const stage = h('div', { class: 'lb-stage' }, img);
  const caption = h('div', { class: 'lb-caption' });
  const count = h('span', { class: 'lb-count' });
  const zoomLabel = h('span', { class: 'lb-zoom', 'aria-live': 'polite' });
  const dl = h('a', { class: 'lb-btn', title: 'Download', 'aria-label': 'Download', download: '', href: '#' }, ic('image', 16), h('span', {}, 'Download'));

  function apply() {
    img.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    img.style.cursor = scale > 1 ? 'grab' : 'zoom-in';
    zoomLabel.textContent = Math.round(scale * 100) + '%';
  }
  function fit() { scale = 1; x = 0; y = 0; apply(); }
  function zoom(f) { scale = Math.min(8, Math.max(0.25, scale * f)); if (scale <= 1) { x = 0; y = 0; } apply(); }
  function show(n) {
    i = (n + items.length) % items.length;
    const it = items[i];
    const url = urlOf(it.src);
    img.src = url; img.alt = it.title || 'Image ' + (i + 1);
    dl.href = url; dl.setAttribute('download', url.split('?')[0].split('/').pop() || 'image.png');
    caption.textContent = it.title;
    count.textContent = items.length > 1 ? `${i + 1} / ${items.length}` : '';
    prev.hidden = next.hidden = items.length < 2;
    fit();
  }

  const prev = h('button', { type: 'button', class: 'lb-nav prev', 'aria-label': 'Previous image', onclick: () => show(i - 1) }, ic('back', 22));
  const next = h('button', { type: 'button', class: 'lb-nav next', 'aria-label': 'Next image', onclick: () => show(i + 1) }, ic('chevron', 22));
  const btn = (label, fn, text) => h('button', { type: 'button', class: 'lb-btn', title: label, 'aria-label': label, onclick: fn }, text);

  const root = h('div', { class: 'lightbox', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Image viewer' },
    h('div', { class: 'lb-bar' }, count, h('span', { class: 'grow' }),
      btn('Zoom out', () => zoom(1 / 1.25), '−'), zoomLabel, btn('Zoom in', () => zoom(1.25), '+'), btn('Fit to screen', fit, 'Fit'), dl,
      h('button', { type: 'button', class: 'lb-btn', 'aria-label': 'Close', title: 'Close (Esc)', onclick: close }, ic('x', 16))),
    stage, prev, next, caption);

  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
    else if (e.key === '+' || e.key === '=') { e.preventDefault(); zoom(1.25); }
    else if (e.key === '-' || e.key === '_') { e.preventDefault(); zoom(1 / 1.25); }
    else if (e.key === '0') { e.preventDefault(); fit(); }
    else if (e.key === 'ArrowRight' && items.length > 1) { e.preventDefault(); show(i + 1); }
    else if (e.key === 'ArrowLeft' && items.length > 1) { e.preventDefault(); show(i - 1); }
    else return;
    e.stopPropagation();
  }
  stage.addEventListener('wheel', (e) => { e.preventDefault(); zoom(e.deltaY < 0 ? 1.15 : 1 / 1.15); }, { passive: false });
  stage.addEventListener('click', (e) => { if (e.target === stage) close(); });
  img.addEventListener('dblclick', () => { if (scale === 1) { scale = 2; apply(); } else fit(); });
  let drag = null;
  img.addEventListener('pointerdown', (e) => { if (scale <= 1) return; drag = { px: e.clientX, py: e.clientY, x, y }; img.setPointerCapture(e.pointerId); img.style.cursor = 'grabbing'; });
  img.addEventListener('pointermove', (e) => { if (!drag) return; x = drag.x + e.clientX - drag.px; y = drag.y + e.clientY - drag.py; apply(); });
  img.addEventListener('pointerup', () => { drag = null; apply(); });

  const prevFocus = document.activeElement;
  function close() {
    document.removeEventListener('keydown', onKey, true);
    root.remove();
    current = null;
    prevFocus?.focus?.({ preventScroll: true });
  }
  document.getElementById('overlay').append(root);
  document.addEventListener('keydown', onKey, true);
  current = { close };
  show(i);
  root.querySelector('button[aria-label="Close"]').focus();
}
