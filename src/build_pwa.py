import re, os, shutil, json
from PIL import Image, ImageDraw

SP = '/tmp/claude-0/-home-claude/8fbd0610-666a-541e-8d22-64bb06f66a70/scratchpad'
OUT = SP + '/pwa'
src = open(SP + '/revierbuch.html', encoding='utf8').read()


def sub(old, new, count=1):
    global src
    assert src.count(old) >= 1, 'pattern not found: ' + old[:70]
    if count == 1:
        assert src.count(old) == 1, 'pattern not unique: ' + old[:70]
    src = src.replace(old, new)


# ---------- CSS ----------
sub('@media (prefers-reduced-motion:reduce)',
    '.attr{position:absolute;left:max(16px,env(safe-area-inset-left,0px));bottom:100px;max-width:60%;font:400 10px/1.3 var(--font-body);color:var(--ink);background:color-mix(in srgb,var(--surface) 78%,transparent);padding:2px 6px;border-radius:4px;pointer-events:none}\n'
    '.attr:empty{display:none}\n'
    'a.btn{text-decoration:none;color:var(--ink)}\n'
    '@media (prefers-reduced-motion:reduce)')

# ---------- markup ----------
sub('<div class="scale" id="scale">',
    '<div class="attr" id="attr"></div>\n      <div class="scale" id="scale">')

# ---------- base map engine ----------
engine = r'''/* ---------- base map (Geoportail.lu raster tiles) ---------- */
var SRC_DEF={
  topo:{label:'Topokarte',url:'https://wmts1.geoportail.lu/opendata/wmts/topogr_global/GLOBAL_WEBMERCATOR_4_V3/{z}/{x}/{y}.png',max:19,attr:'© Administration du cadastre et de la topographie (CC0)',cache:true},
  ortho:{label:'Luftbild',url:'https://wmts1.geoportail.lu/opendata/wmts/ortho_latest/GLOBAL_WEBMERCATOR_4_V3/{z}/{x}/{y}.jpeg',max:19,attr:'© Administration du cadastre et de la topographie (CC0)',cache:true},
  osm:{label:'Straßenkarte',url:'https://tile.openstreetmap.org/{z}/{x}/{y}.png',max:19,attr:'© OpenStreetMap-Mitwirkende',cache:false},
  none:{label:'Raster',url:'',max:0,attr:'',cache:false}
};
var SRC_KEY=LS+'.src2',BASE_KEY=LS+'.base',ORDER=['topo','ortho','osm','none'];
function srcUrls(){var u={topo:SRC_DEF.topo.url,ortho:SRC_DEF.ortho.url,osm:SRC_DEF.osm.url};try{var j=JSON.parse(localStorage.getItem(SRC_KEY)||'null');if(j){if(j.topo)u.topo=j.topo;if(j.ortho)u.ortho=j.ortho}}catch(e){}return u}
function tileUrl(k,z,x,y){var u=srcUrls()[k];return u?u.replace('{z}',z).replace('{x}',x).replace('{y}',y):''}
S.base='topo';try{var sb=localStorage.getItem(BASE_KEY);if(sb&&SRC_DEF[sb])S.base=sb}catch(e){}
var TC=new Map(),tOk=0,tFail=0,tWarned=false,lastAttr='';
function resetTiles(){TC.clear();tOk=0;tFail=0;tWarned=false;dirty=true}
function getTile(k,z,x,y,create){
  var key=k+'/'+z+'/'+x+'/'+y,t=TC.get(key);
  if(t&&t.fail&&create&&Date.now()-t.fail>10000){TC.delete(key);t=null}
  if(t||!create)return t;
  var url=tileUrl(k,z,x,y);if(!url)return null;
  t={img:new Image(),ok:false,fail:0};
  t.img.onload=function(){t.ok=true;tOk++;dirty=true};
  t.img.onerror=function(){t.fail=Date.now();tFail++;if(tFail>=8&&!tOk&&!tWarned){tWarned=true;toast('Die Kartenkacheln lassen sich nicht laden. Prüfe die Adresse unter „Daten“ oder wähle eine andere Karte.')}};
  t.img.src=url;TC.set(key,t);
  if(TC.size>500)TC.delete(TC.keys().next().value);
  return t;
}
function tileAttr(){var a=(SRC_DEF[S.base]||{}).attr||'';if(a!==lastAttr){lastAttr=a;$('#attr').textContent=a}}
function drawTiles(v){
  var s=SRC_DEF[S.base];if(!s||!s.max){tileAttr();return}
  var tz=Math.max(0,Math.min(s.max,Math.round(v.z))),size=256*Math.pow(2,v.z-tz),n=Math.pow(2,tz),cx=mx(v.lon,v.z),cy=my(v.lat,v.z);
  var x0=Math.floor((cx-W/2)/size),x1=Math.floor((cx+W/2)/size),y0=Math.max(0,Math.floor((cy-H/2)/size)),y1=Math.min(n-1,Math.floor((cy+H/2)/size));
  if((x1-x0+1)*(y1-y0+1)>90)return;
  for(var ty=y0;ty<=y1;ty++)for(var tx=x0;tx<=x1;tx++){
    var wx=((tx%n)+n)%n,px=Math.floor(W/2+tx*size-cx),py=Math.floor(H/2+ty*size-cy),sz=Math.ceil(size)+1,t=getTile(S.base,tz,wx,ty,true);
    if(t&&t.ok){ctx.drawImage(t.img,px,py,sz,sz);continue}
    for(var d=1;d<=3&&tz-d>=0;d++){
      var f=Math.pow(2,d),pt=getTile(S.base,tz-d,Math.floor(wx/f),Math.floor(ty/f),false);
      if(pt&&pt.ok){var sw=256/f;ctx.drawImage(pt.img,(wx%f)*sw,(ty%f)*sw,sw,sw,px,py,sz,sz);break}
    }
  }
  tileAttr();
}
function cycleBase(){S.base=ORDER[(ORDER.indexOf(S.base)+1)%ORDER.length];try{localStorage.setItem(BASE_KEY,S.base)}catch(e){}tileAttr();renderLayers();dirty=true}
function saveFile(o){
  if(dl)return dl.save(o);
  return new Promise(function(res,rej){try{
    var blob=new Blob([o.data],{type:/\.csv$/.test(o.filename)?'text/csv;charset=utf-8':'application/json'}),a=document.createElement('a');
    a.href=URL.createObjectURL(blob);a.download=o.filename;document.body.appendChild(a);a.click();
    setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},2000);res({status:'saved'});
  }catch(e){rej({code:'unavailable'})}});
}
function tileRange(b,z){var n=Math.pow(2,z);return [Math.max(0,Math.floor(mx(b[0],0)/256*n)),Math.min(n-1,Math.floor(mx(b[2],0)/256*n)),Math.max(0,Math.floor(my(b[3],0)/256*n)),Math.min(n-1,Math.floor(my(b[1],0)/256*n))]}
function prefetchArea(){
  var s=SRC_DEF[S.base],msg=$('#offMsg'),btn=$('#offSave');
  if(!s||!s.cache){msg.textContent='Wähle auf der Karte zuerst „Topokarte“ oder „Luftbild“.';return}
  if(!window.caches){msg.textContent='Dieser Browser kann keine Karten speichern.';return}
  var ls=lotsAll().filter(isMine),b=null;
  ls.forEach(function(l){b=b?[Math.min(b[0],l.bb[0]),Math.min(b[1],l.bb[1]),Math.max(b[2],l.bb[2]),Math.max(b[3],l.bb[3])]:l.bb.slice()});
  if(!b){msg.textContent='Markiere zuerst dein Los auf der Karte.';return}
  b=[b[0]-.012,b[1]-.008,b[2]+.012,b[3]+.008];
  var list=[],zmax=17,z,x,y,r;
  for(;zmax>=13;zmax--){list=[];for(z=12;z<=zmax;z++){r=tileRange(b,z);for(x=r[0];x<=r[1];x++)for(y=r[2];y<=r[3];y++)list.push([z,x,y])}if(list.length<=2500)break}
  if(list.length>2500){msg.textContent='Das Gebiet ist zu groß zum Speichern.';return}
  btn.disabled=true;var done=0,fail=0,i=0,total=list.length;
  function upd(){msg.textContent=(done+fail)+' von '+total+' Kacheln'+(fail?' ('+fail+' fehlgeschlagen)':'')}
  upd();
  caches.open('tiles-v1').then(function(c){
    function next(){
      if(i>=total)return Promise.resolve();
      var t=list[i++],url=tileUrl(S.base,t[0],t[1],t[2]);
      return c.match(url,{ignoreVary:true}).then(function(hit){
        if(hit)return;
        return fetch(url,{mode:'cors'}).catch(function(){return fetch(url,{mode:'no-cors'})}).then(function(rs){if(rs&&(rs.ok||rs.type==='opaque'))return c.put(url,rs);throw new Error('bad')});
      }).then(function(){done++},function(){fail++}).then(function(){if((done+fail)%10===0)upd();return next()});
    }
    return Promise.all([next(),next(),next(),next(),next()]);
  }).then(function(){upd();msg.textContent+=fail&&!done?'. Die Karte ist nicht erreichbar.':'. Fertig, bis Zoomstufe '+zmax+' gespeichert.'},function(){msg.textContent='Speichern fehlgeschlagen. Eventuell ist der Speicher voll.'}).then(function(){btn.disabled=false});
}
function srcCardHtml(){
  var u=srcUrls();
  return '<div class="card"><h2 class="sec">Karte</h2>'+
  '<p class="hint">Der Kartenhintergrund kommt von Geoportail.lu (Administration du cadastre et de la topographie, frei nutzbar unter CC0). Auf der Karte wechselst du mit dem ersten Knopf zwischen Topokarte, Luftbild, Straßenkarte und Raster.</p>'+
  '<label class="field"><span class="lbl">Adresse Topokarte</span><input type="text" class="mono" id="uTopo" value="'+esc(u.topo)+'" autocapitalize="off" autocomplete="off" spellcheck="false"></label>'+
  '<label class="field"><span class="lbl">Adresse Luftbild</span><input type="text" class="mono" id="uOrtho" value="'+esc(u.ortho)+'" autocapitalize="off" autocomplete="off" spellcheck="false"></label>'+
  '<div class="btnrow"><button class="btn primary" id="srcAuto" type="button">Automatisch suchen</button><button class="btn" id="srcTest" type="button">Testen</button><button class="btn" id="srcReset" type="button">Zurücksetzen</button></div><p class="hint" id="srcMsg"></p>'+
  '<div class="btnrow"><button class="btn primary" id="offSave" type="button">Meinen Bereich offline speichern</button></div>'+
  '<p class="hint" id="offMsg">Speichert die gewählte Karte um deine Lose herum, damit sie im Wald ohne Empfang funktioniert. Mit WLAN ausführen.</p></div>'+
  '<div class="card"><h2 class="sec">Als App installieren</h2><p class="hint">iPhone: In Safari auf „Teilen“ tippen, dann „Zum Home-Bildschirm“. Android: In Chrome das Menü öffnen, dann „App installieren“.</p></div>';
}
function bindSources(){
  var t=$('#uTopo'),o=$('#uOrtho');if(!t||!o)return;
  function save(){try{var j={},a=t.value.trim(),b=o.value.trim();if(a&&a!==SRC_DEF.topo.url)j.topo=a;if(b&&b!==SRC_DEF.ortho.url)j.ortho=b;localStorage.setItem(SRC_KEY,JSON.stringify(j))}catch(e){}resetTiles()}
  function candidates(kind){
    var hosts=['https://wmts1.geoportail.lu/opendata/wmts','https://wmts3.geoportail.lu/mapproxy_4_v3/wmts'],out=[];
    var layers=kind==='topo'?['topogr_global','basemap_2015_global','topo_global']:['ortho_latest','ortho_2023'];
    var exts=kind==='topo'?['png','jpeg']:['jpeg','png'];
    hosts.forEach(function(h){layers.forEach(function(l){['GLOBAL_WEBMERCATOR_4_V3','GLOBAL_WEBMERCATOR'].forEach(function(s){exts.forEach(function(e){out.push(h+'/'+l+'/'+s+'/{z}/{x}/{y}.'+e)})})})});
    return out;
  }
  function probeUrl(u){return new Promise(function(res){var im=new Image(),to=setTimeout(function(){res(false)},9000);im.onload=function(){clearTimeout(to);res(true)};im.onerror=function(){clearTimeout(to);res(false)};im.src=u+(u.indexOf('?')<0?'?':'&')+'t='+Date.now()})}
  $('#srcAuto').onclick=function(){
    var msg=$('#srcMsg'),btn=this,n=Math.pow(2,15),x=Math.floor(mx(6.13,0)/256*n),y=Math.floor(my(49.61,0)/256*n);
    btn.disabled=true;msg.textContent='Suche passende Adressen. Das dauert bis zu 10 Sekunden …';
    function find(kind){return Promise.all(candidates(kind).map(function(u){return probeUrl(u.replace('{z}',15).replace('{x}',x).replace('{y}',y)).then(function(ok){return ok?u:null})})).then(function(r){return r.filter(Boolean)[0]||null})}
    Promise.all([find('topo'),find('ortho')]).then(function(r){
      if(r[0])t.value=r[0];if(r[1])o.value=r[1];save();
      msg.textContent='Topokarte: '+(r[0]?'gefunden und eingetragen':'nicht gefunden')+' · Luftbild: '+(r[1]?'gefunden und eingetragen':'nicht gefunden')+(r[0]&&r[1]?'.':'. Prüfe deine Internetverbindung oder schicke mir die Meldung.');
      btn.disabled=false;
    });
  };
  t.onchange=save;o.onchange=save;
  $('#srcReset').onclick=function(){try{localStorage.removeItem(SRC_KEY)}catch(e){}t.value=SRC_DEF.topo.url;o.value=SRC_DEF.ortho.url;resetTiles();$('#srcMsg').textContent='Zurückgesetzt.'};
  $('#srcTest').onclick=function(){
    var msg=$('#srcMsg'),n=Math.pow(2,15),x=Math.floor(mx(6.13,0)/256*n),y=Math.floor(my(49.61,0)/256*n);
    save();msg.textContent='Teste …';
    function probe(k){return new Promise(function(res){var im=new Image(),to=setTimeout(function(){res(false)},8000);im.onload=function(){clearTimeout(to);res(true)};im.onerror=function(){clearTimeout(to);res(false)};im.src=tileUrl(k,15,x,y)+(tileUrl(k,15,x,y).indexOf('?')<0?'?':'&')+'t='+Date.now()})}
    Promise.all([probe('topo'),probe('ortho')]).then(function(r){msg.textContent='Topokarte: '+(r[0]?'erreichbar':'nicht erreichbar')+' · Luftbild: '+(r[1]?'erreichbar':'nicht erreichbar')});
  };
  $('#offSave').onclick=prefetchArea;
}
function loop(){'''
sub('function loop(){', engine)

