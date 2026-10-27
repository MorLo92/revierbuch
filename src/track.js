/* ---------- Track-Aufzeichnung ---------- */
var TRK_KEY='revierbuch.v1.tracks',REC_KEY='revierbuch.v1.rec';
function trkLoad(){return memo('trk',function(){try{return JSON.parse(localStorage.getItem(TRK_KEY)||'[]')}catch(e){return []}})}
function trkSave(a){try{localStorage.setItem(TRK_KEY,JSON.stringify(a));VER++}catch(e){toast('Speicher voll: Track konnte nicht gespeichert werden.')}}
function trkMerge(a){var cur=trkLoad().slice(),ids={};cur.forEach(function(t){ids[t.id]=1});(a||[]).forEach(function(t){if(t&&t.id&&!ids[t.id]&&t.pts)cur.push(t)});trkSave(cur)}
function trkDur(t){var s=Math.max(0,(t.t1||0)-(t.t0||0)),h=Math.floor(s/3600),m=Math.round(s%3600/60);return h?h+' h '+m+' min':m+' min'}
function trkKm(d){return d>=1000?nf.format(Math.round(d/10)/100)+' km':Math.round(d)+' m'}
function trkSaveRec(){try{localStorage.setItem(REC_KEY,JSON.stringify(S.rec))}catch(e){}}
function trkFinish(r,name){
  if(r.pts.length<2){toast('Track zu kurz, nicht gespeichert.');return}
  var a=trkLoad().slice();a.push({id:r.id,name:name||r.name,t0:r.t0,t1:Math.round(Date.now()/1000),dist:Math.round(r.dist),pts:r.pts});trkSave(a);
  toast('Track gespeichert · '+trkKm(r.dist));
}
function trkRecover(){try{var r=JSON.parse(localStorage.getItem(REC_KEY)||'null');if(r&&r.pts&&r.pts.length>1){r.name=(r.name||'Track')+' (unterbrochen)';r.t1=r.pts[r.pts.length-1][2];var a=trkLoad().slice();a.push({id:r.id,name:r.name,t0:r.t0,t1:r.t1,dist:Math.round(r.dist||0),pts:r.pts});trkSave(a);toast('Eine unterbrochene Aufzeichnung wurde gesichert.')}localStorage.removeItem(REC_KEY)}catch(e){}}
function trkStart(){
  if(S.rec){toast('Es läuft schon eine Aufzeichnung.');return}
  closeSheet();switchTab('map');
  locate(false).then(function(p){
    var d=new Date();
    S.rec={id:uid('t'),name:'Track '+d.toLocaleDateString('de-LU',{day:'2-digit',month:'2-digit'})+' '+d.toLocaleTimeString('de-LU',{hour:'2-digit',minute:'2-digit'}),t0:Math.round(Date.now()/1000),dist:0,pts:[[+p.lat.toFixed(5),+p.lon.toFixed(5),Math.round(Date.now()/1000)]]};
    keepAwake(true);trkSaveRec();renderAll();toast('Aufzeichnung läuft. Der Bildschirm bleibt an.');
  }).catch(function(){toast('Ohne Standort keine Aufzeichnung. Erlaube den Standortzugriff.')});
}
function trkPoint(){
  var r=S.rec;if(!r||!S.gps||S.gps.acc>40)return;var p=S.gps,L=r.pts[r.pts.length-1];
  if(L){var d=distM(L[0],L[1],p.lat,p.lon);if(d<6)return;r.dist+=d}
  r.pts.push([+p.lat.toFixed(5),+p.lon.toFixed(5),Math.round(p.t/1000)]);dirty=true;
  if(r.pts.length%10===0)trkSaveRec();renderLayers();
}
function trkStopSheet(){
  var r=S.rec;if(!r)return;
  openSheet('<h2>Aufzeichnung beenden?</h2><p class="hint">'+trkKm(r.dist)+' · '+r.pts.length+' Punkte</p>'+
    '<label class="field"><span class="lbl">Name</span><input type="text" id="tk-name" value="'+esc(r.name)+'" autocomplete="off"></label>'+
    '<div class="btnrow"><button class="btn primary" id="tk-save" type="button" style="flex:2">Speichern</button><button class="btn" id="tk-go" type="button" style="flex:1">Weiter</button></div>'+
    '<button class="btn danger" id="tk-drop" type="button">Verwerfen</button>');
  function end(){S.rec=null;try{localStorage.removeItem(REC_KEY)}catch(e){}keepAwake(!!S.guide);closeSheet();renderAll()}
  $('#tk-go').onclick=closeSheet;
  $('#tk-save').onclick=function(){var nm=$('#tk-name').value.trim();trkFinish(r,nm);end()};
  var dr=$('#tk-drop');dr.onclick=function(){if(dr.dataset.s!=='1'){dr.dataset.s='1';dr.textContent='Wirklich verwerfen?';return}end();toast('Verworfen')};
}
function trkGpx(t){
  var x=function(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')};
  return '<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Revierbuch" xmlns="http://www.topografix.com/GPX/1/1"><trk><name>'+x(t.name)+'</name><trkseg>\n'+
    t.pts.map(function(p){return '<trkpt lat="'+p[0]+'" lon="'+p[1]+'"><time>'+new Date(p[2]*1000).toISOString()+'</time></trkpt>'}).join('\n')+'\n</trkseg></trk></gpx>';
}
function trkBox(t){var b=[1e9,1e9,-1e9,-1e9];t.pts.forEach(function(p){b[0]=Math.min(b[0],p[1]);b[1]=Math.min(b[1],p[0]);b[2]=Math.max(b[2],p[1]);b[3]=Math.max(b[3],p[0])});return b}
function trkCardHtml(){
  var a=trkLoad().slice().sort(function(x,y){return y.t0-x.t0});
  return '<div class="card"><h2 class="sec">Tracks</h2><p class="hint">Zeichnet deinen Weg per GPS auf, z. B. Pirschgang oder Treiberlinie. Während der Aufzeichnung muss die App geöffnet bleiben, der Bildschirm bleibt dafür an.</p>'+
    '<div class="btnrow"><button class="btn primary" id="tkStart" type="button">'+(S.rec?'Aufzeichnung beenden':'Aufzeichnung starten')+'</button></div>'+
    (a.length?'<div class="rows">'+a.map(function(t){return '<div class="lotrow" style="flex-wrap:wrap"><span style="flex:1;min-width:140px"><b>'+esc(t.name)+'</b><br><small>'+new Date(t.t0*1000).toLocaleDateString('de-LU')+' · '+trkKm(t.dist)+' · '+trkDur(t)+'</small></span>'+
      '<button class="btn sm" data-tshow="'+esc(t.id)+'" type="button">'+(S.trkShow&&S.trkShow[t.id]?'Ausblenden':'Anzeigen')+'</button><button class="btn sm" data-tname="'+esc(t.id)+'" type="button">Name</button><button class="btn sm" data-tgpx="'+esc(t.id)+'" type="button">GPX</button><button class="btn sm danger" data-tdel="'+esc(t.id)+'" type="button">Löschen</button></div>'}).join('')+'</div>':'<p class="hint">Noch keine Tracks.</p>')+'</div>';
}
function bindTracks(){
  var s=$('#tkStart');if(s)s.onclick=function(){S.rec?trkStopSheet():trkStart()};
  var all=trkLoad();
  function find(id){return all.filter(function(t){return t.id===id})[0]}
  $$('#dataBody [data-tshow]').forEach(function(b){b.onclick=function(){var t=find(b.dataset.tshow);if(!t)return;S.trkShow=S.trkShow||{};S.trkShow[t.id]=!S.trkShow[t.id];if(S.trkShow[t.id]){switchTab('map');fitBox(trkBox(t))}renderAll()}});
  $$('#dataBody [data-tgpx]').forEach(function(b){b.onclick=function(){var t=find(b.dataset.tgpx);if(t)saveFile({filename:'track-'+new Date(t.t0*1000).toISOString().slice(0,10)+'.gpx',data:trkGpx(t)}).then(function(){toast('GPX gespeichert')}).catch(function(e){if(!e||e.code!=='declined')toast('Speichern nicht möglich.')})}});
  $$('#dataBody [data-tname]').forEach(function(b){b.onclick=function(){var t=find(b.dataset.tname);if(!t)return;
    openSheet('<h2>Track umbenennen</h2><label class="field"><span class="lbl">Name</span><input type="text" id="tn-name" value="'+esc(t.name)+'" autocomplete="off"></label><div class="btnrow"><button class="btn primary" id="tn-ok" type="button">Speichern</button><button class="btn" id="tn-no" type="button">Abbrechen</button></div>');
    $('#tn-no').onclick=closeSheet;$('#tn-ok').onclick=function(){var n=$('#tn-name').value.trim();if(n){t.name=n;trkSave(all)}closeSheet();renderAll()}}});
  $$('#dataBody [data-tdel]').forEach(function(b){b.onclick=function(){if(b.dataset.s!=='1'){b.dataset.s='1';b.textContent='Sicher?';return}trkSave(all.filter(function(t){return t.id!==b.dataset.tdel}));renderAll()}});
}
function drawTracks(v){
  function line(pts,col){
    if(pts.length<2)return;var st=pts.length>1500?4:pts.length>600?2:1,i;
    ctx.beginPath();for(i=0;i<pts.length;i+=st){var s=toScr(pts[i][0],pts[i][1]);i?ctx.lineTo(s.x,s.y):ctx.moveTo(s.x,s.y)}
    var e=toScr(pts[pts.length-1][0],pts[pts.length-1][1]);ctx.lineTo(e.x,e.y);
    ctx.lineCap='round';ctx.lineJoin='round';ctx.setLineDash([]);ctx.lineWidth=6;ctx.strokeStyle=pal.surface;ctx.globalAlpha=.85;ctx.stroke();ctx.globalAlpha=1;ctx.lineWidth=3.2;ctx.strokeStyle=col;ctx.stroke()}
  if(S.trkShow){trkLoad().forEach(function(t){if(S.trkShow[t.id])line(t.pts,'#C2185B')})}
  if(S.rec)line(S.rec.pts,'#E08A00');
}
