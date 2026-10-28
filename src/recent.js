/* ---------- Kachel: Letzte Einträge ---------- */
function recentCfg(){var c=D.settings.recentCfg||{};return {types:c.types||'all',n:c.n||5}}
function recentCardHtml(){
  var c=recentCfg(),list=[];
  if(c.types!=='sight')G('kills').forEach(function(o){list.push({k:'kill',o:o})});
  if(c.types!=='kill')G('sightings').forEach(function(o){list.push({k:'sight',o:o})});
  list.sort(function(a,b){return new Date(b.o.ts)-new Date(a.o.ts)});list=list.slice(0,c.n);
  var rows=list.length?'<div class="rows">'+list.map(function(it){
    var o=it.o,mk=it.k==='kill'?'<span class="mk sq" style="background:var(--kill)">✕</span>':'<span class="mk sq" style="background:var(--sicht)">'+(o.count||1)+'</span>';
    var t=it.k==='kill'?esc(o.species)+' · '+SEX[o.sex]+(o.weight!=null?' · '+nf.format(o.weight)+' kg':''):(o.count||1)+'× '+esc(o.species)+' · '+SEX[o.sex];
    var m=fmtDate(o.ts)+(o.kanzelId?' · '+esc(facName(o.kanzelId)):'')+(o.group?' · '+esc(o.group):'');
    return '<button class="row" type="button" data-k="'+it.k+'" data-id="'+esc(o.id)+'">'+mk+'<span class="rt"><b>'+t+'</b><small>'+m+'</small></span>'+(o.tag?'<span class="tagc">'+esc(o.tag)+'</span>':'')+'</button>'}).join('')+'</div>':'<div class="empty">Noch keine Einträge.</div>';
  return '<div class="card" id="rcCard"><div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><h2 class="sec" style="margin:0;flex:1">Letzte Einträge</h2><button type="button" class="btn sm" id="rcCfg">Anpassen</button></div>'+rows+
    '<div class="btnrow" style="margin-top:10px"><button class="btn" id="rcAll" type="button">Alle Einträge</button></div></div>';
}
function recentBind(){
  $$('#rcCard .row[data-k]').forEach(function(b){b.onclick=function(){var arr=b.dataset.k==='kill'?G('kills'):G('sightings');var o=arr.filter(function(x){return x.id===b.dataset.id})[0];if(o)showDetail(b.dataset.k,o)}});
  var a=$('#rcAll');if(a)a.onclick=function(){switchTab('log')};
  var g=$('#rcCfg');if(g)g.onclick=recentSheet;
}
function recentSheet(){
  var c=recentCfg();
  openSheet('<h2>Letzte Einträge</h2><label class="field"><span class="lbl">Welche Einträge</span><select id="rc-t"><option value="all"'+(c.types==='all'?' selected':'')+'>Abschüsse und Sichtungen</option><option value="kill"'+(c.types==='kill'?' selected':'')+'>Nur Abschüsse</option><option value="sight"'+(c.types==='sight'?' selected':'')+'>Nur Sichtungen</option></select></label>'+
    '<label class="field"><span class="lbl">Anzahl</span><select id="rc-n">'+[3,5,10,20].map(function(n){return '<option value="'+n+'"'+(c.n===n?' selected':'')+'>'+n+'</option>'}).join('')+'</select></label>'+
    '<div class="btnrow"><button class="btn primary" id="rc-save" type="button" style="flex:2">Speichern</button><button class="btn" id="rc-cancel" type="button" style="flex:1">Abbrechen</button></div>');
  $('#rc-cancel').onclick=closeSheet;
  $('#rc-save').onclick=function(){guard(Store.setting({recentCfg:{types:$('#rc-t').value,n:+$('#rc-n').value}})).then(function(){closeSheet();renderActive()},function(){})};
}