# draw hook + contrast of lot lines on photos / tiles
sub('  /* lots */\n  var sc2=', '  drawTiles(v);\n  /* lots */\n  var sc2=')
sub("ctx.lineWidth=1;ctx.strokeStyle=pal.ink2;ctx.globalAlpha=.6;ctx.stroke();ctx.globalAlpha=1;",
    "ctx.lineWidth=1.2;ctx.strokeStyle=S.base==='ortho'?'#FFFFFF':pal.ink2;ctx.globalAlpha=S.base==='ortho'?.85:.7;ctx.stroke();ctx.globalAlpha=1;")
sub("ctx.globalAlpha=1;ctx.lineWidth=3;ctx.strokeStyle=pal.accent;ctx.stroke()});",
    "ctx.globalAlpha=1;if(S.base!=='none'){ctx.lineWidth=6;ctx.strokeStyle=pal.surface;ctx.globalAlpha=.85;ctx.stroke();ctx.globalAlpha=1}ctx.lineWidth=3;ctx.strokeStyle=pal.accent;ctx.stroke()});")

# base chip in layer row
sub("$('#layers').innerHTML=L.map(",
    "$('#layers').innerHTML='<button type=\"button\" class=\"chip\" id=\"baseChip\" style=\"--c:var(--ink)\"><i></i>Karte: '+SRC_DEF[S.base].label+'</button>'+L.map(")
sub("$('#layers').addEventListener('click',function(e){var b=",
    "$('#layers').addEventListener('click',function(e){if(e.target.closest('#baseChip')){cycleBase();return}var b=")

# navigation link in detail sheet
sub("'<div class=\"btnrow\"><button class=\"btn\" id=\"d-map\" type=\"button\">Auf Karte zeigen</button>'",
    "'<div class=\"btnrow\"><button class=\"btn primary\" id=\"d-guide\" type=\"button\">Hinführen</button>"
    "<a class=\"btn\" href=\"https://www.google.com/maps/dir/?api=1&destination='+o.lat+','+o.lon+'&travelmode=driving\" target=\"_blank\" rel=\"noopener\">Route Auto</a>"
    "<a class=\"btn\" href=\"https://www.google.com/maps/dir/?api=1&destination='+o.lat+','+o.lon+'&travelmode=walking\" target=\"_blank\" rel=\"noopener\">Route zu Fuß</a>"
    "<button class=\"btn\" id=\"d-map\" type=\"button\">Auf Karte zeigen</button>'")
sub("$('#d-map').onclick=function(){closeSheet();S.sel={k:kind,id:o.id};",
    "$('#d-guide').onclick=function(){startGuide({lat:o.lat,lon:o.lon,name:title})};\n  $('#d-map').onclick=function(){closeSheet();S.sel={k:kind,id:o.id};")

# ---------- guidance (Hinführen) ----------
sub('<div class="place gx" id="place" hidden>',
    '<div class="guide gx" id="guide" hidden>\n'
    '        <svg id="gArrow" class="garrow" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="30" fill="none" stroke="var(--line)" stroke-width="2"/><path d="M32 7 L47 46 L32 38 L17 46 Z" fill="var(--accent)"/></svg>\n'
    '        <div class="gtext"><b id="gName"></b><span class="gdist" id="gDist">…</span><span class="hint" id="gSub"></span></div>\n'
    '        <div class="gbtn"><a class="btn sm" id="gCar" target="_blank" rel="noopener">Route Auto</a><a class="btn sm" id="gWalk" target="_blank" rel="noopener">Route zu Fuß</a><button class="btn sm danger" id="gEnd" type="button">Beenden</button></div>\n'
    '      </div>\n      <div class="place gx" id="place" hidden>')
sub('.attr:empty{display:none}',
    '.attr:empty{display:none}\n'
    '.guide{position:absolute;top:0;left:0;right:0;background:var(--surface);border-bottom:1px solid var(--line);padding-block:10px;display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;box-shadow:var(--shadow);z-index:3}\n'
    '.garrow{width:64px;height:64px;flex:none;transition:transform .12s linear}\n'
    '.gtext{display:flex;flex-direction:column;gap:2px;flex:1;min-width:130px}\n'
    '.gtext b{overflow-wrap:anywhere}\n'
    '.gdist{font:700 34px/1 var(--font-display);letter-spacing:.03em}\n'
    '.gbtn{display:flex;gap:6px;flex-wrap:wrap;width:100%}')
sub("$('#layers').hidden=!!S.placing;", "$('#layers').hidden=!!S.placing||!!S.guide;")
sub("$('#demo').hidden=!useDemo()||!!S.placing;", "$('#demo').hidden=!useDemo()||!!S.placing||!!S.guide;")
sub("S.gps={lat:p.coords.latitude,lon:p.coords.longitude,acc:p.coords.accuracy,t:Date.now()};S.gpsState='on';dirty=true;renderHeader()}",
    "S.gps={lat:p.coords.latitude,lon:p.coords.longitude,acc:p.coords.accuracy,hd:p.coords.heading,sp:p.coords.speed,t:Date.now()};S.gpsState='on';dirty=true;renderHeader();updateGuide()}")
sub("  /* own position */",
    "  /* guidance line + target */\n"
    "  if(S.guide){var tg=toScr(S.guide.lat,S.guide.lon);\n"
    "    if(S.gps){var me=toScr(S.gps.lat,S.gps.lon);ctx.lineCap='round';ctx.setLineDash([]);ctx.lineWidth=7;ctx.strokeStyle=pal.surface;ctx.globalAlpha=.9;ctx.beginPath();ctx.moveTo(me.x,me.y);ctx.lineTo(tg.x,tg.y);ctx.stroke();ctx.globalAlpha=1;ctx.lineWidth=3.5;ctx.strokeStyle=pal.accent;ctx.setLineDash([10,8]);ctx.stroke();ctx.setLineDash([])}\n"
    "    ctx.beginPath();ctx.arc(tg.x,tg.y,22,0,7);ctx.lineWidth=6;ctx.strokeStyle=pal.surface;ctx.stroke();ctx.lineWidth=3;ctx.strokeStyle=pal.accent;ctx.stroke()}\n"
    "  /* own position */")
sub("Kanzel, Bock, Futterplatz, Salzlecke, Hütte</small></span></button>');",
    "Kanzel, Bock, Futterplatz, Salzlecke, Hütte</small></span></button>'+\n"
    "  '<button class=\"choice\" data-n=\"guide\" type=\"button\"><span class=\"mk\" style=\"background:var(--ink)\">➜</span><span><b>Hinführen</b><small>Zu einer Kanzel oder Einrichtung gehen</small></span></button>');")
sub("function newEntry(kind){", "function newEntry(kind){if(kind==='guide'){pickTarget();return}")
sub("toast('Der Standort ist in dieser Ansicht nicht abrufbar. Setze die Position über die Karte.');",
    "toast('Der Standort ist nicht verfügbar. Erlaube den Standortzugriff in den Einstellungen deines Browsers oder setze die Position über die Karte.');")

