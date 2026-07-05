/* ==========================================================================
   ReconQL — render.js
   All DOM rendering plus the state-mutating actions each feature needs.
   Reads/writes the globals `state` and `persist` declared in app.js.
   ========================================================================== */

/* ---------- Toast notifications ---------- */
function showToast(msg, msOrType, maybeType){
  // supports showToast(msg), showToast(msg, ms), showToast(msg, ms, type), showToast(msg, type)
  let ms = 2600, type = 'default';
  if(typeof msOrType === 'string'){ type = msOrType; }
  else if(typeof msOrType === 'number'){ ms = msOrType; if(typeof maybeType === 'string') type = maybeType; }
  const wrap = document.getElementById('toastContainer');
  const el = document.createElement('div');
  el.className = 'toast' + (type !== 'default' ? ` ${type}` : '');
  el.textContent = msg;
  wrap.appendChild(el);
  requestAnimationFrame(()=> el.classList.add('show'));
  setTimeout(()=>{
    el.classList.remove('show');
    setTimeout(()=> el.remove(), 250);
  }, ms);
}

/* ---------- Copy / open with feedback + history logging ---------- */
function copyWithFeedback(str, btn){
  copyTextToClipboard(str).then(()=>{
    const original = btn.textContent;
    btn.textContent = 'Copied';
    btn.classList.add('copied');
    setTimeout(()=>{ btn.textContent = original; btn.classList.remove('copied'); }, 1100);
  }).catch(()=>{
    showToast('Copy failed — select and copy manually.');
  });
}

function addHistory(entry){
  persist.history.unshift({
    id: uid(),
    ts: Date.now(),
    engine: entry.engine,
    target: entry.target,
    query: entry.query,
    label: entry.label || '',
    catId: entry.catId || '',
  });
  if(persist.history.length > 50) persist.history.length = 50;
  savePersist(persist);
}

function openQuery(query, label, catId){
  const targets = currentTargets();
  const url = engineUrl(state.engine, query, state.dateFilter, state.customFrom, state.customTo);
  window.open(url, '_blank', 'noopener');
  addHistory({ engine: state.engine, target: targets.join(', '), query, label, catId });
  if(state.activeCat === 'history') renderPanel();
  renderStats();
}

/* ---------- Favorites ---------- */
function favoriteKey(fav){
  return fav.type === 'preset' ? `preset:${fav.catId}:${fav.dorkIndex}` : `custom:${fav.id}`;
}
function isFavorited(catId, dorkIndex){
  return persist.favorites.some(f => f.type === 'preset' && f.catId === catId && f.dorkIndex === dorkIndex);
}
function toggleFavorite(catId, dorkIndex, label){
  const idx = persist.favorites.findIndex(f => f.type === 'preset' && f.catId === catId && f.dorkIndex === dorkIndex);
  if(idx > -1){
    persist.favorites.splice(idx, 1);
    showToast('Removed from favorites.');
  } else {
    persist.favorites.push({ id: uid(), type:'preset', catId, dorkIndex, label });
    showToast('Added to favorites.');
  }
  savePersist(persist);
  renderPanel();
  if(state.activeCat === 'favorites') renderPanel();
  renderStats();
}
function addCustomFavorite(query, label){
  persist.favorites.push({ id: uid(), type:'custom', label: label || 'Custom query', query });
  savePersist(persist);
  showToast('Added to favorites.');
  renderStats();
  if(state.activeCat === 'favorites') renderPanel();
}
function removeFavorite(id){
  persist.favorites = persist.favorites.filter(f => f.id !== id);
  savePersist(persist);
  renderPanel();
  renderStats();
}

/* ---------- Domain input ---------- */
function parseDomains(raw){
  return [...new Set(raw.split(/[\n,]/).map(s=>s.trim()).filter(Boolean))];
}

function renderDomainChips(){
  const wrap = document.getElementById('domainChips');
  wrap.innerHTML = '';
  state.domains.forEach(d=>{
    const chip = document.createElement('span');
    chip.className = 'domain-chip';
    const label = document.createElement('span');
    label.textContent = d;
    const rm = document.createElement('button');
    rm.type = 'button';
    rm.textContent = '×';
    rm.setAttribute('aria-label', `Remove ${d}`);
    rm.addEventListener('click', ()=>{
      state.domains = state.domains.filter(x=>x!==d);
      if(state.viewDomain === d) state.viewDomain = 'all';
      document.getElementById('domainInput').value = state.domains.join('\n');
      renderAll();
    });
    chip.appendChild(label);
    chip.appendChild(rm);
    wrap.appendChild(chip);
  });
}

function renderViewToggle(){
  const wrap = document.getElementById('viewToggle');
  wrap.innerHTML = '';
  if(state.domains.length <= 1) return;
  const allBtn = document.createElement('button');
  allBtn.className = 'view-btn' + (state.viewDomain==='all' ? ' active' : '');
  allBtn.textContent = `All (${state.domains.length} combined)`;
  allBtn.addEventListener('click', ()=>{ state.viewDomain='all'; renderAll(); });
  wrap.appendChild(allBtn);
  state.domains.forEach(d=>{
    const b = document.createElement('button');
    b.className = 'view-btn' + (state.viewDomain===d ? ' active' : '');
    b.textContent = d;
    b.addEventListener('click', ()=>{ state.viewDomain=d; renderAll(); });
    wrap.appendChild(b);
  });
}

/* ---------- Recent targets ---------- */
function addRecentTarget(d){
  if(!d) return;
  persist.recentTargets = [d, ...persist.recentTargets.filter(x=>x!==d)].slice(0, 8);
  savePersist(persist);
}

function renderRecentTargets(){
  const wrap = document.getElementById('recentTargets');
  const list = persist.recentTargets.filter(d=>!state.domains.includes(d));
  if(!list.length){ wrap.innerHTML = ''; return; }
  wrap.innerHTML = '<span class="recent-label">Recent:</span>';
  list.forEach(d=>{
    const chip = document.createElement('button');
    chip.className = 'recent-chip';
    chip.type = 'button';
    chip.textContent = d;
    chip.addEventListener('click', ()=>{
      state.domains = [...new Set([...state.domains, d])];
      document.getElementById('domainInput').value = state.domains.join('\n');
      renderAll();
    });
    wrap.appendChild(chip);
  });
}

/* ---------- Stats ---------- */
function totalQueryCount(){
  return CATEGORIES.reduce((sum,c)=>sum+c.dorks.length, 0);
}
function workflowPercent(){
  return Math.round((persist.workflow.completed.length / WORKFLOW_STEPS.length) * 100) || 0;
}
function renderStats(){
  const targets = currentTargets();
  const el = document.getElementById('statsRow');
  const totalCats = allCategories().length;
  el.innerHTML = `
    <span class="stats-sentence">${totalQueryCount()} dorks across ${totalCats} categories</span>
    <span title="Targets loaded"><b>${targets.length}</b> target${targets.length===1?'':'s'}</span>
    <span title="Favorited queries"><b>${persist.favorites.length}</b> favorites</span>
    <span title="Searches opened this session/before"><b>${persist.history.length}</b> history</span>
    <span title="Guided workflow completion"><b>${workflowPercent()}%</b> workflow</span>
    <span title="Recon checklist items ticked"><b>${persist.checklist.checked.length}/${CHECKLIST_ITEMS.length}</b> checklist</span>
    <span title="Findings logged"><b>${persist.findings.length}</b> findings</span>
    <span title="Saved sessions"><b>${Object.keys(persist.sessions).length}</b> sessions</span>
  `;
}

/* ---------- Accent picker ---------- */
const ACCENTS = {
  teal:   { accent:'#39C7B8', dim:'#2B9C90', soft:'rgba(57,199,184,0.12)' },
  amber:  { accent:'#E3A73B', dim:'#B5842B', soft:'rgba(227,167,59,0.12)' },
  violet: { accent:'#8B7CF6', dim:'#6E5FD6', soft:'rgba(139,124,246,0.12)' },
  rose:   { accent:'#E8617A', dim:'#C24A61', soft:'rgba(232,97,122,0.12)' },
};
// Darker/more saturated variants for adequate text contrast on light backgrounds
const LIGHT_ACCENTS = {
  teal:   { accent:'#127D72', dim:'#0E5F57', soft:'rgba(18,125,114,0.10)' },
  amber:  { accent:'#96650C', dim:'#7A5109', soft:'rgba(150,101,12,0.10)' },
  violet: { accent:'#5B4BC4', dim:'#4738A0', soft:'rgba(91,75,196,0.10)' },
  rose:   { accent:'#C13655', dim:'#9C2B44', soft:'rgba(193,54,85,0.10)' },
};

