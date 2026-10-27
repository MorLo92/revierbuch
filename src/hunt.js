/* ---------- Drückjagd: Posten, Schützen, Schussmeldungen, Nachsuche ---------- */
ICON.hunt='<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>';
var RES={unk:'Unklar',fl:'Flüchtig / krank',tot:'Tot am Anschuss',miss:'Fehlschuss'};
var NST={open:'Offen',org:'Führer informiert',run:'Nachsuche läuft',found:'Stück gefunden',fail:'Erfolglos beendet'};
function hunts(){return D.settings.hunts||[]}
function saveHunts(arr){return guard(Store.setting({hunts:arr}))}
function huntById(id){return hunts().filter(function(h){return h.id===id})[0]}
function updHunt(h){return saveHunts(hunts().map(function(x){return x.id===h.id?h:x}))}
function needsNach(s){return s.res==='unk'||s.res==='fl'}
function nstOf(s){return (s.nach&&s.nach.st)||'open'}
function nachOpen(s){return needsNach(s)&&['open','org','run'].indexOf(nstOf(s))>-1}
function openNach(){var a=[];hunts().forEach(function(h){(h.shots||[]).forEach(function(s){if(nachOpen(s))a.push({h:h,s:s})})});return a}
function postMarker(id){return memo('mk',function(){var m={};D.markers.forEach(function(x){m[x.id]=x});return m})[id]}
function postName(id){var m=postMarker(id);return m?(m.name||FAC[m.type].label):'Gelöschter Posten'}
function postGroup(id){var m=postMarker(id);return m&&m.group||''}
function postMk(id){var m=postMarker(id);return m?entMk({k:'fac',o:m}):'<span class="mk">?</span>'}
function postOf(h,id){return (h.posts||[]).filter(function(p){return p.id===id})[0]||{}}
function shotTitle(s){return (s.count||1)+'× '+s.species+(s.sex&&s.sex!=='u'?' ('+SEX[s.sex]+')':'')+' · '+RES[s.res]}
function fmtDay(d){if(!d)return '';var x=new Date(d+'T12:00');return isNaN(x)?d:x.toLocaleDateString('de-LU',{weekday:'short',day:'2-digit',month:'2-digit',year:'numeric'})}
function telHref(t){return 'tel:'+String(t).replace(/[^+0-9]/g,'')}
function mapsLink(lat,lon){return 'https://www.google.com/maps?q='+lat+','+lon}
function shareText(txt,title){
  if(navigator.share){navigator.share({title:title||'Revierbuch',text:txt}).catch(function(){})}
  else if(navigator.clipboard){navigator.clipboard.writeText(txt).then(function(){toast('Text kopiert')},function(){toast('Kopieren nicht möglich')})}
  else toast('Teilen wird hier nicht unterstützt.');
}
function nachRowsHtml(list){return '<div class="rows">'+list.map(function(x){var s=x.s;return '<button class="row" type="button" data-nh="'+esc(x.h.id)+'" data-ns="'+esc(s.id)+'"><span class="mk sq" style="background:var(--kill)">!</span><span class="rt"><b>'+esc(shotTitle(s))+'</b><small>'+esc(x.h.name)+' · '+esc(postName(s.postId))+' · '+esc(NST[nstOf(s)])+'</small></span></button>'}).join('')+'</div>'}
function shotRowsHtml(h){
  var a=(h.shots||[]).slice().sort(function(x,y){return new Date(y.ts)-new Date(x.ts)});
  if(!a.length)return '<div class="empty">Noch keine Schüsse gemeldet.</div>';
  return '<div class="rows">'+a.map(function(s){var op=nachOpen(s),p=postOf(h,s.postId);return '<button class="row" type="button" data-nh="'+esc(h.id)+'" data-ns="'+esc(s.id)+'"><span class="mk sq" style="background:'+(op?'var(--kill)':'var(--ink-2)')+'">'+(op?'!':'S')+'</span><span class="rt"><b>'+esc(shotTitle(s))+'</b><small>'+new Date(s.ts).toLocaleTimeString('de-LU',{hour:'2-digit',minute:'2-digit'})+' · '+esc(postName(s.postId))+(p.shooter?' · '+esc(p.shooter):'')+(needsNach(s)?' · Nachsuche: '+esc(NST[nstOf(s)]):'')+'</small></span></button>'}).join('')+'</div>'}

