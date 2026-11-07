import { mountRoster, unmountRoster } from './beosztas.js?v=34';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js';

// Dandó vezetői modul: a régi app.js-t és a dando_data rekordot nem módosítja.
const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = value => value ? new Intl.DateTimeFormat('hu-HU', {dateStyle:'medium',timeZone:'Europe/Budapest'}).format(new Date(value.length === 10 ? `${value}T12:00:00Z` : value)) : '—';
function budapestParts(){
  const parts = new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Budapest',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date());
  const val = Object.fromEntries(parts.map(x=>[x.type,x.value]));
  return {date:`${val.year}-${val.month}-${val.day}`,minute:Number(val.hour)*60+Number(val.minute)};
}
const today = () => budapestParts().date;
const toTime = t => (t || '').slice(0,5);
const num = n => Number(n).toLocaleString('hu-HU',{maximumFractionDigits:3});
const idKey = v => String(v||'').replace(/[^a-zA-Z0-9-]/g,'');
const actionLabel = {draft:'Előkészítve',ordered:'Megrendelve',received:'Beérkezett',cancelled:'Visszavonva'};
const priorityLabel = {normal:'Normál',important:'Fontos',urgent:'Sürgős'};
const logStatus = {open:'Nyitott',doing:'Folyamatban',done:'Lezárt'};
const categories = ['Egyéb','Készlet','Pénztár','Dolgozók','Berendezések','Shop','Kültér'];
const checkDefaults = [
  ['Shop rendezettsége','daily'],['Kávégép állapota','daily'],['Hűtők ellenőrzése','daily'],
  ['Mosdók állapota','daily'],['Kültéri terület','daily'],['Polcfeltöltés','daily'],
  ['Lejárati idők áttekintése','weekly'],['Berendezések állapota','weekly']
];
const tableNames = {
  prefs:'manager_preferences', logs:'manager_shift_logs', templates:'manager_checklist_templates',
  checks:'manager_checklist_entries', people:'manager_employees', products:'manager_products',
  movements:'manager_stock_movements', orders:'manager_orders'
};
const state={view:'home',user:null,loaded:false,loading:false,mode:'',editing:null,editorHandler:null,
  prefs:null,logs:[],templates:[],checks:[],people:[],products:[],movements:[],orders:[]};
