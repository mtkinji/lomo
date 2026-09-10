import { statuses, parseImport, mergeReviews, reviewStatus, summary } from './review-state.mjs';
const $ = id => document.getElementById(id);
const catalog = await (await fetch('catalog.json')).json();
const variants = catalog.variants, types = catalog.types;
const storageKey = 'kwilt.homeFeedReviews.v1';
const labels = { unreviewed:'Unreviewed', needs_changes:'Needs changes', approved:'Approved for this review', deferred:'Deferred', recheck:'Fixture changed — recheck' };
let reviews = {}, loadFailed = false, typeId = '', activeId = null, pendingImport = null;
const selected = new Set();
try { const saved = localStorage.getItem(storageKey); if (saved) reviews = parseImport(saved, variants); }
catch { loadFailed = true; $('error').hidden = false; $('error').textContent = 'Stored reviews could not be loaded. Export all reviews to back up the original data, then import a valid file. Editing is disabled to avoid overwriting it.'; }
$('scope').textContent = `4 feed patterns · ${types.length} content categories · ${variants.length} representative variants. Native screenshots, local review notes, no household publication.`;
function element(tag, text, className) { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (className) n.className = className; return n; }
function typeFor(v) { return types.find(t => t.id === v.typeId); }
function filtered() {
 const query = $('search').value.trim().toLowerCase(), state = $('status-filter').value, priority = $('priority-filter').value;
 return variants.filter(v => (!typeId || v.typeId === typeId) && ($('pattern-filter').value === 'all' || v.family === $('pattern-filter').value) && (state === 'all' || reviewStatus(reviews[v.id],v) === state) && (priority === 'all' || reviews[v.id]?.priority === priority) && (!query || `${v.id} ${v.name} ${typeFor(v).label} ${v.family} ${v.tags.join(' ')} ${v.post?.text ?? v.delivery?.body ?? ''} ${reviews[v.id]?.notes ?? ''}`.toLowerCase().includes(query)));
}
function notify(text) { $('notice').textContent = text; }
function persist() {
 try { localStorage.setItem(storageKey, JSON.stringify({schemaVersion:1,reviews})); return true; }
 catch { $('error').hidden=false; $('error').textContent='Reviews are kept in memory, but could not be saved in this browser. Export them now for a durable backup.'; return false; }
}
function image(v, thumbnail=false) {
 const container = element('div'); const img = document.createElement('img');
 img.src = `captures/${v.id}.png?v=${v.revision}`; img.alt = `${typeFor(v).label}: ${v.name} — native fixture capture`;
 if (thumbnail) { img.className='card-preview'; img.loading='lazy'; }
 img.onerror=()=>{const placeholder=element('div','Native capture not available for this variant yet.','missing');container.replaceChildren(placeholder);};
 container.append(img); return container;
}
function statusText(v) { return labels[reviewStatus(reviews[v.id],v)]; }
function render() {
 const all = summary(variants,reviews);
 $('summary').replaceChildren(...['unreviewed','needs_changes','approved','deferred','recheck'].map(s=>element('span',`${labels[s]}: ${all[s]}`)));
 $('types').replaceChildren();
 const addType=(id,label,list)=>{const b=element('button');b.setAttribute('aria-current',String(id===typeId));const stats=summary(list,reviews);b.append(element('span',label),element('small',`${list.length} variants · ${stats.approved} approved · ${stats.needs_changes} changes`));b.onclick=()=>{typeId=id;render();};$('types').append(b);};
 addType('','All categories',variants);for(const type of types) addType(type.id,type.label,variants.filter(v=>v.typeId===type.id));
 const list=filtered();$('results').textContent=`${list.length} of ${variants.length} variants shown`;$('empty').hidden=!!list.length;
 $('cards').replaceChildren(...list.map(v=>{
  const card=element('article',undefined,'card'), head=element('div',undefined,'card-head');
  head.append(element('small',typeFor(v).label),element('h3',v.name),element('div',statusText(v),'status'));
  const tags=element('div',undefined,'tags');for(const tag of v.tags)tags.append(element('span',tag,'tag'));head.append(tags);
  const open=element('button',undefined,'preview-open');open.setAttribute('aria-label',`Review ${v.id}`);open.append(image(v,true));open.onclick=()=>openDetail(v.id);
  const foot=element('div',undefined,'card-foot'), label=element('label'), check=document.createElement('input');check.type='checkbox';check.checked=selected.has(v.id);check.setAttribute('aria-label',`Compare ${v.id}`);check.onchange=()=>{if(check.checked && selected.size>=4){check.checked=false;notify('Choose up to four variants for a readable comparison.');return;}check.checked?selected.add(v.id):selected.delete(v.id);updateSelection();};label.append(check,document.createTextNode('Compare'));
  const button=element('button','Review');button.setAttribute('aria-label',`Open review for ${v.id}`);button.onclick=()=>openDetail(v.id);foot.append(label,button);card.append(head,open,foot);return card;
 }));updateSelection();
}
function updateSelection(){ $('compare').textContent=`Compare selected (${selected.size}/4)`;$('compare').disabled=selected.size<2;$('export-selected').disabled=!selected.size;$('clear-selection').disabled=!selected.size; }
function openDetail(id) {
 activeId=id;const v=variants.find(x=>x.id===id),r=reviews[id];
 $('detail-family').textContent=`${v.family} · ${typeFor(v).label}`;$('detail-title').textContent=v.name;
 $('detail-image').replaceChildren(image(v));$('detail-meta').replaceChildren(element('code',v.id),element('p',v.tags.join(' · '),'muted'));
 $('question').textContent=v.question;$('fixture-note').textContent=v.note;$('fixture-note').hidden=!v.note;
 $('review-status').value=r?.status ?? 'unreviewed';$('review-priority').value=r?.priority ?? 'normal';$('notes').value=r?.notes ?? '';
 for(const id of ['review-status','review-priority','notes'])$(id).disabled=loadFailed;
 $('saved-status').textContent=reviewStatus(r,v)==='recheck'?'This fixture changed after its last review. Revisit it, then choose its status to confirm the current version.':r?`Last saved ${new Date(r.updatedAt).toLocaleString()}`:'No review recorded yet.';
 $('fixture-data').textContent=JSON.stringify(v,null,2);
 const list=filtered();const i=list.findIndex(x=>x.id===id);$('detail-prev').disabled=i<=0;$('detail-next').disabled=i<0||i===list.length-1;
 if(!$('detail').open)$('detail').showModal();
}
function saveReview(repaint=false,confirmVersion=false){
 if(loadFailed||!activeId)return;const v=variants.find(x=>x.id===activeId),prior=reviews[activeId];
 reviews[activeId]={status:$('review-status').value,priority:$('review-priority').value,notes:$('notes').value,fixtureVersion:confirmVersion?v.revision:(prior?.fixtureVersion??v.revision),updatedAt:new Date().toISOString()};
 $('saved-status').textContent=persist()?'Saved in this browser':'Not persisted — export a backup';if(repaint)render();
}
$('notes').addEventListener('input',()=>saveReview());$('review-priority').onchange=()=>saveReview(true);$('review-status').onchange=()=>saveReview(true,true);
$('detail-prev').onclick=()=>step(-1);$('detail-next').onclick=()=>step(1);
function step(delta){const list=filtered(),i=list.findIndex(v=>v.id===activeId),v=list[i+delta];if(v)openDetail(v.id);}
for(const button of document.querySelectorAll('[data-close]'))button.onclick=()=>$(button.dataset.close).close();
$('detail').addEventListener('close',()=>{activeId=null;render();});
$('pattern-filter').onchange=()=>{typeId='';render();};$('search').addEventListener('input',render);$('status-filter').onchange=render;$('priority-filter').onchange=render;
$('clear-selection').onclick=()=>{selected.clear();render();};
$('compare').onclick=()=>{
 const chosen=variants.filter(v=>selected.has(v.id));$('compare-grid').style.setProperty('--columns',String(chosen.length));
 $('compare-grid').replaceChildren(...chosen.map(v=>{const section=element('section');section.append(element('small',typeFor(v).label),element('h3',v.name),element('p',statusText(v),'status'),image(v),element('p',reviews[v.id]?.notes||'No notes yet.','muted'));return section;}));$('compare-dialog').showModal();
};
function download(text,name){const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function exportReviews(onlySelected=false){
 if(loadFailed){download(localStorage.getItem(storageKey)||'{}','kwilt-home-review-recovery.json');return;}
 const chosen=onlySelected?Object.fromEntries(Object.entries(reviews).filter(([id])=>selected.has(id))):reviews;
 download(JSON.stringify({schemaVersion:1,catalogRevision:catalog.revision,exportedAt:new Date().toISOString(),reviews:chosen},null,2),'kwilt-home-feed-reviews.json');
 notify(`Exported ${Object.keys(chosen).length} recorded reviews${onlySelected?' for selected variants':''}. Unreviewed variants without notes have no saved record.`);
}
$('export').onclick=()=>exportReviews();$('export-selected').onclick=()=>exportReviews(true);
$('import').onclick=()=>{$('import-error').textContent='';$('import-dialog').showModal();};
function clearImport(){pendingImport=null;$('apply-import').disabled=true;$('import-preview').textContent='';}
$('import-text').addEventListener('input',clearImport);
$('import-file').onchange=async()=>{clearImport();const file=$('import-file').files[0];if(file){if(file.size>2000000){$('import-error').textContent='Choose a review export smaller than 2 MB.';return;}$('import-text').value=await file.text();}};
$('validate-import').onclick=()=>{clearImport();try{pendingImport=parseImport($('import-text').value,variants);const ids=Object.keys(pendingImport),replaced=ids.filter(id=>reviews[id]).length;$('import-error').textContent='';$('import-preview').textContent=`${ids.length} valid reviews. ${replaced} matching local reviews will be replaced; all other local reviews stay.`;$('apply-import').disabled=!ids.length;}catch(error){$('import-error').textContent=error.message;}};
$('apply-import').onclick=()=>{if(!pendingImport)return;reviews=mergeReviews(reviews,pendingImport);loadFailed=false;$('error').hidden=true;persist();render();$('import-dialog').close();notify(`Imported ${Object.keys(pendingImport).length} reviews.`);clearImport();};
render();