/* ----- tab ----- */
function renderHunt(){
  var h=S.hid&&huntById(S.hid);if(S.hid&&!h)S.hid=null;
  $('#huntBody').innerHTML=h?huntDetailHtml(h):huntListHtml();
  var root=$('#huntBody');
  $$('[data-nh]',root).forEach(function(b){b.onclick=function(){showShot(b.dataset.nh,b.dataset.ns)}});
  if(!h){
    $('#hNew').onclick=function(){huntForm(null)};
    $$('[data-h]',root).forEach(function(b){b.onclick=function(){S.hid=b.dataset.h;renderHunt();window.scrollTo(0,0)}});
    $('#rNew').onclick=function(){resForm(null,null)};bindResRows(root);
  }else{
    $('#hBack').onclick=function(){S.hid=null;renderHunt()};
    $('#hShot').onclick=function(){shotForm(h,null,null)};
    $('#hPosts').onclick=function(){postsPicker(h)};
    $('#hNewPost').onclick=function(){newPost(h)};
    $('#hNewLine').onclick=function(){lineWizard(h)};
    $('#hMap').onclick=function(){showHuntOnMap(h)};
    $('#hShare').onclick=function(){shareText(standText(h),h.name)};
    $('#hEdit').onclick=function(){huntForm(h)};
    var mt=$('#hMeet');if(mt)mt.onclick=function(){showMeet(h)};
    $$('[data-p]',root).forEach(function(b){b.onclick=function(){postSheet(h,b.dataset.p)}});
    $$('[data-gc]',root).forEach(function(b){b.onclick=function(){colorSheet(b.dataset.gc)}});
  }
}
function huntListHtml(){
  var hs=hunts().slice().sort(function(a,b){return (b.date||'').localeCompare(a.date||'')}),no=openNach();
  var html='<div class="toolbar"><button class="btn primary" id="hNew" type="button">+ Neue Drückjagd</button></div>';
  if(no.length)html+='<div class="warnbox"><b>Offene Nachsuchen ('+no.length+')</b></div>'+nachRowsHtml(no);
  if(!hs.length)html+='<div class="empty">Noch keine Drückjagd. Lege zuerst unter Eintragen → Einrichtung die Posten an (Art „Drückjagdposten“, optional mit Gruppe wie „Linie 1“). Dann erstellst du hier die Jagd, wählst die Posten und trägst die Schützen ein.</div>';
  else html+='<div class="rows">'+hs.map(function(h){var ns=(h.shots||[]).length,o=(h.shots||[]).filter(nachOpen).length;return '<button class="row" type="button" data-h="'+esc(h.id)+'"><span class="mk sq" style="background:var(--accent)">'+(h.posts||[]).length+'</span><span class="rt"><b>'+esc(h.name)+'</b><small>'+esc(fmtDay(h.date))+(h.time?' · '+esc(h.time):'')+' · '+ns+' Schüsse'+(o?' · '+o+' Nachsuche offen':'')+'</small></span></button>'}).join('')+'</div>';
  html+=resSectionHtml();
  return html;
}
function huntDetailHtml(h){
  var posts=(h.posts||[]).slice().sort(function(a,b){return nat(postGroup(a.id)||'~',postGroup(b.id)||'~')||nat(postName(a.id),postName(b.id))});
  var no=(h.shots||[]).filter(nachOpen).map(function(s){return {h:h,s:s}});
  var html='<div class="toolbar"><button class="btn sm" id="hBack" type="button">‹ Alle Jagden</button></div>'+
    '<h2 class="sec">'+esc(h.name)+'</h2><p class="hint">'+esc(fmtDay(h.date))+(h.time?' · Beginn '+esc(h.time):'')+(h.place?' · '+esc(h.place):'')+'</p>'+(h.pLat!=null?'<button class="btn sm" id="hMeet" type="button">Treffpunkt: '+esc(meetName(h))+' · anzeigen</button>':'')+(h.note?'<p>'+esc(h.note)+'</p>':'')+
    '<div class="toolbar"><button class="btn primary" id="hShot" type="button">Schuss melden</button><button class="btn" id="hPosts" type="button">Posten wählen</button></div>'+
    '<div class="toolbar"><button class="btn" id="hNewPost" type="button">+ Posten</button><button class="btn" id="hNewLine" type="button">+ Linie</button></div>'+
    '<div class="toolbar"><button class="btn" id="hMap" type="button">Auf Karte</button><button class="btn" id="hShare" type="button">Standliste teilen</button><button class="btn" id="hEdit" type="button">Bearbeiten</button></div>';
  if(no.length)html+='<div class="warnbox"><b>Offene Nachsuchen ('+no.length+')</b></div>'+nachRowsHtml(no);
  html+='<h2 class="sec">Posten und Schützen</h2>';
  if(!posts.length)html+='<div class="empty">Noch keine Posten gewählt. Tippe auf „Posten wählen“.</div>';
  else{
    var order=[],map={};posts.forEach(function(p){var g=postGroup(p.id)||'Ohne Gruppe';if(!map[g]){map[g]=[];order.push(g)}map[g].push(p)});
    order.forEach(function(g){
      html+='<h3 class="lbl" style="margin:14px 0 6px;display:flex;align-items:center;gap:8px">'+esc(g)+(g!=='Ohne Gruppe'?'<button type="button" class="swb dot" data-gc="'+esc(g)+'" style="background:'+(grpColor(g)||'var(--line)')+'" aria-label="Farbe der Linie wählen"></button>':'')+'</h3><div class="rows">'+map[g].map(function(p){var n=(h.shots||[]).filter(function(s){return s.postId===p.id}).length;
        return '<button class="row" type="button" data-p="'+esc(p.id)+'">'+postMk(p.id)+'<span class="rt"><b>'+esc(postName(p.id))+'</b><small>'+(p.shooter?esc(p.shooter):'kein Schütze eingetragen')+(p.phone?' · '+esc(p.phone):'')+(n?' · '+n+' Schuss'+(n>1?'e':''):'')+'</small></span></button>'}).join('')+'</div>';
    });
  }
  html+='<h2 class="sec">Schussmeldungen</h2>'+shotRowsHtml(h);
  return html;
}