function currentThemeMode(){ return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'; }
function accentMap(){ return currentThemeMode() === 'light' ? LIGHT_ACCENTS : ACCENTS; }

function applyAccent(name){
  const map = accentMap();
  const a = map[name] || map.teal;
  const root = document.documentElement.style;
  root.setProperty('--accent', a.accent);
  root.setProperty('--accent-dim', a.dim);
  root.setProperty('--accent-soft', a.soft);
  persist.ui.accent = name;
  savePersist(persist);
  renderAccentPicker();
}

function renderAccentPicker(){
  const wrap = document.getElementById('accentPicker');
  wrap.innerHTML = '';
  const map = accentMap();
  Object.keys(map).forEach(name=>{
    const b = document.createElement('button');
    b.className = 'accent-swatch' + (persist.ui.accent === name ? ' active' : '');
    b.type = 'button';
    b.style.background = map[name].accent;
    b.title = name;
    b.addEventListener('click', ()=> applyAccent(name));
    wrap.appendChild(b);
  });
}

/* ---------- Appearance theme (dark / light / system) ---------- */
function effectiveTheme(mode){
  if(mode === 'system'){
    return (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark';
  }
  return mode === 'light' ? 'light' : 'dark';
}

function applyTheme(mode){
  persist.ui.theme = mode;
  savePersist(persist);
  document.documentElement.dataset.theme = effectiveTheme(mode);
  applyAccent(persist.ui.accent || 'teal'); // re-apply so contrast-adjusted variant matches the new theme
  renderThemeToggle();
}

function renderThemeToggle(){
  const wrap = document.getElementById('themeToggle');
  if(!wrap) return;
  wrap.innerHTML = '';
  [['dark','Dark'],['light','Light'],['system','System']].forEach(([value,label])=>{
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.className = persist.ui.theme === value ? 'active' : '';
    b.addEventListener('click', ()=> applyTheme(value));
    wrap.appendChild(b);
  });
}

/* ---------- Sidebar ---------- */
const UTILITY_PANELS = [
  { id:'workflow',  label:'Recon Workflow' },
  { id:'assistant', label:'Recon Assistant' },
  { id:'templates', label:'Search Templates' },
  { id:'github',    label:'GitHub Advanced Search' },
  { id:'launcher',  label:'Tool Launcher' },
  { id:'operators', label:'Operators & Tags' },
  { id:'custompacks', label:'Custom Dork Packs' },
  { id:'checklist', label:'Recon Checklist' },
  { id:'findings',  label:'Findings' },
  { id:'timeline',  label:'Recon Timeline' },
  { id:'favorites', label:'Favorites' },
  { id:'history',   label:'Search History' },
  { id:'sessions',  label:'Saved Sessions' },
  { id:'external',  label:'External Recon Tools' },
];

function renderSidebar(){
  const nav = document.getElementById('sidebar');
  nav.innerHTML = '';

  const utilBlock = document.createElement('div');
  utilBlock.className = 'nav-group';
  UTILITY_PANELS.forEach(p=>{
    const b = document.createElement('button');
    b.className = 'sidebar-tool-link' + (state.activeCat === p.id ? ' active' : '');
    b.innerHTML = `<span class="dot"></span><span>${p.label}</span>`;
    b.title = p.label;
    b.addEventListener('click', ()=>{ state.activeCat = p.id; renderSidebar(); renderPanel(); });
    utilBlock.appendChild(b);
  });
  nav.appendChild(utilBlock);

  function makeNavItem(cat){
    const b = document.createElement('button');
    b.className = 'nav-item' + (state.activeCat === cat.id ? ' active' : '');
    const pinned = persist.pinnedCategories.includes(cat.id);
    b.innerHTML = `<span class="num">${cat.num}</span><span>${cat.title}</span>`;
    b.title = cat.title;
    b.addEventListener('click', ()=>{ state.activeCat = cat.id; renderSidebar(); renderPanel(); });

    const pin = document.createElement('button');
    pin.className = 'pin-btn' + (pinned ? ' on' : '');
    pin.type = 'button';
    pin.title = pinned ? 'Unpin' : 'Pin to top';
    pin.textContent = pinned ? '📌' : '📍';
    pin.addEventListener('click', (e)=>{
      e.stopPropagation();
      togglePinnedCategory(cat.id);
    });

    const wrap = document.createElement('div');
    wrap.className = 'nav-item-row';
    wrap.appendChild(b);
    wrap.appendChild(pin);
    return wrap;
  }

  if(persist.pinnedCategories.length){
    const pinnedGroup = document.createElement('div');
    pinnedGroup.className = 'nav-group';
    const label = document.createElement('div');
    label.className = 'nav-group-label';
    label.textContent = 'Pinned';
    pinnedGroup.appendChild(label);
    persist.pinnedCategories.forEach(id=>{
      const cat = allCategories().find(c=>c.id===id);
      if(cat) pinnedGroup.appendChild(makeNavItem(cat));
    });
    nav.appendChild(pinnedGroup);
  }

  const filter = (state.sidebarFilter || '').toLowerCase();
  GROUPS.forEach(g=>{
    const visibleIds = g.ids.filter(id=>{
      if(!filter) return true;
      const cat = CATEGORIES.find(c=>c.id===id);
      return cat.title.toLowerCase().includes(filter);
    });
    if(!visibleIds.length) return;
    const group = document.createElement('div');
    group.className = 'nav-group';
    const label = document.createElement('div');
    label.className = 'nav-group-label';
    label.textContent = g.label;
    group.appendChild(label);
    visibleIds.forEach(id=>{
      const cat = CATEGORIES.find(c=>c.id===id);
      group.appendChild(makeNavItem(cat));
    });
    nav.appendChild(group);
  });

  if(persist.customCategories.length){
    const customGroup = document.createElement('div');
    customGroup.className = 'nav-group';
    const label = document.createElement('div');
    label.className = 'nav-group-label';
    label.textContent = 'Custom Packs';
    customGroup.appendChild(label);
    persist.customCategories.forEach(cat=> customGroup.appendChild(makeNavItem(cat)));
    nav.appendChild(customGroup);
  }
}

function togglePinnedCategory(id){
  const i = persist.pinnedCategories.indexOf(id);
  if(i > -1) persist.pinnedCategories.splice(i, 1);
  else persist.pinnedCategories.push(id);
  savePersist(persist);
  renderSidebar();
}

/* Merges built-in categories with any imported custom dork packs. */
function allCategories(){
  return CATEGORIES.concat(persist.customCategories || []);
}

/* ---------- Operator Compatibility & Browse panel ---------- */
const ALL_TAGS = [...new Set(CATEGORIES.flatMap(c=>c.tags || []))].sort();

function renderOperatorsPanel(panel){
  const head = document.createElement('div');
  head.className = 'panel-head';
  head.innerHTML = `<div><h2>Operators & Tags</h2><p>What each operator actually supports across engines, plus every dork filterable by tag or operator in one flat list.</p></div>`;
  panel.appendChild(head);

  const table = document.createElement('table');
  table.className = 'op-table';
  table.innerHTML = `
    <thead><tr><th>Operator</th><th>Google</th><th>Bing</th><th>DuckDuckGo</th><th>Notes</th></tr></thead>
    <tbody>${OPERATOR_INFO.map(o=>`
      <tr>
        <td><code>${escapeHtml(o.op)}</code></td>
        <td>${supportCell(o.google)}</td>
        <td>${supportCell(o.bing)}</td>
        <td>${supportCell(o.ddg)}</td>
        <td class="op-note">${escapeHtml(o.note)}</td>
      </tr>`).join('')}</tbody>
  `;
  panel.appendChild(table);

  const browseHead = document.createElement('div');
  browseHead.className = 'nav-group-label';
  browseHead.style.padding = '20px 2px 8px';
  browseHead.textContent = 'Browse all dorks by tag or operator';
  panel.appendChild(browseHead);

  const filterRow = document.createElement('div');
  filterRow.className = 'chip-grid';
  filterRow.innerHTML = ALL_TAGS.map(tag=>`<button type="button" class="template-chip" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</button>`).join('') +
    OPERATOR_INFO.filter(o=>!['"..."','( )','-term'].includes(o.op)).map(o=>`<button type="button" class="template-chip" data-op="${escapeHtml(o.op)}">${escapeHtml(o.op)}</button>`).join('');
  panel.appendChild(filterRow);

  const resultsWrap = document.createElement('div');
  resultsWrap.className = 'card-grid';
  resultsWrap.style.marginTop = '14px';
  panel.appendChild(resultsWrap);

  let activeTag = null, activeOp = null;
  function renderResults(){
    resultsWrap.innerHTML = '';
    const c = ctxFor(currentTargets());
    let count = 0;
    allCategories().forEach(cat=>{
      if(activeTag && !(cat.tags || []).includes(activeTag)) return;
      cat.dorks.forEach((d, i)=>{
        const query = typeof d.q === 'function' ? d.q(c) : renderCustomTemplate(d.q, c, currentTargets());
        if(activeOp && !query.includes(activeOp.replace('(n)','').replace(':',':'))) return;
        count++;
        const card = document.createElement('div');
        card.className = 'dork-card';
        card.innerHTML = `<h3>${escapeHtml(d.t)}</h3><div class="dork-query">${escapeHtml(query)}</div>`;
        const actions = document.createElement('div');
        actions.className = 'card-actions';
        const copyBtn = document.createElement('button');
        copyBtn.className = 'btn'; copyBtn.type = 'button'; copyBtn.textContent = 'Copy';
        copyBtn.addEventListener('click', ()=>copyWithFeedback(query, copyBtn));
        const openBtn = document.createElement('button');
        openBtn.className = 'btn primary'; openBtn.type = 'button'; openBtn.textContent = 'Open ↗';
        openBtn.addEventListener('click', ()=> openQuery(query, d.t, cat.id));
        actions.appendChild(copyBtn); actions.appendChild(openBtn);
        card.appendChild(actions);
        resultsWrap.appendChild(card);
      });
    });
    if(!count && (activeTag || activeOp)){
      resultsWrap.innerHTML = '<p class="empty-state">No dorks match that filter.</p>';
    }
  }

  filterRow.addEventListener('click', (e)=>{
    const btn = e.target.closest('button');
    if(!btn) return;
    [...filterRow.children].forEach(b=>b.classList.remove('on'));
    if(btn.dataset.tag){
      activeTag = activeTag === btn.dataset.tag ? null : btn.dataset.tag;
      activeOp = null;
    } else if(btn.dataset.op){
      activeOp = activeOp === btn.dataset.op ? null : btn.dataset.op;
      activeTag = null;
    }
    if(activeTag) [...filterRow.children].find(b=>b.dataset.tag===activeTag)?.classList.add('on');
    if(activeOp) [...filterRow.children].find(b=>b.dataset.op===activeOp)?.classList.add('on');
    renderResults();
  });

  renderResults();
}

function supportCell(level){
  const map = { yes:['high','Yes'], partial:['med','Partial'], no:['low','No'], dead:['low','Dead'] };
  const [cls, text] = map[level] || ['low','—'];
  return `<span class="badge ${cls}">${text}</span>`;
}

/* Custom-pack dorks store q as a string template (JSON-safe) rather than a
   function. Supports {site}, {mention}, {wild}, and {target} placeholders. */
function renderCustomTemplate(template, c, targets){
  return String(template)
    .replace(/\{site\}/g, c.site)
    .replace(/\{mention\}/g, c.mention)
    .replace(/\{wild\}/g, c.wild)
    .replace(/\{target\}/g, targets[0] || DEFAULT_TARGET);
}

/* ---------- Custom Dork Packs (community/local import-export) ---------- */
function renderCustomPacksPanel(panel){
  const head = document.createElement('div');
  head.className = 'panel-head';
  head.innerHTML = `<div><h2>Custom Dork Packs</h2><p>Add your own categories as JSON. Query templates use <code>{site}</code>, <code>{mention}</code>, <code>{wild}</code>, or <code>{target}</code> placeholders instead of functions, so packs are plain, shareable JSON.</p></div>`;
  panel.appendChild(head);

  const example = JSON.stringify([{
    id: 'my-pack', title: 'My Custom Pack', note: 'Example pack — edit or replace this.',
    tags: ['Secrets'],
    dorks: [{ t: 'Example dork', desc: 'One-line search tip.', q: '{site} filetype:env intext:password' }],
  }], null, 2);

  const wrap = document.createElement('div');
  wrap.className = 'custompack-wrap';
  wrap.innerHTML = `
    <textarea id="customPackInput" class="custompack-textarea" placeholder='${escapeHtml(example)}'></textarea>
    <div class="card-actions">
      <button class="btn primary" id="customPackImportBtn" type="button">Import pack</button>
      <button class="btn" id="customPackFileBtn" type="button">Import from file</button>
      <button class="btn" id="customPackExampleBtn" type="button">Load example</button>
    </div>
  `;
  panel.appendChild(wrap);

  document.getElementById('customPackExampleBtn').addEventListener('click', ()=>{
    document.getElementById('customPackInput').value = example;
  });
  document.getElementById('customPackImportBtn').addEventListener('click', ()=>{
    importCustomPackJson(document.getElementById('customPackInput').value);
  });
  document.getElementById('customPackFileBtn').addEventListener('click', ()=> document.getElementById('customPackFile').click());

  if(persist.customCategories.length){
    const listHead = document.createElement('div');
    listHead.className = 'nav-group-label';
    listHead.style.padding = '18px 2px 8px';
    listHead.textContent = 'Imported packs';
    panel.appendChild(listHead);

    const list = document.createElement('div');
    list.className = 'session-list';
    persist.customCategories.forEach(cat=>{
      const row = document.createElement('div');
      row.className = 'session-row';
      row.innerHTML = `<div class="session-info"><strong>${escapeHtml(cat.title)}</strong><span>${cat.dorks.length} dork${cat.dorks.length===1?'':'s'}</span></div>`;
      const actions = document.createElement('div');
      actions.className = 'card-actions';
      const exportBtn = document.createElement('button');
      exportBtn.className = 'btn'; exportBtn.type = 'button'; exportBtn.textContent = 'Export';
      exportBtn.addEventListener('click', ()=> downloadFile(`reconql-pack-${cat.id}.json`, JSON.stringify([cat], null, 2), 'application/json'));
      const delBtn = document.createElement('button');
      delBtn.className = 'btn ghost'; delBtn.type = 'button'; delBtn.textContent = 'Remove';
      delBtn.addEventListener('click', ()=>{
        persist.customCategories = persist.customCategories.filter(c=>c.id!==cat.id);
        persist.pinnedCategories = persist.pinnedCategories.filter(id=>id!==cat.id);
        savePersist(persist);
        renderSidebar();
        renderPanel();
      });
      actions.appendChild(exportBtn);
      actions.appendChild(delBtn);
      row.appendChild(actions);
      list.appendChild(row);
    });
    panel.appendChild(list);
  }
}

function importCustomPackJson(raw){
  let parsed;
  try{ parsed = JSON.parse(raw); }
  catch(e){ showToast('Invalid JSON — check the format and try again.', 'warn'); return; }
  const packs = Array.isArray(parsed) ? parsed : [parsed];
  let added = 0;
  packs.forEach(p=>{
    if(!p || !p.title || !Array.isArray(p.dorks)) return;
    const id = 'custom-' + (p.id || p.title).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || uid();
    const cat = {
      id, num: '—', title: String(p.title), signal: p.signal || 'med',
      tags: Array.isArray(p.tags) ? p.tags : [],
      note: p.note || 'Custom imported pack.',
      falsePositives: p.falsePositives || 'Not documented for this custom pack.',
      dorks: p.dorks.filter(d=>d && d.t && d.q).map(d=>({ t: String(d.t), desc: d.desc || '', q: String(d.q) })),
    };
    if(!cat.dorks.length) return;
    persist.customCategories = persist.customCategories.filter(c=>c.id !== id);
    persist.customCategories.push(cat);
    added++;
  });
  if(added){
    savePersist(persist);
    showToast(`Imported ${added} custom pack${added===1?'':'s'}.`, 'success');
    renderSidebar();
    renderPanel();
  } else {
    showToast('No valid packs found in that JSON.', 'warn');
  }
}

function goToCategory(id){
  if(!id) { showToast('This step has no linked category — it\u2019s a manual checkpoint.'); return; }
  if(id === 'export'){
    document.getElementById('exportSection').scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block:'start' });
    return;
  }
  state.activeCat = id;
  renderSidebar();
  renderPanel();
  document.getElementById('panel').scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block:'start' });
}

