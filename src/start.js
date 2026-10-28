/* ---------- Start: eigenes Dashboard ---------- */
ICON.start='<path d="M3 11l9-8 9 8"/><path d="M5 9.5V20h5v-6h4v6h5V9.5"/>';
function wCard(title,inner){return '<div class="card"><h2 class="sec">'+title+'</h2>'+inner+'</div>'}
function startQuickHtml(){
  var q=[['kill','Abschuss','K'],['sight','Sichtung','S'],['res','Ansitz reservieren','R'],['track',S.rec?'Track beenden':'Track starten','T'],['parcel','Fläche','F'],['dmg','Wildschaden','€']];
  return '<div class="card"><h2 class="sec">Schnellaktionen</h2><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">'+q.map(function(x){return '<button type="button" class="btn" data-q="'+x[0]+'" style="flex-direction:column;gap:4px;height:auto;padding:12px 4px;line-height:1.15;font-size:13px"><b style="font-size:18px">'+x[2]+'</b>'+x[1]+'</button>'}).join('')+'</div></div>';
}
function startResHtml(){
  var up=resUpcoming().slice(0,3);
  return wCard('Anstehende Ansitze',up.length?resRowsHtml(up,true):'<p class="hint">Keine anstehenden Reservierungen.</p>')+'';
}
function startHuntHtml(){
  var today=toLocalInput().slice(0,10),hs=hunts().filter(function(h){return (h.date||'')>=today}).sort(function(a,b){return (a.date||'').localeCompare(b.date||'')}),no=openNach(),h='';
  if(hs.length){var n=hs[0];h+='<button class="row" type="button" data-sh="'+esc(n.id)+'"><span class="mk sq" style="background:var(--accent)">J</span><span class="rt"><b>'+esc(n.name||'Drückjagd')+'</b><small>'+esc(new Date(n.date+'T12:00').toLocaleDateString('de-LU',{weekday:'long',day:'numeric',month:'long'}))+((n.posts||[]).length?' · '+n.posts.length+' Posten':'')+'</small></span></button>'}
  else h+='<p class="hint">Keine kommende Drückjagd geplant.</p>';
  if(no.length)h+='<div class="warnbox" style="margin-top:8px">'+no.length+(no.length===1?' offene Nachsuche':' offene Nachsuchen')+'</div>';
  return wCard('Nächste Drückjagd',h);
}
function startKillsHtml(kills){
  var y=new Date().getFullYear(),ks=kills.filter(function(k){return new Date(k.ts).getFullYear()===y}),m={};
  ks.forEach(function(k){m[k.species]=(m[k.species]||0)+1});
  var rows=Object.keys(m).map(function(k){return [k,m[k]]}).sort(function(a,b){return b[1]-a[1]}).slice(0,6),mxv=rows.length?rows[0][1]:1;
  return wCard('Meine Abschüsse '+y,'<div class="big">'+ks.length+'</div>'+(rows.length?'<div class="bars" style="margin-top:8px">'+rows.map(function(r){return '<div class="bar"><span class="bl">'+esc(r[0])+'</span><span class="bt"><i style="width:'+Math.max(4,Math.round(r[1]/mxv*100))+'%"></i></span><span class="bv">'+r[1]+'</span></div>'}).join('')+'</div>':'<p class="hint">Noch kein Abschuss in diesem Jahr.</p>'));
}
function renderStart(){
  var box=$('#startBody');if(!box)return;
  var kills=G('kills'),d=new Date(),parts=[
    ['quick',startQuickHtml()],['jz',jzCardHtml()],['res',startResHtml()],['hunt',startHuntHtml()],['plan',lotPlanCardHtml(kills)],['kills',startKillsHtml(kills)],['dmg',damageCardHtml('all')],['crop',cropSumHtml(null,true)||'']
  ];
  box.innerHTML='<p class="hint" style="margin:0 0 12px">'+esc(d.toLocaleDateString('de-LU',{weekday:'long',day:'numeric',month:'long',year:'numeric'}))+'</p>'+
    parts.map(function(p){return p[1]?'<div class="wid" data-cid="'+p[0]+'" style="margin-bottom:12px">'+p[1]+'</div>':''}).join('');
  $$('#startBody .wid > .card').forEach(function(c){c.style.marginBottom='0'});
  cardLayout(CARD_CFG.start);
  jzBind();bindLotPlan();bindDamage();bindResRows(box);
  $$('#startBody [data-q]').forEach(function(b){b.onclick=function(){var k=b.dataset.q;
    if(k==='res')resForm(null,null);else if(k==='dmg')pickParcelFor0();else if(k==='track')S.rec?trkStopSheet():trkStart();else newEntry(k)}});
  $$('#startBody [data-sh]').forEach(function(b){b.onclick=function(){switchTab('hunt')}});
}
function pickParcelFor0(){if(!parcels().length)parcelNew();else pickParcelFor()}