/* ----- jagd anlegen / bearbeiten ----- */
function huntForm(h){
  var d=h?clone(h):{id:uid('j'),name:'',date:toLocalInput().slice(0,10),time:'',place:'',pLat:null,pLon:null,note:'',posts:[],shots:[]};
  huntFormShow(d,!!h);
}
function huntFormShow(d,edit){
  openSheet('<h2>'+(edit?'Drückjagd bearbeiten':'Neue Drückjagd')+'</h2>'+
    '<label class="field"><span class="lbl">Name</span><input type="text" id="hf-name" value="'+esc(d.name)+'" placeholder="z. B. Drückjagd Eichberg" autocomplete="off"></label>'+
    '<div class="grid2"><label class="field"><span class="lbl">Datum</span><input type="date" id="hf-date" value="'+esc(d.date||'')+'"></label><label class="field"><span class="lbl">Beginn</span><input type="time" id="hf-time" value="'+esc(d.time||'')+'"></label></div>'+
    '<label class="field"><span class="lbl">Treffpunkt (Name)</span><input type="text" id="hf-place" value="'+esc(d.place||'')+'" placeholder="z. B. Parkplatz Waldhütte" autocomplete="off"></label>'+
    '<div class="field"><span class="lbl">Treffpunkt auf der Karte</span><div class="posrow"><code id="hf-pos"></code><div class="btnrow"><button type="button" class="btn sm" id="hf-pick">Auf Karte setzen</button><button type="button" class="btn sm" id="hf-gps">Mein Standort</button><button type="button" class="btn sm" id="hf-nopos">Entfernen</button></div></div></div>'+
    '<label class="field"><span class="lbl">Notiz</span><textarea rows="2" id="hf-note">'+esc(d.note||'')+'</textarea></label>'+
    '<div class="btnrow"><button class="btn primary" id="hf-save" type="button" style="flex:2">Speichern</button><button class="btn" id="hf-cancel" type="button" style="flex:1">Abbrechen</button></div>'+(edit?'<button class="btn danger" id="hf-del" type="button">Jagd löschen</button>':''));
  function grab(){d.name=$('#hf-name').value.trim();d.date=$('#hf-date').value;d.time=$('#hf-time').value;d.place=$('#hf-place').value.trim();d.note=$('#hf-note').value.trim()}
  function upd(){$('#hf-pos').textContent=d.pLat!=null?posText({lat:d.pLat,lon:d.pLon}):'noch nicht festgelegt'}
  upd();
  $('#hf-cancel').onclick=closeSheet;
  var gp=$('#hf-gps');gp.onclick=function(){gp.disabled=true;locate(false).then(function(p){d.pLat=p.lat;d.pLon=p.lon;upd()}).catch(function(){}).then(function(){gp.disabled=false})};
  $('#hf-nopos').onclick=function(){d.pLat=null;d.pLon=null;upd()};
  $('#hf-pick').onclick=function(){
    grab();closeSheet();switchTab('map');if(d.pLat!=null)centerOn(d.pLat,d.pLon,Math.max(S.view.z,16));
    $('#placeTitle').textContent='Treffpunkt festlegen';
    var back=function(){endPlace();switchTab('hunt');huntFormShow(d,edit)};
    S.placing={ok:function(){d.pLat=S.view.lat;d.pLon=S.view.lon;back()},no:back};renderAll();
  };
  $('#hf-save').onclick=function(){
    grab();var o=Object.assign({},d,{name:d.name||'Drückjagd'});
    (edit?updHunt(o):saveHunts(hunts().concat([o]))).then(function(){
      toast('Gespeichert');
      if(!edit){S.hid=o.id;renderHunt();postsPicker(huntById(o.id))}else{closeSheet();renderHunt()}
    },function(){});
  };
  var del=$('#hf-del');if(del)del.onclick=function(){if(del.dataset.s!=='1'){del.dataset.s='1';del.textContent='Wirklich löschen? Alle Schussmeldungen gehen verloren.';return}
    saveHunts(hunts().filter(function(x){return x.id!==d.id})).then(function(){if(S.hunt===d.id)S.hunt=null;S.hid=null;closeSheet();renderHunt();toast('Gelöscht')},function(){})};
}
/* ----- treffpunkt ----- */
function meetName(h){return h.place||'Treffpunkt'}
function showMeet(h){
  openSheet('<h2>'+esc(meetName(h))+'</h2><p class="hint">Treffpunkt · '+esc(h.name)+(h.time?' · '+esc(h.time):'')+'</p><dl class="kv"><dt>Position</dt><dd><code>'+posText({lat:h.pLat,lon:h.pLon})+'</code></dd></dl>'+
    '<div class="btnrow"><button class="btn primary" id="mt-guide" type="button">Hinführen</button><a class="btn" href="https://www.google.com/maps/dir/?api=1&destination='+h.pLat+','+h.pLon+'&travelmode=driving" target="_blank" rel="noopener">Route Auto</a><a class="btn" href="https://www.google.com/maps/dir/?api=1&destination='+h.pLat+','+h.pLon+'&travelmode=walking" target="_blank" rel="noopener">Route zu Fuß</a></div>'+
    '<div class="btnrow"><button class="btn" id="mt-open" type="button">Jagd öffnen</button><button class="btn" id="mt-close" type="button">Schließen</button></div>');
  $('#mt-close').onclick=closeSheet;
  $('#mt-guide').onclick=function(){startGuide({lat:h.pLat,lon:h.pLon,name:meetName(h)})};
  $('#mt-open').onclick=function(){closeSheet();S.hid=h.id;switchTab('hunt')};
}
function meetHit(px,py){var cur=S.hunt&&huntById(S.hunt);if(!cur||cur.pLat==null)return null;var p=toScr(cur.pLat,cur.pLon);return Math.hypot(p.x-px,p.y-py)<Math.max(18,28*MKS)?cur:null}

/* ----- posten wählen ----- */
function postsPicker(h){
  h=huntById(h.id)||h;
  var ms=D.markers.filter(function(m){return SEATS.indexOf(m.type)>-1}).sort(function(a,b){return nat(a.group||'~',b.group||'~')||nat(a.name||'',b.name||'')});
  if(!ms.length){openSheet('<h2>Posten wählen</h2><div class="empty">Es gibt noch keine Posten. Lege sie unter Eintragen → Einrichtung an (Art „Drückjagdposten“, „Kanzel“ oder „Ansitzbock / Drückjagdstand“).</div><div class="btnrow"><button class="btn" id="pk-close" type="button">Schließen</button></div>');$('#pk-close').onclick=closeSheet;return}
  var sel={};(h.posts||[]).forEach(function(p){sel[p.id]=1});
  var groups=Array.from(new Set(ms.map(function(m){return m.group||''}))).filter(Boolean);
  openSheet('<h2>Posten wählen</h2><p class="hint">Hake die Posten an, die bei dieser Jagd besetzt sind. Mit den Gruppen-Knöpfen wählst du eine ganze Linie auf einmal.</p>'+
    (groups.length?'<div class="btnrow">'+groups.map(function(g){return '<button class="btn sm" type="button" data-g="'+esc(g)+'">'+esc(g)+' ('+ms.filter(function(m){return m.group===g}).length+')</button>'}).join('')+'</div>':'')+
    '<div class="rows">'+ms.map(function(m,i){return '<label class="row pick"><input type="checkbox" data-i="'+i+'"'+(sel[m.id]?' checked':'')+'>'+entMk({k:'fac',o:m})+'<span class="rt"><b>'+esc(m.name||FAC[m.type].label)+'</b>'+(m.group?'<small>'+esc(m.group)+'</small>':'')+'</span></label>'}).join('')+'</div>'+
    '<div class="btnrow"><button class="btn primary" id="pk-save" type="button" style="flex:2">Übernehmen</button><button class="btn" id="pk-cancel" type="button" style="flex:1">Abbrechen</button></div>');
  $('#pk-cancel').onclick=closeSheet;
  $$('#sheetBody [data-g]').forEach(function(b){b.onclick=function(){
    var boxes=ms.map(function(m,i){return m.group===b.dataset.g?$('#sheetBody input[data-i="'+i+'"]'):null}).filter(Boolean),all=boxes.every(function(x){return x.checked});
    boxes.forEach(function(x){x.checked=!all})}});
  $('#pk-save').onclick=function(){
    var posts=[];ms.forEach(function(m,i){if($('#sheetBody input[data-i="'+i+'"]').checked)posts.push(postOf(h,m.id).id?postOf(h,m.id):{id:m.id,shooter:'',phone:'',note:''})});
    updHunt(Object.assign({},h,{posts:posts})).then(function(){closeSheet();renderHunt();toast(posts.length+' Posten gewählt')},function(){});
  };
}