let supabase=null;
let busy=false;
function showToast(message){const el=$('toast');el.textContent=message;el.classList.remove('hidden');clearTimeout(showToast.timeout);showToast.timeout=setTimeout(()=>el.classList.add('hidden'),5000)}
function setSync(ok,title,subtitle){$('syncLed').classList.toggle('online',ok);$('syncTitle').textContent=title;$('syncSubtitle').textContent=subtitle}
function fail(error){console.error(error);$('errorPanel').textContent=error?.message || String(error);$('errorPanel').classList.remove('hidden');setSync(false,'Hiba','Nem sikerült szinkronizálni')}
function clearError(){$('errorPanel').classList.add('hidden');$('errorPanel').textContent=''}
function requireUser(){if(!state.user)throw Error('Előbb jelentkezz be.');}
async function loadAll(){
  if(!supabase||!state.user||state.loading)return;
  state.loading=true;clearError();setSync(false,'Betöltés…','A felhőből');
  try{
    const queries=[
      supabase.from(tableNames.prefs).select('*').eq('user_id',state.user.id).maybeSingle(),
      supabase.from(tableNames.logs).select('*').order('shift_date',{ascending:false}).order('created_at',{ascending:false}).limit(500),
      supabase.from(tableNames.templates).select('*').order('created_at',{ascending:true}),
      supabase.from(tableNames.checks).select('*').order('checked_at',{ascending:false}).limit(2000),
      supabase.from(tableNames.people).select('*').order('name',{ascending:true}),
      supabase.from(tableNames.products).select('*').order('name',{ascending:true}),
      supabase.from(tableNames.movements).select('*').order('created_at',{ascending:false}).limit(1000),
      supabase.from(tableNames.orders).select('*').order('created_at',{ascending:false}).limit(500)
    ];
    const results=await Promise.all(queries);
    for(const r of results)if(r.error)throw r.error;
    state.prefs=results[0].data;
    for(const [i,key] of ['logs','templates','checks','people','products','movements','orders'].entries())state[key]=results[i+1].data||[];
    state.loaded=true;$('authPanel').classList.add('hidden');$('workspace').classList.remove('hidden');
    $('userLabel').textContent=state.user.email||'';
    setSync(true,'Szinkronizálva',new Date().toLocaleTimeString('hu-HU',{hour:'2-digit',minute:'2-digit'}));
    render();
  }catch(error){fail(new Error('Az adatok nem tölthetők be. Ellenőrizd, hogy lefuttattad-e a supabase-vezeto.sql fájlt. Részlet: '+(error.message||error)));}
  finally{state.loading=false;}
}
async function write(operation,success='Mentve'){
  if(busy)return;
  requireUser();busy=true;clearError();
  try{const r=await operation();if(r?.error)throw r.error;showToast(success);await loadAll();return true;}
  catch(error){fail(error);showToast('A módosítás nem sikerült, nincs mentve a felhőbe.');return false;}
  finally{busy=false;}
}
function controls(title,caption,action,label='＋ Új'){return `<div class="section-head"><div><h2>${title}</h2>${caption?`<p>${caption}</p>`:''}</div><button type="button" class="button primary small" data-action="${action}">${label}</button></div>`}
function pill(text,type=''){return `<span class="pill ${type}">${esc(text)}</span>`}
function shiftLabel(shift){return shift==='one'?esc(state.prefs?.shift_one_name||'Délelőtt'):esc(state.prefs?.shift_two_name||'Délután')}
function currentShift(){
  const p=state.prefs;
  if(!p||!p.shift_one_start||!p.shift_one_end||!p.shift_two_start||!p.shift_two_end)return 'A műszakidők még nincsenek beállítva';
  const min=budapestParts().minute;
  const isInside=(a,b)=>{const from=Number(toTime(a).slice(0,2))*60+Number(toTime(a).slice(3,5)),to=Number(toTime(b).slice(0,2))*60+Number(toTime(b).slice(3,5));return from<to ? min>=from&&min<to : min>=from||min<to;};
  return isInside(p.shift_one_start,p.shift_one_end)?p.shift_one_name:isInside(p.shift_two_start,p.shift_two_end)?p.shift_two_name:'Jelenleg egyik megadott műszak sem aktív';
}
function lowProducts(){return state.products.filter(p=>Number(p.quantity)<=Number(p.minimum));}
function openLogs(){return state.logs.filter(l=>l.status!=='done');}
function weekKey(dateStr){
  const d=new Date(dateStr+'T12:00:00Z');
  const weekday=(d.getUTCDay()+6)%7;
  d.setUTCDate(d.getUTCDate()-weekday+3);
  const firstThu=new Date(Date.UTC(d.getUTCFullYear(),0,4));
  const w=1+Math.round((d-firstThu)/604800000);
  return `${d.getUTCFullYear()}-W${String(w).padStart(2,'0')}`;
}
function periodKey(t){return t.cadence==='weekly'?weekKey(today()):today();}
function checkRecord(t){return state.checks.find(c=>c.template_id===t.id&&c.period_key===periodKey(t));}
function dashboard(){
  const active=state.templates.filter(t=>t.enabled);
  const completed=active.filter(t=>checkRecord(t)?.status==='ok').length;
  const latest=state.logs.slice(0,5);
  return `<section class="hero"><span class="eyebrow">VEZETŐHELYETTESI ÁTTEKINTÉS</span><h2>Ma is minden egy helyen.</h2><p>${esc(fmt(today()))} · ${esc(currentShift())}</p></section>
  <div class="metrics"><article class="metric"><span>NYITOTT ESEMÉNY</span><strong>${openLogs().length}</strong><small>Műszaknapló</small></article><article class="metric"><span>ELLENŐRIZVE</span><strong>${completed}/${active.length}</strong><small>Aktuális napi/heti pontok</small></article><article class="metric"><span>KÉSZLETHATÁRON</span><strong>${lowProducts().length}</strong><small>Minimumon vagy az alatt</small></article><article class="metric"><span>RENDELÉS FOLYAMATBAN</span><strong>${state.orders.filter(x=>x.status==='draft'||x.status==='ordered').length}</strong><small>Előkészítve vagy megrendelve</small></article></div>
  <div class="columns"><div class="stack"><section class="panel">${controls('Fontos események','A legutóbbi műszaknapló-bejegyzések','new-log')}${latest.length?`<div class="list-timeline">${latest.map(l=>`<article class="timeline-item"><small>${esc(l.shift_date)} · ${shiftLabel(l.shift_type)}</small><h3>${esc(l.title)} ${l.priority==='urgent'?pill('Sürgős','red'):''}</h3><p>${esc(l.details).slice(0,180)}</p>${pill(logStatus[l.status]||l.status,l.status==='done'?'green':'orange')}</article>`).join('')}</div>`:'<div class="empty">Nincs még műszaknapló-bejegyzés.</div>'}</section></div>
  <div class="stack"><section class="panel">${controls('Figyelmet igényel','Teendők egy helyen','new-product','＋ Termék')}<div>${lowProducts().slice(0,7).map(p=>`<div class="summary-row"><div><strong>${esc(p.name)}</strong><br><small>${num(p.quantity)} ${esc(p.unit)} / min. ${num(p.minimum)}</small></div>${pill('Készlet','red')}</div>`).join('')||'<div class="empty">Nincs készlethatáron lévő termék.</div>'}</div></section>
  <section class="panel"><div class="section-head"><div><h2>Gyorsműveletek</h2><p>Egy kattintással</p></div></div><div class="field-group"><button class="button quiet" data-action="new-log">＋ Új naplóbejegyzés</button><button class="button quiet" data-action="new-order">＋ Új rendelés</button><button class="button quiet" data-action="new-employee">＋ Dolgozó rögzítése</button><button class="button quiet" data-view="settings">⚙ Műszakidők beállítása</button></div></section></div></div>`;
}
function renderLogs(){return `<section class="panel">${controls('Műszaknapló','Délelőtti és délutáni események','new-log')}
  <div class="toolbar"><label>Szűrés<select id="logFilter"><option value="all">Minden bejegyzés</option><option value="open">Nyitottak</option><option value="urgent">Sürgősek</option></select></label></div>
  <div class="table-wrap"><table class="data-table"><thead><tr><th>Dátum / műszak</th><th>Esemény</th><th>Kategória</th><th>Prioritás</th><th>Állapot</th><th>Művelet</th></tr></thead><tbody id="logRows"></tbody></table></div>
  <p class="hint">A módosítások azonnal a felhőbe kerülnek. Régi eseményeket a szerkesztés gombbal frissíthetsz.</p></section>`}
