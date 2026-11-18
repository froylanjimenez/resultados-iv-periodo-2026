(() => {
'use strict';
const C = window.CONFIG, RES = window.RES || {}, GR = window.GRADOS || [];
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = (x, d = 1) => x == null || isNaN(x) ? '—' : Number(x).toLocaleString('es-CO', {minimumFractionDigits: d, maximumFractionDigits: d});
const norm = s => String(s).toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
const sd = a => { const m = mean(a); return a.length ? Math.sqrt(mean(a.map(x => (x - m) ** 2))) : null; };
const LV = ['Bajo', 'Básico', 'Alto', 'Superior'];
const LVC = {Bajo: 'var(--bajo)', 'Básico': 'var(--basico)', Alto: 'var(--alto)', Superior: 'var(--sup)'};
const nota = p => Math.round(p);
const fmtN = x => fmt(x, 0);
const level = p => { const n = nota(p); return n < 60 ? 'Bajo' : n < 80 ? 'Básico' : n < 90 ? 'Alto' : 'Superior'; };
const cell = p => p == null ? '<span class="na">—</span>' : `<span class="cell lv-${level(p)}">${fmt(p, 0)}</span>`;
const ORD = ['', 'Primer', 'Segundo', 'Tercer'];
const MEDAL = ['', '#c99a12', '#8c96a3', '#b06a33'];
const SHORT = {'Matemáticas':'Mat','Ética y valores':'Ética','Lengua Castellana':'Leng','Educación Física':'E. Fís','Ciencias Sociales':'Soc','Gestión Empresarial':'Gest','Ciencias Naturales':'Nat','Educación Artística':'Art','Inglés':'Ing','Educación Religiosa':'Rel','Tecnología':'Tec','Química':'Quím','Física':'Fís','Filosofía':'Filo','Ciencias Políticas':'Pol','Ciencias Políticas y Económicas':'Pol','Ciencias Económicas':'Econ'};
const short = a => SHORT[a] || a.slice(0, 5);
const slug = s => norm(s).replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

// ---------- Preparación de datos ----------
const ALL = [];
for (const g of GR) {
  const d = RES[g.grade];
  if (!d || d.status === 'pendiente') continue;
  const maxT = Math.max(...d.students.map(s => Object.values(s.a).reduce((x, v) => x + v[1], 0)));
  for (const s of d.students) {
    s.grade = d.grade; s.gname = d.name;
    s.p = {};
    let c = 0, t = 0;
    for (const [a, [ac, at]] of Object.entries(s.a)) { s.p[a] = 100 * ac / at; c += ac; t += at; }
    s.c = c; s.t = t; s.tp = t ? 100 * c / t : null; s.full = t === maxT;
    s.key = `${d.grade}|${s.id || s.name}`;
    ALL.push(s);
  }
  // puestos (ranking de competencia: empates comparten puesto)
  const rankBy = (list, val, field) => {
    const v = list.map(val);
    list.forEach((s, i) => { s[field] = 1 + v.filter(x => x > v[i]).length; });
  };
  for (const grp of d.groups) {
    const gs = d.students.filter(s => s.grupo === grp);
    gs.forEach(s => { s.rg = null; s.ra = {}; });
    if (grp === 'Sin grupo') continue;
    rankBy(gs.filter(s => s.full), s => s.c, 'rg');
    for (const a of d.areas) {
      const has = gs.filter(s => s.a[a.name]);
      const v = has.map(s => s.a[a.name][0]);
      has.forEach((s, i) => { s.ra[a.name] = 1 + v.filter(x => x > v[i]).length; });
    }
  }
  const full = d.students.filter(s => s.full);
  rankBy(full, s => s.c, 'rgr');
}

// ---------- Estado ----------
const state = {grade: null, grupo: '', q: '', sortKey: 'name', sortDir: 1};
const firstReady = GR.find(g => RES[g.grade] && RES[g.grade].status !== 'pendiente');
function readHash() {
  if (location.hash === '#general') { state.grade = 'G'; state.grupo = ''; return; }
  const m = location.hash.match(/^#grado-(\d+)(?:-g(\d+))?$/);
  state.grade = m && GR.some(g => g.grade == m[1]) ? +m[1] : (firstReady ? firstReady.grade : GR[0].grade);
  state.grupo = m && m[2] ? `${state.grade}-${m[2]}` : '';
}
function writeHash() {
  if (state.grade === 'G') { if (location.hash !== '#general') history.replaceState(null, '', '#general'); return; }
  const h = `#grado-${state.grade}${state.grupo && /-\d+$/.test(state.grupo) ? '-g' + state.grupo.split('-')[1] : ''}`;
  if (location.hash !== h) history.replaceState(null, '', h);
}

// ---------- Tema ----------
(() => { let t = null; try { t = localStorage.getItem('theme'); } catch (e) {} if (t) document.documentElement.dataset.theme = t;
  $('#themebtn').onclick = () => { const dark = matchMedia('(prefers-color-scheme: dark)').matches; const cur = document.documentElement.dataset.theme || (dark ? 'dark' : 'light'); const nx = cur === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = nx; try { localStorage.setItem('theme', nx); } catch (e) {} }; })();
$('#instName').textContent = C.sigla;
$('#instSub').textContent = `${C.institucion} · Resultados ${C.periodo} ${C.anio}`;
document.title = `Resultados ${C.periodo} ${C.anio} · ${C.sigla}`;

// ---------- Pestañas ----------
function renderTabs() {
  $('#tabs').innerHTML = GR.map(g => {
    const d = RES[g.grade], st = !d || d.status === 'pendiente' ? 'Pendiente' : d.status === 'sesion1' ? 'Sesión 1' : `${d.students.length} estudiantes`;
    return `<button class="tab" role="tab" aria-selected="${g.grade === state.grade}" data-g="${g.grade}">${g.grade}.° ${esc(g.name)}<small>${st}</small></button>`;
  }).join('') + `<button class="tab" role="tab" aria-selected="${state.grade === 'G'}" data-g="G">Análisis general<small>6.° a 10.°</small></button>`;
  $$('#tabs .tab').forEach(b => b.onclick = () => { state.grade = b.dataset.g === 'G' ? 'G' : +b.dataset.g; state.grupo = ''; state.q = ''; writeHash(); render(); });
}

// ---------- Vista de grado ----------
const DL = '<svg viewBox="0 0 24 24"><path d="M12 3v12m0 0-4-4m4 4 4-4M4 17v3h16v-3"/></svg>';
const AWARD = '<svg viewBox="0 0 24 24"><circle cx="12" cy="9" r="6"/><path d="m8.5 14-1.5 7 5-3 5 3-1.5-7"/></svg>';
function render() {
  renderTabs();
  if (state.grade === 'G') { $('#foot').textContent = `${C.institucion} (${C.sigla}) · ${C.prueba} · ${C.periodo} ${C.anio}. Escala de 0 a 100 (porcentaje de aciertos). Actualizado: ${window.ACTUALIZADO || ''}.`; renderGeneral(); return; }
  const d = RES[state.grade];
  $('#foot').textContent = `${C.institucion} (${C.sigla}) · ${C.prueba} · ${C.periodo} ${C.anio}. Escala de 0 a 100 (porcentaje de aciertos). Actualizado: ${window.ACTUALIZADO || ''}.`;
  if (!d || d.status === 'pendiente') {
    $('#view').innerHTML = `<div class="pending"><div class="ic">⏳</div><h2>${state.grade}.° ${esc(d ? d.name : '')}: resultados en proceso</h2><p class="sub">Los resultados de este grado se publicarán cuando termine la calificación.</p></div>`;
    return;
  }
  const groups = d.groups;
  $('#view').innerHTML = `
  <div class="toolbar">
    <h1>${state.grade}.° ${esc(d.name)}</h1>
    <label class="field" for="fGrupo">Grupo <select id="fGrupo"><option value="">Todos</option>${groups.map(g => `<option ${g === state.grupo ? 'selected' : ''}>${esc(g)}</option>`).join('')}</select></label>
    <div class="menu"><button class="btn" id="bDl" type="button" aria-haspopup="true" aria-expanded="false">${DL} Descargar CSV</button>
      <div class="menu-list" id="mDl" hidden>
        <div class="lbl">Notas de todas las áreas</div>
        <button data-dl="grado">Grado completo (${d.students.length} estudiantes)</button>
        ${groups.map(g => `<button data-dl="grupo" data-g="${esc(g)}">Grupo ${esc(g)}</button>`).join('')}
        <hr><div class="lbl">Por área y grupo</div>
        <div class="dlform"><label for="dlArea">Área</label><select id="dlArea">${d.areas.map(a => `<option>${esc(a.name)}</option>`).join('')}</select>
        <label for="dlGrupo">Grupo</label><select id="dlGrupo"><option value="">Todo el grado</option>${groups.map(g => `<option ${g === state.grupo ? 'selected' : ''}>${esc(g)}</option>`).join('')}</select>
        <button class="btn pri" type="button" data-dl="area">${DL} Descargar</button></div>
      </div></div>
    <button class="btn pri" id="bRec" type="button">${AWARD} Reconocimientos</button>
  </div>
  ${d.status === 'sesion1' ? '<p class="sub">Resultados parciales: solo sesión 1.</p>' : ''}
  <div class="grid kpis" id="kpis"></div>
  <section id="s-areas"><h2>Resultados por área</h2><p class="sub" id="areasSub"></p>
    <div class="grid two"><div class="card"><h3>Promedio de aciertos</h3><div id="areaBars"></div></div>
    <div class="card"><h3>Estudiantes por nivel de desempeño</h3><div class="legend" style="margin-bottom:8px">${LV.map(l => `<span><i class="sw" style="background:${LVC[l]}"></i>${l}</span>`).join('')}</div><div id="areaLevels"></div></div></div>
    <div class="scroll" style="margin-top:12px"><table id="areaTable"></table></div></section>
  <section id="s-grupos"><h2>Comparativo por grupo</h2><p class="sub">Promedio de aciertos (%) por grupo y área.</p><div class="scroll"><table id="groupTable"></table></div></section>
  <section id="s-est"><h2>Estudiantes</h2><p class="sub">Haz clic en un estudiante para ver su detalle, descargar su CSV o imprimir su boletín y reconocimiento. Las medallas marcan los puestos 1 a 3 del grupo.</p>
    <div class="toolbar" style="padding-top:0"><input type="search" id="fq" placeholder="Filtrar por nombre o código…" aria-label="Filtrar estudiantes" value="${esc(state.q)}" style="flex:1 1 240px"></div>
    <div class="scroll" style="max-height:75vh"><table id="stTable"></table></div><p class="small muted" id="stCount"></p></section>
  <section id="s-preg"><h2>Análisis por pregunta</h2><p class="sub">Porcentaje de acierto, distribución de respuestas e índice de discriminación D de cada pregunta (todo el grado).</p><div class="legend" id="optLegend" style="margin-bottom:10px"></div><div id="itemAreas"></div></section>`;
  $('#fGrupo').onchange = e => { state.grupo = e.target.value; writeHash(); render(); };
  $('#fq').oninput = e => { state.q = e.target.value; renderStudents(d); };
  const bDl = $('#bDl'), mDl = $('#mDl');
  bDl.onclick = e => { e.stopPropagation(); mDl.hidden = !mDl.hidden; bDl.setAttribute('aria-expanded', !mDl.hidden); };
  mDl.onclick = e => { e.stopPropagation(); const b = e.target.closest('button'); if (!b) return; mDl.hidden = true;
    if (b.dataset.dl === 'grado') csvGrado(d, d.students, `Notas_${d.grade}_${slug(d.name)}_completo.csv`);
    if (b.dataset.dl === 'grupo') csvGrado(d, d.students.filter(s => s.grupo === b.dataset.g), `Notas_${b.dataset.g}.csv`);
    if (b.dataset.dl === 'area') csvArea(d, $('#dlArea').value, $('#dlGrupo').value); };
  $('#bRec').onclick = () => openRec(d);
  renderSummary(d); renderGroups(d); renderStudents(d); renderItems(d);
}
document.addEventListener('click', () => { const m = $('#mDl'); if (m && !m.hidden) { m.hidden = true; $('#bDl').setAttribute('aria-expanded', 'false'); } });

const subset = d => state.grupo ? d.students.filter(s => s.grupo === state.grupo) : d.students;

function renderSummary(d) {
  const ss = subset(d), tots = ss.map(s => s.tp);
  const am = d.areas.map(a => ({a, v: ss.filter(s => s.a[a.name]).map(s => s.p[a.name])})).map(o => ({...o, m: mean(o.v)}));
  const srt = [...am].sort((x, y) => y.m - x.m);
  const ok = ss.filter(s => level(s.tp) !== 'Bajo').length;
  $('#kpis').innerHTML = [
    [ss.length, state.grupo ? `Estudiantes del grupo ${state.grupo}` : 'Estudiantes evaluados', `${new Set(ss.map(s => s.grupo)).size} grupo(s)`],
    [fmt(mean(tots)) + ' %', 'Promedio de aciertos', `Nota promedio ${fmtN(nota(mean(tots)))}`],
    [fmt(100 * ok / ss.length, 0) + ' %', 'Básico o superior', `${ok} estudiantes con nota ≥ 60`],
    [fmt(srt[0].m, 0) + ' %', 'Área más alta', srt[0].a.name],
    [fmt(srt.at(-1).m, 0) + ' %', 'Área más baja', srt.at(-1).a.name],
  ].map(([v, l, x]) => `<div class="card kpi"><div class="v">${v}</div><div class="l">${esc(l)}</div><div class="d">${esc(x)}</div></div>`).join('');
  $('#areasSub').textContent = state.grupo ? `Grupo ${state.grupo} frente al promedio del grado.` : 'Promedio del grado y distribución de estudiantes por nivel de desempeño.';
  const gradeMean = a => mean(d.students.filter(s => s.a[a.name]).map(s => s.p[a.name]));
  const W = 540, rowH = 28, padL = Math.max(152, 12 + 6.6 * Math.max(...am.map(o => o.a.name.length))), padR = 48, H = am.length * rowH + 22, x = v => padL + (W - padL - padR) * v / 100;
  let svg = `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Promedio de aciertos por área">`;
  [0, 25, 50, 75, 100].forEach(t => svg += `<line x1="${x(t)}" x2="${x(t)}" y1="0" y2="${H - 18}" stroke="var(--line)"/><text x="${x(t)}" y="${H - 4}" text-anchor="middle">${t}</text>`);
  svg += `<line x1="${x(60)}" x2="${x(60)}" y1="0" y2="${H - 18}" stroke="var(--basico)" stroke-dasharray="3 3"/>`;
  am.forEach((o, i) => { const y = i * rowH + 6;
    svg += `<text x="${padL - 8}" y="${y + 12}" text-anchor="end" style="fill:var(--ink)">${esc(o.a.name)}</text><rect x="${x(0)}" y="${y + 2}" width="${Math.max(0, x(o.m) - x(0))}" height="14" rx="3" fill="${o.a.s === 1 ? 'var(--s1)' : 'var(--s2)'}"><title>${esc(o.a.name)}: ${fmt(o.m)} %</title></rect><text x="${x(o.m) + 5}" y="${y + 13}" style="fill:var(--ink);font-weight:700">${fmt(o.m, 0)} %</text>`;
    if (state.grupo) { const gm = gradeMean(o.a); svg += `<line x1="${x(gm)}" x2="${x(gm)}" y1="${y}" y2="${y + 18}" stroke="var(--ink)" stroke-width="2"><title>Grado: ${fmt(gm)} %</title></line>`; } });
  svg += '</svg>';
  $('#areaBars').innerHTML = svg + `<div class="legend" style="margin-top:6px"><span><i class="sw" style="background:var(--s1)"></i>Sesión 1</span>${d.sessions.includes(2) ? '<span><i class="sw" style="background:var(--s2)"></i>Sesión 2</span>' : ''}<span><i class="sw" style="border:1px dashed var(--basico)"></i>60 % (Básico)</span>${state.grupo ? '<span><i class="sw" style="background:var(--ink);width:2px"></i>Promedio del grado</span>' : ''}</div>`;
  $('#areaLevels').innerHTML = am.map(o => { const c = LV.map(l => o.v.filter(p => level(p) === l).length), n = o.v.length || 1;
    return `<div class="arow"><span>${esc(o.a.name)}</span><div class="dist" title="${LV.map((l, i) => `${l}: ${c[i]}`).join(' · ')}">${c.map((k, i) => k ? `<i style="width:${100 * k / n}%;background:${LVC[LV[i]]}"></i>` : '').join('')}</div></div>`; }).join('');
  $('#areaTable').innerHTML = `<thead><tr><th>Área</th><th class="num">Preguntas</th><th class="num">Estudiantes</th><th class="num">Nota promedio</th><th class="num">Desv.</th>${LV.map(l => `<th class="num">${l}</th>`).join('')}</tr></thead><tbody>` +
    am.map(o => `<tr><td><b>${esc(o.a.name)}</b></td><td class="num">${o.a.n}</td><td class="num">${o.v.length}</td><td>${cell(o.m)}</td><td class="num">${fmt(sd(o.v))}</td>${LV.map(l => { const k = o.v.filter(p => level(p) === l).length; return `<td class="num">${k} <span class="muted small">(${fmt(100 * k / (o.v.length || 1), 0)} %)</span></td>`; }).join('')}</tr>`).join('') + '</tbody>';
}

function renderGroups(d) {
  const row = (label, ss, bold) => `<tr${bold ? ' style="font-weight:700"' : ''}><td>${label}</td><td class="num">${ss.length}</td>${d.areas.map(a => `<td>${cell(mean(ss.filter(s => s.a[a.name]).map(s => s.p[a.name])))}</td>`).join('')}<td>${cell(mean(ss.map(s => s.tp)))}</td></tr>`;
  $('#groupTable').innerHTML = `<thead><tr><th>Grupo</th><th class="num">Est.</th>${d.areas.map(a => `<th class="num" title="${esc(a.name)}">${esc(short(a.name))}</th>`).join('')}<th class="num">Total</th></tr></thead><tbody>` +
    d.groups.map(g => row(`<b>${esc(g)}</b>`, d.students.filter(s => s.grupo === g))).join('') + row('Grado', d.students, true) + '</tbody>';
}

const medal = r => r && r <= 3 ? `<span class="medal m${r}" title="${ORD[r]} puesto del grupo">${r}</span>` : '';
function renderStudents(d) {
  const q = norm(state.q.trim());
  const cols = [['name', 'Estudiante'], ['grupo', 'Grupo'], ...d.areas.map(a => [a.name, short(a.name)]), ['tp', 'Nota final'], ['rg', 'Puesto']];
  const val = (s, k) => k === 'name' ? s.name : k === 'grupo' ? s.grupo : k === 'tp' || k === 'nota' ? s.tp : k === 'rg' ? (s.rg || 999) : (s.p[k] ?? -1);
  const rows = subset(d).filter(s => !q || norm(s.name).includes(q) || (s.id && s.id.includes(q)));
  rows.sort((a, b) => { const x = val(a, state.sortKey), y = val(b, state.sortKey); return (typeof x === 'string' ? x.localeCompare(y, 'es') : x - y) * state.sortDir; });
  $('#stTable').innerHTML = `<thead><tr>${cols.map(([k, l]) => `<th class="sort ${k === state.sortKey ? (state.sortDir > 0 ? 'asc' : 'desc') : ''} ${k === 'name' || k === 'grupo' ? '' : 'num'}" data-k="${esc(k)}" title="${esc(k)}">${esc(l)}</th>`).join('')}</tr></thead><tbody>` +
    rows.map(s => `<tr class="st" data-k="${esc(s.key)}" tabindex="0"><td><b>${esc(s.name)}</b>${medal(s.rg)}</td><td>${esc(s.grupo)}</td>${d.areas.map(a => `<td>${cell(s.p[a.name])}</td>`).join('')}<td>${cell(s.tp)}</td><td class="num">${s.rg || '—'}</td></tr>`).join('') + '</tbody>';
  $('#stCount').textContent = `${rows.length} de ${subset(d).length} estudiantes.`;
  $$('#stTable th.sort').forEach(th => th.onclick = () => { const k = th.dataset.k; if (k === state.sortKey) state.sortDir *= -1; else { state.sortKey = k; state.sortDir = k === 'name' || k === 'grupo' || k === 'rg' ? 1 : -1; } renderStudents(d); });
  $$('#stTable tr.st').forEach(tr => { tr.onclick = () => openStudent(tr.dataset.k); tr.onkeydown = e => { if (e.key === 'Enter') openStudent(tr.dataset.k); }; });
}

const OPTS = ['A','B','C','D','E','F','G','H','Múltiple','Blanco'];
const OPC = {A:'#4e79a7',B:'#f28e2b',C:'#59a14f',D:'#b07aa1',E:'#76b7b2',F:'#edc948',G:'#9c755f',H:'#bab0ac','Múltiple':'#e15759','Blanco':'var(--line)'};
function renderItems(d) {
  $('#optLegend').innerHTML = OPTS.map(o => `<span><i class="sw" style="background:${OPC[o]}"></i>${o}</span>`).join('') + '<span>· el borde oscuro marca la clave</span>';
  $('#itemAreas').innerHTML = d.areas.map(a => {
    const its = d.items.filter(i => i.area === a.name), m = mean(d.students.filter(s => s.a[a.name]).map(s => s.p[a.name]));
    const hard = [...its].sort((x, y) => x.pc - y.pc).slice(0, 3).map(i => `${i.n} (${fmt(i.pc, 0)} %)`).join(', ');
    return `<details class="area"><summary><div><b>${esc(a.name)}</b> <span class="small muted">· Sesión ${a.s} · ${its.length} preguntas · más difíciles: ${hard}</span></div>${cell(m)}</summary>
    <div class="scroll"><table><thead><tr><th>N.º</th><th>Clave</th><th>% acierto</th><th class="num">D</th><th>Distribución de respuestas</th><th>Competencia</th></tr></thead><tbody>${its.map(i => {
      const tot = Object.values(i.dist).reduce((x, y) => x + y, 0);
      return `<tr><td>${i.n}</td><td><b>${esc(i.key)}</b></td><td>${cell(i.pc)}</td><td class="num">${fmt(i.D, 2)}</td><td><div class="dist">${OPTS.filter(k => i.dist[k]).map(k => `<i title="${k}: ${i.dist[k]}" style="width:${100 * i.dist[k] / tot}%;background:${OPC[k]};${k === i.key ? 'box-shadow:inset 0 0 0 2px var(--ink)' : ''}"></i>`).join('')}</div></td><td class="small">${esc(i.comp)}</td></tr>`; }).join('')}</tbody></table></div></details>`; }).join('');
}

// ---------- Estudiante ----------
const byKey = k => ALL.find(s => s.key === k);
function recsOf(s, d) {
  const r = [];
  if (s.rg && s.rg <= 3) r.push({s, tipo: 'general', puesto: s.rg});
  for (const a of d.areas) if (s.ra && s.ra[a.name] <= 3 && s.a[a.name] && s.a[a.name][0] > 0) r.push({s, tipo: 'area', area: a.name, puesto: s.ra[a.name]});
  return r;
}
function openStudent(k) {
  const s = byKey(k); if (!s) return; const d = RES[s.grade];
  $('#dsMeta').textContent = `${s.grade}.° ${s.gname} · Grupo ${s.grupo}${s.id ? ' · Código ' + s.id : ''}`;
  $('#dsName').textContent = s.name;
  $('#dsTot').innerHTML = `Total ${s.c} de ${s.t} aciertos · ${fmt(s.tp)} % · nota ${fmtN(nota(s.tp))} · <span class="pill lv-${level(s.tp)}">${level(s.tp)}</span>${s.rg ? ` · puesto ${s.rg} en el grupo` : ''}${s.rgr ? ` · ${s.rgr} en el grado` : ''}`;
  const rows = d.areas.map(a => { const r = s.a[a.name], gm = mean(d.students.filter(x => x.a[a.name]).map(x => x.p[a.name]));
    if (!r) return `<div class="srow"><span>${esc(a.name)}</span><span class="small muted">No presentó la sesión ${a.s}</span><span></span></div>`;
    if (s.anul && s.anul.includes(a.s)) return `<div class="srow"><span>${esc(a.name)}</span><span class="small muted">Sesión ${a.s} anulada</span><span class="small">nota 0</span></div>`;
    const p = s.p[a.name];
    return `<div class="srow"><span>${esc(a.name)}${medal(s.ra[a.name])}</span><div class="bar" title="Promedio del grado: ${fmt(gm, 0)} %"><i style="width:${p}%;background:${LVC[level(p)]}"></i><u style="left:${gm}%"></u></div><span class="small"><b>${r[0]}/${r[1]}</b> · nota ${fmtN(nota(p))}</span></div>`; }).join('');
  const recs = recsOf(s, d);
  $('#dsBody').innerHTML = `<p class="small muted" style="margin-top:0">La raya vertical marca el promedio del grado.</p>${rows}${recs.length ? `<p class="small" style="margin-bottom:0"><b>Reconocimientos:</b> ${recs.map(r => `${ORD[r.puesto]} puesto ${r.tipo === 'general' ? 'general' : 'en ' + esc(r.area)}`).join(' · ')}</p>` : ''}`;
  $('#dsFoot').innerHTML = `${recs.length ? `<input type="text" id="sDocente" placeholder="Docente que firma el reconocimiento" aria-label="Docente que firma el reconocimiento" style="flex:1 1 220px;min-width:0">` : ''}<button class="btn" id="sCsv" type="button">${DL} CSV del estudiante</button><button class="btn" id="sBol" type="button">Imprimir boletín</button>${recs.length ? `<button class="btn pri" id="sRec" type="button">${AWARD} Imprimir reconocimiento${recs.length > 1 ? 's (' + recs.length + ')' : ''}</button>` : ''}`;
  $('#sCsv').onclick = () => csvStudent(s, d);
  $('#sBol').onclick = () => printDocs(boletin(s, d));
  if (recs.length) { $('#sDocente').value = docName; $('#sDocente').oninput = e => setDocente(e.target.value); $('#sRec').onclick = () => printDocs(recs.map(certificate).join('')); }
  const dlg = $('#dStudent'); if (!dlg.open) dlg.showModal();
}

// ---------- CSV ----------
const n1 = x => x == null ? '' : fmt(x, 1);
function download(name, rows) {
  const txt = '﻿' + rows.map(r => r.map(v => { const s = String(v ?? ''); return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([txt], {type: 'text/csv;charset=utf-8'}));
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000); toast(`Descargado: ${name}`);
}
const sortGN = (a, b) => a.grupo.localeCompare(b.grupo) || a.name.localeCompare(b.name, 'es');
function csvGrado(d, list, name) {
  const head = ['Grado', 'Grupo', 'Código', 'Apellidos', 'Nombres', ...d.areas.map(a => a.name), 'Aciertos', 'Preguntas', '% aciertos', 'Nota final', 'Nivel', 'Puesto en el grupo'];
  download(name, [head, ...[...list].sort(sortGN).map(s => [d.grade, s.grupo, s.id, s.last, s.first, ...d.areas.map(a => s.a[a.name] ? fmtN(nota(s.p[a.name])) : ''), s.c, s.t, n1(s.tp), fmtN(nota(s.tp)), level(s.tp), s.rg || ''])]);
}
function csvArea(d, area, grupo) {
  const list = d.students.filter(s => s.a[area] && (!grupo || s.grupo === grupo)).sort(sortGN);
  download(`Notas_${grupo ? slug(grupo) : d.grade}_${slug(area)}.csv`, [['Grado', 'Grupo', 'Código', 'Apellidos', 'Nombres', 'Área', 'Aciertos', 'Preguntas', '% aciertos', 'Nota', 'Nivel', 'Puesto en el grupo'],
    ...list.map(s => [d.grade, s.grupo, s.id, s.last, s.first, area, s.a[area][0], s.a[area][1], n1(s.p[area]), fmtN(nota(s.p[area])), level(s.p[area]), s.ra[area]])]);
}
function csvStudent(s, d) {
  download(`Notas_${slug(s.name)}.csv`, [['Grado', 'Grupo', 'Código', 'Apellidos', 'Nombres', 'Área', 'Aciertos', 'Preguntas', '% aciertos', 'Nota', 'Nivel', 'Puesto en el grupo'],
    ...d.areas.filter(a => s.a[a.name]).map(a => [d.grade, s.grupo, s.id, s.last, s.first, a.name, s.a[a.name][0], s.a[a.name][1], n1(s.p[a.name]), fmtN(nota(s.p[a.name])), level(s.p[a.name]), s.ra[a.name]]),
    [d.grade, s.grupo, s.id, s.last, s.first, 'TOTAL', s.c, s.t, n1(s.tp), fmtN(nota(s.tp)), level(s.tp), s.rg || '']]);
}

// ---------- Docente que firma ----------
let docName = ''; try { docName = localStorage.getItem('docente') || ''; } catch (e) {}
const docente = () => docName.trim();
function setDocente(v) { docName = v; try { localStorage.setItem('docente', v); } catch (e) {} }

// ---------- Impresión ----------
function printDocs(html) {
  $('#print').innerHTML = html; document.body.classList.add('printing');
  const imgs = $$('#print img'); Promise.all(imgs.map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; }))).then(() => (document.fonts ? document.fonts.ready : Promise.resolve())).then(() => setTimeout(() => window.print(), 60));
}
addEventListener('afterprint', () => { document.body.classList.remove('printing'); $('#print').innerHTML = ''; });
function certificate(r) {
  const s = r.s, gp = r.tipo === 'general' ? s.tp : s.p[r.area];
  const motivo = r.tipo === 'general'
    ? `por ocupar el <b>${ORD[r.puesto].toLowerCase()} puesto</b> del grupo <b>${esc(s.grupo)}</b> en el resultado general de la ${esc(C.prueba.split('·')[0].trim().toLowerCase())} del ${esc(C.periodo)} ${C.anio}, con ${s.c} de ${s.t} respuestas correctas (${fmt(gp)} %).`
    : `por ocupar el <b>${ORD[r.puesto].toLowerCase()} puesto</b> del grupo <b>${esc(s.grupo)}</b> en el área de <b>${esc(r.area)}</b> en la ${esc(C.prueba.split('·')[0].trim().toLowerCase())} del ${esc(C.periodo)} ${C.anio}, con ${s.a[r.area][0]} de ${s.a[r.area][1]} respuestas correctas.`;
  return `<div class="cert"><div class="cert-in">${C.escudo ? `<img class="escudo" src="${esc(C.escudo)}" alt="">` : ''}<div class="medalla" style="background:${MEDAL[r.puesto]}">${r.puesto}.°</div>
    <div class="inst">${esc(C.institucion)}</div><div class="sigla">${esc(C.sigla)}</div><div class="lema">${esc(C.lema)}</div>
    <div class="ttl">RECONOCIMIENTO</div><div class="rib">${ORD[r.puesto]} puesto · ${r.tipo === 'general' ? 'Resultado general' : esc(r.area)}</div>
    <div class="otorga">Se otorga a</div><div class="nom">${esc(s.first)} ${esc(s.last)}</div>
    <div class="txt">del grado ${s.grade}.°, ${motivo}</div>
    <div class="firmas"><div>${docente() ? `<b>${esc(docente())}</b>` : ''}${esc(C.firmaCertificado || 'Docente')}</div></div>
    <div class="fecha" style="margin-top:8mm">${esc(C.fechaReconocimiento)}</div></div></div>`;
}
function boletin(s, d) {
  return `<div class="bol"><div class="bh"><div><b>${esc(C.sigla)}</b><div style="font-size:9.5pt;color:#333">${esc(C.institucion)}</div><div style="font-size:9.5pt;color:#555;font-style:italic">${esc(C.lema)}</div></div><div style="text-align:right;font-size:10pt;color:#444">${esc(C.prueba)}<br>${esc(C.periodo)} ${C.anio}</div></div>
  <h1>${esc(s.first)} ${esc(s.last)}</h1><div class="meta"><span>Grado ${s.grade}.° · Grupo ${esc(s.grupo)}</span>${s.id ? `<span>Código ${esc(s.id)}</span>` : ''}${s.rg ? `<span>Puesto en el grupo: ${s.rg}</span>` : ''}</div>
  <table><thead><tr><th>Área</th><th style="text-align:right">Aciertos</th><th style="text-align:right">% aciertos</th><th style="text-align:right">Promedio del grado</th><th style="text-align:right">Nota</th><th>Nivel</th></tr></thead><tbody>
  ${d.areas.map(a => { const r = s.a[a.name], gm = mean(d.students.filter(x => x.a[a.name]).map(x => x.p[a.name]));
    if (r && s.anul && s.anul.includes(a.s)) return `<tr><td>${esc(a.name)}</td><td colspan="3" style="color:#777">Sesión ${a.s} anulada</td><td style="text-align:right"><b>0</b></td><td>Bajo</td></tr>`;
    return r ? `<tr><td>${esc(a.name)}</td><td style="text-align:right">${r[0]} / ${r[1]}</td><td style="text-align:right">${fmt(s.p[a.name])} %</td><td style="text-align:right">${fmt(gm)} %</td><td style="text-align:right"><b>${fmtN(nota(s.p[a.name]))}</b></td><td>${level(s.p[a.name])}</td></tr>` : `<tr><td>${esc(a.name)}</td><td colspan="5" style="color:#777">No presentó la sesión ${a.s}</td></tr>`; }).join('')}
  <tr class="tot"><td>Total</td><td style="text-align:right">${s.c} / ${s.t}</td><td style="text-align:right">${fmt(s.tp)} %</td><td style="text-align:right">${fmt(mean(d.students.map(x => x.tp)))} %</td><td style="text-align:right">${fmtN(nota(s.tp))}</td><td>${level(s.tp)}</td></tr></tbody></table>
  <p class="nota">Escala de 0 a 100 (porcentaje de aciertos). Niveles: Bajo 0–59 · Básico 60–79 · Alto 80–89 · Superior 90–100.</p>
  <div style="display:flex;gap:30mm;margin-top:28mm;font-size:10pt">${C.firmas.map(f => `<div style="border-top:0.3mm solid #333;padding-top:2mm;width:60mm">${esc(f)}</div>`).join('')}</div></div>`;
}

// ---------- Reconocimientos ----------
function openRec(d) {
  $('#rGrupo').innerHTML = `<option value="">Todos los grupos</option>${d.groups.filter(g => g !== 'Sin grupo').map(g => `<option ${g === state.grupo ? 'selected' : ''}>${esc(g)}</option>`).join('')}`;
  $('#rAreaSel').innerHTML = `<option value="">Todas las áreas</option>${d.areas.map(a => `<option>${esc(a.name)}</option>`).join('')}`;
  const collect = () => {
    const g = $('#rGrupo').value, area = $('#rAreaSel').value, list = [];
    $('#rAreaSel').disabled = !$('#rArea').checked;
    for (const grp of d.groups.filter(x => x !== 'Sin grupo' && (!g || x === g))) {
      const gs = d.students.filter(s => s.grupo === grp);
      if ($('#rGen').checked) gs.filter(s => s.rg && s.rg <= 3).sort((a, b) => a.rg - b.rg).forEach(s => list.push({s, tipo: 'general', puesto: s.rg}));
      if ($('#rArea').checked) for (const a of d.areas.filter(a => !area || a.name === area))
        gs.filter(s => s.ra[a.name] <= 3 && s.a[a.name] && s.a[a.name][0] > 0).sort((x, y) => x.ra[a.name] - y.ra[a.name]).forEach(s => list.push({s, tipo: 'area', area: a.name, puesto: s.ra[a.name]}));
    }
    $('#rList').innerHTML = list.length ? list.map(r => `<div><span><span class="medal m${r.puesto}" style="margin:0 6px 0 0">${r.puesto}</span>${esc(r.s.name)}</span><span class="muted">${esc(r.s.grupo)} · ${r.tipo === 'general' ? 'General' : esc(r.area)}</span></div>`).join('') : '<div class="muted">Elige al menos un tipo de reconocimiento.</div>';
    $('#rCount').textContent = `${list.length} reconocimiento${list.length === 1 ? '' : 's'}`;
    $('#rPrint').disabled = !list.length;
    return list;
  };
  ['#rGrupo', '#rGen', '#rArea', '#rAreaSel'].forEach(id => $(id).onchange = collect);
  $('#rDocente').value = docName; $('#rDocente').oninput = e => setDocente(e.target.value);
  collect();
  $('#rPrint').onclick = () => { const l = collect(); $('#dRec').close(); printDocs(l.map(certificate).join('')); };
  $('#dRec').showModal();
}

// ---------- Búsqueda global ----------
const gq = $('#gq'), gres = $('#gres'); let hits = [], sel = 0;
function search() {
  const q = norm(gq.value.trim());
  if (!q) { gres.hidden = true; return; }
  const terms = q.split(/\s+/);
  hits = ALL.filter(s => { const n = norm(s.name) + ' ' + (s.id || ''); return terms.every(t => n.includes(t)); }).slice(0, 30);
  sel = 0;
  gres.innerHTML = hits.length ? hits.map((s, i) => `<button type="button" data-k="${esc(s.key)}" class="${i === sel ? 'on' : ''}"><b>${esc(s.name)}</b><small>${s.grade}.° · Grupo ${esc(s.grupo)}${s.id ? ' · ' + esc(s.id) : ''}</small><span class="r-p">${cell(s.tp)}</span></button>`).join('') : '<div class="empty">Sin resultados.</div>';
  gres.hidden = false;
}
function pick(k) {
  const s = byKey(k); if (!s) return;
  gres.hidden = true; gq.value = '';
  if (state.grade !== s.grade) { state.grade = s.grade; state.grupo = ''; state.q = ''; writeHash(); render(); }
  openStudent(k);
}
gq.oninput = search;
gq.onkeydown = e => {
  const bs = $$('button', gres);
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (!bs.length) return; sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + bs.length) % bs.length; bs.forEach((b, i) => b.classList.toggle('on', i === sel)); bs[sel].scrollIntoView({block: 'nearest'}); }
  if (e.key === 'Enter' && bs[sel]) pick(bs[sel].dataset.k);
  if (e.key === 'Escape') { gres.hidden = true; gq.blur(); }
};
gres.onclick = e => { const b = e.target.closest('button'); if (b) pick(b.dataset.k); };
gq.onfocus = () => { if (gq.value) search(); };
document.addEventListener('click', e => { if (!e.target.closest('.gsearch')) gres.hidden = true; });
document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); gq.focus(); gq.select(); } });