/* ---------- Command palette ---------- */
let paletteActiveIndex = -1;
let paletteCurrentResults = [];

function buildCommandIndex(){
  const items = [];
  CATEGORIES.forEach(cat=>{
    items.push({ type:'Category', label:`${cat.num} ${cat.title}`, action: ()=>goToCategory(cat.id) });
  });
  UTILITY_PANELS.forEach(p=>{
    items.push({ type:'Panel', label:p.label, action: ()=>{ state.activeCat = p.id; renderSidebar(); renderPanel(); } });
  });
  Object.keys(TEMPLATES).forEach(key=>{
    TEMPLATES[key].forEach(item=>{
      items.push({ type:'Template', label:`${item.name} template`, action: ()=>{ state.activeCat='templates'; renderSidebar(); renderPanel(); setTimeout(()=>applyTemplate(item), 0); } });
    });
  });
  EXTERNAL_TOOLS.forEach(tool=>{
    items.push({ type:'External tool', label:tool.name, action: ()=>{ state.activeCat='external'; renderSidebar(); renderPanel(); } });
  });
  TOOL_COMMANDS.forEach(tool=>{
    items.push({ type:'CLI tool', label:tool.name, action: ()=>{ state.activeCat='launcher'; renderSidebar(); renderPanel(); } });
  });
  return items;
}

function openCommandPalette(){
  const modal = document.getElementById('commandPalette');
  modal.classList.add('show');
  const input = document.getElementById('paletteInput');
  input.value = '';
  input.focus();
  filterCommandResults('');
}
function closeCommandPalette(){
  document.getElementById('commandPalette').classList.remove('show');
}

function filterCommandResults(query){
  const all = buildCommandIndex();
  const q = query.trim().toLowerCase();
  const results = q ? all.filter(i => i.label.toLowerCase().includes(q)) : all.slice(0, 40);
  paletteCurrentResults = results.slice(0, 40);
  paletteActiveIndex = paletteCurrentResults.length ? 0 : -1;
  renderPaletteResults();
}

function renderPaletteResults(){
  const wrap = document.getElementById('paletteResults');
  wrap.innerHTML = '';
  if(!paletteCurrentResults.length){
    wrap.innerHTML = '<div class="palette-empty">No matches.</div>';
    return;
  }
  paletteCurrentResults.forEach((item, i)=>{
    const row = document.createElement('div');
    row.className = 'palette-item' + (i === paletteActiveIndex ? ' active' : '');
    row.innerHTML = `<span>${escapeHtml(item.label)}</span><span class="p-type">${escapeHtml(item.type)}</span>`;
    row.addEventListener('mouseenter', ()=>{ paletteActiveIndex = i; renderPaletteResults(); });
    row.addEventListener('click', ()=> executeCommandItem(item));
    wrap.appendChild(row);
  });
}

function executeCommandItem(item){
  if(!item) return;
  closeCommandPalette();
  item.action();
}

/* ---------- Findings Workspace ---------- */
function addFinding(data){
  const now = Date.now();
  const finding = {
    id: uid(),
    target: data.target || currentTargets()[0],
    title: data.title || 'Untitled finding',
    severity: SEVERITIES.includes(data.severity) ? data.severity : 'Info',
    status: STATUSES.includes(data.status) ? data.status : 'Open',
    tags: (data.tags || '').split(',').map(s=>s.trim()).filter(Boolean),
    notes: data.notes || '',
    createdAt: now,
    updatedAt: now,
  };
  persist.findings.unshift(finding);
  savePersist(persist);
  logTimelineEvent('finding', `Finding added: ${finding.title} (${finding.severity})`);
  renderStats();
  return finding;
}
function updateFinding(id, patch){
  const f = persist.findings.find(x=>x.id===id);
  if(!f) return;
  Object.assign(f, patch, { updatedAt: Date.now() });
  savePersist(persist);
}
function deleteFinding(id){
  if(!confirm('Delete this finding? This cannot be undone.')) return;
  persist.findings = persist.findings.filter(x=>x.id!==id);
  savePersist(persist);
  renderPanel();
  renderStats();
}