function fillLogRows(){const select=$('logFilter'),el=$('logRows');if(!el)return;const f=select?.value||'all';const items=state.logs.filter(l=>f==='all'||(f==='open'?l.status!=='done':l.priority==='urgent'));el.innerHTML=items.map(l=>`<tr><td>${esc(l.shift_date)}<small>${shiftLabel(l.shift_type)}</small></td><td><strong>${esc(l.title)}</strong><small class="inline-detail">${esc(l.details).slice(0,130)}</small></td><td>${esc(l.category)}</td><td>${pill(priorityLabel[l.priority],l.priority==='urgent'?'red':l.priority==='important'?'orange':'')}</td><td>${pill(logStatus[l.status],l.status==='done'?'green':'orange')}</td><td><div class="actions"><button class="mini-button" data-action="edit-log" data-id="${idKey(l.id)}">Szerkesztés</button><button class="mini-button" data-action="delete-log" data-id="${idKey(l.id)}">Törlés</button></div></td></tr>`).join('')||'<tr><td colspan="6"><div class="empty">Nincs ilyen bejegyzés.</div></td></tr>';}
function renderChecks(){const ts=state.templates.filter(t=>t.enabled);return `<section class="panel">${controls('Napi és heti ellenőrzések','A lista minta, nem helyettesíti a munkahelyi előírásokat','new-check','＋ Ellenőrzési pont')}
 <div class="toolbar"><button type="button" class="button quiet small" data-action="seed-checks">Mintalista hozzáadása</button><span class="hint">A napi elemek naponta, a hetiek ISO-hét szerint újulnak meg.</span></div>
 <div class="check-list">${ts.map(t=>{const c=checkRecord(t);return `<article class="check-item"><div class="grow"><strong>${esc(t.title)}</strong><small>${t.cadence==='daily'?'Napi':'Heti'} · ${c?`Ellenőrizve: ${fmt(c.checked_at)}`:'Még nincs ellenőrizve'}${c?.note?` · ${esc(c.note)}`:''}</small></div><div class="row-actions"><button class="mini-button ${c?.status==='ok'?'picked':''}" data-action="check-ok" data-id="${idKey(t.id)}">✓ Rendben</button><button class="mini-button ${c?.status==='problem'?'problem':''}" data-action="check-problem" data-id="${idKey(t.id)}">! Probléma</button><button class="mini-button" data-action="reset-check" data-id="${idKey(t.id)}" title="Ellenőrzés visszavonása">↺</button><button class="mini-button" data-action="edit-check" data-id="${idKey(t.id)}" title="Szerkesztés">✎</button></div></article>`}).join('')||'<div class="empty">Még nincs ellenőrzőlista. Hozz létre saját pontokat, vagy töltsd be a mintalistát.</div>'}</div></section>`}