/* ----- posten: schütze eintragen ----- */
function postSheet(h,pid){
  h=huntById(h.id);if(!h)return;var p=postOf(h,pid);if(!p.id)return;
  var names={};hunts().forEach(function(x){(x.posts||[]).forEach(function(q){if(q.shooter)names[q.shooter]=q.phone||names[q.shooter]||''})});
  openSheet('<h2>'+esc(postName(pid))+'</h2><p class="hint">'+esc(postGroup(pid)||'Ohne Gruppe')+'</p>'+
    '<label class="field"><span class="lbl">Schütze</span><input type="text" id="ps-sh" value="'+esc(p.shooter||'')+'" list="shDl" autocomplete="off"><datalist id="shDl">'+Object.keys(names).map(function(n){return '<option value="'+esc(n)+'">'}).join('')+'</datalist></label>'+
    '<label class="field"><span class="lbl">Telefon</span><input type="tel" id="ps-ph" value="'+esc(p.phone||'')+'" inputmode="tel" autocomplete="off"></label>'+
    '<label class="field"><span class="lbl">Notiz</span><textarea rows="2" id="ps-note">'+esc(p.note||'')+'</textarea></label>'+
    '<div class="btnrow"><button class="btn primary" id="ps-save" type="button">Speichern</button><button class="btn" id="ps-shot" type="button">Schuss melden</button></div>'+
    '<div class="btnrow"><button class="btn" id="ps-guide" type="button">Hinführen</button><button class="btn" id="ps-edit" type="button">Name / Linie / Lage</button><button class="btn danger" id="ps-rm" type="button">Aus Jagd entfernen</button><button class="btn" id="ps-close" type="button">Schließen</button></div>');
  $('#ps-close').onclick=closeSheet;
  function collect(){return Object.assign({},p,{shooter:$('#ps-sh').value.trim(),phone:$('#ps-ph').value.trim(),note:$('#ps-note').value.trim()})}
  function put(np){return updHunt(Object.assign({},h,{posts:h.posts.map(function(q){return q.id===pid?np:q})}))}
  $('#ps-sh').addEventListener('change',function(){var n=names[$('#ps-sh').value.trim()];if(n&&!$('#ps-ph').value)$('#ps-ph').value=n});
  $('#ps-save').onclick=function(){put(collect()).then(function(){closeSheet();toast('Gespeichert')},function(){})};
  $('#ps-shot').onclick=function(){put(collect()).then(function(){shotForm(huntById(h.id),null,pid)},function(){})};
  $('#ps-edit').onclick=function(){var mk=postMarker(pid);if(!mk)return;put(collect()).then(function(){var c=clone(mk);c.posManual=true;openForm('marker',c,true)},function(){})};
  var m=postMarker(pid),g=$('#ps-guide');if(!m)g.disabled=true;else g.onclick=function(){startGuide({lat:m.lat,lon:m.lon,name:postName(pid)})};
  var rm=$('#ps-rm');rm.onclick=function(){if(rm.dataset.s!=='1'){rm.dataset.s='1';rm.textContent='Wirklich entfernen?';return}
    updHunt(Object.assign({},h,{posts:h.posts.filter(function(q){return q.id!==pid})})).then(function(){closeSheet();toast('Entfernt')},function(){})};
}