function findingsMarkdown(list){
  const lines = ['# ReconQL Findings', ''];
  list.forEach(f=>{
    lines.push(`## ${f.title}`, '', `- **Target:** ${f.target}`, `- **Severity:** ${f.severity}`, `- **Status:** ${f.status}`,
      `- **Tags:** ${f.tags.join(', ') || '—'}`, `- **Logged:** ${formatDate(f.createdAt)}`, '', f.notes || '_No notes._', '');
  });
  return lines.join('\n');
}
function findingsCsv(list){
  const rows = [['target','title','severity','status','tags','notes','created']];
  list.forEach(f=> rows.push([f.target, f.title, f.severity, f.status, f.tags.join('|'), f.notes, formatDate(f.createdAt)]));
  return rows.map(r=>r.map(csvEscape).join(',')).join('\n');
}
function findingsHtml(list){
  const rows = list.map(f=>`
    <tr>
      <td>${escapeHtml(f.target)}</td>
      <td>${escapeHtml(f.title)}</td>
      <td><span class="sev">${escapeHtml(f.severity)}</span></td>
      <td>${escapeHtml(f.status)}</td>
      <td>${f.tags.map(escapeHtml).join(', ')}</td>
      <td>${escapeHtml(f.notes).replace(/\n/g,'<br>')}</td>
    </tr>`).join('');
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>ReconQL Findings Report</title>
<style>
body{font-family:-apple-system,"Segoe UI",Inter,sans-serif;max-width:1000px;margin:40px auto;padding:0 20px;color:#1a1f26;}
h1{margin-bottom:4px;} .meta{color:#5c6773;font-size:13px;margin-bottom:20px;}
table{width:100%;border-collapse:collapse;} th,td{text-align:left;padding:8px 10px;border-bottom:1px solid #eee;font-size:12.5px;vertical-align:top;}
th{color:#5c6773;font-weight:600;} .sev{font-weight:600;}
@media print{ body{margin:0;} }
</style></head><body>
<h1>ReconQL Findings Report</h1>
<div class="meta">Generated ${new Date().toLocaleString()} · ${list.length} finding${list.length===1?'':'s'}</div>
<table><thead><tr><th>Target</th><th>Title</th><th>Severity</th><th>Status</th><th>Tags</th><th>Notes</th></tr></thead><tbody>${rows}</tbody></table>
</body></html>`;
}

function exportFindingsAs(format, list){
  const data = list || persist.findings;
  if(!data.length){ showToast('No findings to export yet.', 'warn'); return; }
  if(format === 'md') return downloadFile('reconql-findings.md', findingsMarkdown(data), 'text/markdown');
  if(format === 'json') return downloadFile('reconql-findings.json', JSON.stringify(data, null, 2), 'application/json');
  if(format === 'csv') return downloadFile('reconql-findings.csv', findingsCsv(data), 'text/csv');
  if(format === 'pdf'){
    const w = window.open('', '_blank');
    if(!w){ showToast('Pop-up blocked — allow pop-ups to export as PDF.', 'warn'); return; }
    w.document.write(findingsHtml(data));
    w.document.close();
    w.onload = ()=> setTimeout(()=> w.print(), 300);
  }
}

function renderFindingsPanel(panel){
  const head = document.createElement('div');
  head.className = 'panel-head';
  head.innerHTML = `<div><h2>Findings Workspace</h2><p>Track what you've found as you go — severity, status, tags, and notes, all saved locally. Export when you're ready to write it up.</p></div>`;
  panel.appendChild(head);

  const targets = currentTargets();
  const form = document.createElement('div');
  form.className = 'finding-form';
  form.innerHTML = `
    <div class="builder-field"><label>Target</label><input type="text" id="fTarget" value="${escapeHtml(targets[0] || '')}"></div>
    <div class="builder-field"><label>Title</label><input type="text" id="fTitle" placeholder="Exposed .env with SMTP credentials"></div>
    <div class="builder-field"><label>Severity</label><select id="fSeverity">${SEVERITIES.map(s=>`<option value="${s}">${s}</option>`).join('')}</select></div>
    <div class="builder-field"><label>Status</label><select id="fStatus">${STATUSES.map(s=>`<option value="${s}">${s}</option>`).join('')}</select></div>
    <div class="builder-field"><label>Tags (comma separated)</label><input type="text" id="fTags" placeholder="secrets, env"></div>
    <div class="builder-field full-row"><label>Notes</label><textarea id="fNotes" placeholder="Contains SMTP credentials, found via dotenv leak dork…"></textarea></div>
    <div class="full-row"><button class="btn primary" id="fAddBtn" type="button">Add finding</button></div>
  `;
  panel.appendChild(form);
  document.getElementById('fAddBtn').addEventListener('click', ()=>{
    const title = document.getElementById('fTitle').value.trim();
    if(!title){ showToast('Give the finding a title first.', 'warn'); return; }
    addFinding({
      target: document.getElementById('fTarget').value.trim(),
      title, severity: document.getElementById('fSeverity').value, status: document.getElementById('fStatus').value,
      tags: document.getElementById('fTags').value, notes: document.getElementById('fNotes').value,
    });
    showToast('Finding added.', 'success');
    renderPanel();
  });

  if(!persist.findings.length){
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = 'No findings logged yet — add one above.';
    panel.appendChild(empty);
    return;
  }

  const exportRow = document.createElement('div');
  exportRow.className = 'card-actions';
  exportRow.style.marginBottom = '14px';
  [['Markdown','md'],['JSON','json'],['CSV','csv'],['PDF (print)','pdf']].forEach(([label,fmt])=>{
    const b = document.createElement('button');
    b.className = 'btn'; b.type = 'button'; b.textContent = label;
    b.addEventListener('click', ()=> exportFindingsAs(fmt));
    exportRow.appendChild(b);
  });
  panel.appendChild(exportRow);

  const list = document.createElement('div');
  list.className = 'finding-list';
  persist.findings.forEach(f=>{
    const card = document.createElement('div');
    card.className = 'finding-card';
    card.innerHTML = `
      <div class="finding-head">
        <div>
          <div class="finding-title">${escapeHtml(f.title)}</div>
          <div class="finding-target">${escapeHtml(f.target)}</div>
        </div>
        <div style="display:flex; gap:6px;">
          <span class="pill sev-${f.severity}">${f.severity}</span>
          <span class="pill">${f.status}</span>
        </div>
      </div>
      ${f.notes ? `<div class="finding-notes">${escapeHtml(f.notes)}</div>` : ''}
      ${f.tags.length ? `<div class="finding-tags">${f.tags.map(t=>`<span class="finding-tag">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
    `;
    const actions = document.createElement('div');
    actions.className = 'card-actions';
    const delBtn = document.createElement('button');
    delBtn.className = 'btn ghost'; delBtn.type = 'button'; delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', ()=> deleteFinding(f.id));
    actions.appendChild(delBtn);
    card.appendChild(actions);
    list.appendChild(card);
  });
  panel.appendChild(list);
}

/* ---------- Recon Timeline ---------- */
function logTimelineEvent(type, label){
  persist.timeline.unshift({ id: uid(), ts: Date.now(), type, label });
  if(persist.timeline.length > 100) persist.timeline.length = 100;
  savePersist(persist);
}

function renderTimelinePanel(panel){
  const head = document.createElement('div');
  head.className = 'panel-head';
  head.innerHTML = `<div><h2>Recon Timeline</h2><p>A milestone log for this engagement — first visit to each category, workflow steps completed, checklist items ticked, and findings logged.</p></div>`;
  panel.appendChild(head);

  if(!persist.timeline.length){
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = 'Nothing logged yet — visit a category or complete a workflow step to start the timeline.';
    panel.appendChild(empty);
    return;
  }

  const list = document.createElement('div');
  list.className = 'timeline-list';
  persist.timeline.forEach(ev=>{
    const row = document.createElement('div');
    row.className = 'timeline-row';
    row.innerHTML = `<span class="timeline-ts">${formatDate(ev.ts)}</span><span class="timeline-label">${escapeHtml(ev.label)}</span><span class="timeline-type">${escapeHtml(ev.type)}</span>`;
    list.appendChild(row);
  });
  panel.appendChild(list);
}

/* ---------- Integrated Tool Launcher ---------- */
function renderLauncherPanel(panel){
  const targets = currentTargets();
  const head = document.createElement('div');
  head.className = 'panel-head';
  head.innerHTML = `<div><h2>Integrated Tool Launcher</h2><p>Copy-ready commands for standard recon CLI tools, using each tool's own default usage with your target substituted in. Run them in your own terminal — nothing executes from the browser.</p></div>`;
  panel.appendChild(head);

  const grid = document.createElement('div');
  grid.className = 'card-grid';
  TOOL_COMMANDS.forEach(tool=>{
    const cmd = tool.cmd(targets[0] || DEFAULT_TARGET);
    const card = document.createElement('div');
    card.className = 'tool-cmd-card';
    const h3 = document.createElement('h3'); h3.textContent = tool.name;
    const p = document.createElement('p'); p.textContent = tool.desc;
    const qDiv = document.createElement('div'); qDiv.className = 'dork-query'; qDiv.textContent = cmd;
    const actions = document.createElement('div'); actions.className = 'card-actions';
    const copyBtn = document.createElement('button');
    copyBtn.className = 'btn'; copyBtn.type = 'button'; copyBtn.textContent = 'Copy command';
    copyBtn.addEventListener('click', ()=>copyWithFeedback(cmd, copyBtn));
    actions.appendChild(copyBtn);
    card.appendChild(h3); card.appendChild(p); card.appendChild(qDiv); card.appendChild(actions);
    grid.appendChild(card);
  });
  panel.appendChild(grid);

  const manualHead = document.createElement('div');
  manualHead.className = 'nav-group-label';
  manualHead.style.padding = '18px 2px 8px';
  manualHead.textContent = 'GUI tools (no CLI)';
  panel.appendChild(manualHead);

  const manualGrid = document.createElement('div');
  manualGrid.className = 'card-grid';
  MANUAL_TOOLS.forEach(tool=>{
    const note = tool.note(targets[0] || DEFAULT_TARGET);
    const card = document.createElement('div');
    card.className = 'tool-cmd-card';
    card.innerHTML = `<h3>${escapeHtml(tool.name)}</h3><p>${escapeHtml(tool.desc)}</p><div class="dork-query">${escapeHtml(note)}</div>`;
    manualGrid.appendChild(card);
  });
  panel.appendChild(manualGrid);
}

/* ---------- Recon Assistant (rule-based, not a live scan) ---------- */
function renderAssistantPanel(panel){
  const head = document.createElement('div');
  head.className = 'panel-head';
  head.innerHTML = `<div><h2>Recon Assistant</h2><p>Rule-based suggestions from your saved workflow progress — this reads your local checklist state, not a live scan of the target. For real tech-stack detection, use BuiltWith or httpx's <code>-tech-detect</code> from the tool launcher.</p></div>`;
  panel.appendChild(head);

  const remaining = WORKFLOW_STEPS.filter(s=>!persist.workflow.completed.includes(s.id));
  const box = document.createElement('div');
  box.className = 'assistant-box';
  if(!remaining.length){
    box.innerHTML = `<h3>Workflow complete</h3><p class="assistant-note">Every workflow step is marked done. Check the Recon Checklist for anything still unticked, or start logging Findings.</p>`;
  } else {
    const next = remaining.slice(0, 3);
    box.innerHTML = `<h3>Suggested next steps</h3>`;
    const ul = document.createElement('ul');
    ul.className = 'assistant-list';
    next.forEach(step=>{
      const li = document.createElement('li');
      const span = document.createElement('span');
      span.textContent = step.label;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = 'Go';
      btn.addEventListener('click', ()=> goToCategory(step.mapsTo));
      li.appendChild(span);
      li.appendChild(btn);
      ul.appendChild(li);
    });
    box.appendChild(ul);
  }
  panel.appendChild(box);

  const checklistRemaining = CHECKLIST_ITEMS.filter(c=>!persist.checklist.checked.includes(c.id));
  if(checklistRemaining.length){
    const box2 = document.createElement('div');
    box2.className = 'assistant-box';
    box2.innerHTML = `<h3>Unticked checklist items (${checklistRemaining.length})</h3><p class="assistant-note">${checklistRemaining.slice(0,6).map(c=>escapeHtml(c.label)).join(' · ')}${checklistRemaining.length>6 ? '…' : ''}</p>`;
    const goBtn = document.createElement('button');
    goBtn.className = 'btn';
    goBtn.type = 'button';
    goBtn.textContent = 'Open checklist';
    goBtn.addEventListener('click', ()=> goToCategory('checklist'));
    box2.appendChild(goBtn);
    panel.appendChild(box2);
  }
}

/* ---------- Panel dispatcher ---------- */
function badgeClass(signal){ return signal === 'high' ? 'high' : signal === 'med' ? 'med' : 'low'; }
function badgeText(signal){ return signal === 'high' ? 'High signal' : signal === 'med' ? 'Medium signal' : 'Low signal'; }

function renderPanel(){
  const panel = document.getElementById('panel');
  panel.innerHTML = '';

  const dispatch = {
    external: renderExternalPanel,
    templates: renderTemplatesPanel,
    github: renderGithubPanel,
    workflow: renderWorkflowPanel,
    checklist: renderChecklistPanel,
    favorites: renderFavoritesPanel,
    history: renderHistoryPanel,
    sessions: renderSessionsPanel,
    findings: renderFindingsPanel,
    timeline: renderTimelinePanel,
    launcher: renderLauncherPanel,
    assistant: renderAssistantPanel,
    operators: renderOperatorsPanel,
    custompacks: renderCustomPacksPanel,
  };

  if(dispatch[state.activeCat]){ dispatch[state.activeCat](panel); return; }
  renderCategoryPanel(panel);
}

function makeCardActions(query, label, catId, dorkIndex){
  const actions = document.createElement('div');
  actions.className = 'card-actions';

  const copyBtn = document.createElement('button');
  copyBtn.className = 'btn'; copyBtn.type = 'button'; copyBtn.textContent = 'Copy';
  copyBtn.addEventListener('click', ()=>copyWithFeedback(query, copyBtn));

  const openBtn = document.createElement('button');
  openBtn.className = 'btn primary'; openBtn.type = 'button'; openBtn.textContent = 'Open ↗';
  openBtn.addEventListener('click', ()=> openQuery(query, label, catId));

  actions.appendChild(copyBtn);
  actions.appendChild(openBtn);
  return actions;
}

function renderCategoryPanel(panel){
  const cat = allCategories().find(c=>c.id===state.activeCat) || CATEGORIES[0];
  state.activeCat = cat.id;
  const targets = currentTargets();
  const c = ctxFor(targets);

  if(!state.visitedCats.has(cat.id)){
    state.visitedCats.add(cat.id);
    logTimelineEvent('visit', `Started: ${cat.title}`);
  }

  const head = document.createElement('div');
  head.className = 'panel-head';
  head.innerHTML = `<div><h2>${cat.num} — ${cat.title}</h2><p>${cat.note}</p></div>`;

  const right = document.createElement('div');
  right.className = 'panel-head-right';
  const badge = document.createElement('span');
  badge.className = 'badge ' + badgeClass(cat.signal);
  badge.textContent = badgeText(cat.signal);

  const runnerRow = document.createElement('div');
  runnerRow.className = 'runner-row';
  const mk = (label, count) => {
    const b = document.createElement('button');
    b.className = 'copy-all';
    b.type = 'button';
    b.textContent = label;
    b.addEventListener('click', ()=> runCategoryBatch(cat, count));
    return b;
  };
  runnerRow.appendChild(mk('Open first 5', 5));
  runnerRow.appendChild(mk('Open first 10', 10));
  runnerRow.appendChild(mk('Open all', 'all'));
  const copyAllBtn = document.createElement('button');
  copyAllBtn.className = 'copy-all';
  copyAllBtn.type = 'button';
  copyAllBtn.textContent = 'Copy all';
  copyAllBtn.addEventListener('click', ()=>{
    const all = cat.dorks.map(d=>d.q(c)).join('\n');
    copyWithFeedback(all, copyAllBtn);
  });
  runnerRow.appendChild(copyAllBtn);

  right.appendChild(badge);
  right.appendChild(runnerRow);
  head.appendChild(right);

  const grid = document.createElement('div');
  grid.className = 'card-grid';
  cat.dorks.forEach((d, i)=>{
    const query = d.q(c);
    const card = document.createElement('div');
    card.className = 'dork-card';
    card.dataset.query = query;
    card.dataset.title = d.t;
    card.dataset.cat = cat.id;
    card.addEventListener('mouseenter', ()=>{ state.lastCard = { query, title: d.t, catId: cat.id }; });

    const titleRow = document.createElement('div');
    titleRow.className = 'card-title-row';
    const h3 = document.createElement('h3'); h3.textContent = d.t;
    const star = document.createElement('button');
    star.className = 'star-btn' + (isFavorited(cat.id, i) ? ' on' : '');
    star.type = 'button';
    star.title = isFavorited(cat.id, i) ? 'Remove from favorites' : 'Add to favorites';
    star.textContent = isFavorited(cat.id, i) ? '★' : '☆';
    star.addEventListener('click', ()=> toggleFavorite(cat.id, i, d.t));
    titleRow.appendChild(h3);
    titleRow.appendChild(star);

    const tagRow = document.createElement('div');
    tagRow.className = 'finding-tags';
    (cat.tags || []).forEach(tag=>{
      const tagEl = document.createElement('span');
      tagEl.className = 'finding-tag';
      tagEl.textContent = tag;
      tagRow.appendChild(tagEl);
    });

    const tip = document.createElement('p');
    tip.className = 'dork-tip';
    tip.textContent = d.desc || '';

    const qDiv = document.createElement('div'); qDiv.className = 'dork-query'; qDiv.textContent = query;

    const warnings = validateQueryForEngine(query, state.engine);
    let warnEl = null;
    if(warnings.length){
      warnEl = document.createElement('div');
      warnEl.className = 'query-warning';
      warnEl.textContent = '⚠ ' + warnings.join(' ');
    }

    const actions = makeCardActions(query, d.t, cat.id, i);

    if(d.gh){
      const ghA = document.createElement('button');
      ghA.className = 'btn ghost'; ghA.type = 'button'; ghA.textContent = 'GitHub code search ↗';
      ghA.addEventListener('click', ()=>{
        window.open(githubCodeUrl(query), '_blank', 'noopener');
        addHistory({ engine:'github', target: targets.join(', '), query, label: d.t, catId: cat.id });
      });
      actions.appendChild(ghA);
    }

    const whyBtn = document.createElement('button');
    whyBtn.className = 'btn ghost';
    whyBtn.type = 'button';
    whyBtn.textContent = 'Why this dork?';
    const whyPanel = document.createElement('div');
    whyPanel.className = 'why-panel';
    whyPanel.style.display = 'none';
    whyPanel.innerHTML = buildWhyPanelHtml(d, cat, query);
    whyBtn.addEventListener('click', ()=>{
      const showing = whyPanel.style.display !== 'none';
      whyPanel.style.display = showing ? 'none' : 'block';
      whyBtn.textContent = showing ? 'Why this dork?' : 'Hide explanation';
    });
    actions.appendChild(whyBtn);

    card.appendChild(titleRow);
    if((cat.tags || []).length) card.appendChild(tagRow);
    if(d.desc) card.appendChild(tip);
    card.appendChild(qDiv);
    if(warnEl) card.appendChild(warnEl);
    card.appendChild(actions);
    card.appendChild(whyPanel);
    grid.appendChild(card);
  });

  panel.appendChild(head);
  panel.appendChild(grid);
}

/* ---------- "Why this dork?" explanation panel ---------- */
function buildWhyPanelHtml(dork, cat, query){
  const ops = detectOperators(query);
  const opsHtml = ops.length
    ? ops.map(o=>`<li><code>${escapeHtml(o.op)}</code> — ${escapeHtml(o.note)}</li>`).join('')
    : '<li>No indexed operators detected beyond plain keywords.</li>';
  const engineRow = ['google','bing','ddg'].map(e=>{
    const worst = ops.reduce((acc,o)=>{
      const s = o[e];
      if(s === 'dead' || s === 'no') return 'poor';
      if(s === 'partial' && acc !== 'poor') return 'partial';
      return acc;
    }, 'good');
    const label = e === 'ddg' ? 'DuckDuckGo' : e[0].toUpperCase()+e.slice(1);
    const cls = worst === 'good' ? 'high' : worst === 'partial' ? 'med' : 'low';
    const text = worst === 'good' ? 'Fully supported' : worst === 'partial' ? 'Partial support' : 'Not recommended';
    return `<span class="badge ${cls}">${label}: ${text}</span>`;
  }).join(' ');
  return `
    <div class="why-section"><strong>Purpose</strong><p>${escapeHtml(dork.desc || cat.note)}</p></div>
    <div class="why-section"><strong>Operators used</strong><ul>${opsHtml}</ul></div>
    <div class="why-section"><strong>Common false positives</strong><p>${escapeHtml(cat.falsePositives || 'Not documented for this category.')}</p></div>
    <div class="why-section"><strong>Supported engines</strong><div class="why-engines">${engineRow}</div></div>
    <div class="why-section"><strong>Example use case</strong><p>${escapeHtml(cat.note)}</p></div>
  `;
}

function runCategoryBatch(cat, count){
  const c = ctxFor(currentTargets());
  const list = count === 'all' ? cat.dorks : cat.dorks.slice(0, count);
  list.forEach((d, i)=>{
    setTimeout(()=>{
      const query = d.q(c);
      const url = engineUrl(state.engine, query, state.dateFilter, state.customFrom, state.customTo);
      window.open(url, '_blank', 'noopener');
      addHistory({ engine: state.engine, target: currentTargets().join(', '), query, label: d.t, catId: cat.id });
      if(i === list.length - 1){ renderStats(); if(state.activeCat==='history') renderPanel(); }
    }, i * state.openDelay);
  });
  showToast(`Opening ${list.length} ${list.length===1?'query':'queries'}, ${state.openDelay}ms apart — allow popups if your browser blocks extra tabs.`);
}

/* ---------- External Recon Tools panel ---------- */
function renderExternalPanel(panel){
  const targets = currentTargets();
  const head = document.createElement('div');
  head.className = 'panel-head';
  head.innerHTML = `<div><h2>External Recon Tools</h2><p>Passive-recon services that complement search-operator dorking — certificate transparency, historical crawl data, and exposed-service indexes. Tools marked <span class="badge low" style="vertical-align:middle;">Login</span> need a free account for full results.</p></div>`;
  panel.appendChild(head);

  const grid = document.createElement('div');
  grid.className = 'card-grid';
  EXTERNAL_TOOLS.forEach(tool=>{
    const card = document.createElement('div');
    card.className = 'tool-card';
    const h3 = document.createElement('h3');
    h3.textContent = tool.name;
    if(tool.login){
      const tag = document.createElement('span');
      tag.className = 'badge low';
      tag.style.marginLeft = '8px';
      tag.textContent = 'Login';
      h3.appendChild(tag);
    }
    const p = document.createElement('p'); p.textContent = tool.desc;
    const links = document.createElement('div'); links.className = 'tool-links';
    targets.forEach(d=>{
      const a = document.createElement('a');
      a.href = tool.url(d);
      a.target = '_blank'; a.rel = 'noopener';
      a.textContent = targets.length > 1 ? `${d} ↗` : 'Open ↗';
      a.addEventListener('click', ()=> addHistory({ engine: tool.name, target: d, query: tool.url(d), label: tool.name, catId:'external' }));
      links.appendChild(a);
    });
    card.appendChild(h3); card.appendChild(p); card.appendChild(links);
    grid.appendChild(card);
  });
  panel.appendChild(grid);
}

/* ---------- Search Templates panel ---------- */
function applyTemplate(item){
  state.scope = item.scope || 'target';
  state.filetypes = new Set(item.filetypes || []);
  document.getElementById('scopeSelect').value = state.scope;
  document.getElementById('mustInput').value = (item.must || []).join(', ');
  document.getElementById('inurlInput').value = (item.inurl || []).join(', ');
  document.getElementById('intitleInput').value = (item.intitle || []).join(', ');
  renderFiletypeChips();
  renderBuilder();
  document.getElementById('builderSection').scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block:'start' });
  showToast(`"${item.name}" template loaded into the builder.`);
}

function renderTemplatesPanel(panel){
  const head = document.createElement('div');
  head.className = 'panel-head';
  head.innerHTML = `<div><h2>Search Templates</h2><p>Ready-made keyword sets for the Custom Query Builder below — pick one to pre-fill scope, file types, and keywords, then adjust as needed.</p></div>`;
  panel.appendChild(head);

  const sections = [
    { key:'secrets', label:'Secrets' },
    { key:'cloud', label:'Cloud' },
    { key:'auth', label:'Authentication' },
    { key:'api', label:'API' },
  ];
  sections.forEach(sec=>{
    const h = document.createElement('div');
    h.className = 'nav-group-label';
    h.style.padding = '14px 2px 8px';
    h.textContent = sec.label;
    panel.appendChild(h);

    const grid = document.createElement('div');
    grid.className = 'chip-grid';
    TEMPLATES[sec.key].forEach(item=>{
      const b = document.createElement('button');
      b.className = 'template-chip';
      b.type = 'button';
      b.textContent = item.name;
      b.addEventListener('click', ()=> applyTemplate(item));
      grid.appendChild(b);
    });
    panel.appendChild(grid);
  });
}

/* ---------- GitHub Advanced Search panel ---------- */
function renderGithubPanel(panel){
  const head = document.createElement('div');
  head.className = 'panel-head';
  head.innerHTML = `<div><h2>GitHub Advanced Search</h2><p>Build a query using GitHub's own code/commit search qualifiers instead of Google's site: operator — more reliable for source-level searches.</p></div>`;
  panel.appendChild(head);

  const wrap = document.createElement('div');
  wrap.className = 'gh-builder';
  wrap.innerHTML = `
    <div class="builder-grid">
      <div class="builder-field"><label>Keywords</label><input type="text" id="ghKeywords" placeholder="api_key OR secret"></div>
      <div class="builder-field"><label>Organization (org:)</label><input type="text" id="ghOrg" placeholder="tesla"></div>
      <div class="builder-field"><label>Repository (repo:)</label><input type="text" id="ghRepo" placeholder="openai/openai-python"></div>
      <div class="builder-field"><label>User (user:)</label><input type="text" id="ghUser" placeholder="octocat"></div>
      <div class="builder-field"><label>Filename (filename:)</label><input type="text" id="ghFilename" placeholder=".env"></div>
      <div class="builder-field"><label>Extension (extension:)</label><input type="text" id="ghExtension" placeholder="yml"></div>
      <div class="builder-field"><label>Language (language:)</label><input type="text" id="ghLanguage" placeholder="javascript"></div>
      <div class="builder-field"><label>Path (path:)</label><input type="text" id="ghPath" placeholder=".github"></div>
      <div class="builder-field"><label>Fork (fork:)</label>
        <select id="ghFork"><option value="">any</option><option value="true">true</option><option value="false">false</option><option value="only">only</option></select>
      </div>
      <div class="builder-field"><label>Archived (archived:)</label>
        <select id="ghArchived"><option value="">any</option><option value="true">true</option><option value="false">false</option></select>
      </div>
      <div class="builder-field"><label>Author (commits — author:)</label><input type="text" id="ghAuthor" placeholder="jane-doe"></div>
      <div class="builder-field"><label>Committer (commits — committer:)</label><input type="text" id="ghCommitter" placeholder="jane-doe"></div>
      <div class="builder-field"><label>Commit hash (commits — hash:)</label><input type="text" id="ghHash" placeholder="a1b2c3d"></div>
      <div class="builder-field"><label>Merge commits (commits — merge:)</label>
        <select id="ghMerge"><option value="">any</option><option value="true">true</option><option value="false">false</option></select>
      </div>
    </div>
    <div class="builder-output">
      <div class="dork-query" id="ghQuery"></div>
      <div class="card-actions">
        <button class="btn" id="ghCopy" type="button">Copy</button>
        <button class="btn primary" id="ghOpenCode" type="button">Open in Code Search ↗</button>
        <button class="btn ghost" id="ghOpenCommits" type="button">Open in Commit Search ↗</button>
      </div>
    </div>
  `;
  panel.appendChild(wrap);

  const fieldIds = ['ghKeywords','ghOrg','ghRepo','ghUser','ghFilename','ghExtension','ghLanguage','ghPath','ghFork','ghArchived','ghAuthor','ghCommitter','ghHash','ghMerge'];
  const rebuild = ()=>{
    const fields = {
      keywords: v('ghKeywords'), org: v('ghOrg'), repo: v('ghRepo'), user: v('ghUser'),
      filename: v('ghFilename'), extension: v('ghExtension'), language: v('ghLanguage'), path: v('ghPath'),
      fork: v('ghFork'), archived: v('ghArchived'), author: v('ghAuthor'), committer: v('ghCommitter'),
      hash: v('ghHash'), merge: v('ghMerge'),
    };
    const query = buildGithubAdvancedQuery(fields) || 'site:github.com';
    document.getElementById('ghQuery').textContent = query;
    return query;
  };
  function v(id){ return document.getElementById(id).value; }

  fieldIds.forEach(id=> document.getElementById(id).addEventListener('input', rebuild));
  fieldIds.forEach(id=> document.getElementById(id).addEventListener('change', rebuild));

  document.getElementById('ghCopy').addEventListener('click', (e)=> copyWithFeedback(document.getElementById('ghQuery').textContent, e.currentTarget));
  document.getElementById('ghOpenCode').addEventListener('click', ()=>{
    const q = rebuild();
    window.open(githubSearchUrl(q, 'code'), '_blank', 'noopener');
    addHistory({ engine:'github', target: currentTargets().join(', '), query:q, label:'GitHub code search', catId:'github' });
  });
  document.getElementById('ghOpenCommits').addEventListener('click', ()=>{
    const q = rebuild();
    window.open(githubSearchUrl(q, 'commits'), '_blank', 'noopener');
    addHistory({ engine:'github', target: currentTargets().join(', '), query:q, label:'GitHub commit search', catId:'github' });
  });

  rebuild();
}

/* ---------- Recon Workflow panel ---------- */
function toggleWorkflowStep(id){
  const i = persist.workflow.completed.indexOf(id);
  const wasCompleting = i === -1;
  if(i > -1) persist.workflow.completed.splice(i, 1);
  else persist.workflow.completed.push(id);
  if(wasCompleting){
    const step = WORKFLOW_STEPS.find(s=>s.id===id);
    if(step) logTimelineEvent('workflow', `Workflow step done: ${step.label}`);
  }
  savePersist(persist);
  renderPanel();
  renderStats();
}

function renderWorkflowPanel(panel){
  const completed = persist.workflow.completed;
  const remaining = WORKFLOW_STEPS.filter(s=>!completed.includes(s.id));
  const estMinutes = remaining.reduce((sum,s)=>sum+s.est, 0);

  const head = document.createElement('div');
  head.className = 'panel-head';
  head.innerHTML = `<div><h2>Recon Workflow</h2><p>A suggested order for the recon phase. Click a step to jump to it; use the checkbox to mark it done. Progress is saved locally.</p></div>`;
  panel.appendChild(head);

  const summary = document.createElement('div');
  summary.className = 'workflow-summary';
  summary.innerHTML = `
    <div class="wf-stat"><span class="wf-num">${workflowPercent()}%</span><span>Overall progress</span></div>
    <div class="wf-stat"><span class="wf-num">${completed.length}</span><span>Completed steps</span></div>
    <div class="wf-stat"><span class="wf-num">${remaining.length}</span><span>Remaining steps</span></div>
    <div class="wf-stat"><span class="wf-num">~${estMinutes}m</span><span>Est. time remaining (rough guide)</span></div>
  `;
  panel.appendChild(summary);

  const bar = document.createElement('div');
  bar.className = 'progress-bar';
  bar.innerHTML = `<div class="progress-fill" style="width:${workflowPercent()}%"></div>`;
  panel.appendChild(bar);

  const list = document.createElement('div');
  list.className = 'workflow-steps';
  WORKFLOW_STEPS.forEach((s, i)=>{
    const done = completed.includes(s.id);
    const row = document.createElement('div');
    row.className = 'workflow-step' + (done ? ' done' : '');

    const check = document.createElement('button');
    check.className = 'wf-check';
    check.type = 'button';
    check.textContent = done ? '✓' : String(i+1);
    check.title = done ? 'Mark as not done' : 'Mark as done';
    check.addEventListener('click', (e)=>{ e.stopPropagation(); toggleWorkflowStep(s.id); });

    const label = document.createElement('button');
    label.className = 'wf-label';
    label.type = 'button';
    label.textContent = s.label;
    label.addEventListener('click', ()=> goToCategory(s.mapsTo));

    const est = document.createElement('span');
    est.className = 'wf-est';
    est.textContent = `~${s.est}m`;

    row.appendChild(check);
    row.appendChild(label);
    row.appendChild(est);
    list.appendChild(row);
  });
  panel.appendChild(list);
}

/* ---------- Recon Checklist panel ---------- */
function toggleChecklistItem(id){
  const i = persist.checklist.checked.indexOf(id);
  const wasChecking = i === -1;
  if(i > -1) persist.checklist.checked.splice(i, 1);
  else persist.checklist.checked.push(id);
  if(wasChecking){
    const item = CHECKLIST_ITEMS.find(c=>c.id===id);
    if(item) logTimelineEvent('checklist', `Checklist: ${item.label}`);
  }
  savePersist(persist);
  renderPanel();
  renderStats();
}

function renderChecklistPanel(panel){
  const checked = persist.checklist.checked;
  const head = document.createElement('div');
  head.className = 'panel-head';
  head.innerHTML = `<div><h2>Recon Checklist</h2><p>A flat pass/fail list for a final review before wrapping up. Persists locally per browser.</p></div>`;
  panel.appendChild(head);

  const bar = document.createElement('div');
  bar.className = 'progress-bar';
  bar.innerHTML = `<div class="progress-fill" style="width:${Math.round((checked.length/CHECKLIST_ITEMS.length)*100)}%"></div>`;
  panel.appendChild(bar);

  const list = document.createElement('div');
  list.className = 'checklist';
  CHECKLIST_ITEMS.forEach(item=>{
    const done = checked.includes(item.id);
    const row = document.createElement('label');
    row.className = 'checklist-item' + (done ? ' done' : '');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = done;
    cb.addEventListener('change', ()=> toggleChecklistItem(item.id));
    const span = document.createElement('span');
    span.textContent = item.label;
    row.appendChild(cb);
    row.appendChild(span);
    list.appendChild(row);
  });
  panel.appendChild(list);
}

/* ---------- Saved Sessions ---------- */
function snapshotSession(name){
  return {
    id: uid(),
    name: name || `Session ${Object.keys(persist.sessions).length + 1}`,
    savedAt: Date.now(),
    domains: [...state.domains],
    viewDomain: state.viewDomain,
    engine: state.engine,
    dateFilter: state.dateFilter,
    customFrom: state.customFrom,
    customTo: state.customTo,
    activeCat: state.activeCat,
    workflowCompleted: [...persist.workflow.completed],
    checklistChecked: [...persist.checklist.checked],
    favorites: JSON.parse(JSON.stringify(persist.favorites)),
  };
}

function saveSession(name){
  const s = snapshotSession(name);
  persist.sessions[s.id] = s;
  savePersist(persist);
  showToast(`Session "${s.name}" saved.`);
  if(state.activeCat === 'sessions') renderPanel();
  renderStats();
}

function loadSession(id){
  const s = persist.sessions[id];
  if(!s) return;
  state.domains = [...(s.domains || [])];
  state.viewDomain = s.viewDomain || 'all';
  state.engine = s.engine || 'google';
  state.dateFilter = s.dateFilter || 'any';
  state.customFrom = s.customFrom || '';
  state.customTo = s.customTo || '';
  state.activeCat = s.activeCat || 'subdomains';
  persist.workflow.completed = [...(s.workflowCompleted || [])];
  persist.checklist.checked = [...(s.checklistChecked || [])];
  persist.favorites = JSON.parse(JSON.stringify(s.favorites || []));
  savePersist(persist);
  syncStaticControls();
  renderAll();
  showToast(`Session "${s.name}" loaded.`);
}

function renameSession(id){
  const s = persist.sessions[id];
  if(!s) return;
  const name = prompt('Rename session:', s.name);
  if(name === null) return;
  s.name = name.trim() || s.name;
  savePersist(persist);
  renderPanel();
}

function duplicateSession(id){
  const s = persist.sessions[id];
  if(!s) return;
  const copy = JSON.parse(JSON.stringify(s));
  copy.id = uid();
  copy.name = `${s.name} (copy)`;
  copy.savedAt = Date.now();
  persist.sessions[copy.id] = copy;
  savePersist(persist);
  renderPanel();
  showToast('Session duplicated.');
}

function deleteSession(id){
  const s = persist.sessions[id];
  if(!s) return;
  if(!confirm(`Delete session "${s.name}"? This cannot be undone.`)) return;
  delete persist.sessions[id];
  savePersist(persist);
  renderPanel();
  renderStats();
}

function exportSessionJSON(id){
  const s = persist.sessions[id];
  if(!s) return;
  downloadFile(`reconql-session-${s.name.replace(/[^a-z0-9_-]/gi,'_')}.json`, JSON.stringify(s, null, 2), 'application/json');
}

function importSessionFromFile(file){
  const reader = new FileReader();
  reader.onload = ()=>{
    try{
      const parsed = JSON.parse(reader.result);
      const s = { ...parsed, id: uid(), savedAt: Date.now() };
      if(!s.name) s.name = 'Imported session';
      persist.sessions[s.id] = s;
      savePersist(persist);
      renderPanel();
      renderStats();
      showToast(`Imported session "${s.name}".`);
    }catch(e){
      showToast('Could not import — invalid session file.');
    }
  };
  reader.readAsText(file);
}

function renderSessionsPanel(panel){
  const head = document.createElement('div');
  head.className = 'panel-head';
  head.innerHTML = `<div><h2>Saved Sessions</h2><p>Snapshot the current targets, engine, date filter, workflow progress, checklist, and favorites — restore any of it later.</p></div>`;
  panel.appendChild(head);

  const saveRow = document.createElement('div');
  saveRow.className = 'session-save-row';
  saveRow.innerHTML = `
    <input type="text" id="newSessionName" placeholder="Session name (optional)">
    <button class="btn primary" id="saveSessionBtn" type="button">Save current as session</button>
    <button class="btn" id="importSessionBtn" type="button">Import JSON</button>
  `;
  panel.appendChild(saveRow);
  document.getElementById('saveSessionBtn').addEventListener('click', ()=>{
    const name = document.getElementById('newSessionName').value.trim();
    saveSession(name);
    document.getElementById('newSessionName').value = '';
  });
  document.getElementById('importSessionBtn').addEventListener('click', ()=> document.getElementById('importSessionFile').click());

  const ids = Object.keys(persist.sessions).sort((a,b)=>persist.sessions[b].savedAt - persist.sessions[a].savedAt);
  if(!ids.length){
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = 'No saved sessions yet.';
    panel.appendChild(empty);
    return;
  }

  const list = document.createElement('div');
  list.className = 'session-list';
  ids.forEach(id=>{
    const s = persist.sessions[id];
    const row = document.createElement('div');
    row.className = 'session-row';
    row.innerHTML = `
      <div class="session-info">
        <strong>${escapeHtml(s.name)}</strong>
        <span>${escapeHtml((s.domains||[]).join(', ') || 'no targets')} · saved ${formatDate(s.savedAt)}</span>
      </div>
    `;
    const actions = document.createElement('div');
    actions.className = 'card-actions';
    const mk = (label, fn, cls) => { const b = document.createElement('button'); b.className = cls || 'btn'; b.type='button'; b.textContent = label; b.addEventListener('click', fn); return b; };
    actions.appendChild(mk('Load', ()=>loadSession(id), 'btn primary'));
    actions.appendChild(mk('Rename', ()=>renameSession(id)));
    actions.appendChild(mk('Duplicate', ()=>duplicateSession(id)));
    actions.appendChild(mk('Export', ()=>exportSessionJSON(id)));
    actions.appendChild(mk('Delete', ()=>deleteSession(id), 'btn ghost'));
    row.appendChild(actions);
    list.appendChild(row);
  });
  panel.appendChild(list);
}

/* ---------- Favorites panel ---------- */
function renderFavoritesPanel(panel){
  const head = document.createElement('div');
  head.className = 'panel-head';
  head.innerHTML = `<div><h2>Favorites</h2><p>Starred queries from any category, plus any custom queries you\u2019ve favorited from the builder.</p></div>`;
  panel.appendChild(head);

  if(!persist.favorites.length){
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = 'No favorites yet — click the star on any query card to add one.';
    panel.appendChild(empty);
    return;
  }

  const c = ctxFor(currentTargets());
  const grid = document.createElement('div');
  grid.className = 'card-grid';
  persist.favorites.forEach(fav=>{
    let query, label, catId;
    if(fav.type === 'preset'){
      const cat = CATEGORIES.find(cc=>cc.id===fav.catId);
      const dork = cat && cat.dorks[fav.dorkIndex];
      if(!dork) return;
      query = dork.q(c); label = dork.t; catId = cat.id;
    } else {
      query = fav.query; label = fav.label; catId = 'custom';
    }
    const card = document.createElement('div');
    card.className = 'dork-card';
    const titleRow = document.createElement('div');
    titleRow.className = 'card-title-row';
    const h3 = document.createElement('h3'); h3.textContent = label;
    const rm = document.createElement('button');
    rm.className = 'star-btn on';
    rm.type = 'button';
    rm.title = 'Remove from favorites';
    rm.textContent = '★';
    rm.addEventListener('click', ()=> removeFavorite(fav.id));
    titleRow.appendChild(h3);
    titleRow.appendChild(rm);
    const qDiv = document.createElement('div'); qDiv.className = 'dork-query'; qDiv.textContent = query;
    const actions = makeCardActions(query, label, catId);
    card.appendChild(titleRow); card.appendChild(qDiv); card.appendChild(actions);
    grid.appendChild(card);
  });
  panel.appendChild(grid);
}

/* ---------- Search History panel ---------- */
function renderHistoryPanel(panel){
  const head = document.createElement('div');
  head.className = 'panel-head';
  head.innerHTML = `<div><h2>Search History</h2><p>The last ${persist.history.length} of up to 50 searches opened from this browser.</p></div>`;
  const right = document.createElement('div');
  right.className = 'panel-head-right';
  const exportBtn = document.createElement('button');
  exportBtn.className = 'copy-all'; exportBtn.type = 'button'; exportBtn.textContent = 'Export history';
  exportBtn.addEventListener('click', ()=>{
    const lines = persist.history.map(h=>`${formatDate(h.ts)} | ${h.engine} | ${h.target} | ${h.label} | ${h.query}`);
    downloadFile('reconql-history.txt', lines.join('\n'), 'text/plain');
  });
  const clearBtn = document.createElement('button');
  clearBtn.className = 'copy-all'; clearBtn.type = 'button'; clearBtn.textContent = 'Clear all';
  clearBtn.addEventListener('click', ()=>{
    if(!persist.history.length) return;
    if(confirm('Clear all search history? This cannot be undone.')){
      persist.history = [];
      savePersist(persist);
      renderPanel();
      renderStats();
    }
  });
  right.appendChild(exportBtn);
  right.appendChild(clearBtn);
  head.appendChild(right);
  panel.appendChild(head);

  if(!persist.history.length){
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = 'No searches opened yet in this browser.';
    panel.appendChild(empty);
    return;
  }

  const list = document.createElement('div');
  list.className = 'history-list';
  persist.history.forEach(h=>{
    const row = document.createElement('div');
    row.className = 'history-row';
    row.innerHTML = `
      <div class="history-meta">
        <span class="history-ts">${formatDate(h.ts)}</span>
        <span class="history-engine">${escapeHtml(h.engine)}</span>
        <span class="history-target">${escapeHtml(h.target)}</span>
      </div>
      <div class="dork-query">${escapeHtml(h.query)}</div>
    `;
    const actions = document.createElement('div');
    actions.className = 'card-actions';
    const copyBtn = document.createElement('button');
    copyBtn.className = 'btn'; copyBtn.type = 'button'; copyBtn.textContent = 'Copy';
    copyBtn.addEventListener('click', ()=>copyWithFeedback(h.query, copyBtn));
    const delBtn = document.createElement('button');
    delBtn.className = 'btn ghost'; delBtn.type = 'button'; delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', ()=>{
      persist.history = persist.history.filter(x=>x.id!==h.id);
      savePersist(persist);
      renderPanel();
      renderStats();
    });
    actions.appendChild(copyBtn);
    actions.appendChild(delBtn);
    row.appendChild(actions);
    list.appendChild(row);
  });
  panel.appendChild(list);
}

/* ---------- Custom Query Builder ---------- */
function readList(id){
  return document.getElementById(id).value.split(',').map(s=>s.trim()).filter(Boolean);
}

function renderFiletypeChips(){
  const wrap = document.getElementById('filetypeChips');
  wrap.innerHTML = '';
  FILETYPES.forEach(ft=>{
    const chip = document.createElement('span');
    chip.className = 'chip' + (state.filetypes.has(ft) ? ' on' : '');
    chip.textContent = ft;
    chip.addEventListener('click', ()=>{
      if(state.filetypes.has(ft)) state.filetypes.delete(ft); else state.filetypes.add(ft);
      renderFiletypeChips();
      renderBuilder();
    });
    wrap.appendChild(chip);
  });
}

function buildCustomQuery(){
  const targets = currentTargets();
  const parts = [];

  if(state.scope === 'target') parts.push(siteClause(targets));
  else if(state.scope !== 'none') parts.push(`site:${state.scope}`);
  if(state.scope !== 'target') parts.push(mentionClause(targets));

  if(state.filetypes.size){
    const fts = [...state.filetypes].map(f=>`filetype:${f}`).join(' OR ');
    parts.push(state.filetypes.size > 1 ? `(${fts})` : fts);
  }

  const must = readList('mustInput');
  if(must.length){
    const clause = must.map(w=> w.includes(' ') ? `intext:"${w}"` : `intext:${w}`).join(' OR ');
    parts.push(must.length > 1 ? `(${clause})` : clause);
  }

  const andTerms = readList('andInput');
  andTerms.forEach(w=> parts.push(w.includes(' ') ? `intext:"${w}"` : `intext:${w}`));

  const inurl = readList('inurlInput');
  if(inurl.length){
    const clause = inurl.map(w=>`inurl:${w.replace(/\s+/g,'')}`).join(' OR ');
    parts.push(inurl.length > 1 ? `(${clause})` : clause);
  }

  const intitle = readList('intitleInput');
  if(intitle.length){
    const clause = intitle.map(w=> w.includes(' ') ? `intitle:"${w}"` : `intitle:${w}`).join(' OR ');
    parts.push(intitle.length > 1 ? `(${clause})` : clause);
  }

  const exclude = readList('excludeInput');
  exclude.forEach(w=> parts.push(w.includes(' ') ? `-intext:"${w}"` : `-intext:${w}`));

  const t1 = document.getElementById('aroundTerm1').value.trim();
  const t2 = document.getElementById('aroundTerm2').value.trim();
  const dist = document.getElementById('aroundDistance').value.trim();
  if(t1 && t2) parts.push(`"${t1}" AROUND(${dist || 5}) "${t2}"`);

  const before = document.getElementById('beforeDateInput').value;
  const after = document.getElementById('afterDateInput').value;
  if(before) parts.push(`before:${before}`);
  if(after) parts.push(`after:${after}`);

  const cache = document.getElementById('cacheInput').value.trim();
  if(cache) parts.push(`cache:${cache}`);

  const related = document.getElementById('relatedInput').value.trim();
  if(related) parts.push(`related:${related}`);

  return parts.filter(Boolean).join(' ') || siteClause(targets);
}

function renderBuilder(){
  const query = buildCustomQuery();
  document.getElementById('builderQuery').textContent = query;
  document.getElementById('builderOpen').href = engineUrl(state.engine, query, state.dateFilter, state.customFrom, state.customTo);
  const warnings = validateQueryForEngine(query, state.engine);
  const warnEl = document.getElementById('builderWarning');
  if(warnEl){
    warnEl.textContent = warnings.length ? '⚠ ' + warnings.join(' ') : '';
    warnEl.style.display = warnings.length ? 'block' : 'none';
  }
}

/* ---------- Advanced Export ---------- */
function collectFullReconData(){
  const targets = currentTargets();
  const c = ctxFor(targets);
  const categories = CATEGORIES.map(cat=>({
    id: cat.id, title: cat.title, num: cat.num,
    dorks: cat.dorks.map(d=>({ title: d.t, query: d.q(c) })),
  }));
  return {
    tool: 'ReconQL',
    generatedAt: new Date().toISOString(),
    targets,
    engine: state.engine,
    workflowProgress: `${persist.workflow.completed.length}/${WORKFLOW_STEPS.length} (${workflowPercent()}%)`,
    checklistProgress: `${persist.checklist.checked.length}/${CHECKLIST_ITEMS.length}`,
    categories,
  };
}

function toPlainText(data){
  const lines = [
    `ReconQL recon set — ${data.targets.join(', ')}`,
    `Generated: ${data.generatedAt}`,
    `Engine: ${data.engine}`,
    `Workflow: ${data.workflowProgress}`,
    `Checklist: ${data.checklistProgress}`,
    '',
  ];
  data.categories.forEach(cat=>{
    lines.push(`## ${cat.num} ${cat.title}`);
    cat.dorks.forEach(d=> lines.push(`${d.title}: ${d.query}`));
    lines.push('');
  });
  return lines.join('\n');
}

function toMarkdown(data){
  const lines = [
    '# ReconQL Recon Set', '',
    `**Targets:** ${data.targets.join(', ')}  `,
    `**Generated:** ${data.generatedAt}  `,
    `**Engine:** ${data.engine}  `,
    `**Workflow progress:** ${data.workflowProgress}  `,
    `**Checklist progress:** ${data.checklistProgress}`,
    '',
  ];
  data.categories.forEach(cat=>{
    lines.push(`## ${cat.num} ${cat.title}`, '', '| Query | Search |', '|---|---|');
    cat.dorks.forEach(d=> lines.push(`| ${d.title} | \`${d.query.replace(/\|/g,'\\|')}\` |`));
    lines.push('');
  });
  return lines.join('\n');
}

function toCsv(data){
  const rows = [['category','query_title','query']];
  data.categories.forEach(cat=> cat.dorks.forEach(d=> rows.push([cat.title, d.title, d.query])));
  return rows.map(r=>r.map(csvEscape).join(',')).join('\n');
}

function toHtmlReport(data){
  const catsHtml = data.categories.map(cat=>`
    <section>
      <h2>${escapeHtml(cat.num)} — ${escapeHtml(cat.title)}</h2>
      <table>
        <thead><tr><th>Query</th><th>Search</th></tr></thead>
        <tbody>${cat.dorks.map(d=>`<tr><td>${escapeHtml(d.title)}</td><td><code>${escapeHtml(d.query)}</code></td></tr>`).join('')}</tbody>
      </table>
    </section>`).join('');
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>ReconQL Report — ${escapeHtml(data.targets.join(', '))}</title>
<style>
body{font-family:-apple-system,"Segoe UI",Inter,sans-serif;max-width:960px;margin:40px auto;padding:0 20px;color:#1a1f26;}
h1{margin-bottom:4px;} .meta{color:#5c6773;font-size:14px;margin-bottom:24px;}
h2{margin-top:36px;border-bottom:1px solid #ddd;padding-bottom:6px;font-size:18px;}
table{width:100%;border-collapse:collapse;margin-top:10px;}
th,td{text-align:left;padding:8px 10px;border-bottom:1px solid #eee;font-size:13px;vertical-align:top;}
th{color:#5c6773;font-weight:600;}
code{font-family:"JetBrains Mono",monospace;background:#f4f4f4;padding:2px 5px;border-radius:3px;word-break:break-word;}
</style></head><body>
<h1>ReconQL Recon Report</h1>
<div class="meta">Targets: ${escapeHtml(data.targets.join(', '))} &middot; Generated: ${escapeHtml(data.generatedAt)} &middot; Engine: ${escapeHtml(data.engine)} &middot; Workflow: ${escapeHtml(data.workflowProgress)} &middot; Checklist: ${escapeHtml(data.checklistProgress)}</div>
${catsHtml}
</body></html>`;
}

function exportAs(format){
  const data = collectFullReconData();
  const targetLabel = (data.targets.join('_').replace(/[^a-z0-9_.-]/gi,'') || 'reconql').slice(0,60);
  if(format === 'copy'){
    copyTextToClipboard(toPlainText(data)).then(()=>showToast('Full recon set copied to clipboard.'));
    return;
  }
  if(format === 'txt') return downloadFile(`reconql-${targetLabel}.txt`, toPlainText(data), 'text/plain');
  if(format === 'md') return downloadFile(`reconql-${targetLabel}.md`, toMarkdown(data), 'text/markdown');
  if(format === 'json') return downloadFile(`reconql-${targetLabel}.json`, JSON.stringify(data, null, 2), 'application/json');
  if(format === 'csv') return downloadFile(`reconql-${targetLabel}.csv`, toCsv(data), 'text/csv');
  if(format === 'html') return downloadFile(`reconql-${targetLabel}.html`, toHtmlReport(data), 'text/html');
}

/* ---------- Sync static controls after a session load ---------- */
function syncStaticControls(){
  document.getElementById('domainInput').value = state.domains.join('\n');
  [...document.querySelectorAll('#engineOptions button')].forEach(b=>{
    b.classList.toggle('active', b.dataset.engine === state.engine);
  });
  document.getElementById('dateFilterSelect').value = state.dateFilter;
  document.getElementById('customFromInput').value = state.customFrom || '';
  document.getElementById('customToInput').value = state.customTo || '';
  document.getElementById('customDateRow').style.display = state.dateFilter === 'custom' ? 'flex' : 'none';
}

/* ---------- Master render ---------- */
function renderAll(){
  renderDomainChips();
  renderViewToggle();
  renderStats();
  renderSidebar();
  renderPanel();
  renderBuilder();
}
