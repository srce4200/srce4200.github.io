const $ = s => document.querySelector(s);
const el = (tag, props = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const k in props) {
    if (k === 'class') e.className = props[k];
    else if (k.startsWith('on')) e[k] = props[k];
    else e.setAttribute(k, props[k]);
  }
  kids.flat().filter(c => c != null).forEach(c => e.append(c));
  return e;
};
const safeUrl = u => { try { const x = new URL(u, location.href); return /^https?:$/.test(x.protocol) ? x.href : ''; } catch (e) { return ''; } };

let projects = [], active = null, view = 'grid';

/* ---- years: "start" / "end" are optional; end may be "present" ---- */
const NOW = new Date().getFullYear();
const yr = v => {
  if (v == null || v === '') return null;
  if (String(v).toLowerCase() === 'present') return NOW;
  const n = parseInt(v, 10);
  return isNaN(n) ? null : n;
};
const span = p => {
  let s = yr(p.start), e = yr(p.end);
  if (s == null && e == null) return null;
  if (s == null) s = e;
  if (e == null) e = s;
  return e < s ? [e, s] : [s, e];
};
const partial = p => yr(p.start) == null || yr(p.end) == null;
const label = p => {
  const s = yr(p.start), e = yr(p.end), pres = String(p.end).toLowerCase() === 'present';
  if (s == null && e == null) return '';
  if (e == null) return 'From ' + s;
  if (s == null) return 'Until ' + (pres ? 'present' : e);
  if (s === e && !pres) return String(s);
  return s + ' – ' + (pres ? 'present' : e);
};

function card(p) {
  let imgs = (p.images || []).slice(), cur = 0;
  const main = el('img', { class: 'main', alt: p.name });
  const strip = el('div', { class: 'strip' });
  const media = el('div', { class: 'media' });
  const show = i => {
    cur = i; main.src = imgs[i];
    [...strip.children].forEach((t, j) => t.classList.toggle('on', j === i));
  };
  imgs.forEach((src, i) => {
    const t = el('img', { src, alt: '', loading: 'lazy', onclick: () => show(i) });
    t.onerror = () => t.remove();
    strip.append(t);
  });
  main.onclick = () => { $('#lbimg').src = main.src; $('#lb').showModal(); };
  main.onerror = () => { media.className = 'media ph'; media.replaceChildren('Image not found'); };
  if (imgs.length) { media.append(main, imgs.length > 1 ? strip : ''); show(0); }
  else { media.className = 'media ph'; media.textContent = 'No images'; }

  const links = [['GitHub', p.github], ['YouTube', p.youtube], ['itch.io', p.itch]]
    .filter(l => l[1] && safeUrl(l[1]))
    .map(([t, u]) => el('a', { class: 'btn', href: safeUrl(u), target: '_blank', rel: 'noopener noreferrer' }, t + ' ↗'));

  return el('article', { class: 'card' }, media,
    el('div', { class: 'body' },
      el('h2', {}, p.name || 'Untitled'),
      label(p) ? el('div', { class: 'years' }, label(p)) : null,
      p.description ? el('p', {}, p.description) : null,
      (p.languages || []).length ? el('div', { class: 'chips' }, p.languages.map(l => el('span', { class: 'chip' }, l))) : null,
      links.length ? el('div', { class: 'links' }, links) : null));
}

function timeline(list) {
  const root = el('div');
  const dated = list.map(p => ({ p, s: span(p) })).filter(x => x.s)
    .sort((a, b) => a.s[0] - b.s[0] || a.s[1] - b.s[1]);
  const undated = list.filter(p => !span(p));
  if (dated.length) {
    const min = Math.min(...dated.map(x => x.s[0]));
    const max = Math.max(...dated.map(x => x.s[1]));
    const n = max - min + 1;
    const chart = el('div', { class: 'tl' });
    chart.style.setProperty('--n', n);
    chart.append(el('div', { class: 'tl-row tl-head' },
      Array.from({ length: n }, (_, i) => el('span', {}, String(min + i)))));
    const detail = el('div', { class: 'tl-detail' }, el('p', { class: 'tl-hint' }, 'Click a bar to see the project.'));
    dated.forEach(({ p, s }) => {
      const bar = el('button', {
        class: 'tl-bar' + (partial(p) ? ' open' : ''), type: 'button',
        title: p.name + ' · ' + label(p),
        onclick: () => detail.replaceChildren(card(p))
      }, p.name || 'Untitled');
      bar.style.gridColumn = (s[0] - min + 1) + ' / ' + (s[1] - min + 2);
      chart.append(el('div', { class: 'tl-row' }, bar));
    });
    root.append(el('div', { class: 'tl-scroll' }, chart), detail);
  }
  if (undated.length) root.append(el('h3', { class: 'tl-sub' }, 'No dates'), el('div', { class: 'grid' }, undated.map(card)));
  return root;
}

function render() {
  const list = active ? projects.filter(p => (p.languages || []).includes(active)) : projects;
  const tl = view === 'timeline';
  $('#grid').hidden = tl;
  $('#timeline').hidden = !tl;
  if (tl) $('#timeline').replaceChildren(timeline(list));
  else $('#grid').replaceChildren(...list.map(card));
  $('#msg').hidden = list.length > 0;
  if (!list.length) $('#msg').textContent = 'No projects to show yet.';
}

function drawViews() {
  if (!projects.some(span)) return;
  const mk = (label, v) => el('button', {
    class: 'chip' + (view === v ? ' on' : ''), type: 'button',
    onclick: () => { view = v; drawViews(); render(); }
  }, label);
  $('#views').replaceChildren(mk('Grid', 'grid'), mk('Timeline', 'timeline'));
}

function drawFilters() {
  const langs = [...new Set(projects.flatMap(p => p.languages || []))].sort();
  if (langs.length < 2) return;
  const mk = (label, val) => el('button', {
    class: 'chip' + (active === val ? ' on' : ''), type: 'button',
    onclick: () => { active = active === val ? null : val; drawFilters(); render(); }
  }, label);
  $('#filters').replaceChildren(mk('All', null), ...langs.map(l => mk(l, l)));
}

$('#lb').onclick = () => $('#lb').close();

fetch('projects.json', { cache: 'no-cache' })
  .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
  .then(data => {
    $('#name').textContent = data.name || 'Portfolio';
    $('#tagline').textContent = data.tagline || '';
    document.title = (data.name || 'Portfolio') + ' – Portfolio';
    projects = Array.isArray(data.projects) ? data.projects : [];
    drawFilters(); drawViews(); render();
  })
  .catch(() => {
    $('#msg').textContent = 'Couldn’t load projects.json. Check that it sits next to index.html and is valid JSON. (If you opened this file straight from your disk, use a local server or GitHub Pages instead.)';
  });