guide_js = r'''/* ---------- guidance: line, distance and arrow to a chosen target ---------- */
var HEAD=null,headOn=false,lastG=0;
function rad(d){return d*Math.PI/180}
function distM(a,b,c,d){var R=6371000,p=rad(c-a),l=rad(d-b),x=Math.sin(p/2)*Math.sin(p/2)+Math.cos(rad(a))*Math.cos(rad(c))*Math.sin(l/2)*Math.sin(l/2);return 2*R*Math.asin(Math.sqrt(x))}
function bearingTo(a,b,c,d){var y=Math.sin(rad(d-b))*Math.cos(rad(c)),x=Math.cos(rad(a))*Math.sin(rad(c))-Math.sin(rad(a))*Math.cos(rad(c))*Math.cos(rad(d-b));return (Math.atan2(y,x)*180/Math.PI+360)%360}
function dirName(b){return ['N','NO','O','SO','S','SW','W','NW'][Math.round(b/45)%8]}
function fmtDist(m){return m<1000?Math.round(m)+' m':nf.format(m/1000)+' km'}
function setHead(h){
  if(h==null||isNaN(h))return;
  if(HEAD==null)HEAD=h;else{var d=((h-HEAD+540)%360)-180;HEAD=(HEAD+d*.25+360)%360}
  if(Date.now()-lastG>100){lastG=Date.now();updateGuide()}
}
function onOrient(e){
  var h=null;
  if(typeof e.webkitCompassHeading==='number')h=e.webkitCompassHeading;
  else if(e.absolute&&typeof e.alpha==='number'&&typeof e.beta==='number'&&typeof e.gamma==='number'){
    var a=rad(e.alpha),b=rad(e.beta),g=rad(e.gamma),cA=Math.cos(a),sA=Math.sin(a),sB=Math.sin(b),cG=Math.cos(g),sG=Math.sin(g);
    var rA=-cA*sG-sA*sB*cG,rB=-sA*sG+cA*sB*cG,x=Math.atan2(rA,rB);if(x<0)x+=2*Math.PI;h=x*180/Math.PI;
  }
  if(h!=null)setHead(h);
}
function startCompass(){
  if(headOn)return;var DO=window.DeviceOrientationEvent;if(!DO)return;
  function attach(){headOn=true;window.addEventListener('deviceorientationabsolute',onOrient,true);window.addEventListener('deviceorientation',onOrient,true)}
  attach();
  if(typeof DO.requestPermission==='function'){DO.requestPermission().then(function(r){if(r!=='granted')toast('Ohne Kompass-Erlaubnis zeigt der Pfeil von Norden. Erlaube die Bewegungssensoren in den Browser-Einstellungen.')}).catch(function(){})}
}
function updateGuide(){
  var g=S.guide;if(!g)return;
  var dist=$('#gDist'),sub=$('#gSub'),arrow=$('#gArrow');
  if(!S.gps){dist.textContent='…';sub.textContent=S.gpsState==='busy'?'Standort wird gesucht':'Standort nicht verfügbar. Prüfe die GPS-Erlaubnis.';return}
  var d=distM(S.gps.lat,S.gps.lon,g.lat,g.lon),b=bearingTo(S.gps.lat,S.gps.lon,g.lat,g.lon),h=null;
  if(S.gps.sp!=null&&S.gps.sp>.8&&S.gps.hd!=null&&!isNaN(S.gps.hd))h=S.gps.hd;else if(HEAD!=null)h=HEAD;
  arrow.style.transform='rotate('+(h==null?b:b-h)+'deg)';
  dist.textContent=d<15?'Angekommen':fmtDist(d);
  sub.textContent='Richtung '+dirName(b)+' · '+Math.round(b)+'°'+(S.gps.acc?' · GPS ±'+Math.round(S.gps.acc)+' m':'')+(h==null?' · Pfeil zeigt von Norden (Kompass aus)':'');
}
function startGuide(t){
  S.guide={lat:t.lat,lon:t.lon,name:t.name||'Ziel'};
  closeSheet();switchTab('map');startCompass();
  $('#gName').textContent=S.guide.name;
  $('#gCar').href='https://www.google.com/maps/dir/?api=1&destination='+t.lat+','+t.lon+'&travelmode=driving';
  $('#gWalk').href='https://www.google.com/maps/dir/?api=1&destination='+t.lat+','+t.lon+'&travelmode=walking';
  $('#guide').hidden=false;keepAwake(true);renderAll();updateGuide();
  locate(false).then(function(p){fitGuide();updateGuide()}).catch(function(){updateGuide()});
  if(S.gps)fitGuide();
}
function fitGuide(){
  if(!S.guide||!S.gps)return;var g=S.guide,p=.0015;
  fitBox([Math.min(S.gps.lon,g.lon)-p,Math.min(S.gps.lat,g.lat)-p*.7,Math.max(S.gps.lon,g.lon)+p,Math.max(S.gps.lat,g.lat)+p*.7]);
}
var wakeL=null;
function keepAwake(on){try{if(on){if(navigator.wakeLock&&!wakeL)navigator.wakeLock.request('screen').then(function(l){wakeL=l;l.addEventListener('release',function(){wakeL=null})}).catch(function(){})}else if(wakeL){wakeL.release();wakeL=null}}catch(e){}}
document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible'&&S.guide)keepAwake(true)});
function stopGuide(){S.guide=null;$('#guide').hidden=true;keepAwake(false);renderAll()}
$('#gEnd').onclick=stopGuide;
function pickTarget(){
  var p=S.gps,ms=G('markers').map(function(m){return {m:m,d:p?distM(p.lat,p.lon,m.lat,m.lon):null}});
  ms.sort(function(a,b){return p?a.d-b.d:(a.m.name||'').localeCompare(b.m.name||'','de')});
  var h='<h2>Hinführen</h2>';
  if(!ms.length){openSheet(h+'<div class="empty">Noch keine Einrichtungen eingetragen. Lege zuerst eine Kanzel an.</div><button class="btn" id="d-close" type="button">Schließen</button>');$('#d-close').onclick=closeSheet;return}
  h+='<p class="hint">'+(p?'Sortiert nach Entfernung.':'Dein Standort ist noch unbekannt, die Liste ist nach Namen sortiert.')+'</p><div class="rows">'+ms.map(function(x){var m=x.m;return '<button class="row" type="button" data-id="'+esc(m.id)+'"><span class="mk" style="background:var('+FAC[m.type].c+')">'+FAC[m.type].glyph+'</span><span class="rt"><b>'+esc(m.name||FAC[m.type].label)+'</b><small>'+esc(FAC[m.type].label)+'</small></span>'+(x.d!=null?'<span class="tagc">'+fmtDist(x.d)+'</span>':'')+'</button>'}).join('')+'</div>';
  openSheet(h);
  $$('#sheetBody .row').forEach(function(b){b.onclick=function(){var x=ms.filter(function(y){return y.m.id===b.dataset.id})[0].m;startGuide({lat:x.lat,lon:x.lon,name:x.name||FAC[x.type].label})}});
  if(!p)locate(false).catch(function(){});
}
function loop(){'''
sub('function loop(){', guide_js)

# ---------- long press on the map: enter something at that spot ----------
sub("function newEntry(kind){if(kind==='guide'){pickTarget();return}", "function newEntry(kind,at){if(kind==='guide'){pickTarget();return}")
sub("lat:p.lat,lon:p.lon,posManual:false};", "lat:(at||p).lat,lon:(at||p).lon,posManual:!!at};")
sub("function closeSheet(){$('#ov').hidden=true;", "function closeSheet(){if(S.lp){S.lp=null;dirty=true}$('#ov').hidden=true;")
sub("  if(ptrs.size===1)gest={sx:e.offsetX,sy:e.offsetY,t:performance.now(),moved:false};\n  else if(ptrs.size===2){gest=gest||{};gest.moved=true;gest.d=pd();gest.mid=pm()}",
    "  if(ptrs.size===1){gest={sx:e.offsetX,sy:e.offsetY,t:performance.now(),moved:false};armLong(gest)}\n  else if(ptrs.size===2){clearLong();gest=gest||{};gest.moved=true;gest.d=pd();gest.mid=pm()}")
sub("if(Math.hypot(p.x-gest.sx,p.y-gest.sy)>6)gest.moved=true;\n    if(gest.moved)anchor(",
    "if(Math.hypot(p.x-gest.sx,p.y-gest.sy)>14){gest.moved=true;clearLong()}\n    if(gest.moved&&!gest.long)anchor(")
sub("if(!ptrs.has(e.pointerId))return;ptrs.delete(e.pointerId);", "if(!ptrs.has(e.pointerId))return;ptrs.delete(e.pointerId);clearLong();")
sub("cv.addEventListener('wheel',",
    "cv.addEventListener('contextmenu',function(e){\n"
    "  e.preventDefault();\n"
    "  if(S.lp||S.placing||!$('#sheet').hidden||(gest&&gest.moved&&!gest.long))return;\n"
    "  var r=cv.getBoundingClientRect(),geo=fromScr(e.clientX-r.left,e.clientY-r.top);\n"
    "  clearLong();if(gest){gest.moved=true;gest.long=true}longPress(geo.lat,geo.lon);\n"
    "});\n"
    "/* second, independent trigger on plain touch events, in case pointer events behave differently on a device */\n"
    "var tlT=null,tl0=null;\n"
    "function tlStop(){clearTimeout(tlT);tl0=null}\n"
    "cv.addEventListener('touchstart',function(e){tlStop();if(e.touches.length!==1)return;var t=e.touches[0];tl0={x:t.clientX,y:t.clientY};\n"
    "  tlT=setTimeout(function(){if(!tl0||S.lp||S.placing||!$('#sheet').hidden)return;var r=cv.getBoundingClientRect(),geo=fromScr(tl0.x-r.left,tl0.y-r.top);tl0=null;clearLong();if(gest){gest.moved=true;gest.long=true}longPress(geo.lat,geo.lon)},480)},{passive:true});\n"
    "cv.addEventListener('touchmove',function(e){if(!tl0)return;var t=e.touches[0];if(!t||Math.hypot(t.clientX-tl0.x,t.clientY-tl0.y)>14)tlStop()},{passive:true});\n"
    "cv.addEventListener('touchend',tlStop,{passive:true});cv.addEventListener('touchcancel',tlStop,{passive:true});\n"
    "cv.addEventListener('wheel',")
sub("#map{position:absolute;", "#map{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;position:absolute;")
sub("  /* guidance line + target */",
    "  if(S.lpArm){var lk=Math.min(1,(performance.now()-S.lpArm.t0)/450);if(lk>.2){ctx.beginPath();ctx.arc(S.lpArm.sx,S.lpArm.sy,8+14*lk,0,7);ctx.lineWidth=6;ctx.strokeStyle=pal.surface;ctx.stroke();ctx.lineWidth=3;ctx.strokeStyle=pal.accent;ctx.stroke()}dirty=true}\n"
    "  if(S.lp){var lq=toScr(S.lp.lat,S.lp.lon);ctx.beginPath();ctx.arc(lq.x,lq.y,16,0,7);ctx.lineWidth=6;ctx.strokeStyle=pal.surface;ctx.stroke();ctx.lineWidth=3;ctx.strokeStyle=pal.ink;ctx.stroke();ctx.beginPath();ctx.arc(lq.x,lq.y,3,0,7);ctx.fillStyle=pal.ink;ctx.fill()}\n"
    "  /* guidance line + target */")
