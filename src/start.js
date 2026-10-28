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
/* ----- eigene Kacheln: Textblock und Kennzahl ----- */
function dashWidgets(){return D.settings.dashWidgets||[]}
function saveDash(a){return guard(Store.setting({dashWidgets:a}))}
var M_MEAS={kill:'Abschüsse (Anzahl)',sight:'Sichtungen (Anzahl Stücke)',weight:'Ø Gewicht aufgebrochen (kg)',damage:'Wildschaden (€)'};
var M_PER={all:'Alle Zeit',year:'Dieses Jahr',last:'Letztes Jahr',jj:'Dieses Jagdjahr (ab 1.4.)',d30:'Letzte 30 Tage'};
var M_GRP={none:'Gesamt',kanzel:'Nach Kanzel',species:'Nach Wildart',month:'Nach Monat',sex:'Nach Geschlecht',age:'Nach Altersklasse',parcel:'Nach Fläche',year:'Nach Jahr',cause:'Nach Verursacher'};
function mGroups(meas){return meas==='damage'?['none','parcel','year','month','cause']:meas==='sight'?['none','kanzel','species','month','sex']:['none','kanzel','species','month','sex','age']}
function mPeriodTest(p){
  var n=new Date(),y=n.getFullYear(),jj=new Date(n.getMonth()<3?y-1:y,3,1);
  return function(d){
    if(p==='year')return d.getFullYear()===y;if(p==='last')return d.getFullYear()===y-1;if(p==='jj')return d>=jj;if(p==='d30')return d>=new Date(n.getTime()-30*864e5)&&d<=n;return true};
}
function metricTitle(m){
  var base=m.measure==='damage'?'Wildschaden':m.measure==='sight'?'Sichtungen':m.measure==='weight'?'Ø Gewicht':'Abschüsse';
  return base+(m.species&&m.measure!=='damage'?' '+m.species:'')+(m.group!=='none'?' · '+M_GRP[m.group].toLowerCase():'')+' · '+M_PER[m.period].toLowerCase();
}
function metricCalc(m){
  var test=mPeriodTest(m.period),acc={},unit='',fmt=function(v){return String(v)};
  function add(key,label,sort,v,n){var e=acc[key]||(acc[key]={label:label,sort:sort,v:0,n:0});e.v+=v;e.n+=(n==null?1:n)}
  function gk(o,date){
    var g=m.group;
    if(g==='none')return ['all','Gesamt',0];
    if(g==='kanzel'){var nm=o.kanzelId?(facName(o.kanzelId)||'Gelöschte Kanzel'):'Ohne Kanzel';return [nm,nm,0]}
    if(g==='species')return [o.species,o.species,0];
    if(g==='sex')return [o.sex,SEX[o.sex]||'unbekannt',0];
    if(g==='age')return [o.age,AGE[o.age]||'unbekannt',0];
    if(g==='month'){var k=date.getFullYear()*100+date.getMonth();return [k,MONTHS[date.getMonth()]+' '+String(date.getFullYear()).slice(2),k]}
    if(g==='year')return [date.getFullYear(),String(date.getFullYear()),date.getFullYear()];
    if(g==='parcel'){var p=parcelById(o.parcelId);var nm=p?p.name:'Gelöschte Fläche';return [o.parcelId,nm,0]}
    if(g==='cause'){var c=o.cause||'unbekannt';return [c,c,0]}
    return ['all','Gesamt',0];
  }
  if(m.measure==='damage'){damages().forEach(function(d){var dt=new Date(d.date+'T12:00');if(!test(dt))return;var k=gk(d,dt);add(k[0],k[1],k[2],dmgTotal(d),1)});fmt=function(v){return EUR.format(v)}}
  else if(m.measure==='sight'){G('sightings').forEach(function(s){var dt=new Date(s.ts);if(!test(dt)||(m.species&&s.species!==m.species))return;var k=gk(s,dt);add(k[0],k[1],k[2],s.count||1)})}
  else{G('kills').forEach(function(s){var dt=new Date(s.ts);if(!test(dt)||(m.species&&s.species!==m.species))return;var k=gk(s,dt);
    if(m.measure==='weight'){if(s.weight==null)return;add(k[0],k[1],k[2],s.weight,1)}else add(k[0],k[1],k[2],1)});
    if(m.measure==='weight'){fmt=function(v){return nf.format(Math.round(v*10)/10)+' kg'}}}
  var rows=Object.keys(acc).map(function(k){var e=acc[k];return {label:e.label,sort:e.sort,v:m.measure==='weight'?e.v/Math.max(1,e.n):e.v,n:e.n}});
  if(m.group==='month'||m.group==='year')rows.sort(function(a,b){return a.sort-b.sort});else rows.sort(function(a,b){return b.v-a.v});
  return {rows:rows.slice(0,m.group==='month'?24:10),fmt:fmt};
}
function metricInner(m){
  var r=metricCalc(m);
  if(m.group==='none'){var v=r.rows[0]?r.rows[0].v:0;return '<div class="big">'+r.fmt(v)+'</div>'+(m.measure==='weight'&&r.rows[0]?'<p class="hint">aus '+r.rows[0].n+' Stücken mit Gewicht</p>':'')}
  if(!r.rows.length)return '<p class="hint">Keine Daten für diese Auswahl.</p>';
  var mxv=Math.max.apply(null,r.rows.map(function(x){return x.v}).concat([0.0001]));
  return '<div class="bars">'+r.rows.map(function(x){return '<div class="bar"><span class="bl">'+esc(x.label)+(m.measure==='weight'?'<small>'+x.n+' Stücke</small>':'')+'</span><span class="bt"><i style="width:'+Math.max(2,Math.round(x.v/mxv*100))+'%"></i></span><span class="bv" style="min-width:64px;text-align:right">'+r.fmt(x.v)+'</span></div>'}).join('')+'</div>';
}
function linkText(t){return esc(t).replace(/(https?:\/\/[^\s<]+)/g,'<a href="$1" target="_blank" rel="noopener">$1</a>')}
function customHtml(w){
  var head='<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><h2 class="sec" style="margin:0;flex:1">'+esc(w.title||(w.type==='text'?'Notiz':metricTitle(w.m)))+'</h2><button type="button" class="btn sm" data-cw="'+esc(w.id)+'" aria-label="Kachel bearbeiten">Bearbeiten</button></div>';
  return '<div class="card">'+head+(w.type==='text'?'<div style="white-space:pre-wrap;word-break:break-word;font-size:15px;line-height:1.4">'+linkText(w.text||'')+'</div>':metricInner(w.m))+'</div>';
}
function textForm(w){
  var d=w?clone(w):{id:uid('c'),type:'text',title:'',text:''};
  openSheet('<h2>'+(w?'Textblock bearbeiten':'Neuer Textblock')+'</h2>'+
    '<label class="field"><span class="lbl">Überschrift</span><input type="text" id="cw-title" value="'+esc(d.title)+'" placeholder="z. B. Wichtige Nummern" autocomplete="off"></label>'+
    '<label class="field"><span class="lbl">Text</span><textarea rows="7" id="cw-text" placeholder="Notizen, Telefonnummern, Hinweise …">'+esc(d.text)+'</textarea></label>'+
    '<div class="btnrow"><button class="btn primary" id="cw-save" type="button" style="flex:2">Speichern</button><button class="btn" id="cw-cancel" type="button" style="flex:1">Abbrechen</button></div>'+(w?'<button class="btn danger" id="cw-del" type="button">Löschen</button>':''));
  $('#cw-cancel').onclick=closeSheet;
  $('#cw-save').onclick=function(){d.title=$('#cw-title').value.trim();d.text=$('#cw-text').value;if(!d.title&&!d.text.trim()){toast('Bitte Überschrift oder Text eingeben.');return}saveCustom(d,!!w)};
  cwDel(w);
}
function metricForm(w){
  var d=w?clone(w):{id:uid('c'),type:'metric',title:'',m:{measure:'kill',group:'kanzel',period:'year',species:''}};
  openSheet('<h2>'+(w?'Kennzahl bearbeiten':'Neue Kennzahl')+'</h2>'+
    '<label class="field"><span class="lbl">Überschrift (optional)</span><input type="text" id="cw-title" value="'+esc(d.title)+'" placeholder="automatisch" autocomplete="off"></label>'+
    '<label class="field"><span class="lbl">Was</span><select id="cm-meas">'+Object.keys(M_MEAS).map(function(k){return '<option value="'+k+'"'+(d.m.measure===k?' selected':'')+'>'+M_MEAS[k]+'</option>'}).join('')+'</select></label>'+
    '<label class="field"><span class="lbl">Aufgeteilt</span><select id="cm-grp"></select></label>'+
    '<div class="grid2"><label class="field"><span class="lbl">Zeitraum</span><select id="cm-per">'+Object.keys(M_PER).map(function(k){return '<option value="'+k+'"'+(d.m.period===k?' selected':'')+'>'+M_PER[k]+'</option>'}).join('')+'</select></label>'+
    '<label class="field" id="cm-spw"><span class="lbl">Wildart</span><select id="cm-sp"><option value="">Alle</option>'+SPECIES.map(function(x){return '<option'+(d.m.species===x?' selected':'')+'>'+esc(x)+'</option>'}).join('')+'</select></label></div>'+
    '<div class="field"><span class="lbl">Vorschau</span><div class="card" id="cm-prev" style="margin:0"></div></div>'+
    '<div class="btnrow"><button class="btn primary" id="cw-save" type="button" style="flex:2">Speichern</button><button class="btn" id="cw-cancel" type="button" style="flex:1">Abbrechen</button></div>'+(w?'<button class="btn danger" id="cw-del" type="button">Löschen</button>':''));
  function groups(){var g=mGroups(d.m.measure);if(g.indexOf(d.m.group)<0)d.m.group=g[0];$('#cm-grp').innerHTML=g.map(function(k){return '<option value="'+k+'"'+(d.m.group===k?' selected':'')+'>'+M_GRP[k]+'</option>'}).join('');$('#cm-spw').hidden=d.m.measure==='damage'}
  function prev(){d.m.measure=$('#cm-meas').value;d.m.group=$('#cm-grp').value||d.m.group;d.m.period=$('#cm-per').value;d.m.species=d.m.measure==='damage'?'':$('#cm-sp').value;$('#cm-prev').innerHTML=metricInner(d.m)}
  groups();prev();
  $('#cm-meas').onchange=function(){d.m.measure=$('#cm-meas').value;groups();prev()};
  ['#cm-grp','#cm-per','#cm-sp'].forEach(function(s){$(s).onchange=prev});
  $('#cw-cancel').onclick=closeSheet;
  $('#cw-save').onclick=function(){prev();d.title=$('#cw-title').value.trim();saveCustom(d,!!w)};
  cwDel(w);
}
function cwDel(w){var del=$('#cw-del');if(del)del.onclick=function(){if(del.dataset.s!=='1'){del.dataset.s='1';del.textContent='Wirklich löschen?';return}saveDash(dashWidgets().filter(function(x){return x.id!==w.id})).then(function(){closeSheet();renderStart()},function(){})}}
function saveCustom(d,edit){var a=dashWidgets().slice(),i=a.findIndex(function(x){return x.id===d.id});if(i>-1)a[i]=d;else a.push(d);saveDash(a).then(function(){closeSheet();renderStart()},function(){})}
function renderStart(){
  var box=$('#startBody');if(!box)return;
  var kills=G('kills'),d=new Date(),parts=[
    ['quick',startQuickHtml()],['jz',jzCardHtml()],['res',startResHtml()],['hunt',startHuntHtml()],['plan',lotPlanCardHtml(kills)],['kills',startKillsHtml(kills)],['dmg',damageCardHtml('all')],['crop',cropSumHtml(null,true)||'']
  ].concat(dashWidgets().map(function(w){return ['c_'+w.id,customHtml(w)]}));
  box.innerHTML='<p class="hint" style="margin:0 0 12px">'+esc(d.toLocaleDateString('de-LU',{weekday:'long',day:'numeric',month:'long',year:'numeric'}))+'</p>'+
    parts.map(function(p){return p[1]?'<div class="wid" data-cid="'+p[0]+'" style="margin-bottom:12px">'+p[1]+'</div>':''}).join('')+
    '<div class="btnrow" id="stAdd" style="margin:4px 0 80px"><button class="btn" id="addTxt" type="button">+ Textblock</button><button class="btn" id="addMet" type="button">+ Kennzahl</button></div>';
  $$('#startBody .wid > .card').forEach(function(c){c.style.marginBottom='0'});
  cardLayout(CARD_CFG.start);box.appendChild($('#stAdd'));
  jzBind();bindLotPlan();bindDamage();bindResRows(box);
  $('#addTxt').onclick=function(){textForm(null)};$('#addMet').onclick=function(){metricForm(null)};
  $$('#startBody [data-cw]').forEach(function(b){b.onclick=function(){var w=dashWidgets().filter(function(x){return x.id===b.dataset.cw})[0];if(w)(w.type==='text'?textForm:metricForm)(w)}});
  $$('#startBody [data-q]').forEach(function(b){b.onclick=function(){var k=b.dataset.q;
    if(k==='res')resForm(null,null);else if(k==='dmg')pickParcelFor0();else if(k==='track')S.rec?trkStopSheet():trkStart();else newEntry(k)}});
  $$('#startBody [data-sh]').forEach(function(b){b.onclick=function(){switchTab('hunt')}});
}
function pickParcelFor0(){if(!parcels().length)parcelNew();else pickParcelFor()}