/* ----- schussmeldung ----- */
function shotForm(h,s,pid){
  h=huntById(h.id)||h;
  if(!(h.posts||[]).length){toast('Wähle zuerst die Posten dieser Jagd.');postsPicker(h);return}
  var d=s?clone(s):{id:uid('sh'),postId:pid||h.posts[0].id,species:'Rehwild',sex:'u',count:1,res:'unk',lat:null,lon:null,note:'',nach:{st:'open',dog:'',phone:''}};
  d.tsl=toLocalInput(s?s.ts:null);d.nach=Object.assign({st:'open',dog:'',phone:''},d.nach||{});
  if(d.lat==null){var m=postMarker(d.postId);if(m){d.lat=m.lat;d.lon=m.lon}d.posManual=false}else d.posManual=true;
  shotFormShow(h.id,d,!!s);
}
function shotFormShow(hid,d,edit){
  var h=huntById(hid);if(!h)return;
  function seg(f,map,keys,val){return '<div class="seg" data-sf="'+f+'">'+keys.map(function(k){return '<button type="button" data-v="'+k+'" aria-pressed="'+(val===k)+'">'+map[k]+'</button>'}).join('')+'</div>'}
  openSheet('<h2>'+(edit?'Schussmeldung bearbeiten':'Schuss melden')+'</h2><p class="hint">'+esc(h.name)+'</p>'+
    '<label class="field"><span class="lbl">Posten</span><select id="sf-post">'+h.posts.map(function(p){return '<option value="'+esc(p.id)+'"'+(p.id===d.postId?' selected':'')+'>'+esc(postName(p.id))+(p.shooter?' · '+esc(p.shooter):'')+'</option>'}).join('')+'</select></label>'+
    '<div class="grid2"><label class="field"><span class="lbl">Zeitpunkt</span><input type="datetime-local" id="sf-tsl" value="'+esc(d.tsl)+'"></label>'+
    '<label class="field"><span class="lbl">Anzahl</span><input type="number" inputmode="numeric" min="1" step="1" id="sf-count" value="'+(d.count||1)+'"></label></div>'+
    '<label class="field"><span class="lbl">Wildart</span><select id="sf-sp">'+opts(SPECIES,d.species)+'</select></label>'+
    '<div class="field"><span class="lbl">Geschlecht</span>'+seg('sex',SEX,['m','w','u'],d.sex)+'</div>'+
    '<div class="field"><span class="lbl">Ergebnis laut Schütze</span>'+seg('res',RES,['unk','fl','tot','miss'],d.res)+'<p class="hint">„Unklar“ und „Flüchtig“ legen automatisch eine offene Nachsuche an.</p></div>'+
    '<div class="field"><span class="lbl">Anschuss</span><div class="posrow"><code id="sf-pos"></code><p class="hint" id="sf-poshint"></p><div class="btnrow"><button type="button" class="btn sm" id="sf-pick">Auf Karte setzen</button><button type="button" class="btn sm" id="sf-gps">Mein Standort</button><button type="button" class="btn sm" id="sf-post0">Wie Posten</button></div></div></div>'+
    '<label class="field"><span class="lbl">Zeichnen, Schweiß, Fluchtrichtung, Notiz</span><textarea rows="3" id="sf-note">'+esc(d.note||'')+'</textarea></label>'+
    '<div id="sf-nach"><div class="field"><span class="lbl">Nachsuche</span>'+seg('st',NST,['open','org','run','found','fail'],d.nach.st)+'</div>'+
    '<div class="grid2"><label class="field"><span class="lbl">Nachsuchenführer</span><input type="text" id="sf-dog" value="'+esc(d.nach.dog||'')+'" autocomplete="off"></label><label class="field"><span class="lbl">Telefon</span><input type="tel" id="sf-dph" inputmode="tel" value="'+esc(d.nach.phone||'')+'"></label></div></div>'+
    '<div class="btnrow"><button class="btn primary" id="sf-save" type="button" style="flex:2">Speichern</button><button class="btn" id="sf-cancel" type="button" style="flex:1">Abbrechen</button></div>');
  function upd(){$('#sf-pos').textContent=posText(d);$('#sf-poshint').textContent=d.posManual?'':'Position des Postens. Für eine genaue Nachsuche den Anschuss mit „Mein Standort“ oder auf der Karte festlegen.';$('#sf-nach').hidden=!needsNach(d)}
  upd();
  $$('#sheetBody [data-sf]').forEach(function(box){box.addEventListener('click',function(e){var b=e.target.closest('button[data-v]');if(!b)return;
    $$('button[data-v]',box).forEach(function(x){x.setAttribute('aria-pressed',x===b)});
    var f=box.dataset.sf;if(f==='st')d.nach.st=b.dataset.v;else d[f]=b.dataset.v;upd()})});
  $('#sf-post').onchange=function(e){d.postId=e.target.value;if(!d.posManual){var m=postMarker(d.postId);if(m){d.lat=m.lat;d.lon=m.lon}upd()}};
  $('#sf-post0').onclick=function(){var m=postMarker(d.postId);if(m){d.lat=m.lat;d.lon=m.lon}d.posManual=false;upd()};
  var gp=$('#sf-gps');gp.onclick=function(){gp.disabled=true;locate(false).then(function(p){d.lat=p.lat;d.lon=p.lon;d.posManual=true;upd()}).catch(function(){}).then(function(){gp.disabled=false})};
  $('#sf-cancel').onclick=closeSheet;
  function grab(){d.postId=$('#sf-post').value;d.tsl=$('#sf-tsl').value;d.count=Math.max(1,parseInt($('#sf-count').value,10)||1);d.species=$('#sf-sp').value;d.note=$('#sf-note').value.trim();d.nach.dog=$('#sf-dog').value;d.nach.phone=$('#sf-dph').value}
  $('#sf-pick').onclick=function(){
    grab();closeSheet();switchTab('map');if(d.lat!=null)centerOn(d.lat,d.lon,Math.max(S.view.z,16));
    $('#placeTitle').textContent='Anschuss festlegen';
    var back=function(){endPlace();switchTab('hunt');shotFormShow(hid,d,edit)};
    S.placing={ok:function(){d.lat=S.view.lat;d.lon=S.view.lon;d.posManual=true;back()},no:back};renderAll();
  };
  $('#sf-save').onclick=function(){
    grab();var t=new Date(d.tsl);if(isNaN(t)){toast('Bitte Datum und Uhrzeit angeben.');return}
    if(d.lat==null){toast('Bitte eine Position festlegen.');return}
    var o={id:d.id,postId:d.postId,ts:t.toISOString(),species:d.species,sex:d.sex,count:d.count,res:d.res,lat:d.lat,lon:d.lon,note:d.note,
      nach:needsNach(d)?{st:d.nach.st||'open',dog:(d.nach.dog||'').trim(),phone:(d.nach.phone||'').trim()}:null};
    var cur=huntById(hid),shots=(cur.shots||[]).slice(),i=shots.findIndex(function(x){return x.id===o.id});if(i>-1)shots[i]=o;else shots.push(o);
    updHunt(Object.assign({},cur,{shots:shots})).then(function(){toast('Gespeichert');if(!edit&&needsNach(o))showShot(hid,o.id);else closeSheet();renderHunt()},function(){});
  };
}

