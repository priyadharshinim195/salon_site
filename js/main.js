'use strict';
/* ===== Image-sequence config: change these two lines to match your files ===== */
const TOTAL_FRAMES = 300;
const framePath = n => `images/frames/frame${String(n).padStart(3, '0')}.jpg`; // n runs 1..TOTAL_FRAMES
const SUBJECT_X = 0.33; // horizontal focus (0-1) used when the screen is narrower than 16:9

const canvas = document.getElementById('sequence');
const ctx = canvas.getContext('2d', { alpha: false });
const hero = document.querySelector('.hero');
const frames = new Array(TOTAL_FRAMES); // each frame is requested exactly once
let loaded = 0, current = 0, target = 0, dpr = 1, lastKey = '';

/* ---- Preload: first frames first, then the rest in small parallel batches ---- */
function loadFrame(i) {
  return new Promise(res => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = img.onerror = () => { frames[i] = img.naturalWidth ? img : null; loaded++;
      document.getElementById('loaderBar').style.width = (loaded / TOTAL_FRAMES * 100) + '%'; res(); };
    img.src = framePath(i + 1);
  });
}
async function preload() {
  const order = [...Array(TOTAL_FRAMES).keys()], BATCH = 10;
  for (let i = 0; i < order.length; i += BATCH) await Promise.all(order.slice(i, i + BATCH).map(loadFrame));
  document.getElementById('loader').classList.add('done');
  document.body.style.overflowY = '';
  draw(true);
}
document.body.style.overflowY = 'hidden'; // keep page still until frames are ready

/* ---- Canvas sizing: draws at devicePixelRatio, never stretches the 16:9 frames ---- */
function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = canvas.clientWidth * dpr; canvas.height = canvas.clientHeight * dpr;
  lastKey = ''; draw(true);
}
function drawImageFit(img, alpha) {
  const cw = canvas.width, ch = canvas.height, ir = img.naturalWidth / img.naturalHeight;
  // Wide screens: "contain" keeps the full composition. Narrow screens: "cover" with subject focus.
  const cover = cw / ch < 1.2;
  let w, h;
  if (cover ? cw / ch > ir : cw / ch < ir) { w = cw; h = cw / ir; } else { h = ch; w = ch * ir; }
  const x = cover ? Math.min(0, Math.max(cw - w, cw / 2 - SUBJECT_X * w)) : (cw - w) / 2;
  ctx.globalAlpha = alpha; ctx.drawImage(img, x, (ch - h) / 2, w, h);
}
/* ---- Draw: blend the two neighbouring frames by the fractional position for fluid motion ---- */
function draw(force) {
  const base = Math.min(TOTAL_FRAMES - 1, Math.floor(current)), mix = current - base;
  const key = base + ':' + mix.toFixed(2);
  if (!force && key === lastKey) return; lastKey = key;
  const a = frames[base], b = frames[Math.min(TOTAL_FRAMES - 1, base + 1)];
  if (!a) return;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawImageFit(a, 1);
  if (b && mix > 0.02) drawImageFit(b, mix);
  ctx.globalAlpha = 1;
}
/* ---- Scroll progress through the tall hero track maps to frame index 0..TOTAL_FRAMES-1 ---- */
const copy = document.getElementById('heroCopy'), hint = document.getElementById('hint');
function readScroll() {
  const range = hero.offsetHeight - window.innerHeight;
  const p = Math.min(1, Math.max(0, -hero.getBoundingClientRect().top / range));
  target = p * (TOTAL_FRAMES - 1);
  copy.classList.toggle('gone', p > 0.1); hint.classList.toggle('gone', p > 0.02);
}
function tick() { // requestAnimationFrame loop: ease toward the scroll target
  current += (target - current) * 0.14;
  if (Math.abs(target - current) < 0.01) current = target;
  draw(false); requestAnimationFrame(tick);
}
window.addEventListener('scroll', readScroll, { passive: true });
window.addEventListener('resize', () => { resize(); readScroll(); });
resize(); readScroll(); requestAnimationFrame(tick); preload();

/* ===== Navbar, mobile menu ===== */
const nav = document.getElementById('nav'), menu = document.getElementById('menu'), burger = document.getElementById('burger');
const onScroll = () => nav.classList.toggle('solid', scrollY > 40);
addEventListener('scroll', onScroll, { passive: true }); onScroll();
burger.onclick = () => { const o = menu.classList.toggle('open'); burger.setAttribute('aria-expanded', o); };
menu.querySelectorAll('a').forEach(a => a.onclick = () => { menu.classList.remove('open'); burger.setAttribute('aria-expanded', false); });

/* ===== Scroll reveal ===== */
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); setTimeout(() => e.target.style.transitionDelay = '', 1400); } }), { threshold: .12 });
document.querySelectorAll('.reveal').forEach((el, i) => { el.style.transitionDelay = (i % 4) * 70 + 'ms'; io.observe(el); });