function renderStock(){const low=lowProducts();return `<section class="panel">${controls('Készletfigyelő','Kézzel vezetett készlet – minden változtatás naplózva','new-product','＋ Új termék')}
  <div class="toolbar"><span>${pill(`${state.products.length} termék`)}</span><span>${pill(`${low.length} készlethatáron`,low.length?'red':'green')}</span><span class="hint">Raktári adatokat nem kérünk le MOL-rendszerből.</span></div>
  <div class="item-grid">${state.products.map(p=>`<article class="product-card"><small>${esc(p.category||'Egyéb')}</small><h3>${esc(p.name)}</h3><div class="quantity">${num(p.quantity)} <small>${esc(p.unit)}</small></div>${Number(p.quantity)<=Number(p.minimum)?pill('Minimumon / hiány','red'):pill('Rendben','green')}<p class="hint">Minimum: ${num(p.minimum)} · Cél: ${num(p.target)}</p><div class="actions"><button class="button small quiet" data-action="adjust-stock" data-id="${idKey(p.id)}">± Készlet</button><button class="button small quiet" data-action="edit-product" data-id="${idKey(p.id)}">Szerkesztés</button></div></article>`).join('')||'<div class="empty">Nincs még terméked.</div>'}</div>
  <div class="note">Új termék 0 készlettel jön létre. A kezdőmennyiséget a „± Készlet” gombbal rögzítheted, így annak is marad naplója. A készletváltozásokat a rendszer atomi adatbázis-művelettel végzi.</div></section>
 <section class="panel" style="margin-top:16px"><div class="section-head"><h2>Utolsó készletmozgások</h2></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Időpont</th><th>Termék</th><th>Változás</th><th>Új mennyiség</th><th>Megjegyzés</th></tr></thead><tbody>${state.movements.slice(0,25).map(m=>`<tr><td>${fmt(m.created_at)}</td><td>${esc(state.products.find(p=>p.id===m.product_id)?.name||'Archivált termék')}</td><td>${num(m.delta)}</td><td>${num(m.quantity_after)}</td><td>${esc(m.note)}</td></tr>`).join('')||'<tr><td colspan="5">Még nincs készletmozgás.</td></tr>'}</tbody></table></div></section>`}
function renderOrders(){return `<section class="panel">${controls('Rendelések','Beszállítók és többtételes rendelések','new-order','＋ Új rendelés')}
 <div class="note">Beérkezettnek jelöléskor a készlet <strong>nem frissül automatikusan</strong>. A tényleges átvett mennyiségeket külön, a Készlet menüben kell rögzítened.</div>
 <div class="table-wrap"><table class="data-table"><thead><tr><th>Létrehozva</th><th>Beszállító</th><th>Tételek</th><th>Várható érkezés</th><th>Állapot</th><th>Művelet</th></tr></thead><tbody>${state.orders.map(o=>`<tr><td>${fmt(o.created_at)}</td><td><strong>${esc(o.supplier)}</strong><small>${esc(o.note)}</small></td><td>${(Array.isArray(o.items)?o.items:[]).map(i=>`<div>${esc(i.name)}: ${num(i.quantity)} ${esc(i.unit)}</div>`).join('')}</td><td>${o.expected_on?esc(o.expected_on):'—'}</td><td>${pill(actionLabel[o.status]||o.status,o.status==='received'?'green':o.status==='ordered'?'orange':'')}</td><td><div class="actions">${o.status==='draft'?`<button class="mini-button" data-action="order-status" data-status="ordered" data-id="${idKey(o.id)}">Megrendelve</button>`:''}${o.status==='ordered'?`<button class="mini-button" data-action="order-status" data-status="received" data-id="${idKey(o.id)}">Beérkezett</button>`:''}${['draft','ordered'].includes(o.status)?`<button class="mini-button" data-action="order-status" data-status="cancelled" data-id="${idKey(o.id)}">Visszavonás</button>`:''}</div></td></tr>`).join('')||'<tr><td colspan="6"><div class="empty">Még nincs rendelésed.</div></td></tr>'}</tbody></table></div></section>`}
function renderPeople(){return `<section class="panel">${controls('Dolgozói nyilvántartás','Csak a feltétlenül szükséges munkaszervezési adatok','new-employee','＋ Dolgozó')}
  <p class="hint">Ez személyes lista, nem munkaügyi rendszer. Bizalmas értékelést, egészségügyi vagy egyéb különleges személyes adatot ne rögzíts.</p>
  <div class="table-wrap"><table class="data-table"><thead><tr><th>Név</th><th>Munkakör</th><th>Állapot</th><th>Megjegyzés</th><th>Művelet</th></tr></thead><tbody>${state.people.map(p=>`<tr><td><strong>${esc(p.name)}</strong></td><td>${esc(p.role)}</td><td>${pill(p.active?'Aktív':'Inaktív',p.active?'green':'')}</td><td>${esc(p.notes).slice(0,120)}</td><td><button class="mini-button" data-action="edit-employee" data-id="${idKey(p.id)}">Szerkesztés</button></td></tr>`).join('')||'<tr><td colspan="5"><div class="empty">Még nincs rögzített dolgozó.</div></td></tr>'}</tbody></table></div></section>`}
