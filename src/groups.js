/* ---------- Tab "Gruppen" ---------- */
ICON.groups='<circle cx="9" cy="8" r="3"/><path d="M3 20v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14.5a4 4 0 0 1 4 4V20"/>';
var GTAB={t:0,err:false};
function renderGroups(){
  var el=$('#groupsBody');if(!el)return;
  var h='<div class="card"><h2 class="sec">Gruppen</h2>';
  if(!ACC.sess){
    el.innerHTML=h+'<p class="hint">Mit einem Konto kannst du Gruppen anlegen oder einer Gruppe beitreten und Einträge mit anderen Jägern deines Loses teilen.</p><div class="btnrow"><button class="btn primary" type="button" data-accopen>Anmelden oder registrieren</button></div></div>';
    return;
  }
  var gs=ACC.groups;
  if(!gs&&GTAB.err){
    el.innerHTML=h+'<p class="warnbox">Keine Verbindung. Bitte später noch einmal versuchen.</p><div class="btnrow"><button class="btn" type="button" data-gtab="reload">Noch einmal</button></div></div>';return;
  }
  if(!gs||Date.now()-GTAB.t>30000){
    GTAB.t=Date.now();GTAB.err=false;
    accLoadAll().then(function(ok){if(!ok)GTAB.err=true;if(S.tab==='groups')renderGroups()},function(){GTAB.err=true;if(S.tab==='groups')renderGroups()});
  }
  if(!gs){el.innerHTML=h+'<p class="hint">Lade …</p></div>';return}
  h+=gs.length?'<div class="rows">'+gs.map(function(g){
    return '<div class="lotrow" style="flex-wrap:wrap"><span style="flex:1;min-width:140px"><b>'+esc(g.name)+'</b><br><small>'+esc(g.role)+' · '+g.lots.length+' Los'+(g.lots.length===1?'':'e')+'</small></span><button class="btn sm" type="button" data-gtab="group" data-v="'+esc(g.id)+'">Öffnen</button></div>';
  }).join('')+'</div>':'<p class="hint">Du bist noch in keiner Gruppe.</p>';
  h+='<div class="btnrow" style="margin-top:8px"><button class="btn primary" type="button" data-gtab="new">+ Gruppe erstellen</button><button class="btn" type="button" data-gtab="join">Einladung einlösen</button></div></div>';
  el.innerHTML=h;
}
document.addEventListener('click',function(e){
  var b=e.target.closest('#groupsBody [data-gtab]');if(!b)return;
  var k=b.dataset.gtab;
  if(k==='group')accGroup(b.dataset.v);
  else if(k==='new')accNewGroup();
  else if(k==='join')accSheet();
  else if(k==='reload'){GTAB.err=false;GTAB.t=0;renderGroups()}
});