/* ===== Testimonial carousel ===== */
const track = document.getElementById('track'), slides = track.children, dots = document.getElementById('dots');
let idx = 0, timer;
[...slides].forEach((_, i) => { const d = document.createElement('i'); d.onclick = () => go(i); dots.appendChild(d); });
function go(i) { idx = (i + slides.length) % slides.length; track.style.transform = `translateX(-${idx * 100}%)`;
  [...dots.children].forEach((d, k) => d.classList.toggle('on', k === idx)); clearInterval(timer); timer = setInterval(() => go(idx + 1), 7000); }
document.getElementById('prev').onclick = () => go(idx - 1); document.getElementById('next').onclick = () => go(idx + 1); go(0);

/* ===== Service buttons pre-select the booking form ===== */
document.querySelectorAll('[data-service]').forEach(a => a.addEventListener('click', () => { document.getElementById('service').value = a.dataset.service; }));

/* ===== Booking form (front-end validation; connect to your backend in submit handler) ===== */
const form = document.getElementById('form'), msg = document.getElementById('formMsg');
form.querySelector('[name=date]').min = new Date().toISOString().split('T')[0];
form.addEventListener('submit', e => {
  e.preventDefault(); let ok = true;
  form.querySelectorAll('[required]').forEach(f => { const bad = !f.checkValidity(); f.classList.toggle('bad', bad); if (bad) ok = false; });
  if (!ok) { msg.textContent = 'Please complete the highlighted fields.'; return; }
  msg.textContent = `Thank you, ${form.elements["name"].value.split(' ')[0]}. Your request is in; we'll confirm shortly.`; form.reset();
});

/* ===== Before/after comparison sliders ===== */
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
document.querySelectorAll('.compare').forEach(box => {
  const handle = box.querySelector('.handle'); handle.setAttribute('aria-valuenow', parseInt(box.style.getPropertyValue('--pos')) || 50);
  const setPos = p => { p = Math.max(0, Math.min(100, p)); box.style.setProperty('--pos', p + '%'); handle.setAttribute('aria-valuenow', Math.round(p)); };
  const fromEvent = e => { const r = box.getBoundingClientRect(); setPos((e.clientX - r.left) / r.width * 100); };
  let dragging = false;
  box.addEventListener('pointerdown', e => { dragging = true; box.setPointerCapture(e.pointerId); fromEvent(e); });
  box.addEventListener('pointermove', e => { if (dragging) fromEvent(e); });
  ['pointerup', 'pointercancel'].forEach(t => box.addEventListener(t, () => dragging = false));
  handle.addEventListener('keydown', e => { const v = +handle.getAttribute('aria-valuenow');
    if (e.key === 'ArrowLeft') setPos(v - 4); else if (e.key === 'ArrowRight') setPos(v + 4); else return; e.preventDefault(); });
  // one gentle sweep the first time it scrolls into view, to show it is interactive
  new IntersectionObserver((es, o) => es.forEach(x => { if (!x.isIntersecting) return; o.disconnect(); if (reduceMotion) return;
    const base = parseFloat(box.style.getPropertyValue('--pos')) || 50, t0 = performance.now(); (function sweep(t) { const k = (t - t0) / 1800; if (k >= 1 || dragging) return;
      setPos(base + Math.sin(k * Math.PI * 2) * 14 * (1 - k)); requestAnimationFrame(sweep); })(t0); }), { threshold: .6 }).observe(box);
});

/* ===== Gallery lightbox ===== */
const gItems = [...document.querySelectorAll('.gi')], lb = document.getElementById('lightbox'), lbImg = lb.querySelector('img'), lbCap = document.getElementById('lbCap');
let lbIdx = 0;
function showLb(i) { lbIdx = (i + gItems.length) % gItems.length; const im = gItems[lbIdx].querySelector('img'); lbImg.src = im.src; lbImg.alt = im.alt; lbCap.textContent = im.alt; }
function openLb(i) { showLb(i); lb.hidden = false; document.body.style.overflow = 'hidden'; document.getElementById('lbClose').focus(); }
function closeLb() { lb.hidden = true; document.body.style.overflow = ''; }
gItems.forEach((g, i) => g.addEventListener('click', () => openLb(i)));
document.getElementById('viewGallery').onclick = () => openLb(0);
document.getElementById('lbClose').onclick = closeLb; document.getElementById('lbPrev').onclick = () => showLb(lbIdx - 1); document.getElementById('lbNext').onclick = () => showLb(lbIdx + 1);
lb.addEventListener('click', e => { if (e.target === lb) closeLb(); });
addEventListener('keydown', e => { if (lb.hidden) return; if (e.key === 'Escape') closeLb(); if (e.key === 'ArrowLeft') showLb(lbIdx - 1); if (e.key === 'ArrowRight') showLb(lbIdx + 1); });