function renderSettings(){const p=state.prefs||{};return `<section class="panel"><div class="section-head"><div><h2>Műszakbeállítások</h2><p>Mindkét műszak nevét és idejét te határozod meg.</p></div></div>
  <form id="shiftForm" class="form-grid"><label>1. műszak neve<input name="shift_one_name" maxlength="40" value="${esc(p.shift_one_name||'Délelőtt')}" required /></label><label>2. műszak neve<input name="shift_two_name" maxlength="40" value="${esc(p.shift_two_name||'Délután')}" required /></label>
  <label>1. műszak kezdete<input type="time" name="shift_one_start" value="${esc(toTime(p.shift_one_start))}" required /></label><label>1. műszak vége<input type="time" name="shift_one_end" value="${esc(toTime(p.shift_one_end))}" required /></label>
  <label>2. műszak kezdete<input type="time" name="shift_two_start" value="${esc(toTime(p.shift_two_start))}" required /></label><label>2. műszak vége<input type="time" name="shift_two_end" value="${esc(toTime(p.shift_two_end))}" required /></label>
  <div class="wide"><button class="button primary" type="submit">Műszakidők mentése</button></div></form>
  <div class="note">A rendszer a <strong>Europe/Budapest</strong> időzónát használja. A műszakok átnyúlhatnak éjfélre is. Ez a beállítás nem módosít dolgozói beosztást.</div></section>
  <section class="panel" style="margin-top:17px"><div class="section-head"><h2>Adatmentés</h2></div><p>Az adatokat a Supabase tárolja. A JSON-export külön biztonsági másolatnak alkalmas. Ha megszakad az internetkapcsolat, ez a verzió <strong>nem állítja, hogy mentett</strong>: hibaüzenetet kapsz, és újra kell próbálnod.</p><button class="button quiet" type="button" data-action="export">⇩ JSON-export letöltése</button></section>`}
function render(){
  if(!state.loaded)return;
  const views={home:['Áttekintés',dashboard],logs:['Műszaknapló',renderLogs],checks:['Ellenőrzőlisták',renderChecks],stock:['Készlet',renderStock],orders:['Rendelések',renderOrders],people:['Dolgozók',renderPeople],settings:['Beállítások',renderSettings],roster:['Havi beosztás',()=>'<div id="rosterRoot"></div>']};
  if(!views[state.view])state.view='home';
  $('screenTitle').textContent=views[state.view][0];
  $('dateLabel').textContent=new Intl.DateTimeFormat('hu-HU',{dateStyle:'full',timeZone:'Europe/Budapest'}).format(new Date()).toUpperCase();
  document.querySelectorAll('.nav[data-view]').forEach(n=>n.classList.toggle('active',n.dataset.view===state.view));
  if(state.view!=='roster')unmountRoster();
  $('screen').innerHTML=views[state.view][1]();
  if(state.view==='roster')mountRoster($('rosterRoot'),supabase,state.user);
  if(state.view==='logs')fillLogRows();
}
function setView(v){state.view=v;render();window.scrollTo({top:0,behavior:'smooth'})}
function field(label,input){return `<label>${label}${input}</label>`}
function options(values,current){return values.map(([value,label])=>`<option value="${esc(value)}" ${value===current?'selected':''}>${esc(label)}</option>`).join('')}
function openEditor(title,fields,handler){state.editorHandler=handler;$('editorTitle').textContent=title;$('editorFields').innerHTML=`<div class="form-grid">${fields}</div>`;$('editor').showModal()}
function closeEditor(){$('editor').close();state.editorHandler=null;$('editorFields').innerHTML=''}
function fieldValue(form,name){return (form.elements.namedItem(name)?.value||'').trim()}
function optionalId(id){return id?{id}:{};}
function openLog(log=null){const l=log||{};
  openEditor(log?'Naplóbejegyzés szerkesztése':'Új naplóbejegyzés',
    field('Dátum',`<input name="shift_date" type="date" required value="${esc(l.shift_date||today())}" />`)+
    field('Műszak',`<select name="shift_type">${options([['one',state.prefs?.shift_one_name||'Délelőtt'],['two',state.prefs?.shift_two_name||'Délután']],l.shift_type||'one')}</select>`)+
    `<div class="wide">${field('Esemény címe',`<input name="title" maxlength="140" required value="${esc(l.title||'')}" />`)}</div>`+
    field('Kategória',`<select name="category">${options(categories.map(c=>[c,c]),l.category||'Egyéb')}</select>`)+
    field('Prioritás',`<select name="priority">${options(Object.entries(priorityLabel),l.priority||'normal')}</select>`)+
    field('Állapot',`<select name="status">${options(Object.entries(logStatus),l.status||'open')}</select>`)+
    `<div class="wide">${field('Részletek',`<textarea name="details" maxlength="5000">${esc(l.details||'')}</textarea>`)}</div>`,
    async f=>{const payload={user_id:state.user.id,shift_date:fieldValue(f,'shift_date'),shift_type:fieldValue(f,'shift_type'),title:fieldValue(f,'title'),category:fieldValue(f,'category'),priority:fieldValue(f,'priority'),status:fieldValue(f,'status'),details:fieldValue(f,'details'),updated_at:new Date().toISOString()};if(!payload.title)throw Error('Adj címet az eseménynek.');return write(()=>log?supabase.from(tableNames.logs).update(payload).eq('id',log.id):supabase.from(tableNames.logs).insert(payload),'Napló mentve');});
}
function openChecklist(t=null){openEditor(t?'Ellenőrzési pont':'Új ellenőrzési pont',
  `<div class="wide">${field('Megnevezés',`<input name="title" maxlength="120" required value="${esc(t?.title||'')}" />`)}</div>`+
  field('Gyakoriság',`<select name="cadence">${options([['daily','Napi'],['weekly','Heti']],t?.cadence||'daily')}</select>`)+
  field('Állapot',`<select name="enabled">${options([['true','Aktív'],['false','Archiválva']],String(t?.enabled??true))}</select>`),
  async f=>{const payload={user_id:state.user.id,title:fieldValue(f,'title'),cadence:fieldValue(f,'cadence'),enabled:fieldValue(f,'enabled')==='true'};return write(()=>t?supabase.from(tableNames.templates).update(payload).eq('id',t.id):supabase.from(tableNames.templates).insert(payload),'Ellenőrzési pont mentve');});}
