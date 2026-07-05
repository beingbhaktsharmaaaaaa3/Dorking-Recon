/* ==========================================================================
   ReconQL — utils.js
   Pure helper functions. No DOM access, no global state mutation.
   ========================================================================== */

/* ---------- Scope clause builders ---------- */
function siteClause(targets){
  return targets.length > 1
    ? `(${targets.map(d=>`site:${d}`).join(' OR ')})`
    : `site:${targets[0]}`;
}
function wildClause(targets){
  const inc = targets.length > 1
    ? `(${targets.map(d=>`site:*.${d}`).join(' OR ')})`
    : `site:*.${targets[0]}`;
  const exc = targets.map(d=>`-site:www.${d}`).join(' ');
  return `${inc} ${exc}`;
}
function mentionClause(targets){
  return targets.length > 1
    ? `(${targets.map(d=>`"${d}"`).join(' OR ')})`
    : `"${targets[0]}"`;
}
function ctxFor(targets){
  return { site: siteClause(targets), wild: wildClause(targets), mention: mentionClause(targets), first: targets[0], n: targets.length };
}

/* ---------- Date filter helpers ---------- */
function toGoogleDateFmt(iso){
  if(!iso) return '';
  const parts = iso.split('-');
  if(parts.length !== 3) return '';
  const [y,m,d] = parts;
  return `${m}/${d}/${y}`;
}

function applyDateFilter(url, engine, dateFilter, customFromIso, customToIso){
  if(!dateFilter || dateFilter === 'any') return url;
  const sep = url.includes('?') ? '&' : '?';

  if(engine === 'bing'){
    const map = { '24h':'filterui:age-lt1440', 'week':'filterui:age-lt10080', 'month':'filterui:age-lt43200', 'year':'filterui:age-lt525600' };
    if(map[dateFilter]) return `${url}${sep}qft=+${map[dateFilter]}`;
    return url; // custom range not supported by Bing's simple qft param
  }
  if(engine === 'ddg'){
    const map = { '24h':'d', 'week':'w', 'month':'m', 'year':'y' };
    if(map[dateFilter]) return `${url}${sep}df=${map[dateFilter]}`;
    return url; // custom range not supported by DuckDuckGo's simple df param
  }
  // Google
  if(dateFilter === 'custom' && customFromIso && customToIso){
    const min = toGoogleDateFmt(customFromIso);
    const max = toGoogleDateFmt(customToIso);
    return `${url}${sep}tbs=cdr:1,cd_min:${min},cd_max:${max}`;
  }
  const map = { '24h':'qdr:d', 'week':'qdr:w', 'month':'qdr:m', 'year':'qdr:y' };
  if(map[dateFilter]) return `${url}${sep}tbs=${map[dateFilter]}`;
  return url;
}

/* ---------- Engine URL builders ---------- */
function engineUrl(engine, query, dateFilter, customFromIso, customToIso){
  const q = encodeURIComponent(query);
  let url;
  if(engine === 'bing') url = `https://www.bing.com/search?q=${q}`;
  else if(engine === 'ddg') url = `https://duckduckgo.com/?q=${q}`;
  else url = `https://www.google.com/search?q=${q}`;
  return applyDateFilter(url, engine, dateFilter, customFromIso, customToIso);
}

function githubCodeUrl(query){
  const stripped = query.replace(/site:\S+\s*/gi, '').trim();
  return `https://github.com/search?q=${encodeURIComponent(stripped)}&type=code`;
}

function githubSearchUrl(query, type){
  return `https://github.com/search?q=${encodeURIComponent(query)}&type=${type === 'commits' ? 'commits' : 'code'}`;
}

/* ---------- GitHub advanced query builder ---------- */
function buildGithubAdvancedQuery(fields){
  const parts = [];
  if(fields.keywords) parts.push(fields.keywords.trim());
  if(fields.org) parts.push(`org:${fields.org.trim()}`);
  if(fields.repo) parts.push(`repo:${fields.repo.trim()}`);
  if(fields.user) parts.push(`user:${fields.user.trim()}`);
  if(fields.filename) parts.push(`filename:${fields.filename.trim()}`);
  if(fields.extension) parts.push(`extension:${fields.extension.trim()}`);
  if(fields.language) parts.push(`language:${fields.language.trim()}`);
  if(fields.path) parts.push(`path:${fields.path.trim()}`);
  if(fields.size) parts.push(`size:${fields.size.trim()}`);
  if(fields.created) parts.push(`created:${fields.created.trim()}`);
  if(fields.pushed) parts.push(`pushed:${fields.pushed.trim()}`);
  if(fields.fork) parts.push(`fork:${fields.fork}`);
  if(fields.archived) parts.push(`archived:${fields.archived}`);
  if(fields.author) parts.push(`author:${fields.author.trim()}`);
  if(fields.committer) parts.push(`committer:${fields.committer.trim()}`);
  if(fields.hash) parts.push(`hash:${fields.hash.trim()}`);
  if(fields.merge) parts.push(`merge:${fields.merge}`);
  return parts.filter(Boolean).join(' ');
}

/* ---------- Base64 (unicode-safe) ---------- */
function b64(str){
  try{ return btoa(unescape(encodeURIComponent(str))); }
  catch(e){ return btoa(str); }
}

/* ---------- Clipboard / download ---------- */
function copyTextToClipboard(str){
  if(navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(str);
  return new Promise((resolve, reject)=>{
    try{
      const ta = document.createElement('textarea');
      ta.value = str;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      resolve();
    }catch(e){ reject(e); }
  });
}

function downloadFile(filename, content, mime){
  const blob = new Blob([content], { type: mime || 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(url), 2000);
}

/* ---------- Misc ---------- */
function escapeHtml(str){
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function csvEscape(str){
  const s = String(str == null ? '' : str);
  if(/[",\n]/.test(s)) return `"${s.replace(/"/g,'""')}"`;
  return s;
}

function debounce(fn, delay){
  let timer = null;
  return function(...args){
    clearTimeout(timer);
    timer = setTimeout(()=>fn.apply(this, args), delay);
  };
}

function uid(){
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
}

function formatDate(ts){
  const d = new Date(ts);
  return d.toLocaleString(undefined, { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
}

function prefersReducedMotion(){
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