lp_js = r'''/* ---------- long press on the map ---------- */
var lpT=null;
function clearLong(){clearTimeout(lpT);if(S.lpArm){S.lpArm=null;dirty=true}}
function armLong(g){
  clearLong();S.lpArm={sx:g.sx,sy:g.sy,t0:performance.now()};dirty=true;
  lpT=setTimeout(function(){
    S.lpArm=null;
    if(!gest||gest!==g||g.moved||ptrs.size!==1||S.placing)return;
    g.moved=true;g.long=true;var geo=fromScr(g.sx,g.sy);longPress(geo.lat,geo.lon);
  },450);
}
function longPress(lat,lon){
  if(S.lp||S.placing)return;
  S.ovBlock=Date.now()+800;
  try{if(navigator.vibrate)navigator.vibrate(30)}catch(e){}
  S.lp={lat:lat,lon:lon};dirty=true;var at={lat:lat,lon:lon},base='https://www.google.com/maps/dir/?api=1&destination='+lat.toFixed(6)+','+lon.toFixed(6);
  openSheet('<h2>Hier eintragen</h2><p class="hint"><code>'+lat.toFixed(5)+'° N, '+lon.toFixed(5)+'° E</code></p>'+
    '<button class="choice" data-n="kill" type="button"><span class="mk sq" style="background:var(--kill)">✕</span><span><b>Abschuss</b><small>Wildart, Kanzel, Wildmarke</small></span></button>'+
    '<button class="choice" data-n="sight" type="button"><span class="mk sq" style="background:var(--sicht)">3</span><span><b>Wildsichtung</b><small>Wildart, Anzahl, Uhrzeit</small></span></button>'+
    '<button class="choice" data-n="marker" type="button"><span class="mk" style="background:var(--kanzel)">K</span><span><b>Einrichtung</b><small>Kanzel, Bock, Futterplatz, Salzlecke, Hütte</small></span></button>'+
    '<button class="choice" data-n="guide" type="button"><span class="mk" style="background:var(--ink)">➜</span><span><b>Hierher führen</b><small>Pfeil und Entfernung zu diesem Punkt</small></span></button>'+
    '<div class="btnrow"><a class="btn sm" href="'+base+'&travelmode=driving" target="_blank" rel="noopener">Route Auto</a><a class="btn sm" href="'+base+'&travelmode=walking" target="_blank" rel="noopener">Route zu Fuß</a><button class="btn sm" id="lp-close" type="button">Schließen</button></div>');
  $$('#sheetBody .choice').forEach(function(b){b.onclick=function(){if(b.dataset.n==='guide'){S.lp=null;startGuide({lat:lat,lon:lon,name:'Markierter Punkt'})}else newEntry(b.dataset.n,at)}});
  $('#lp-close').onclick=closeSheet;
}
function loop(){'''
sub('function loop(){', lp_js)
sub("Store.init().catch(function(){S.mode='local';Store.loadLocal();markReady()});\n",
    "Store.init().catch(function(){S.mode='local';Store.loadLocal();markReady()});\n"
    "try{if(!localStorage.getItem(LS+'.tip1')){localStorage.setItem(LS+'.tip1','1');setTimeout(function(){toast('Tipp: Auf der Karte lange drücken, um dort etwas einzutragen.')},2500)}}catch(e){}\n")

# a new first finger always starts clean (stale pointers from lost pointerup events would turn a hold into a two-finger gesture)
sub("  ptrs.set(e.pointerId,{x:e.offsetX,y:e.offsetY});", "  if(e.isPrimary&&ptrs.size>0){ptrs.clear();clearLong()}\n  ptrs.set(e.pointerId,{x:e.offsetX,y:e.offsetY});")

# gesture test card in the data tab
diag_js = r'''function diagCardHtml(){
  return '<div class="card"><h2 class="sec">Gestentest</h2><p class="hint">Hilft bei Problemen mit dem langen Drücken. Halte einen Finger eine Sekunde auf das Feld und schicke mir den Text darunter.</p>'+
  '<div id="dgBox" style="height:110px;border:2px dashed var(--line);border-radius:10px;display:grid;place-items:center;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;color:var(--ink-2)">Hier halten</div>'+
  '<pre id="dgLog" style="font:12px/1.4 var(--font-mono);white-space:pre-wrap;margin:0;max-height:220px;overflow:auto;overflow-wrap:anywhere"></pre></div>';
}
function bindDiag(){
  var b=$('#dgBox'),l=$('#dgLog');if(!b)return;
  var t0=0,tm=null,moves=0,lines=[];
  function log(s){lines.unshift(Math.round(performance.now()-t0)+' ms  '+s);if(lines.length>16)lines.pop();l.textContent=lines.join('\n')}
  ['pointerdown','pointermove','pointerup','pointercancel','touchstart','touchend','touchcancel','contextmenu'].forEach(function(ev){
    b.addEventListener(ev,function(e){
      if(ev==='pointerdown'){t0=performance.now();lines=[];moves=0;clearTimeout(tm);
        log('Gerät: '+(navigator.userAgent.match(/Android [\d.]+|Chrome\/[\d.]+|Samsung[^ ]*|Firefox\/[\d.]+/g)||['?']).join(' ')+' | PointerEvent '+(window.PointerEvent?'ja':'nein')+' | Touch '+('ontouchstart' in window?'ja':'nein'));
        tm=setTimeout(function(){log('HALTEN ERKANNT (450 ms ohne Bewegung)')},450)}
      if(ev==='pointermove'){moves++;if(moves>3&&moves%5)return}
      if(ev==='pointerup'||ev==='pointercancel'||ev==='touchcancel'||ev==='contextmenu'){if(ev!=='contextmenu')clearTimeout(tm)}
      log(ev+(e.pointerType?' ('+e.pointerType+')':'')+(ev==='pointermove'?' #'+moves:''));
      if(ev==='contextmenu')e.preventDefault();
    },{passive:false});
  });
}
function loop(){'''
sub('function loop(){', diag_js)
# lifting the finger after a long press must not close the new sheet or hit one of its buttons
sub("$('#ov').addEventListener('click',closeSheet);",
    "$('#ov').addEventListener('click',function(){if(Date.now()<(S.ovBlock||0))return;closeSheet()});\n"
    "$('#sheet').addEventListener('click',function(e){if(Date.now()<(S.ovBlock||0)){e.stopPropagation();e.preventDefault()}},true);")

# ---------- delete entries from their detail sheet ----------
sub("(demo?'':'<button class=\"btn primary\" id=\"d-edit\" type=\"button\">Bearbeiten</button>')",
    "(demo?'':'<button class=\"btn\" id=\"d-edit\" type=\"button\">Bearbeiten</button><button class=\"btn danger\" id=\"d-del\" type=\"button\">Löschen</button>')")
sub("  var e=$('#d-edit');if(e)e.onclick=",
    "  var dd=$('#d-del');if(dd)dd.onclick=function(){\n"
    "    if(dd.dataset.s!=='1'){dd.dataset.s='1';dd.textContent='Wirklich löschen?';return}\n"
    "    var coll={fac:'markers',sight:'sightings',kill:'kills'}[kind];dd.disabled=true;\n"
    "    guard(Store.del(coll,o.id),'Löschen fehlgeschlagen').then(function(){if(S.guide&&S.guide.lat===o.lat&&S.guide.lon===o.lon)stopGuide();S.sel=null;closeSheet();toast('Gelöscht')},function(){dd.disabled=false});\n"
    "  };\n"
    "  var e=$('#d-edit');if(e)e.onclick=")

# ---------- split into document ----------

# exports work without the artifact runtime
sub("dl.save({filename:'revierbuch-sicherung-", "saveFile({filename:'revierbuch-sicherung-")
sub("dl.save({filename:'abschuesse-", "saveFile({filename:'abschuesse-")
sub("(dl?'':' disabled')+'>Abschüsse als CSV", "''+'>Abschüsse als CSV")
sub("(dl?'':' disabled')+'>Sicherung (JSON)", "''+'>Sicherung (JSON)")
sub("  (dl?'':'<p class=\"hint\">Der Export ist in dieser Ansicht nicht verfügbar.</p>')+'</div>';", "  '</div>';")
sub("'<p class=\"hint\">'+(S.mode==='cloud'?", "'<p class=\"hint\">'+(S.mode==='cloud'?")

# data tab: replace the "planned" card with map settings
m = re.search(r"  html\+='<div class=\"card\"><h2 class=\"sec\">Geplant für Version 2</h2>.*?</div>';\n", src)
assert m, 'planned card not found'
src = src[:m.start()] + "  html+=srcCardHtml();\n" + src[m.end():]
sub("var c=$('#expCsv');if(c)c.onclick=exportCsv;var j=$('#expJson');if(j)j.onclick=exportJson;",
    "var c=$('#expCsv');if(c)c.onclick=exportCsv;var j=$('#expJson');if(j)j.onclick=exportJson;bindSources();")
sub("  html+=srcCardHtml();\n", "  html+=srcCardHtml()+diagCardHtml();\n")
sub("bindSources();", "bindSources();bindDiag();")

# boot: service worker + persistent storage
sub("Store.init().catch(function(){S.mode='local';Store.loadLocal();markReady()});",
    "Store.init().catch(function(){S.mode='local';Store.loadLocal();markReady()});\n"
    "if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol))navigator.serviceWorker.register('sw.js').catch(function(){});\n"
    "if(navigator.storage&&navigator.storage.persist)navigator.storage.persist().catch(function(){});")

# ---------- Posten + freie Beschriftung ----------
assert src.count('--sonst:#6B746E;')==1 and src.count('--sonst:#9AA59E;')==2
src = src.replace('--sonst:#6B746E;','--sonst:#6B746E; --posten:#8A2F5B;').replace('--sonst:#9AA59E;','--sonst:#9AA59E; --posten:#E08AB4;')
sub("  huette:{label:", "  posten:{label:'Drückjagdposten',glyph:'P',c:'--posten'},\n  huette:{label:")
sub("  sonst:{label:'Sonstiges',glyph:'·',c:'--sonst'}\n};", "  sonst:{label:'Sonstiges',glyph:'·',c:'--sonst'},\n  text:{label:'Beschriftung (freier Text)',glyph:'T',c:'--ink'}\n};")
sub("var SEATS=['kanzel','bock'];", "var SEATS=['kanzel','bock','posten'];")
assert src.count("<b>Einrichtung</b><small>Kanzel, Bock, Futterplatz, Salzlecke, Hütte</small>")==2
src = src.replace("<b>Einrichtung</b><small>Kanzel, Bock, Futterplatz, Salzlecke, Hütte</small>", "<b>Einrichtung</b><small>Kanzel, Posten, Bock, Futterplatz, Hütte, Beschriftung</small>")
sub('placeholder="z. B. Kanzel Eichberg"', 'placeholder="Name bzw. Text, z. B. Posten 1"')
sub("if(it.k==='fac'){badge(", "if(it.k==='fac'&&o.type==='text'){ctx.beginPath();ctx.arc(s.x,s.y,sel?6:4,0,7);ctx.fillStyle=pal.ink;ctx.fill();ctx.font='600 15px \"Atkinson Hyperlegible\",sans-serif';ctx.textAlign='left';ctx.textBaseline='middle';halo(o.name,s.x+9,s.y,pal.ink)}else if(it.k==='fac'){badge(")