/* ----- schuss ansehen, nachsuche organisieren ----- */
function nachText(h,s){
  var p=postOf(h,s.postId),L=['NACHSUCHE – '+h.name,'Wild: '+shotTitle(s),'Schuss: '+fmtDate(s.ts)+', '+postName(s.postId)+(postGroup(s.postId)?' ('+postGroup(s.postId)+')':'')];
  if(p.shooter)L.push('Schütze: '+p.shooter+(p.phone?', '+p.phone:''));
  if(s.note)L.push('Zeichnen/Notiz: '+s.note);
  L.push('Anschuss: '+s.lat.toFixed(5)+', '+s.lon.toFixed(5),'Karte: '+mapsLink(s.lat,s.lon));return L.join('\n');
}
function standText(h){
  var L=[h.name,fmtDay(h.date)+(h.time?', Beginn '+h.time:'')+(h.place||h.pLat!=null?'\nTreffpunkt: '+(h.place||'')+(h.pLat!=null?' '+mapsLink(h.pLat,h.pLon):''):''),''],order=[],map={};
  (h.posts||[]).slice().sort(function(a,b){return nat(postGroup(a.id)||'~',postGroup(b.id)||'~')||nat(postName(a.id),postName(b.id))}).forEach(function(p){var g=postGroup(p.id)||'Ohne Gruppe';if(!map[g]){map[g]=[];order.push(g)}map[g].push(p)});
  order.forEach(function(g){L.push(g);map[g].forEach(function(p){L.push('  '+postName(p.id)+' – '+(p.shooter||'frei')+(p.phone?' ('+p.phone+')':''))});L.push('')});
  return L.join('\n').trim();
}
function showShot(hid,sid){
  var h=huntById(hid),s=h&&(h.shots||[]).filter(function(x){return x.id===sid})[0];if(!s)return;
  var p=postOf(h,s.postId),needs=needsNach(s),st=nstOf(s),n=s.nach||{};
  var rows='<dt>Jagd</dt><dd>'+esc(h.name)+'</dd><dt>Posten</dt><dd>'+esc(postName(s.postId))+(postGroup(s.postId)?' · '+esc(postGroup(s.postId)):'')+'</dd>'+
    (p.shooter?'<dt>Schütze</dt><dd>'+esc(p.shooter)+(p.phone?' · <a href="'+telHref(p.phone)+'">'+esc(p.phone)+'</a>':'')+'</dd>':'')+
    '<dt>Zeitpunkt</dt><dd>'+fmtDate(s.ts)+'</dd><dt>Ergebnis</dt><dd>'+esc(RES[s.res])+'</dd><dt>Anschuss</dt><dd><code>'+posText(s)+'</code></dd>'+
    (s.note?'<dt>Notiz</dt><dd>'+esc(s.note)+'</dd>':'')+
    (needs?'<dt>Nachsuche</dt><dd>'+esc(NST[st])+'</dd>'+(n.dog?'<dt>Führer</dt><dd>'+esc(n.dog)+(n.phone?' · <a href="'+telHref(n.phone)+'">'+esc(n.phone)+'</a>':'')+'</dd>':''):'');
  openSheet('<h2>'+esc(shotTitle(s))+'</h2><dl class="kv">'+rows+'</dl>'+
    (needs?'<div class="field"><span class="lbl">Status der Nachsuche</span><div class="seg" id="sh-st">'+['open','org','run','found','fail'].map(function(k){return '<button type="button" data-v="'+k+'" aria-pressed="'+(st===k)+'">'+NST[k]+'</button>'}).join('')+'</div></div>':'')+
    '<div class="btnrow"><button class="btn primary" id="sh-guide" type="button">Hinführen</button><a class="btn" href="https://www.google.com/maps/dir/?api=1&destination='+s.lat+','+s.lon+'&travelmode=driving" target="_blank" rel="noopener">Route Auto</a><a class="btn" href="https://www.google.com/maps/dir/?api=1&destination='+s.lat+','+s.lon+'&travelmode=walking" target="_blank" rel="noopener">Route zu Fuß</a></div>'+
    '<div class="btnrow"><button class="btn" id="sh-share" type="button">Nachsuche melden (teilen)</button><button class="btn" id="sh-kill" type="button">Als Abschuss eintragen</button><button class="btn" id="sh-map" type="button">Auf Karte</button></div>'+
    '<div class="btnrow"><button class="btn" id="sh-edit" type="button">Bearbeiten</button><button class="btn danger" id="sh-del" type="button">Löschen</button><button class="btn" id="sh-close" type="button">Schließen</button></div>');
  $('#sh-close').onclick=closeSheet;
  $('#sh-guide').onclick=function(){startGuide({lat:s.lat,lon:s.lon,name:'Anschuss · '+postName(s.postId)})};
  $('#sh-share').onclick=function(){shareText(nachText(h,s),'Nachsuche')};
  $('#sh-map').onclick=function(){closeSheet();S.hunt=h.id;switchTab('map');centerOn(s.lat,s.lon,Math.max(S.view.z,17));renderAll()};
  $('#sh-edit').onclick=function(){var cur=huntById(hid);shotFormShow(hid,(function(){var d=clone(s);d.tsl=toLocalInput(s.ts);d.nach=Object.assign({st:'open',dog:'',phone:''},d.nach||{});d.posManual=true;return d})(),true)};
  $('#sh-kill').onclick=function(){
    var k={id:uid('k'),lat:s.lat,lon:s.lon,posManual:true,species:s.species,sex:s.sex==='g'?'u':s.sex,age:'u',weight:null,tsl:toLocalInput(s.ts),kanzelId:postMarker(s.postId)?s.postId:'',tag:'',note:'Drückjagd '+h.name};
    closeSheet();openForm('kill',k,false)};
  var dl=$('#sh-del');dl.onclick=function(){if(dl.dataset.s!=='1'){dl.dataset.s='1';dl.textContent='Wirklich löschen?';return}
    updHunt(Object.assign({},h,{shots:h.shots.filter(function(x){return x.id!==sid})})).then(function(){closeSheet();toast('Gelöscht');renderHunt()},function(){})};
  var sg=$('#sh-st');if(sg)sg.addEventListener('click',function(e){var b=e.target.closest('button[data-v]');if(!b)return;
    var ns=Object.assign({},s,{nach:Object.assign({},s.nach||{},{st:b.dataset.v})});
    updHunt(Object.assign({},h,{shots:h.shots.map(function(x){return x.id===sid?ns:x})})).then(function(){showShot(hid,sid);renderHunt()},function(){})});
}

