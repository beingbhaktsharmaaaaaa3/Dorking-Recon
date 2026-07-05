/* ==========================================================================
   ReconQL — storage.js
   All localStorage read/write goes through here. One JSON blob, one key.
   ========================================================================== */

const STORAGE_KEY = 'reconql_state_v1';

function defaultPersist(){
  return {
    favorites: [],           // [{ id, type:'preset'|'custom', catId, dorkIndex, label, query }]
    history: [],             // [{ id, ts, engine, target, query, label, catId }]
    workflow: { completed: [] },
    checklist: { checked: [] },
    sessions: {},             // { [id]: {...snapshot} }
    findings: [],             // [{ id, target, title, severity, status, tags:[], notes, createdAt, updatedAt }]
    timeline: [],             // [{ id, ts, type, label }]
    recentTargets: [],        // [ 'example.com', ... ] most-recent-first
    pinnedCategories: [],     // [ 'subdomains', ... ]
    customCategories: [],     // [ { id, title, note, dorks:[{t, q:string-template}] } ]
    ui: { sidebarCollapsed: false, accent: 'teal', theme: 'dark' },
  };
}

function loadPersist(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return defaultPersist();
    const parsed = JSON.parse(raw);
    const base = defaultPersist();
    return Object.assign(base, parsed, {
      favorites: Array.isArray(parsed.favorites) ? parsed.favorites : base.favorites,
      history: Array.isArray(parsed.history) ? parsed.history : base.history,
      workflow: parsed.workflow && Array.isArray(parsed.workflow.completed) ? parsed.workflow : base.workflow,
      checklist: parsed.checklist && Array.isArray(parsed.checklist.checked) ? parsed.checklist : base.checklist,
      sessions: parsed.sessions && typeof parsed.sessions === 'object' ? parsed.sessions : base.sessions,
      findings: Array.isArray(parsed.findings) ? parsed.findings : base.findings,
      timeline: Array.isArray(parsed.timeline) ? parsed.timeline : base.timeline,
      recentTargets: Array.isArray(parsed.recentTargets) ? parsed.recentTargets : base.recentTargets,
      pinnedCategories: Array.isArray(parsed.pinnedCategories) ? parsed.pinnedCategories : base.pinnedCategories,
      customCategories: Array.isArray(parsed.customCategories) ? parsed.customCategories : base.customCategories,
      ui: parsed.ui && typeof parsed.ui === 'object' ? Object.assign({}, base.ui, parsed.ui) : base.ui,
    });
  }catch(e){
    console.warn('ReconQL: could not read saved data, starting fresh.', e);
    return defaultPersist();
  }
}

function savePersist(persist){
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persist));
    return true;
  }catch(e){
    console.warn('ReconQL: could not save data (storage full or blocked).', e);
    return false;
  }
}