# ---------- Fotos + Gruppen ----------
feat_js = r'''/* ---------- Fotos (IndexedDB) und Gruppen ---------- */
function nat(a,b){return String(a).localeCompare(String(b),'de',{numeric:true})}
/* Zwischenspeicher: wird bei jeder lokalen Änderung (VER) verworfen */
var MEMO={};
function memo(k,fn){var m=MEMO[k];if(m&&m.v===VER)return m.r;var r=fn();MEMO[k]={v:VER,r:r};return r}
var Ph={p:null,urls:{},
  open:function(){if(!this.p)this.p=new Promise(function(res,rej){var r=indexedDB.open('revierbuch-photos',1);r.onupgradeneeded=function(){r.result.createObjectStore('p')};r.onsuccess=function(){res(r.result)};r.onerror=function(){rej(r.error)}});return this.p},
  put:function(id,blob){return this.open().then(function(db){return new Promise(function(res,rej){var t=db.transaction('p','readwrite');t.objectStore('p').put(blob,id);t.oncomplete=res;t.onerror=function(){rej(t.error)}})})},
  get:function(id){return this.open().then(function(db){return new Promise(function(res,rej){var q=db.transaction('p').objectStore('p').get(id);q.onsuccess=function(){res(q.result)};q.onerror=function(){rej(q.error)}})})},
  del:function(id){delete Ph.urls[id];return Ph.open().then(function(db){return new Promise(function(res){var t=db.transaction('p','readwrite');t.objectStore('p').delete(id);t.oncomplete=res;t.onerror=res})}).catch(function(){})},
  url:function(id){if(Ph.urls[id])return Promise.resolve(Ph.urls[id]);return Ph.get(id).then(function(b){return b?(Ph.urls[id]=URL.createObjectURL(b)):null}).catch(function(){return null})}
};
function phCompress(file){return new Promise(function(res,rej){var u=URL.createObjectURL(file),im=new Image();
  im.onload=function(){var s=Math.min(1,1600/Math.max(im.naturalWidth,im.naturalHeight)),w=Math.round(im.naturalWidth*s),h=Math.round(im.naturalHeight*s),c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(im,0,0,w,h);URL.revokeObjectURL(u);c.toBlob(function(b){b?res(b):rej(new Error('blob'))},'image/jpeg',.82)};
  im.onerror=function(){URL.revokeObjectURL(u);rej(new Error('img'))};im.src=u})}
function phStrip(ids,rm){return '<div class="phs">'+ids.map(function(id){return '<span class="phw"><button type="button" class="ph" data-ph="'+esc(id)+'" aria-label="Foto ansehen"><img alt=""></button>'+(rm?'<button type="button" class="phx" data-rm="'+esc(id)+'" aria-label="Foto entfernen">✕</button>':'')+'</span>'}).join('')+'</div>'}
function fillPh(root){$$('[data-ph]',root).forEach(function(b){var im=b.querySelector('img');Ph.url(b.dataset.ph).then(function(u){if(u)im.src=u})})}
function phView(ids,i){
  var v=document.createElement('div');v.id='phv';v.style.cssText='position:fixed;left:0;top:0;right:0;bottom:0;z-index:200;background:rgba(0,0,0,.93);display:flex;align-items:center;justify-content:center';
  v.innerHTML='<img alt="" style="max-width:100%;max-height:100%;object-fit:contain"><button type="button" class="btn" style="position:absolute;top:max(12px,env(safe-area-inset-top));right:12px">Schließen</button><div style="position:absolute;bottom:max(14px,env(safe-area-inset-bottom));left:0;right:0;text-align:center;color:#fff;font:14px sans-serif"></div>';
  document.body.appendChild(v);var im=v.querySelector('img'),n=v.lastChild;
  function show(){Ph.url(ids[i]).then(function(u){if(u)im.src=u});n.textContent=ids.length>1?(i+1)+' / '+ids.length+' · Tippen für nächstes Foto':''}
  im.onclick=function(){i=(i+1)%ids.length;show()};v.querySelector('button').onclick=function(){v.remove()};show();
}
function allEntries(){return memo('ent',allEntries0)}
function allEntries0(){var a=[];
  D.markers.slice().sort(function(x,y){return nat(x.name||'',y.name||'')}).forEach(function(o){a.push({k:'fac',coll:'markers',o:o})});
  D.sightings.slice().sort(function(x,y){return new Date(y.ts)-new Date(x.ts)}).forEach(function(o){a.push({k:'sight',coll:'sightings',o:o})});
  D.kills.slice().sort(function(x,y){return new Date(y.ts)-new Date(x.ts)}).forEach(function(o){a.push({k:'kill',coll:'kills',o:o})});
  return a}
function entLabel(e){var o=e.o;if(e.k==='fac')return o.name||FAC[o.type].label;if(e.k==='sight')return (o.count||1)+'× '+o.species+' · '+fmtDate(o.ts);return o.species+' · '+fmtDate(o.ts)}
function entMk(e){var o=e.o;if(e.k==='fac')return '<span class="mk" style="background:'+(grpColor(o.group)||'var('+FAC[o.type].c+')')+'">'+FAC[o.type].glyph+'</span>';if(e.k==='sight')return '<span class="mk sq" style="background:var(--sicht)">'+(o.count||1)+'</span>';return '<span class="mk sq" style="background:var(--kill)">✕</span>'}
function groupNames(){var m={};allEntries().forEach(function(e){if(e.o.group)m[e.o.group]=1});return Object.keys(m).sort(nat)}
function groupListHtml(){
  var m={};allEntries().forEach(function(e){if(e.o.group)(m[e.o.group]=m[e.o.group]||[]).push(e)});var names=Object.keys(m).sort(nat);
  if(!names.length)return '<div class="empty">Noch keine Gruppen. Tippe auf „+ Gruppe“, wähle Einträge aus und gib einen Namen ein, z. B. „Linie 1“. Du kannst den Namen auch direkt beim Bearbeiten eines Eintrags eintippen.</div>';
  return '<div class="rows">'+names.map(function(n){var a=m[n],f=a.filter(function(e){return e.k==='fac'}).length,s=a.filter(function(e){return e.k==='sight'}).length,k=a.filter(function(e){return e.k==='kill'}).length;
    var sm=[f?f+' Einrichtung'+(f>1?'en':''):'',s?s+' Sichtung'+(s>1?'en':''):'',k?k+' Abschuss'+(k>1?'e':''):''].filter(Boolean).join(' · ');
    return '<button class="row" type="button" data-grp="'+esc(n)+'"><span class="mk sq" style="background:var(--accent)">'+a.length+'</span><span class="rt"><b>'+esc(n)+'</b><small>'+sm+'</small></span></button>'}).join('')+'</div>'}
function bindGroupRows(){$$('#logBody [data-grp]').forEach(function(b){b.onclick=function(){showGroup(b.dataset.grp)}});var ng=$('#newGrp');if(ng)ng.onclick=function(){editGroup('')}}
function showGroup(name){
  var ms=allEntries().filter(function(e){return e.o.group===name});
  openSheet('<h2>'+esc(name)+'</h2><p class="hint">'+ms.length+' Eintr'+(ms.length===1?'ag':'äge')+' in dieser Gruppe</p><div class="rows">'+ms.map(function(e,i){return '<button class="row" type="button" data-i="'+i+'">'+entMk(e)+'<span class="rt"><b>'+esc(entLabel(e))+'</b></span></button>'}).join('')+'</div>'+
    '<div class="btnrow"><button class="btn primary" id="g-map" type="button">Auf Karte zeigen</button><button class="btn" id="g-edit" type="button">Bearbeiten</button><button class="btn" id="g-close" type="button">Schließen</button></div>');
  $('#g-close').onclick=closeSheet;
  $$('#sheetBody .row').forEach(function(b){b.onclick=function(){var e=ms[+b.dataset.i];showDetail(e.k,e.o)}});
  $('#g-edit').onclick=function(){editGroup(name)};
  $('#g-map').onclick=function(){closeSheet();S.grp=name;switchTab('map');
    if(ms.length){var b=[1e9,1e9,-1e9,-1e9];ms.forEach(function(e){b[0]=Math.min(b[0],e.o.lon);b[1]=Math.min(b[1],e.o.lat);b[2]=Math.max(b[2],e.o.lon);b[3]=Math.max(b[3],e.o.lat)});fitBox(b)}
    renderAll()};
}
function editGroup(name){
  var es=allEntries();if(!es.length){toast('Lege zuerst Einträge an, die du zusammenfassen willst.');return}
  var col=grpColor(name)||'',touched=false;
  openSheet('<h2>'+(name?'Gruppe bearbeiten':'Neue Gruppe')+'</h2>'+
    '<label class="field"><span class="lbl">Name der Gruppe (frei wählbar)</span><input type="text" id="g-name" value="'+esc(name)+'" placeholder="z. B. Linie 1" list="grpList2" autocomplete="off"><datalist id="grpList2">'+groupNames().map(function(g){return '<option value="'+esc(g)+'">'}).join('')+'</datalist></label>'+
    '<div class="field"><span class="lbl">Farbe der Gruppe (optional)</span>'+swatchesHtml(col,'g-col')+'</div>'+
    '<div class="field"><span class="lbl">Einträge auswählen</span><div class="rows">'+es.map(function(e,i){return '<label class="row pick"><input type="checkbox" data-i="'+i+'"'+(name&&e.o.group===name?' checked':'')+'>'+entMk(e)+'<span class="rt"><b>'+esc(entLabel(e))+'</b>'+(e.o.group&&e.o.group!==name?'<small>aktuell in: '+esc(e.o.group)+'</small>':'')+'</span></label>'}).join('')+'</div></div>'+
    '<div class="btnrow"><button class="btn primary" id="g-save" type="button" style="flex:2">Speichern</button><button class="btn" id="g-cancel" type="button" style="flex:1">Abbrechen</button></div>'+(name?'<button class="btn danger" id="g-del" type="button">Gruppe auflösen</button>':''));
  $('#g-cancel').onclick=closeSheet;
  bindSwatches('g-col',function(c){col=c;touched=true});
  function apply(setFn,msg,cm){
    var ps=[];es.forEach(function(e,i){var v=setFn(e,$('#sheetBody input[data-i="'+i+'"]').checked);if(v!==null&&v!==(e.o.group||''))ps.push(Store.put(e.coll,Object.assign({},e.o,{group:v}),true))});
    if(cm)ps.push(Store.setting({groupColors:cm}));
    Promise.all(ps).then(function(){if(S.grp===name)S.grp=null;closeSheet();renderAll();toast(msg)},function(){toast('Speichern fehlgeschlagen.')})}
  $('#g-save').onclick=function(){var nm=$('#g-name').value.trim();if(!nm){toast('Bitte einen Namen eingeben.');return}
    var merge=nm!==name&&groupNames().indexOf(nm)>-1;
    var cm=Object.assign({},D.settings.groupColors||{}),oc=name?cm[name]:null;if(name&&name!==nm)delete cm[name];
    if(touched){if(col)cm[nm]=col;else delete cm[nm]}else if(oc&&!cm[nm])cm[nm]=oc;
    apply(function(e,on){return on?nm:(name&&e.o.group===name?'':null)},merge?'Zu „'+nm+'“ zusammengeführt':'Gruppe gespeichert',cm)};
  var dl=$('#g-del');if(dl)dl.onclick=function(){if(dl.dataset.s!=='1'){dl.dataset.s='1';dl.textContent='Wirklich auflösen? Die Einträge bleiben erhalten.';return}
    var cm=Object.assign({},D.settings.groupColors||{});delete cm[name];
    apply(function(e){return e.o.group===name?'':null},'Gruppe aufgelöst',cm)};
}
function extraHtml(kind,o){var h='';
  if(o.group)h+='<div class="field"><span class="lbl">Gruppe</span><button type="button" class="btn sm" id="d-grp">'+esc(o.group)+' · alle anzeigen</button></div>';
  if(o.photos&&o.photos.length)h+='<div class="field"><span class="lbl">Fotos</span>'+phStrip(o.photos,false)+'</div>';
  return h}
function bindExtra(kind,o){var g=$('#d-grp');if(g)g.onclick=function(){showGroup(o.group)};
  var ids=o.photos||[],root=$('#sheetBody');fillPh(root);$$('[data-ph]',root).forEach(function(b){b.onclick=function(){phView(ids,ids.indexOf(b.dataset.ph))}})}
function extraFormHtml(d){
  return '<label class="field"><span class="lbl">Gruppe (optional)</span><input type="text" data-f="group" list="grpList" value="'+esc(d.group||'')+'" placeholder="z. B. Linie 1" autocomplete="off"><datalist id="grpList">'+groupNames().map(function(g){return '<option value="'+esc(g)+'">'}).join('')+'</datalist></label>'+
  '<div class="field"><span class="lbl">Fotos</span><div id="f-phs"></div><input type="file" id="f-phin" accept="image/*" multiple hidden><button type="button" class="btn sm" id="f-phadd">Foto hinzufügen</button></div>'}
function bindExtraForm(){
  var f=S.form,d=f.d;
  function paint(){var box=$('#f-phs');box.innerHTML=phStrip(d.photos,true);fillPh(box);
    $$('[data-ph]',box).forEach(function(b){b.onclick=function(){phView(d.photos,d.photos.indexOf(b.dataset.ph))}});
    $$('[data-rm]',box).forEach(function(b){b.onclick=function(){var id=b.dataset.rm;d.photos=d.photos.filter(function(x){return x!==id});var j=d._new.indexOf(id);if(j>-1){d._new.splice(j,1);Ph.del(id)}paint()}})}
  paint();
  var inp=$('#f-phin'),add=$('#f-phadd');add.onclick=function(){inp.click()};
  inp.onchange=function(){var fs=Array.from(inp.files||[]);inp.value='';if(!fs.length)return;add.disabled=true;
    fs.reduce(function(p,file){return p.then(function(){return phCompress(file).then(function(b){var id=uid('p');return Ph.put(id,b).then(function(){d.photos.push(id);d._new.push(id);paint()})})}).catch(function(){toast('Foto konnte nicht gespeichert werden.')})},Promise.resolve()).then(function(){add.disabled=false})};
}
function phCleanup(){var f=S.form;if(f&&!f.keep&&!f.saved&&f.d&&f.d._new)f.d._new.forEach(Ph.del)}
function phSaved(d){(d._orig||[]).filter(function(id){return d.photos.indexOf(id)<0}).forEach(Ph.del)}
function loop(){'''
sub('function loop(){', feat_js)
sub("S.form={kind:kind,d:d,edit:isEdit};",
    "S.form={kind:kind,d:d,edit:isEdit};if(d._orig===undefined)d._orig=(d.photos||[]).slice();if(!d.photos)d.photos=[];if(!d._new)d._new=[];")