function openEmployee(e=null){openEditor(e?'Dolgozó szerkesztése':'Új dolgozó',
  field('Név',`<input name="name" required maxlength="100" value="${esc(e?.name||'')}" />`)+
  field('Munkakör',`<input name="role" maxlength="100" value="${esc(e?.role||'')}" />`)+
  field('Állapot',`<select name="active">${options([['true','Aktív'],['false','Inaktív']],String(e?.active??true))}</select>`)+
  `<div class="wide">${field('Munkaügyi szempontból nem érzékeny megjegyzés',`<textarea name="notes" maxlength="1000">${esc(e?.notes||'')}</textarea>`)}</div>`,
  async f=>{const payload={user_id:state.user.id,name:fieldValue(f,'name'),role:fieldValue(f,'role'),notes:fieldValue(f,'notes'),active:fieldValue(f,'active')==='true'};return write(()=>e?supabase.from(tableNames.people).update(payload).eq('id',e.id):supabase.from(tableNames.people).insert(payload),'Dolgozó mentve');});}
function openProduct(p=null){openEditor(p?'Termék szerkesztése':'Új termék',
  field('Terméknév',`<input name="name" required maxlength="140" value="${esc(p?.name||'')}" />`)+
  field('Kategória',`<input name="category" maxlength="80" value="${esc(p?.category||'')}" />`)+
  field('Mértékegység',`<input name="unit" required maxlength="12" value="${esc(p?.unit||'db')}" />`)+
  field('Minimum készlet',`<input name="minimum" type="number" min="0" max="1000000" step="0.001" required value="${esc(p?.minimum??0)}" />`)+
  field('Célkészlet',`<input name="target" type="number" min="0" max="1000000" step="0.001" required value="${esc(p?.target??0)}" />`)+
  `<p class="hint wide">A mennyiséget a készletmozgásnál módosíthatod; ez garantálja a változások naplózását.</p>`,
  async f=>{const payload={user_id:state.user.id,name:fieldValue(f,'name'),category:fieldValue(f,'category'),unit:fieldValue(f,'unit'),minimum:Number(fieldValue(f,'minimum')),target:Number(fieldValue(f,'target')),updated_at:new Date().toISOString()};if(payload.target<payload.minimum)throw Error('A célkészlet nem lehet kisebb a minimumnál.');return write(()=>p?supabase.from(tableNames.products).update(payload).eq('id',p.id):supabase.from(tableNames.products).insert(payload),'Termék mentve');});}
function openAdjust(p){openEditor('Készletmódosítás – '+p.name,
  field('Művelet',`<select name="direction"><option value="plus">Bevételezés / növelés</option><option value="minus">Kivét / csökkentés</option></select>`)+
  field('Mennyiség',`<input name="amount" required type="number" min="0.001" max="1000000" step="0.001" />`)+
  `<div class="wide">${field('Megjegyzés / ok',`<textarea name="note" maxlength="500" placeholder="Például áruátvétel, hiánykorrekció..."></textarea>`)}</div>`+
  `<div class="note wide">Jelenlegi készlet: ${num(p.quantity)} ${esc(p.unit)}. Negatív készlet nem engedélyezett.</div>`,
  async f=>{const a=Number(fieldValue(f,'amount'));if(!Number.isFinite(a)||a<=0)throw Error('Érvényes pozitív mennyiség kell.');const delta=fieldValue(f,'direction')==='minus'?-a:a;return write(()=>supabase.rpc('manager_adjust_stock',{p_product_id:p.id,p_delta:delta,p_note:fieldValue(f,'note')}),'Készlet frissítve és naplózva');});}
