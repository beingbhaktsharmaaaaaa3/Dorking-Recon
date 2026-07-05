/* ==========================================================================
   ReconQL — app.js
   Global state + persisted data, event wiring, keyboard shortcuts, init.
   Loaded last, after data.js / utils.js / storage.js / render.js.
   ========================================================================== */

let state = {
  domains: [],
  viewDomain: 'all',
  engine: 'google',
  dateFilter: 'any',
  customFrom: '',
  customTo: '',
  activeCat: 'subdomains',
  scope: 'target',
  filetypes: new Set(),
  sidebarFilter: '',
  openDelay: 1000,
  lastCard: null,
  visitedCats: new Set(),
};

let persist = loadPersist();

function currentTargets(){
  if(state.domains.length === 0) return [DEFAULT_TARGET];
  if(state.viewDomain !== 'all') return [state.viewDomain];
  return state.domains;
}

/* ---------- Domain input ---------- */
document.getElementById('domainInput').addEventListener('input', debounce((e)=>{
  state.domains = parseDomains(e.target.value);
  if(state.viewDomain !== 'all' && !state.domains.includes(state.viewDomain)) state.viewDomain = 'all';
  state.domains.forEach(addRecentTarget);
  renderDomainChips();
  renderRecentTargets();
  renderViewToggle();
  renderStats();
  renderPanel();
  renderBuilder();
}, 150));

/* ---------- Engine toggle ---------- */
document.getElementById('engineOptions').addEventListener('click', (e)=>{
  const btn = e.target.closest('button[data-engine]');
  if(!btn) return;
  state.engine = btn.dataset.engine;
  [...document.querySelectorAll('#engineOptions button')].forEach(b=>b.classList.toggle('active', b===btn));
  renderBuilder();
});

/* ---------- Date filter ---------- */
document.getElementById('dateFilterSelect').addEventListener('change', (e)=>{
  state.dateFilter = e.target.value;
  document.getElementById('customDateRow').style.display = state.dateFilter === 'custom' ? 'flex' : 'none';
  renderBuilder();
});
document.getElementById('customFromInput').addEventListener('change', (e)=>{ state.customFrom = e.target.value; renderBuilder(); });
document.getElementById('customToInput').addEventListener('change', (e)=>{ state.customTo = e.target.value; renderBuilder(); });

/* ---------- Open delay (category runner) ---------- */
document.getElementById('openDelaySelect').addEventListener('change', (e)=>{
  state.openDelay = parseInt(e.target.value, 10) || 1000;
});

/* ---------- Advanced export buttons ---------- */
document.getElementById('exportButtons').addEventListener('click', (e)=>{
  const btn = e.target.closest('button[data-format]');
  if(!btn) return;
  exportAs(btn.dataset.format);
});

/* ---------- Sidebar filter + collapse ---------- */
document.getElementById('sidebarFilter').addEventListener('input', debounce((e)=>{
  state.sidebarFilter = e.target.value;
  renderSidebar();
}, 120));

document.getElementById('sidebarCollapseBtn').addEventListener('click', ()=>{
  persist.ui.sidebarCollapsed = !persist.ui.sidebarCollapsed;
  savePersist(persist);
  document.getElementById('layoutRoot').classList.toggle('sidebar-collapsed', persist.ui.sidebarCollapsed);
});

/* ---------- Builder fields ---------- */
document.getElementById('scopeSelect').addEventListener('change', (e)=>{ state.scope = e.target.value; renderBuilder(); });
['mustInput','excludeInput','inurlInput','intitleInput','andInput','aroundTerm1','aroundTerm2','aroundDistance','cacheInput','relatedInput'].forEach(id=>{
  document.getElementById(id).addEventListener('input', debounce(renderBuilder, 120));
});
['beforeDateInput','afterDateInput'].forEach(id=>{
  document.getElementById(id).addEventListener('change', renderBuilder);
});
document.getElementById('builderCopy').addEventListener('click', (e)=>{
  copyWithFeedback(document.getElementById('builderQuery').textContent, e.currentTarget);
});
document.getElementById('builderOpen').addEventListener('click', ()=>{
  const query = document.getElementById('builderQuery').textContent;
  addHistory({ engine: state.engine, target: currentTargets().join(', '), query, label: 'Custom builder', catId: 'builder' });
});
document.getElementById('builderFavorite').addEventListener('click', ()=>{
  const query = document.getElementById('builderQuery').textContent;
  addCustomFavorite(query, 'Custom builder query');
});