sub("openSheet('<h2>'+(isEdit?title+' bearbeiten':'Neu: '+title)+'</h2>'+body+",
    "openSheet('<h2>'+(isEdit?title+' bearbeiten':'Neu: '+title)+'</h2>'+body+extraFormHtml(d)+")
sub("  $('#f-cancel').onclick=closeSheet;", "  bindExtraForm();\n  $('#f-cancel').onclick=closeSheet;")
sub("function pickOnMap(kind,d,isEdit){\n  closeSheet();", "function pickOnMap(kind,d,isEdit){\n  if(S.form)S.form.keep=true;closeSheet();")
sub("function closeSheet(){if(S.lp){S.lp=null;dirty=true}", "function closeSheet(){phCleanup();if(S.lp){S.lp=null;dirty=true}")
sub("  saveLocal:function(){", "  saveLocal:function(){VER++;")
sub("  loadLocal:function(){", "  loadLocal:function(){VER++;")
sub("var LS='revierbuch.v1';", "var LS='revierbuch.v1',VER=0;")
import re as _re
src, _n = _re.subn(r"^function inPoly\(.*\n", "", src, flags=_re.M); assert _n==1
sub("  var b=$('#f-save');b.disabled=true;", "  o.photos=(d.photos||[]).slice();o.group=(d.group||'').trim();\n  var b=$('#f-save');b.disabled=true;")
sub("guard(Store.put(coll,o)).then(function(){closeSheet();toast('Gespeichert');", "guard(Store.put(coll,o)).then(function(){f.saved=true;phSaved(d);hookNewPost(o,d);closeSheet();toast('Gespeichert');")
sub("  del:function(coll,id){", "  del:function(coll,id){var _o=(D[coll]||[]).filter(function(x){return x.id===id})[0];if(_o&&_o.photos)_o.photos.forEach(Ph.del);")
sub("rows+'</dl>'+", "rows+'</dl>'+extraHtml(kind,o)+")
sub("$('#d-guide').onclick=function(){startGuide(", "bindExtra(kind,o);$('#d-guide').onclick=function(){startGuide(")
# Einträge-Tab: Gruppen
sub("[['all','Alle'],['kill','Abschüsse'],['sight','Sichtungen']]", "[['all','Alle'],['kill','Abschüsse'],['sight','Sichtungen'],['grp','Gruppen']]")
sub("if(f!=='sight')G('kills')", "if(f!=='sight'&&f!=='grp')G('kills')")
sub("if(f!=='kill')G('sightings')", "if(f!=='kill'&&f!=='grp')G('sightings')")
sub("if(!list.length)html+='<div class=\"empty\">Keine Einträge gefunden.</div>';", "if(f==='grp')html+=groupListHtml();else if(!list.length)html+='<div class=\"empty\">Keine Einträge gefunden.</div>';")
sub("+ Sichtung</button></div>'+", "+ Sichtung</button><button class=\"btn\" id=\"newGrp\" type=\"button\">+ Gruppe</button></div>'+")
sub("[o.species,o.tag,o.note,", "[o.species,o.tag,o.note,o.group,")
sub("var m=fmtDate(o.ts)+(o.kanzelId?' · '+esc(facName(o.kanzelId)):'');", "var m=fmtDate(o.ts)+(o.kanzelId?' · '+esc(facName(o.kanzelId)):'')+(o.group?' · '+esc(o.group):'');")
sub("  $('#logQ').oninput=function(e){", "  bindGroupRows();\n  $('#logQ').oninput=function(e){")
sub("$$('#logBody .row').forEach(", "$$('#logBody .row[data-k]').forEach(")
# Karte: Gruppe hervorheben
sub("+SRC_DEF[S.base].label+'</button>'+L.map(", "+SRC_DEF[S.base].label+'</button>'+(S.grp?'<button type=\"button\" class=\"chip\" id=\"grpChip\" style=\"--c:var(--accent)\"><i></i>'+esc(S.grp)+' ✕</button>':'')+L.map(")
sub("if(e.target.closest('#baseChip')){cycleBase();return}", "if(e.target.closest('#baseChip')){cycleBase();return}if(e.target.closest('#grpChip')){S.grp=null;renderAll();return}")
sub("  /* guidance line + target */\n",
    "  /* group highlight */\n"
    "  if(S.grp){var gmm=memo('gh'+S.grp,function(){var a=allEntries().filter(function(e){return e.o.group===S.grp});return {gm:a,gp:a.filter(function(e){return e.k==='fac'}).sort(function(x,y){return nat(entLabel(x),entLabel(y))})}}),gm=gmm.gm,gp=gmm.gp;\n"
    "    gm.forEach(function(e){e._s=toScr(e.o.lat,e.o.lon)});\n"
    "    if(gp.length>1){ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();gp.forEach(function(e,i){i?ctx.lineTo(e._s.x,e._s.y):ctx.moveTo(e._s.x,e._s.y)});ctx.setLineDash([]);ctx.lineWidth=6;ctx.strokeStyle=pal.surface;ctx.globalAlpha=.85;ctx.stroke();ctx.globalAlpha=1;ctx.lineWidth=3;ctx.strokeStyle=(grpColor(S.grp)||pal.accent);ctx.setLineDash([9,7]);ctx.stroke();ctx.setLineDash([])}\n"
    "    gm.forEach(function(e){ctx.beginPath();ctx.arc(e._s.x,e._s.y,20*MKS,0,7);ctx.lineWidth=5;ctx.strokeStyle=pal.surface;ctx.stroke();ctx.lineWidth=3;ctx.strokeStyle=(grpColor(S.grp)||pal.accent);ctx.stroke();ctx.font='600 12px \"Atkinson Hyperlegible\",sans-serif';ctx.textAlign='center';ctx.textBaseline='top';if(!(e.k==='fac'&&(e.o.type==='text'||v.z>=15.2&&e.o.name)))halo(entLabel(e),e._s.x,e._s.y+Math.round(20*MKS)+4)})}\n"
    "  /* guidance line + target */\n")
sub(".gbtn{display:flex;gap:6px;flex-wrap:wrap;width:100%}",
    ".gbtn{display:flex;gap:6px;flex-wrap:wrap;width:100%}\n"
    ".phs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px}.phw{position:relative}\n"
    ".ph{width:84px;height:84px;padding:0;border:1px solid var(--line);border-radius:10px;overflow:hidden;background:var(--surface);cursor:pointer}.ph img{width:100%;height:100%;object-fit:cover;display:block}\n"
    ".phx{position:absolute;top:3px;right:3px;width:26px;height:26px;padding:0;border:0;border-radius:50%;background:rgba(0,0,0,.65);color:#fff;font-size:14px;line-height:26px;cursor:pointer}\n"
    ".pick{display:flex;align-items:center;gap:10px;cursor:pointer}.pick input{width:22px;height:22px;flex:none}")