function orderRow(){return `<div class="order-line"><select class="product" required>${options(state.products.map(p=>[p.id,`${p.name} (${p.unit})`]),'')}</select><input class="amount" type="number" min="0.001" max="1000000" step="0.001" required placeholder="Mennyiség"/><button type="button" class="mini-button" data-action="remove-order-line" aria-label="Tétel eltávolítása">×</button></div>`}
function openOrder(){if(!state.products.length){showToast('Előbb hozz létre terméket a Készlet menüben.');setView('stock');return;}
  openEditor('Új rendelés',
    field('Beszállító',`<input name="supplier" maxlength="140" required />`)+
    field('Várható érkezés',`<input type="date" name="expected_on" />`)+
    `<div class="wide">${field('Tételek',`<div id="orderLines">${orderRow()}</div>`)}</div>`+
    `<div class="wide"><button type="button" class="button quiet small" data-action="add-order-line">＋ Új tétel</button></div>`+
    `<div class="wide">${field('Megjegyzés',`<textarea name="note" maxlength="1200"></textarea>`)}</div>`,
    async f=>{const lines=[...f.querySelectorAll('.order-line')].map(row=>{const p=state.products.find(x=>x.id===row.querySelector('.product').value);return {product_id:p?.id,name:p?.name,unit:p?.unit,quantity:Number(row.querySelector('.amount').value)};});if(!lines.length||lines.some(l=>!l.product_id||!Number.isFinite(l.quantity)||l.quantity<=0))throw Error('Minden tételhez termék és pozitív mennyiség kell.');const payload={user_id:state.user.id,supplier:fieldValue(f,'supplier'),expected_on:fieldValue(f,'expected_on')||null,note:fieldValue(f,'note'),items:lines,status:'draft'};return write(()=>supabase.from(tableNames.orders).insert(payload),'Rendelés előkészítve');});
}
async function setCheck(t,status){const key=periodKey(t);if(!status){const c=checkRecord(t);if(!c)return;await write(()=>supabase.from(tableNames.checks).delete().eq('id',c.id),'Ellenőrzés visszavonva');return;}
  let note='';if(status==='problem'){const answer=window.prompt('Mi a probléma? (üresen is hagyható)');if(answer===null)return;note=answer.slice(0,1000);}
  const payload={user_id:state.user.id,template_id:t.id,period_key:key,status,note,checked_at:new Date().toISOString()};await write(()=>supabase.from(tableNames.checks).upsert(payload,{onConflict:'user_id,template_id,period_key'}),'Ellenőrzés mentve');
}
async function seedChecks(){if(state.templates.length&&!window.confirm('Hozzáadjam a mintalistát a meglévő ellenőrzési pontjaid mellé?'))return;
  const existing=new Set(state.templates.map(x=>x.title));const rows=checkDefaults.filter(([title])=>!existing.has(title)).map(([title,cadence])=>({user_id:state.user.id,title,cadence}));if(!rows.length){showToast('A mintalista már benne van.');return;}await write(()=>supabase.from(tableNames.templates).insert(rows),'Mintalista hozzáadva');}
