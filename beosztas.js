// Dandó V3.4: havi beosztás, bejelentkezett felhasználónként a Supabase-ben.
export const EMPLOYEES=['Busai Rita','Kovács Béláné','Szeghalmi Beáta','Váradi Noémi','Sirkó Flóra','Koledich Milán','Petykó Mihályné','Ferov Viktor','Telek Bori','Bartus Tamás','Szűcs Endre','Koledich Csaba','Balázs Roland'];
const CODES=['e','n','8','sz','p','x',''];
export const LABELS={'e':'Éjszakás','n':'Nappalos','8':'8 óra','sz':'Szabadnap','p':'Egyéb','x':'Távollét','':'Törlés'};
let generation=0;
const htmlEscape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
export function currentMonth(){const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Budapest',year:'numeric',month:'2-digit'}).formatToParts(new Date());const v=Object.fromEntries(parts.map(p=>[p.type,p.value]));return `${v.year}-${v.month}`}
function csvExport(month,data){const [y,m]=month.split('-').map(Number),days=new Date(y,m,0).getDate();const rows=[['Dolgozó',...Array.from({length:days},(_,i)=>String(i+1))],...EMPLOYEES.map((name,i)=>[name,...Array.from({length:days},(_,j)=>data[`${i}-${j+1}`]||'')])];const csv='\ufeff'+rows.map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(';')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`dando-beosztas-${month}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}

// A régi beosztások indexei változatlanok: Roland a 12-es indexen van.
// A 8 órás beosztás kizárólag a nappalos (n) műszakban jelenik meg.
export function workingNow(entries, date, shiftCode){
 const day=Number(date.slice(-2));
 return EMPLOYEES.filter((_,i)=>{
  const code=entries?.[`${i}-${day}`];
  return code===shiftCode || (code==='8' && shiftCode==='n');
 });
}
function normalizedName(value){return String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('hu-HU').replace(/[^a-z0-9]/g,'');}
function parseDelimited(text){
 text=String(text).replace(/^\uFEFF/,'');
 const first=text.split(/\r?\n/,1)[0]||'';
 const sep=(first.match(/;/g)||[]).length >= (first.match(/,/g)||[]).length?';':',';
 const rows=[];let row=[],field='',quoted=false;
 for(let i=0;i<text.length;i++){
  const ch=text[i];
  if(ch==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++}else quoted=!quoted;}
  else if(ch===sep&&!quoted){row.push(field);field='';}
  else if((ch==='\n'||ch==='\r')&&!quoted){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(field);if(row.some(v=>v.trim()))rows.push(row);row=[];field='';}
  else field+=ch;
 }
 row.push(field);if(row.some(v=>v.trim()))rows.push(row);
 return rows;
}
function extractSchedule(rows, month){
 const [year,mo]=month.split('-').map(Number),maxDay=new Date(year,mo,0).getDate();
 const known=new Map(EMPLOYEES.map((n,i)=>[normalizedName(n),i]));
 // A mintaképen a dátumok a 2. sorban, a nevek az A oszlopban vannak.
 let headerIndex=rows.findIndex(row=>row.filter(v=>/^([1-9]|[12][0-9]|3[01])$/.test(String(v).trim())).length>=Math.min(7,maxDay));
 if(headerIndex<0)throw Error('Nem találom a napokat (1–31) tartalmazó fejlécsort.');
 const header=rows[headerIndex];const columns=new Map();
 header.forEach((v,c)=>{const day=Number(String(v??'').trim());if(day>=1&&day<=maxDay&&String(v).trim()===String(day))columns.set(c,day)});
 if(columns.size<7)throw Error('A táblázatban nem található elegendő naposzlop.');
 const found=new Set(),entries={},unknown=[],invalid=[];let count=0;
 for(const row of rows.slice(headerIndex+1)){
  let employee=-1,personCol=-1;
  for(let c=0;c<Math.min(4,row.length);c++){
   const name=normalizedName(row[c]);if(known.has(name)){employee=known.get(name);personCol=c;break;}
  }
  if(employee<0){const possible=String(row[0]??'').trim();if(possible&&/[a-záéíóöőúüű]/i.test(possible))unknown.push(possible);continue;}
  if(found.has(employee))throw Error(`A dolgozó többször szerepel: ${EMPLOYEES[employee]}`);
  found.add(employee);
  for(const [col,day] of columns){if(col===personCol)continue;
   let raw=String(row[col]??'').trim().toLocaleLowerCase('hu-HU');
   if(!raw)continue;
   const aliases={'délelőtt':'e','del':'e','d':'e','első':'e','elso':'e','délután':'n','du':'n','második':'n','masodik':'n','nyolc':'8','szabad':'sz','szabadság':'sz','szabadsag':'sz','pihenő':'sz','piheno':'sz','távollét':'x','tavollet':'x','beteg':'x'};
   const code=aliases[raw]||raw;
   if(!['e','n','8','sz','p','x'].includes(code)){invalid.push(`${EMPLOYEES[employee]} / ${day}. nap: ${raw}`);continue;}
   entries[`${employee}-${day}`]=code;count++;
  }
 }
 if(!found.size)throw Error('Nem találtam ismert dolgozót a táblázatban.');
 if(invalid.length)throw Error('Ismeretlen jelölések: '+invalid.slice(0,5).join('; '));
 return {entries,found:[...found].map(i=>EMPLOYEES[i]),unknown,count};
}
async function readScheduleFile(file){
 if(/\.csv$/i.test(file.name))return parseDelimited(await file.text());
 if(!/\.xlsx?$/i.test(file.name))throw Error('CSV, XLSX vagy XLS fájlt válassz.');
 // XLSX/XLS fájl olvasásához SheetJS szükséges, csak importáláskor töltjük le.
 const XLSX=await import('https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs');
 const workbook=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:false});
 const sheet=workbook.Sheets[workbook.SheetNames[0]];
 return XLSX.utils.sheet_to_json(sheet,{header:1,defval:'',raw:false});
}

export async function mountRoster(root,supabase,user){
 const ticket=++generation;
 root.innerHTML=`<section class="panel roster-panel"><div class="section-head"><div><h2>Havi műszakbeosztás</h2><p>13 dolgozó · Balázs Roland az első sorban · felhőben mentve</p></div></div><div class="roster-lockbar"><div class="roster-lockinfo"><strong id="rosterModeTitle">🔒 Megtekintési mód</strong><small id="rosterModeHint">A beosztás zárolva van, érintésre nem változik.</small></div><button type="button" class="button primary" id="rosterToggleEdit">✎ Szerkesztés bekapcsolása</button></div><div class="roster-toolbar"><label>Hónap<input id="rosterMonth" type="month" value="${currentMonth()}"></label><label>Jelölés<select id="rosterCode">${CODES.map(c=>`<option value="${c}">${c||'–'} – ${LABELS[c]}</option>`).join('')}</select></label><label>Beosztás importálása (Excel/CSV)<input id="rosterImport" type="file" accept=".csv,.xlsx,.xls" /></label><button class="button quiet" id="rosterCsv">CSV export</button><button class="button quiet" id="rosterPrint">Nyomtatás</button><button class="button danger" id="rosterClear">Hónap ürítése</button></div><p class="hint" id="rosterStatus" role="status">Betöltés…</p><div class="roster-scroll"><table class="roster-table" id="rosterTable"></table></div><div class="roster-legend">🌙 e – éjszakás · ☀️ n – nappalos · 🔵 8 – nyolc óra · 🟩 sz – szabad · 🟣 p – egyéb · 🟥 x – távollét</div><p class="hint">Alapértelmezetten zárolva. A cellák csak a külön bekapcsolt szerkesztő módban módosíthatók. Minden módosítás Supabase-mentést igényel; sikertelen mentés esetén az eredeti érték marad.</p></section>`;
 const el=id=>root.querySelector('#'+id),status=(message,error=false)=>{const s=el('rosterStatus');if(s){s.textContent=message;s.style.color=error?'#b82e50':''}};
 let data={},revision=null,loading=false,saving=false,editing=false;
 const active=()=>ticket===generation&&root.isConnected;
 function setEditing(value){
  if(saving||loading){status('Várd meg a betöltés vagy mentés végét!',true);return;}
  editing=Boolean(value);
  root.classList.toggle('roster-editing',editing);
  el('rosterModeTitle').textContent=editing?'✎ Szerkesztő mód':'🔒 Megtekintési mód';
  el('rosterModeHint').textContent=editing?'A cellák módosíthatók, a változások felhőbe mentődnek.':'A beosztás zárolva van, érintésre nem változik.';
  el('rosterToggleEdit').textContent=editing?'🔒 Szerkesztés befejezése':'✎ Szerkesztés bekapcsolása';
  for(const id of ['rosterCode','rosterImport','rosterClear'])el(id).disabled=!editing;
  draw();
 }
 function draw(){if(!active())return;const [y,m]=el('rosterMonth').value.split('-').map(Number);const days=new Date(y,m,0).getDate();let markup='<thead><tr><th class="roster-person">Dolgozó</th>';for(let d=1;d<=days;d++){const wd=new Date(y,m-1,d).getDay();markup+=`<th class="${wd===0||wd===6?'weekend':''}">${d}</th>`}markup+='</tr></thead><tbody>';EMPLOYEES.map((name,i)=>({name,i})).sort((a,b)=>a.name==='Balázs Roland'?-1:b.name==='Balázs Roland'?1:a.i-b.i).forEach(({name,i})=>{markup+=`<tr><th class="roster-person ${i===8||i===11||i===12?'special':''}">${htmlEscape(name)}</th>`;for(let d=1;d<=days;d++){const wd=new Date(y,m-1,d).getDay(),code=data[`${i}-${d}`]||'';markup+=`<td class="roster-day ${wd===0||wd===6?'weekend':''}" data-cell="${i}-${d}" data-code="${code}" tabindex="${editing?0:-1}" aria-readonly="${!editing}" aria-label="${htmlEscape(name)}, ${d}. nap: ${LABELS[code]||'Üres'}">${code}</td>`}markup+='</tr>'});el('rosterTable').innerHTML=markup+'</tbody>'}
 async function load(){if(!active()||loading||saving)return;loading=true;status('Felhőadatok betöltése…');const month=el('rosterMonth').value;try{const {data:record,error}=await supabase.from('manager_rosters').select('entries,updated_at').eq('user_id',user.id).eq('month',month).maybeSingle();if(error)throw error;if(!active()||el('rosterMonth').value!==month)return;data=record?.entries||{};revision=record?.updated_at||null;draw();status('Felhőből betöltve · '+month)}catch(err){status('Nem sikerült betölteni: '+err.message,true)}finally{loading=false}}
 async function save(next){if(!editing){status('A beosztás zárolva van. Előbb kapcsold be a szerkesztést!',true);return;}if(saving||loading)return;const month=el('rosterMonth').value;saving=true;status('Mentés a felhőbe…');try{
 // Optimista zárolás: a régebbi állapot nem írhatja felül a másik eszköz friss módosítását.
 let query;if(revision){query=supabase.from('manager_rosters').update({entries:next}).eq('user_id',user.id).eq('month',month).eq('updated_at',revision).select('updated_at').maybeSingle()}else{query=supabase.from('manager_rosters').insert({user_id:user.id,month,entries:next}).select('updated_at').single()}
 const {data:record,error}=await query;if(error)throw error;if(!record)throw Error('Másik eszközön változott a beosztás. Frissítsd az oldalt, majd próbáld újra.');if(!active())return;data=next;revision=record.updated_at;draw();status('Sikeresen mentve a felhőbe · '+month)
 }catch(err){status('Nincs mentve: '+err.message,true)}finally{saving=false}}
 const changeCell=target=>{const cell=target.closest('[data-cell]');if(!cell||!editing||saving||loading)return;const code=el('rosterCode').value;const next={...data};if(code)next[cell.dataset.cell]=code;else delete next[cell.dataset.cell];save(next)};
 el('rosterTable').addEventListener('click',e=>changeCell(e.target));el('rosterTable').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();changeCell(e.target)}});
 el('rosterMonth').addEventListener('change',()=>{if(saving){status('Várd meg a mentést!',true);return}data={};revision=null;el('rosterTable').innerHTML='';load()});
 el('rosterImport').addEventListener('change',async e=>{
  const file=e.target.files?.[0];if(!file)return;
  if(!editing){status('Importáláshoz kapcsold be a szerkesztést!',true);e.target.value='';return;}if(saving||loading){status('Várd meg a folyamatban lévő műveletet!',true);return;}
  const month=el('rosterMonth').value;
  try{
   status('Importálás ellenőrzése…');
   const result=extractSchedule(await readScheduleFile(file),month);
   if(!active()||el('rosterMonth').value!==month)return;
   const preview=`${month} hónap • ${result.found.length} ismert dolgozó • ${result.count} műszakjelölés.\n`+
    `Felismert dolgozók: ${result.found.join(', ')}\n`+
    (result.unknown.length?`Nem felismert sorok: ${result.unknown.slice(0,8).join(', ')}\n`:'')+
    'A fájlban nem szereplő dolgozók korábbi beosztása megmarad. A fájlban szereplő dolgozók kiválasztott havi sorait felülírjuk (az üres napokat is). Folytatod?';
   if(!confirm(preview)){status('Importálás megszakítva.');return;}
   const next={...data};
   for(const name of result.found){const idx=EMPLOYEES.indexOf(name);for(let d=1;d<=31;d++)delete next[`${idx}-${d}`];}
   Object.assign(next,result.entries);
   await save(next);
  }catch(err){status('Importálási hiba: '+err.message,true)}
  finally{e.target.value='';}
 });
 el('rosterCsv').addEventListener('click',()=>csvExport(el('rosterMonth').value,data));
 el('rosterPrint').addEventListener('click',()=>window.print());
 el('rosterClear').addEventListener('click',()=>{if(!editing)return;if(confirm('FIGYELEM! A kiválasztott hónap TELJES beosztása törlődik. Biztosan folytatod?'))save({})});
 el('rosterToggleEdit').addEventListener('click',()=>setEditing(!editing));
 setEditing(false);
 await load();
}
export function unmountRoster(){generation++}