// ---------- Utilidades ----------
$$('dialog').forEach(dl => { dl.addEventListener('click', e => { if (e.target === dl || e.target.closest('[data-close]')) dl.close(); }); });
let tt; function toast(m) { let t = $('.toast'); if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); } t.textContent = m; t.hidden = false; clearTimeout(tt); tt = setTimeout(() => t.hidden = true, 2600); }

// ---------- Análisis general ----------
function hbars(rows, label) {
  const W = 540, rowH = 30, padL = Math.max(110, 12 + 6.6 * Math.max(...rows.map(r => r.label.length))), padR = 48, H = rows.length * rowH + 22, x = v => padL + (W - padL - padR) * v / 100;
  let s = `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${esc(label)}">`;
  [0, 25, 50, 75, 100].forEach(t => s += `<line x1="${x(t)}" x2="${x(t)}" y1="0" y2="${H - 18}" stroke="var(--line)"/><text x="${x(t)}" y="${H - 4}" text-anchor="middle">${t}</text>`);
  s += `<line x1="${x(60)}" x2="${x(60)}" y1="0" y2="${H - 18}" stroke="var(--basico)" stroke-dasharray="3 3"/>`;
  rows.forEach((r, i) => { const y = i * rowH + 6;
    s += `<text x="${padL - 8}" y="${y + 13}" text-anchor="end" style="fill:var(--ink)">${esc(r.label)}</text><rect x="${x(0)}" y="${y + 2}" width="${Math.max(0, x(r.v) - x(0))}" height="16" rx="3" fill="${r.color || 'var(--s1)'}"><title>${esc(r.label)}: ${fmt(r.v)} %</title></rect><text x="${x(r.v) + 5}" y="${y + 14}" style="fill:var(--ink);font-weight:700">${fmt(r.v, 0)} %</text>`; });
  return s + '</svg>';
}
function renderGeneral() {
  const ds = GR.map(g => RES[g.grade]).filter(d => d && d.status !== 'pendiente');
  const all = ds.flatMap(d => d.students);
  const am = (list, a) => mean(list.filter(s => s.a[a]).map(s => s.p[a]));
  const gmean = d => mean(d.students.map(s => s.tp));
  const okp = list => 100 * list.filter(s => level(s.tp) !== 'Bajo').length / list.length;
  const byG = [...ds].sort((a, b) => gmean(b) - gmean(a));
  const areas = []; ds.forEach(d => d.areas.forEach(a => { if (!areas.includes(a.name)) areas.push(a.name); }));
  const areaAll = areas.map(a => ({a, m: am(all, a), n: ds.filter(d => d.areas.some(x => x.name === a)).length})).sort((x, y) => y.m - x.m);
  const groups = ds.flatMap(d => d.groups.filter(g => g !== 'Sin grupo').map(g => { const ss = d.students.filter(s => s.grupo === g);
    const ar = d.areas.map(a => ({a: a.name, m: am(ss, a.name)})).sort((x, y) => y.m - x.m);
    return {d, g, ss, m: mean(ss.map(s => s.tp)), ok: okp(ss), best: ar[0], worst: ar.at(-1)}; })).sort((a, b) => b.m - a.m);
  $('#view').innerHTML = `
  <div class="toolbar"><h1>Análisis general · 6.° a 10.°</h1>
    <button class="btn" id="bDlAll" type="button">${DL} CSV consolidado</button></div>
  <div class="grid kpis">${[
    [all.length, 'Estudiantes evaluados', `${ds.length} grados · ${groups.length} grupos`],
    [fmt(mean(all.map(s => s.tp))) + ' %', 'Promedio institucional', `Nota promedio ${fmtN(nota(mean(all.map(s => s.tp))))}`],
    [fmt(okp(all), 0) + ' %', 'Básico o superior', `${all.filter(s => level(s.tp) !== 'Bajo').length} estudiantes con nota ≥ 60`],
    [`${byG[0].grade}.°`, 'Grado con mejor promedio', `${byG[0].name} · ${fmt(gmean(byG[0]), 0)} %`],
    [`${byG.at(-1).grade}.°`, 'Grado con menor promedio', `${byG.at(-1).name} · ${fmt(gmean(byG.at(-1)), 0)} %`],
  ].map(([v, l, x]) => `<div class="card kpi"><div class="v">${v}</div><div class="l">${esc(l)}</div><div class="d">${esc(x)}</div></div>`).join('')}</div>

  <section><h2>Resultados por grado</h2><p class="sub">Promedio de aciertos de cada grado y distribución de sus estudiantes por nivel de desempeño.</p>
    <div class="grid two"><div class="card"><h3>Promedio por grado</h3>${hbars(ds.map(d => ({label: `${d.grade}.° ${d.name}`, v: gmean(d)})), 'Promedio por grado')}</div>
    <div class="card"><h3>Niveles de desempeño por grado</h3><div class="legend" style="margin-bottom:8px">${LV.map(l => `<span><i class="sw" style="background:${LVC[l]}"></i>${l}</span>`).join('')}</div>
    ${ds.map(d => { const c = LV.map(l => d.students.filter(s => level(s.tp) === l).length), n = d.students.length;
      return `<div class="arow"><span>${d.grade}.° ${esc(d.name)}</span><div class="dist" title="${LV.map((l, i) => `${l}: ${c[i]}`).join(' · ')}">${c.map((k, i) => k ? `<i style="width:${100 * k / n}%;background:${LVC[LV[i]]}"></i>` : '').join('')}</div></div>`; }).join('')}
    <div class="scroll" style="margin-top:12px"><table><thead><tr><th>Grado</th><th class="num">Est.</th>${LV.map(l => `<th class="num">${l}</th>`).join('')}</tr></thead><tbody>${ds.map(d => `<tr><td>${d.grade}.°</td><td class="num">${d.students.length}</td>${LV.map(l => { const k = d.students.filter(s => level(s.tp) === l).length; return `<td class="num">${k} <span class="muted small">(${fmt(100 * k / d.students.length, 0)} %)</span></td>`; }).join('')}</tr>`).join('')}</tbody></table></div></div></div></section>

  <section><h2>Áreas en todos los grados</h2><p class="sub">Promedio de aciertos (%) por área y grado. La última columna es el promedio institucional del área.</p>
    <div class="scroll"><table><thead><tr><th>Área</th>${ds.map(d => `<th class="num">${d.grade}.°</th>`).join('')}<th class="num">Institución</th></tr></thead><tbody>
    ${areas.map(a => `<tr><td><b>${esc(a)}</b></td>${ds.map(d => `<td>${cell(d.areas.some(x => x.name === a) ? am(d.students, a) : null)}</td>`).join('')}<td>${cell(am(all, a))}</td></tr>`).join('')}
    <tr style="font-weight:700"><td>Total</td>${ds.map(d => `<td>${cell(gmean(d))}</td>`).join('')}<td>${cell(mean(all.map(s => s.tp)))}</td></tr></tbody></table></div>
    <div class="grid two" style="margin-top:12px">
      <div class="card"><h3>Áreas con mejor desempeño</h3>${hbars(areaAll.slice(0, 5).map(o => ({label: o.a, v: o.m, color: 'var(--alto)'})), 'Áreas con mejor desempeño')}</div>
      <div class="card"><h3>Áreas por fortalecer</h3>${hbars(areaAll.slice(-5).reverse().map(o => ({label: o.a, v: o.m, color: 'var(--bajo)'})), 'Áreas por fortalecer')}</div></div></section>

  <section><h2>Fortalezas y retos por grado</h2><p class="sub">Área con el promedio más alto y más bajo en cada grado.</p>
    <div class="scroll"><table><thead><tr><th>Grado</th><th>Promedio</th><th>Área más alta</th><th class="num">%</th><th>Área más baja</th><th class="num">%</th><th class="num">Áreas en Bajo (&lt; 60)</th></tr></thead><tbody>
    ${ds.map(d => { const ar = d.areas.map(a => ({a: a.name, m: am(d.students, a.name)})).sort((x, y) => y.m - x.m);
      return `<tr><td><b>${d.grade}.° ${esc(d.name)}</b></td><td>${cell(gmean(d))}</td><td>${esc(ar[0].a)}</td><td>${cell(ar[0].m)}</td><td>${esc(ar.at(-1).a)}</td><td>${cell(ar.at(-1).m)}</td><td class="num">${ar.filter(x => x.m < 60).length} de ${ar.length}</td></tr>`; }).join('')}</tbody></table></div></section>

  <section><h2>Comparativo de grupos</h2><p class="sub">Todos los grupos de 6.° a 10.° ordenados por promedio de aciertos. Haz clic en un grupo para ver su detalle.</p>
    <div class="scroll" style="max-height:70vh"><table><thead><tr><th class="num">#</th><th>Grupo</th><th class="num">Est.</th><th>Promedio</th><th class="num">Básico o superior</th><th>Área más alta</th><th>Área más baja</th></tr></thead><tbody>
    ${groups.map((o, i) => `<tr class="st" data-gg="${o.d.grade}|${esc(o.g)}" tabindex="0"><td class="num muted">${i + 1}</td><td><b>${esc(o.g)}</b></td><td class="num">${o.ss.length}</td><td>${cell(o.m)}</td><td class="num">${fmt(o.ok, 0)} %</td><td class="small">${esc(o.best.a)} (${fmt(o.best.m, 0)})</td><td class="small">${esc(o.worst.a)} (${fmt(o.worst.m, 0)})</td></tr>`).join('')}</tbody></table></div></section>

  <section><h2>Mejores resultados por grado</h2><p class="sub">Los tres puntajes totales más altos de cada grado (entre quienes presentaron las dos sesiones).</p>
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr))">${ds.map(d => `<div class="card"><h3>${d.grade}.° ${esc(d.name)}</h3>${d.students.filter(s => s.rgr && s.rgr <= 3).sort((a, b) => a.rgr - b.rgr).map(s => `<button type="button" class="top3" data-k="${esc(s.key)}"><span class="medal m${s.rgr}" style="margin:0">${s.rgr}</span><span><b>${esc(s.name)}</b><small>${esc(s.grupo)}</small></span>${cell(s.tp)}</button>`).join('')}</div>`).join('')}</div></section>`;
  $('#bDlAll').onclick = () => {
    const head = ['Grado', 'Grupo', 'Código', 'Apellidos', 'Nombres', ...areas, 'Aciertos', 'Preguntas', '% aciertos', 'Nota final', 'Nivel', 'Puesto en el grupo', 'Puesto en el grado'];
    download('Notas_consolidado_6_a_10.csv', [head, ...ds.flatMap(d => [...d.students].sort(sortGN).map(s => [d.grade, s.grupo, s.id, s.last, s.first, ...areas.map(a => s.a[a] ? fmtN(nota(s.p[a])) : ''), s.c, s.t, n1(s.tp), fmtN(nota(s.tp)), level(s.tp), s.rg || '', s.rgr || '']))]);
  };
  $$('tr[data-gg]').forEach(tr => { const go = () => { const [g, grp] = tr.dataset.gg.split('|'); state.grade = +g; state.grupo = grp; state.q = ''; writeHash(); render(); scrollTo(0, 0); }; tr.onclick = go; tr.onkeydown = e => { if (e.key === 'Enter') go(); }; });
  $$('.top3').forEach(b => b.onclick = () => openStudent(b.dataset.k));
}

window.APP = {certificate, boletin, recsOf, ALL, RES};
readHash(); render();
addEventListener('hashchange', () => { readHash(); render(); });
})();