async function shiftSave(form){const data=new FormData(form);const payload={user_id:state.user.id};for(const k of ['shift_one_name','shift_one_start','shift_one_end','shift_two_name','shift_two_start','shift_two_end'])payload[k]=String(data.get(k)||'').trim();
  if(['shift_one_start','shift_one_end','shift_two_start','shift_two_end'].some(k=>!/^\d\d:\d\d$/.test(payload[k])))throw Error('Mindkét műszakhoz add meg a kezdő- és végidőt.');
  if(payload.shift_one_start===payload.shift_one_end||payload.shift_two_start===payload.shift_two_end)throw Error('Egy műszak kezdete és vége nem lehet azonos.');
  const mins=x=>Number(x.slice(0,2))*60+Number(x.slice(3));
  const overlap=([a,b],[c,d])=>{const ranges=([start,end])=>{const st=mins(start),en=mins(end);return en>st?[[st,en]]:[[st,1440],[0,en]];};return ranges([a,b]).some(([x,y])=>ranges([c,d]).some(([u,v])=>Math.max(x,u)<Math.min(y,v)));};
  if(overlap([payload.shift_one_start,payload.shift_one_end],[payload.shift_two_start,payload.shift_two_end]))throw Error('A két műszak időtartama átfedésben van.');
  payload.updated_at=new Date().toISOString();return write(()=>supabase.from(tableNames.prefs).upsert(payload,{onConflict:'user_id'}),'Műszakidők mentve');
}
function exportData(){if(!state.loaded){showToast('Előbb töltsd be az adatokat.');return;}
  const data={app:'Dando-vezeto',exported_at:new Date().toISOString(),time_zone:'Europe/Budapest',data:Object.fromEntries(['prefs','logs','templates','checks','people','products','movements','orders'].map(k=>[k,state[k]]))};
  const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`dando-vezeto-${today()}.json`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);showToast('JSON-export elkészült.');
}
function requireRow(list,id){const x=state[list].find(row=>row.id===id);if(!x)throw Error('Ez a bejegyzés már nem található. Frissítsd az oldalt.');return x;}
async function act(name,el){const id=idKey(el.dataset.id);switch(name){
  case 'refresh':await loadAll();break;
  case 'logout':if(supabase)await supabase.auth.signOut();break;
  case 'export':exportData();break;
  case 'new-log':openLog();break;
  case 'edit-log':openLog(requireRow('logs',id));break;
  case 'delete-log':if(window.confirm('Biztosan törlöd ezt a naplóbejegyzést?'))await write(()=>supabase.from(tableNames.logs).delete().eq('id',id),'Bejegyzés törölve');break;
  case 'new-check':openChecklist();break;
  case 'edit-check':openChecklist(requireRow('templates',id));break;
  case 'seed-checks':await seedChecks();break;
  case 'check-ok':await setCheck(requireRow('templates',id),'ok');break;
  case 'check-problem':await setCheck(requireRow('templates',id),'problem');break;
  case 'reset-check':await setCheck(requireRow('templates',id),null);break;
  case 'new-employee':openEmployee();break;
  case 'edit-employee':openEmployee(requireRow('people',id));break;
  case 'new-product':openProduct();break;
  case 'edit-product':openProduct(requireRow('products',id));break;
  case 'adjust-stock':openAdjust(requireRow('products',id));break;
  case 'new-order':openOrder();break;
  case 'order-status':{const order=requireRow('orders',id),next=el.dataset.status;
    const allowed={draft:['ordered','cancelled'],ordered:['received','cancelled']};
    if(!allowed[order.status]?.includes(next))throw Error('A rendelés állapota időközben megváltozott.');
    if(next==='received'&&!window.confirm('A beérkezést jelölöd. A készletet ez NEM módosítja: az átvett tételeket külön rögzítsd a Készlet menüben. Folytatod?'))return;
    await write(()=>supabase.from(tableNames.orders).update({status:next,updated_at:new Date().toISOString()}).eq('id',id).eq('status',order.status), 'Rendelés állapota frissítve');break;}
  case 'add-order-line':$('orderLines')?.insertAdjacentHTML('beforeend',orderRow());break;
  case 'remove-order-line':if(document.querySelectorAll('.order-line').length>1)el.closest('.order-line')?.remove();break;
  case 'close-dialog':closeEditor();break;
}}
function attach(){
  document.addEventListener('click',async e=>{const link=e.target.closest('[data-view]');if(link){setView(link.dataset.view);return;}const el=e.target.closest('[data-action]');if(!el)return;try{await act(el.dataset.action,el);}catch(error){fail(error);showToast(error.message||String(error));}});
  document.addEventListener('change',e=>{if(e.target.id==='logFilter')fillLogRows();});
  $('editorForm').addEventListener('submit',async e=>{e.preventDefault();if(!state.editorHandler)return;const handler=state.editorHandler,button=$('editorSave');button.disabled=true;try{const ok=await handler(e.currentTarget);if(ok)closeEditor();}catch(error){fail(error);showToast(error.message||String(error));}finally{button.disabled=false;}});
  document.addEventListener('submit',async e=>{if(e.target.id!=='shiftForm')return;e.preventDefault();const button=e.target.querySelector('button[type="submit"]');button.disabled=true;try{await shiftSave(e.target)}catch(error){fail(error);showToast(error.message||String(error))}finally{button.disabled=false}});
  $('loginForm').addEventListener('submit',async e=>{e.preventDefault();if(!supabase)return;clearError();const button=e.target.querySelector('button');button.disabled=true;try{const {error}=await supabase.auth.signInWithPassword({email:$('loginEmail').value.trim(),password:$('loginPassword').value});if(error)throw error;$('loginPassword').value='';}catch(error){fail(error)}finally{button.disabled=false}});
  window.addEventListener('online',()=>{if(state.user)loadAll();});
  window.addEventListener('offline',()=>setSync(false,'Offline','A felhőbe mentés nem érhető el'));
}
async function init(){attach();if(!SUPABASE_URL||!SUPABASE_ANON_KEY||SUPABASE_URL.includes('IDE_JON')||SUPABASE_ANON_KEY.includes('IDE_JON')){fail(new Error('Nincs érvényes Supabase konfiguráció a supabase-config.js fájlban.'));return;}
  supabase=createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
  supabase.auth.onAuthStateChange((event,session)=>{const previous=state.user?.id;state.user=session?.user||null;if(!state.user){state.loaded=false;$('authPanel').classList.remove('hidden');$('workspace').classList.add('hidden');setSync(false,'Kijelentkezve','Jelentkezz be');return;}if(previous!==state.user.id||!state.loaded){setTimeout(()=>loadAll(),0);}});
  try{const {data,error}=await supabase.auth.getSession();if(error)throw error;state.user=data.session?.user||null;if(state.user)await loadAll();else setSync(false,'Bejelentkezés szükséges','Supabase fiók');}catch(error){fail(error);}
}
init();