# ---------- Drückjagd-Planung ----------
sub('function loop(){', open('ansitz.js',encoding='utf8').read() + open('hunt.js',encoding='utf8').read() + open('plan.js',encoding='utf8').read() + open('track.js',encoding='utf8').read() + open('parcel.js',encoding='utf8').read() + open('lotplan.js',encoding='utf8').read() + open('seasons.js',encoding='utf8').read() + open('statlayout.js',encoding='utf8').read() + 'function loop(){')
sub(".tabs{display:grid;grid-template-columns:repeat(4,1fr);", ".tabs{display:grid;grid-template-columns:repeat(5,1fr);")
sub(".pick input{width:22px;height:22px;flex:none}", ".pick input{width:22px;height:22px;flex:none}\n.tabs button{letter-spacing:.03em!important;padding-inline:2px!important}")
sub('<section class="view" id="viewStats" hidden>', '<section class="view" id="viewHunt" hidden><div class="pad gx" id="huntBody"></div></section>\n    <section class="view" id="viewStats" hidden>')
sub("var t=[['map','Karte'],['log','Einträge'],['stats','Statistik'],['data','Daten']];", "var t=[['map','Karte'],['log','Einträge'],['hunt','Jagd'],['stats','Statistik'],['data','Daten']];")
sub("var ic={map:'map',log:'list',stats:'chart',data:'data'}", "var ic={map:'map',log:'list',hunt:'hunt',stats:'chart',data:'data'}")
sub("[['map','viewMap'],['log','viewLog'],['stats','viewStats'],['data','viewData']]", "[['map','viewMap'],['log','viewLog'],['hunt','viewHunt'],['stats','viewStats'],['data','viewData']]")
sub("else if(S.tab==='data')renderData();", "else if(S.tab==='hunt')renderHunt();else if(S.tab==='data')renderData();")
sub("function onTap(px,py){\n  if(S.placing)return;", "function onTap(px,py){\n  if(S.placing)return;\n  var hs=shotHit(px,py);if(hs){showShot(hs.h.id,hs.s.id);return}\n  var mh=meetHit(px,py);if(mh){showMeet(mh);return}")
sub("  /* group highlight */\n", "  drawHunt(v);\n  /* group highlight */\n")
sub("+esc(S.grp)+' ✕</button>':'')+L.map(", "+esc(S.grp)+' ✕</button>':'')+(S.hunt&&huntById(S.hunt)?'<button type=\"button\" class=\"chip\" id=\"huntChip\" style=\"--c:var(--kill)\"><i></i>Jagd: '+esc(huntById(S.hunt).name)+' ✕</button>':'')+L.map(")
sub("if(e.target.closest('#grpChip')){S.grp=null;renderAll();return}", "if(e.target.closest('#grpChip')){S.grp=null;renderAll();return}if(e.target.closest('#huntChip')){S.hunt=null;renderAll();return}")


# ---------- Linienfarben ----------
sub("badge(s.x,s.y,pal[o.type]||pal.sonst,", "var gcol=o.group&&grpColor(o.group);badgeTxt=gcol?'#fff':null;badge(s.x,s.y,gcol||pal[o.type]||pal.sonst,")
sub("  ctx.beginPath();ctx.arc(x,y,11.5,0,7);ctx.fillStyle=col;ctx.fill();\n  ctx.fillStyle=pal.on;", "  ctx.beginPath();ctx.arc(x,y,11.5,0,7);ctx.fillStyle=col;ctx.fill();\n  ctx.fillStyle=badgeTxt||pal.on;")
sub(".pick input{width:22px;height:22px;flex:none}", ".pick input{width:22px;height:22px;flex:none}\n.sw{display:flex;flex-wrap:wrap;gap:8px}.swb{width:36px;height:36px;border-radius:50%;border:2px solid var(--line);padding:0;cursor:pointer}.swb.auto{width:auto;border-radius:18px;padding:0 12px;background:var(--surface);color:var(--ink);font:600 13px/1 inherit}.swb.dot{width:20px;height:20px}.swb[aria-pressed=\"true\"]{outline:3px solid var(--ink);outline-offset:2px}")


# ---------- Kanzel-Bauart + Reservierungen ----------
sub("    '<label class=\"field\"><span class=\"lbl\">Name</span><input type=\"text\" data-f=\"name\"",
    "    '<div class=\"field\" id=\"f-subf\"'+(d.type==='kanzel'?'':' hidden')+'><span class=\"lbl\">Bauart der Kanzel</span>'+chips('sub',SUBK,d.sub||'',['closed','mobile','open'])+'</div>'+\n    '<label class=\"field\"><span class=\"lbl\">Name</span><input type=\"text\" data-f=\"name\"")
sub("  if(key==='tag')checkTag();", "  if(key==='tag')checkTag();\n  if(key==='type'){var sf=$('#f-subf');if(sf)sf.hidden=d.type!=='kanzel'}")
sub("o.photos=(d.photos||[]).slice();o.group=(d.group||'').trim();", "o.photos=(d.photos||[]).slice();o.group=(d.group||'').trim();if(f.kind==='marker')o.sub=d.type==='kanzel'?(d.sub||''):'';")
sub("'<dt>Art</dt><dd>'+esc(FAC[o.type].label)+'</dd>", "'<dt>Art</dt><dd>'+esc(FAC[o.type].label)+(o.sub?' ('+esc(SUBK[o.sub].toLowerCase())+')':'')+'</dd>")
sub("FAC[o.type]?FAC[o.type].glyph:'·',sel);", "kGlyph(o),sel);if(resNow()[o.id])resDot(s.x,s.y);")
sub("+'\">'+FAC[o.type].glyph+'</span>'", "+'\">'+kGlyph(o)+'</span>'")
sub("  return h}\nfunction bindExtra", "  if(kind==='fac'&&!o.demo&&(o.type==='kanzel'||o.type==='bock'))h+=seatResHtml(o);\n  return h}\nfunction bindExtra")
sub("function bindExtra(kind,o){var g=$('#d-grp');", "function bindExtra(kind,o){bindSeatRes(kind,o);var g=$('#d-grp');")


# ---------- Marker skalieren mit dem Zoom ----------
sub("var LS='revierbuch.v1',VER=0;", "var LS='revierbuch.v1',VER=0,MKS=1;\nfunction markScale(z){return Math.max(.5,Math.min(1.3,.5+(z-12)*.12))}")
sub("  dirty=false;if(!W||!H)return;palette();", "  dirty=false;if(!W||!H)return;palette();MKS=markScale(S.view.z);")
sub("function badge(x,y,col,glyph,sel){\n", "function badge(x,y,col,glyph,sel){\n  ctx.save();ctx.translate(x,y);ctx.scale(MKS,MKS);x=0;y=0;\n")
sub("ctx.fillText(glyph,x,y+.5);\n}", "ctx.fillText(glyph,x,y+.5);\n  ctx.restore();\n}")
sub("function diamond(x,y,n,sel){\n", "function diamond(x,y,n,sel){\n  ctx.save();ctx.translate(x,y);ctx.scale(MKS,MKS);x=0;y=0;\n")
sub("ctx.fillText(String(n),x,y+.5);\n}", "ctx.fillText(String(n),x,y+.5);\n  ctx.restore();\n}")
sub("function killMark(x,y,sel){\n", "function killMark(x,y,sel){\n  ctx.save();ctx.translate(x,y);ctx.scale(MKS,MKS);x=0;y=0;\n")
sub("ctx.lineTo(x-4.5,y+4.5);ctx.stroke();\n}", "ctx.lineTo(x-4.5,y+4.5);ctx.stroke();\n  ctx.restore();\n}")
sub("halo(o.name,s.x,s.y+17)", "halo(o.name,s.x,s.y+Math.round(14*MKS)+3)")
sub("ctx.arc(s.x,s.y,sel?6:4,0,7);ctx.fillStyle=pal.ink;ctx.fill();ctx.font='600 15px \"Atkinson Hyperlegible\",sans-serif';ctx.textAlign='left';ctx.textBaseline='middle';halo(o.name,s.x+9,s.y,pal.ink)",
    "ctx.arc(s.x,s.y,(sel?6:4)*MKS,0,7);ctx.fillStyle=pal.ink;ctx.fill();ctx.font='600 '+Math.round(9+6*MKS)+'px \"Atkinson Hyperlegible\",sans-serif';ctx.textAlign='left';ctx.textBaseline='middle';halo(o.name,s.x+Math.round(5+4*MKS),s.y,pal.ink)")
sub("var its=items(),best=null,bd=24;", "var its=items(),best=null,bd=Math.max(16,24*MKS);")


# ---------- Abschussplan + Tracks ----------
sub("  html+='<p class=\"hint\">Der Vergleich mit dem Abschussplan kommt in Version 2.</p>';", "  html+=planCardHtml(Y,kills);")
sub("$('#statYear').onchange=function(e){S.statYear=e.target.value;renderStats()};", "$('#statYear').onchange=function(e){S.statYear=e.target.value;renderStats()};\n  bindPlan(Y);")
sub(".pick input{width:22px;height:22px;flex:none}", ".pick input{width:22px;height:22px;flex:none}\n.plrow{display:grid;grid-template-columns:1.3fr 1fr .7fr auto;gap:6px;align-items:start}")
sub("html+=srcCardHtml()+diagCardHtml();", "html+=trkCardHtml()+srcCardHtml()+diagCardHtml();")
sub("bindSources();bindDiag();", "bindSources();bindDiag();bindTracks();")
sub("S.gpsState='on';dirty=true;renderHeader();updateGuide()}", "S.gpsState='on';dirty=true;renderHeader();updateGuide();trkPoint()}")
sub("if(document.visibilityState==='visible'&&S.guide)keepAwake(true)", "if(document.visibilityState==='visible'&&(S.guide||S.rec))keepAwake(true)")
sub("+(S.grp?'<button type=\"button\" class=\"chip\" id=\"grpChip\"", "+(S.rec?'<button type=\"button\" class=\"chip\" id=\"recChip\" style=\"--c:#E08A00\"><i></i>Aufzeichnung '+trkKm(S.rec.dist)+' ■</button>':'')+(S.grp?'<button type=\"button\" class=\"chip\" id=\"grpChip\"")
sub("if(e.target.closest('#grpChip')){S.grp=null;renderAll();return}", "if(e.target.closest('#recChip')){trkStopSheet();return}if(e.target.closest('#grpChip')){S.grp=null;renderAll();return}")
sub("  /* markers */\n", "  drawTracks(v);\n  /* markers */\n")
sub("function newEntry(kind,at){if(kind==='guide'){pickTarget();return}", "function newEntry(kind,at){if(kind==='track'){trkStart();return}if(kind==='guide'){pickTarget();return}")
sub("Zu einer Kanzel oder Einrichtung gehen</small></span></button>'", "Zu einer Kanzel oder Einrichtung gehen</small></span></button>'+\n  '<button class=\"choice\" data-n=\"track\" type=\"button\"><span class=\"mk\" style=\"background:#E08A00\">●</span><span><b>Track aufzeichnen</b><small>Deinen Weg per GPS mitschneiden</small></span></button>'")
sub("settings:D.settings},null,1);", "settings:D.settings,tracks:trkLoad()},null,1);")
sub("  seq.then(function(){return j.settings?", "  seq.then(function(){if(j.tracks)trkMerge(j.tracks);return j.settings?")
sub("'application/json'}),a=document.createElement('a');", "'application/json'}),a=document.createElement('a');")
sub("{type:/\\.csv$/.test(o.filename)?'text/csv;charset=utf-8':'application/json'}", "{type:/\\.csv$/.test(o.filename)?'text/csv;charset=utf-8':/\\.gpx$/.test(o.filename)?'application/gpx+xml':'application/json'}")
sub("if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol))", "trkRecover();\nif('serviceWorker' in navigator&&/^https?:$/.test(location.protocol))")