/* ----- karte ----- */
function showHuntOnMap(h){
  S.hunt=h.id;switchTab('map');
  var b=[1e9,1e9,-1e9,-1e9],n=0;function add(la,lo){if(la==null)return;n++;b[0]=Math.min(b[0],lo);b[1]=Math.min(b[1],la);b[2]=Math.max(b[2],lo);b[3]=Math.max(b[3],la)}
  (h.posts||[]).forEach(function(p){var m=postMarker(p.id);if(m)add(m.lat,m.lon)});(h.shots||[]).forEach(function(s){add(s.lat,s.lon)});add(h.pLat,h.pLon);
  if(n)fitBox(b);renderAll();
}
function shotsOnMap(){return memo('sm'+(S.hunt||''),function(){var a=[],cur=S.hunt&&huntById(S.hunt);hunts().forEach(function(h){(h.shots||[]).forEach(function(s){if(s.lat!=null&&(nachOpen(s)||(cur&&cur.id===h.id)))a.push({h:h,s:s})})});return a})}
function shotHit(px,py){var a=shotsOnMap(),best=null,bd=Math.max(16,24*MKS);a.forEach(function(x){var p=toScr(x.s.lat,x.s.lon),d=Math.hypot(p.x-px,p.y-py);if(d<bd){bd=d;best=x}});return best}
function drawHunt(v){
  var cur=S.hunt&&huntById(S.hunt);
  if(cur&&cur.pLat!=null){var mp=toScr(cur.pLat,cur.pLon);
    ctx.beginPath();ctx.arc(mp.x,mp.y,17*MKS,0,7);ctx.fillStyle=pal.surface;ctx.fill();ctx.beginPath();ctx.arc(mp.x,mp.y,13.5*MKS,0,7);ctx.fillStyle=pal.ink;ctx.fill();
    ctx.fillStyle=pal.surface;ctx.font='700 '+Math.round(14*MKS)+'px "Barlow Condensed",Arial Narrow,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('T',mp.x,mp.y+.5);
    ctx.font='700 13px "Atkinson Hyperlegible",sans-serif';ctx.textBaseline='top';halo(meetName(cur),mp.x,mp.y+Math.round(17*MKS)+4)}
  if(cur){var lines=memo('hl'+cur.id,function(){var gr={};(cur.posts||[]).forEach(function(p){var m=postMarker(p.id);if(m&&m.group)(gr[m.group]=gr[m.group]||[]).push(m)});
      return Object.keys(gr).map(function(g){return {g:g,ms:gr[g].sort(function(x,y){return nat(x.name||'',y.name||'')})}})});
    lines.forEach(function(L){var g=L.g,a=L.ms.map(function(m){return toScr(m.lat,m.lon)});
      if(a.length>1){ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();a.forEach(function(q,i){i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y)});ctx.setLineDash([]);ctx.lineWidth=6;ctx.strokeStyle=pal.surface;ctx.globalAlpha=.85;ctx.stroke();ctx.globalAlpha=1;ctx.lineWidth=3;ctx.strokeStyle=grpColor(g)||pal.accent;ctx.setLineDash([9,7]);ctx.stroke();ctx.setLineDash([])}
      ctx.font='700 14px "Barlow Condensed",Arial Narrow,sans-serif';ctx.textAlign='center';ctx.textBaseline='bottom';halo(g,a[0].x,a[0].y-Math.round(20*MKS)-6,grpColor(g)||pal.accent)});}
  if(cur)(cur.posts||[]).forEach(function(p){var m=postMarker(p.id);if(!m)return;var s=toScr(m.lat,m.lon);
    ctx.beginPath();ctx.arc(s.x,s.y,20*MKS,0,7);ctx.lineWidth=5;ctx.strokeStyle=pal.surface;ctx.stroke();ctx.lineWidth=3;ctx.strokeStyle=grpColor(m.group)||pal.accent;ctx.stroke();
    ctx.font='600 12px "Atkinson Hyperlegible",sans-serif';ctx.textAlign='center';ctx.textBaseline='top';var nm=v.z>=15.2&&m.name,tx=nm?(p.shooter||''):(m.name||'')+(p.shooter?' · '+p.shooter:'');if(tx)halo(tx,s.x,s.y+Math.round(20*MKS)+(nm?11:4))});
  shotsOnMap().forEach(function(x){var s=toScr(x.s.lat,x.s.lon),op=nachOpen(x.s);
    ctx.beginPath();ctx.arc(s.x,s.y,(op?15:10)*MKS,0,7);ctx.fillStyle=pal.surface;ctx.fill();
    ctx.beginPath();ctx.arc(s.x,s.y,(op?12:7.5)*MKS,0,7);ctx.fillStyle=op?pal.kill:pal.ink2;ctx.fill();
    ctx.fillStyle=pal.on;ctx.font='700 '+Math.round((op?15:11)*MKS)+'px "Barlow Condensed",Arial Narrow,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(op?'!':'S',s.x,s.y+.5)});
}

/* ----- posten und linien direkt in der jagd anlegen ----- */
function lineInfo(g){
  var ms=D.markers.filter(function(m){return (m.group||'')===g}),mx=0,pre='Posten';
  ms.forEach(function(m){var r=/^(.*?)(\d+)\s*$/.exec(m.name||'');if(r){mx=Math.max(mx,+r[2]);if(r[1].trim())pre=r[1].trim()}});
  return {pre:pre,next:ms.length?Math.max(mx,ms.length)+1:1}}
function huntLines(h){var a=[];(h.posts||[]).forEach(function(p){var g=postGroup(p.id);if(g&&a.indexOf(g)<0)a.push(g)});return a.sort(nat)}
function newPost(h){
  var ls=huntLines(h),g=ls.indexOf(S.lastLine)>-1?S.lastLine:(ls[ls.length-1]||''),li=lineInfo(g),pos=defaultPos();
  openForm('marker',{id:uid('m'),lat:pos.lat,lon:pos.lon,posManual:false,type:'posten',name:li.pre+' '+li.next,group:g,note:'',_hunt:h.id},false);
}
function hookNewPost(o,d){
  if(!d._hunt||SEATS.indexOf(o.type)<0)return;var h=huntById(d._hunt);if(!h)return;
  if((h.posts||[]).some(function(p){return p.id===o.id}))return;
  S.hid=h.id;S.lastLine=o.group||'';
  updHunt(Object.assign({},h,{posts:(h.posts||[]).concat([{id:o.id,shooter:'',phone:'',note:''}])})).then(function(){switchTab('hunt');renderHunt();toast(o.name+' zur Jagd hinzugefügt')},function(){});
}
function lineWizard(h){
  var def='Linie '+(huntLines(h).length+1),used={};Object.keys(D.settings.groupColors||{}).forEach(function(k){used[D.settings.groupColors[k]]=1});
  var col=PALETTE.filter(function(c){return !used[c]})[0]||PALETTE[0],touched=false;
  openSheet('<h2>Neue Linie</h2><p class="hint">Eine Linie fasst mehrere Posten zusammen. Du setzt die Posten danach nacheinander auf der Karte: Karte verschieben, bis das Fadenkreuz auf dem Standplatz liegt, dann „Hier setzen“.</p>'+
    '<label class="field"><span class="lbl">Name der Linie (frei wählbar)</span><input type="text" id="ln-name" value="'+esc(def)+'" list="lnDl" autocomplete="off"><datalist id="lnDl">'+groupNames().map(function(g){return '<option value="'+esc(g)+'">'}).join('')+'</datalist></label>'+
    '<div class="grid2"><label class="field"><span class="lbl">Bezeichnung der Posten</span><input type="text" id="ln-pre" value="Posten" autocomplete="off"></label><label class="field"><span class="lbl">Erste Nummer</span><input type="number" inputmode="numeric" min="1" id="ln-start" value="1"></label></div>'+
    '<div class="field"><span class="lbl">Farbe der Linie</span>'+swatchesHtml(col,'ln-col')+'</div>'+
    '<div class="btnrow"><button class="btn primary" id="ln-go" type="button" style="flex:2">Posten auf Karte setzen</button><button class="btn" id="ln-cancel" type="button" style="flex:1">Abbrechen</button></div>');
  $('#ln-cancel').onclick=closeSheet;
  bindSwatches('ln-col',function(c){col=c;touched=true});
  $('#ln-name').addEventListener('input',function(){var g=$('#ln-name').value.trim();if(groupNames().indexOf(g)>-1){var li=lineInfo(g);$('#ln-pre').value=li.pre;$('#ln-start').value=li.next;var gc=grpColor(g);if(gc&&!touched){col=gc;$$('#ln-col button').forEach(function(x){x.setAttribute('aria-pressed',x.dataset.c===gc)})}}});
  $('#ln-go').onclick=function(){var line=$('#ln-name').value.trim();if(!line){toast('Bitte einen Namen für die Linie eingeben.');return}
    var go=function(){lineSet(h.id,line,$('#ln-pre').value.trim()||'Posten',Math.max(1,parseInt($('#ln-start').value,10)||1))};
    if(col&&grpColor(line)!==col)setGrpColor(line,col).then(go,function(){});else go()};
}
function lineSet(hid,line,pre,n){
  closeSheet();var h0=huntById(hid);S.hunt=hid;S.lastLine=line;switchTab('map');
  var ob=$('#pOk'),nb=$('#pNo'),t0=ob.textContent,t1=nb.textContent,c=h0&&h0.pLat!=null?{lat:h0.pLat,lon:h0.pLon}:null;
  if(h0&&(h0.posts||[]).length){var m=postMarker(h0.posts[h0.posts.length-1].id);if(m)c={lat:m.lat,lon:m.lon}}
  if(c)centerOn(c.lat,c.lon,Math.max(S.view.z,16));
  function title(){$('#placeTitle').textContent=line+' · '+pre+' '+n+' setzen'}
  function finish(){ob.textContent=t0;nb.textContent=t1;endPlace();switchTab('hunt');S.hid=hid;renderHunt()}
  ob.textContent='Hier setzen';nb.textContent='Fertig';title();
  S.placing={ok:function(){
    var m={id:uid('m'),type:'posten',name:pre+' '+n,group:line,lat:S.view.lat,lon:S.view.lon,note:'',photos:[]};
    Store.put('markers',m).then(function(){var cur=huntById(hid);return updHunt(Object.assign({},cur,{posts:(cur.posts||[]).concat([{id:m.id,shooter:'',phone:'',note:''}])}))}).then(function(){toast(m.name+' gesetzt');n++;title();dirty=true},function(){});
  },no:finish};
  renderAll();
}

/* ----- linienfarben ----- */
var PALETTE=['#C0392B','#D2691E','#B8860B','#2E7D32','#00796B','#1E6FD9','#3F51B5','#7B3FA0','#C2185B','#6D4C41','#455A64'];
var badgeTxt=null;
function grpColor(g){var c=D.settings.groupColors;return g&&c&&c[g]||null}
function swatchesHtml(sel,id){return '<div class="sw" id="'+id+'"><button type="button" class="swb auto" data-c="" aria-pressed="'+(!sel)+'">Auto</button>'+PALETTE.map(function(c){return '<button type="button" class="swb" data-c="'+c+'" style="background:'+c+'" aria-pressed="'+(sel===c)+'" aria-label="Farbe '+c+'"></button>'}).join('')+'</div>'}
function bindSwatches(id,fn){var box=$('#'+id);box.addEventListener('click',function(e){var b=e.target.closest('button[data-c]');if(!b)return;$$('button',box).forEach(function(x){x.setAttribute('aria-pressed',x===b)});fn(b.dataset.c)})}
function setGrpColor(g,c){var m=Object.assign({},D.settings.groupColors||{});if(c)m[g]=c;else delete m[g];return Store.setting({groupColors:m})}
function colorSheet(g){
  openSheet('<h2>Farbe: '+esc(g)+'</h2><p class="hint">Alle Posten dieser Linie bekommen diese Farbe auf der Karte. „Auto“ nimmt wieder die Farbe der Einrichtungsart.</p>'+swatchesHtml(grpColor(g)||'','cs-sw')+'<div class="btnrow"><button class="btn" id="cs-close" type="button">Schließen</button></div>');
  $('#cs-close').onclick=closeSheet;
  bindSwatches('cs-sw',function(c){setGrpColor(g,c).then(function(){closeSheet();renderHunt()},function(){})});
}