/* ---------- Command palette ---------- */
document.getElementById('paletteBtn').addEventListener('click', openCommandPalette);
document.getElementById('commandPalette').addEventListener('click', (e)=>{
  if(e.target.id === 'commandPalette') closeCommandPalette();
});
document.getElementById('paletteInput').addEventListener('input', (e)=> filterCommandResults(e.target.value));
document.getElementById('paletteInput').addEventListener('keydown', (e)=>{
  if(e.key === 'ArrowDown'){
    e.preventDefault();
    paletteActiveIndex = Math.min(paletteActiveIndex + 1, paletteCurrentResults.length - 1);
    renderPaletteResults();
  } else if(e.key === 'ArrowUp'){
    e.preventDefault();
    paletteActiveIndex = Math.max(paletteActiveIndex - 1, 0);
    renderPaletteResults();
  } else if(e.key === 'Enter'){
    e.preventDefault();
    executeCommandItem(paletteCurrentResults[paletteActiveIndex]);
  } else if(e.key === 'Escape'){
    closeCommandPalette();
  }
});

/* ---------- Accent picker ---------- */
document.getElementById('accentPicker').addEventListener('click', ()=>{}); // populated by renderAccentPicker

/* ---------- Saved sessions: import file input ---------- */
document.getElementById('importSessionFile').addEventListener('change', (e)=>{
  const file = e.target.files[0];
  if(file) importSessionFromFile(file);
  e.target.value = '';
});

document.getElementById('customPackFile').addEventListener('change', (e)=>{
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ()=> importCustomPackJson(reader.result);
  reader.readAsText(file);
  e.target.value = '';
});

/* ---------- Builder autocomplete datalists ---------- */
function populateDatalist(id, values){
  const el = document.getElementById(id);
  el.innerHTML = values.map(v=>`<option value="${escapeHtml(v)}"></option>`).join('');
}

/* ---------- Help modal ---------- */
function toggleHelpModal(force){
  const modal = document.getElementById('helpModal');
  const show = force !== undefined ? force : !modal.classList.contains('show');
  modal.classList.toggle('show', show);
}
document.getElementById('helpModalClose').addEventListener('click', ()=> toggleHelpModal(false));
document.getElementById('helpModal').addEventListener('click', (e)=>{
  if(e.target.id === 'helpModal') toggleHelpModal(false);
});
document.getElementById('helpBtn').addEventListener('click', ()=> toggleHelpModal(true));

/* ---------- Keyboard shortcuts ---------- */
function getShortcutTarget(){
  if(state.lastCard) return state.lastCard;
  const card = document.querySelector('#panel .dork-card');
  if(card) return { query: card.dataset.query, title: card.dataset.title, catId: card.dataset.cat };
  return null;
}

document.addEventListener('keydown', (e)=>{
  const meta = e.ctrlKey || e.metaKey;

  if(!meta){
    // Plain '?' opens help, but only when not typing in a field
    const tag = (e.target.tagName || '').toLowerCase();
    const typing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;
    if(e.key === '?' && !typing){
      e.preventDefault();
      toggleHelpModal();
    }
    return;
  }

  const key = e.key.toLowerCase();

  if(key === 'k'){
    e.preventDefault();
    openCommandPalette();
  } else if(e.key === 'Enter'){
    e.preventDefault();
    const t = getShortcutTarget();
    if(t) openQuery(t.query, t.title, t.catId);
  } else if(e.shiftKey && key === 'c'){
    e.preventDefault();
    const t = getShortcutTarget();
    if(t) copyTextToClipboard(t.query).then(()=>showToast('Copied focused query.'));
  } else if(key === 's'){
    e.preventDefault();
    saveSession('');
  } else if(e.key === '/'){
    e.preventDefault();
    toggleHelpModal();
  }
});

/* ---------- Init ---------- */
function init(){
  document.getElementById('layoutRoot').classList.toggle('sidebar-collapsed', !!persist.ui.sidebarCollapsed);
  applyTheme(persist.ui.theme || 'dark');
  if(window.matchMedia){
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', ()=>{
      if(persist.ui.theme === 'system') applyTheme('system');
    });
  }
  renderFiletypeChips();
  populateDatalist('mustSuggestions', SUGGEST_MUST);
  populateDatalist('inurlSuggestions', SUGGEST_INURL);
  populateDatalist('intitleSuggestions', SUGGEST_INTITLE);
  renderRecentTargets();
  renderAll();
}
init();