# GPS: kurze Funklöcher beenden die Ortung nicht mehr (wichtig für Tracks im Wald)
sub("},function(){gpsFail()},{enableHighAccuracy:true,maximumAge:3000", "},function(e){if(e&&e.code===1)gpsFail(e);else{S.gpsState='busy';renderHeader()}},{enableHighAccuracy:true,maximumAge:3000")


# ---------- Flächen + Wildschaden ----------
sub("layers:{lots:true,all:true,fac:true,sight:true,kill:true}", "layers:{lots:true,all:true,fac:true,sight:true,kill:true,par:true}")
sub("['kill','Abschüsse','--kill']];", "['kill','Abschüsse','--kill'],['par','Flächen','--futter']];")
sub("  drawTracks(v);\n  /* markers */\n", "  drawParcels(v);drawTracks(v);\n  /* markers */\n")
sub("  S.sel=null;dirty=true;\n  var wx=", "  S.sel=null;dirty=true;\n  var ph=parcelHit(px,py);S.parHi=ph?ph.id:null;if(ph){showParcel(ph.id);return}\n  var wx=")
sub("Deinen Weg per GPS mitschneiden</small></span></button>'", "Deinen Weg per GPS mitschneiden</small></span></button>'+\n  '<button class=\"choice\" data-n=\"parcel\" type=\"button\"><span class=\"mk sq\" style=\"background:#B8860B\">F</span><span><b>Fläche einzeichnen</b><small>Feld oder Waldparzelle, für Wildschaden</small></span></button>'")
sub("function newEntry(kind,at){if(kind==='track'){trkStart();return}", "function newEntry(kind,at){if(kind==='parcel'){parcelNew();return}if(kind==='track'){trkStart();return}")
sub("['sight','Sichtungen'],['grp','Gruppen']]", "['sight','Sichtungen'],['grp','Gruppen'],['par','Flächen']]")
sub("if(f!=='sight'&&f!=='grp')G('kills')", "if(f!=='sight'&&f!=='grp'&&f!=='par')G('kills')")
sub("if(f!=='kill'&&f!=='grp')G('sightings')", "if(f!=='kill'&&f!=='grp'&&f!=='par')G('sightings')")
sub("if(f==='grp')html+=groupListHtml();else if(!list.length)", "if(f==='grp')html+=groupListHtml();else if(f==='par')html+=parcelListHtml();else if(!list.length)")
sub("id=\"newGrp\" type=\"button\">+ Gruppe</button></div>'+", "id=\"newGrp\" type=\"button\">+ Gruppe</button><button class=\"btn\" id=\"newPar\" type=\"button\">+ Fläche</button></div>'+")
sub("  bindGroupRows();\n", "  bindGroupRows();bindParcelRows();\n")
sub("  html+=planCardHtml(Y,kills);", "  html+=cropSumHtml(Y==='all'?null:+Y,true)+lotPlanCardHtml(kills)+damageCardHtml(Y)+planCardHtml(Y,kills);")
sub("\n  bindPlan(Y);", "\n  bindPlan(Y);bindDamage();bindLotPlan();")

sub("bindForm();updPos();if(kind==='kill')checkTag();", "bindForm();updPos();if(kind==='kill'){checkTag();seasonCheck()}")
sub("function changed(key){\n  var f=S.form,d=f.d;", "function changed(key){\n  var f=S.form,d=f.d;\n  if(f.kind==='kill'&&(key==='species'||key==='sex'||key==='age'||key==='tsl'))seasonCheck();")
sub("'<div class=\"field\"><span class=\"lbl\">Geschlecht</span>'+chips('sex',SEX,d.sex,['m','w','u'])+'</div>'+", "'<div class=\"field\"><span class=\"lbl\">Geschlecht</span>'+chips('sex',SEX,d.sex,['m','w','u'])+'</div>'+'<div id=\"f-season\" class=\"warnbox\" hidden></div>'+")
sub("html+=cropSumHtml(Y==='all'?null:+Y,true)+lotPlanCardHtml(kills)", "html+=jzCardHtml()+cropSumHtml(Y==='all'?null:+Y,true)+lotPlanCardHtml(kills)")
sub("bindLotPlan();", "bindLotPlan();jzBind();")

sub("  $('#statsBody').innerHTML=html;\n  $('#statYear')", "  $('#statsBody').innerHTML=html;statLayout();\n  $('#statYear')")

# ---------- split into document ----------
i = src.index('<div id="app">')
head_part, body_part = src[:i], src[i:]
head_part = head_part.replace('<meta name="claude:viewport-fit-sides" content="cover">\n', '')
assert 'claude:viewport' not in head_part

html = ('<!doctype html>\n<html lang="de">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
        '<meta name="theme-color" content="#2D5A43">\n<link rel="manifest" href="manifest.webmanifest">\n'
        '<link rel="icon" href="icon-192.png" type="image/png">\n<link rel="apple-touch-icon" href="apple-touch-icon.png">\n'
        '<meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-capable" content="yes">\n'
        '<meta name="apple-mobile-web-app-title" content="Revierbuch"><meta name="apple-mobile-web-app-status-bar-style" content="default">\n'
        '<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}'
        'body{margin:0;font:14px system-ui,-apple-system,"Segoe UI",sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>\n'
        + head_part + '</head>\n<body>\n' + body_part.replace('</script>\n', '</script>\n</body>\n</html>\n', 1) if False else None)
# (assembled below to keep the string simple)
doc = ('<!doctype html>\n<html lang="de">\n<head>\n<meta charset="utf-8">\n'
       '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
       '<meta name="theme-color" content="#2D5A43">\n<link rel="manifest" href="manifest.webmanifest">\n'
       '<link rel="icon" href="icon-192.png" type="image/png">\n<link rel="apple-touch-icon" href="apple-touch-icon.png">\n'
       '<meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-capable" content="yes">\n'
       '<meta name="apple-mobile-web-app-title" content="Revierbuch"><meta name="apple-mobile-web-app-status-bar-style" content="default">\n'
       '<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}'
       'body{margin:0;font:14px system-ui,-apple-system,"Segoe UI",sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>\n'
       + head_part + '</head>\n<body>\n' + body_part.rstrip() + '\n</body>\n</html>\n')

os.makedirs(OUT, exist_ok=True)
open(OUT + '/index.html', 'w', encoding='utf8').write(doc)
shutil.copy(SP + '/lots-lu.geojson', OUT + '/lots-lu.geojson')

# ---------- manifest ----------
json.dump({
    'name': 'Revierbuch', 'short_name': 'Revierbuch', 'lang': 'de',
    'description': 'Jagdrevier-Verwaltung mit Karte, Abschüssen und Statistik',
    'start_url': './', 'scope': './', 'display': 'standalone', 'orientation': 'portrait',
    'background_color': '#EDEFE8', 'theme_color': '#2D5A43',
    'icons': [
        {'src': 'icon-192.png', 'sizes': '192x192', 'type': 'image/png', 'purpose': 'any'},
        {'src': 'icon-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'any'},
        {'src': 'icon-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'maskable'}]
}, open(OUT + '/manifest.webmanifest', 'w'), ensure_ascii=False, indent=1)

# ---------- service worker ----------
open(OUT + '/sw.js', 'w', encoding='utf8').write(r'''/* Revierbuch service worker: app shell offline, map tiles cached as they are viewed */
const VERSION = 'v26';
const SHELL = 'shell-' + VERSION, TILES = 'tiles-v1', FONTS = 'fonts-v1';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'lots-lu.geojson', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];
const MAX_TILES = 6000;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('shell-') && k !== SHELL).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

async function trim(cache, max) {
  const keys = await cache.keys();
  if (keys.length > max) await Promise.all(keys.slice(0, keys.length - max).map(k => cache.delete(k)));
}

async function tile(req) {
  const cache = await caches.open(TILES);
  const hit = await cache.match(req.url, { ignoreVary: true });
  if (hit) return hit;
  let res;
  try { res = await fetch(req.url, { mode: 'cors' }); } catch (_) { res = await fetch(req); }
  if (res && (res.ok || res.type === 'opaque')) {
    cache.put(req.url, res.clone()).then(() => { if (Math.random() < 0.025) trim(cache, MAX_TILES); }).catch(() => {});
  }
  return res;
}

async function swr(req, name) {
  const cache = await caches.open(name);
  const hit = await cache.match(req, { ignoreSearch: false });
  const net = fetch(req).then(res => { if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone()); return res; }).catch(() => hit);
  return hit || net;
}

async function page(req) {
  const cache = await caches.open(SHELL);
  try {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 4000);
    const res = await fetch('index.html', { cache: 'no-cache', signal: ctl.signal });
    clearTimeout(t);
    if (res && res.ok) { cache.put('index.html', res.clone()); return res; }
  } catch (_) {}
  return (await cache.match('index.html')) || fetch(req);
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    if (req.mode === 'navigate') {
      e.respondWith(page(req));
    } else {
      e.respondWith(swr(req, SHELL));
    }
    return;
  }
  if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) { e.respondWith(swr(req, FONTS)); return; }
  if (req.destination === 'image') { e.respondWith(tile(req)); }
});
''')

# ---------- icons ----------
def icon(size):
    S = size * 4
    im = Image.new('RGB', (S, S), '#2D5A43')
    d = ImageDraw.Draw(im)
    k = S / 512
    pts = [(150, 190), (250, 150), (350, 175), (375, 270), (330, 355), (235, 375), (160, 320)]
    pts = [(x * k, y * k) for x, y in pts]
    d.line(pts + [pts[0]], fill='#F8F9F4', width=int(14 * k), joint='curve')
    cx, cy, r = 262 * k, 262 * k, 44 * k
    d.polygon([(cx, cy - r), (cx + r, cy), (cx, cy + r), (cx - r, cy)], fill='#F8F9F4')
    d.polygon([(cx, cy - r * .5), (cx + r * .5, cy), (cx, cy + r * .5), (cx - r * .5, cy)], fill='#2D5A43')
    return im.resize((size, size), Image.LANCZOS)

icon(512).save(OUT + '/icon-512.png')
icon(192).save(OUT + '/icon-192.png')
icon(180).save(OUT + '/apple-touch-icon.png')

open(OUT + '/README.md', 'w', encoding='utf8').write(
    '# Revierbuch\n\nJagdrevier-App für das Handy (Web-App). Karte von Geoportail.lu, Lose der Administration de la nature et des forêts.\n\n'
    'Alle Dateien liegen direkt im Hauptordner des Repositories. Die App läuft über GitHub Pages.\n')
print('ok', os.listdir(OUT))
