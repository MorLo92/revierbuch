/* ---------- Flächen (Felder, Waldparzellen) und Wildschaden ---------- */
var PKIND={feld:'Feld / Acker',wiese:'Wiese / Grünland',wald:'Waldparzelle',sonst:'Sonstige Fläche'};
var PCOL={feld:'#B8860B',wiese:'#6F7A25',wald:'#2E7D32',sonst:'#455A64'};
var PGLY={feld:'F',wiese:'G',wald:'W',sonst:'S'};
var CAUSES=['Schwarzwild','Rehwild','Rotwild','Damwild','Sonstige / unbekannt'];
var CROPS=['Mais','Weizen','Gerste','Raps','Hafer','Kartoffeln','Grünland','Wiese','Eichenkultur','Buchenverjüngung','Fichtenkultur','Douglasienkultur'];
var EUR=new Intl.NumberFormat('de-LU',{style:'currency',currency:'EUR'}),N2=new Intl.NumberFormat('de-LU',{maximumFractionDigits:2});
var CROPCOL=[[/mais/,'#E39A1B'],[/raps/,'#E6D12E'],[/weizen/,'#C28E3A'],[/gerste/,'#A9A04A'],[/hafer/,'#8FA05A'],[/roggen|triticale/,'#9C7A4A'],[/kartoffel/,'#8D6E63'],[/r(ü|ue)be/,'#B5476B'],[/sonnenblume/,'#F2B705'],[/senf|phacelia|zwischen|gr(ü|ue)ndüng|gruendueng/,'#8E5BB5'],[/klee|luzerne|erbse|bohne|soja/,'#2FA595'],[/gr(ü|ue)nland|wiese|weide|gras/,'#6FA83A'],[/fichte/,'#1B5E20'],[/buche/,'#66A23F'],[/eiche/,'#2E7D32'],[/douglasie|kiefer|lärche|tanne/,'#2E6F57'],[/brache|stilllegung/,'#9AA0A6']];
var CROPFB=['#D2691E','#4F7CAC','#C2547A','#7B8F2A','#B9770E','#5D6D7E'];
function cropCol(c,kind){
  var l=String(c||'').toLowerCase().trim(),i,h=0;if(!l)return PCOL[kind]||PCOL.sonst;
  for(i=0;i<CROPCOL.length;i++)if(CROPCOL[i][0].test(l))return CROPCOL[i][1];
  for(i=0;i<l.length;i++)h=(h*31+l.charCodeAt(i))>>>0;return CROPFB[h%CROPFB.length];
}
/* Kulturverlauf: [{from:'JJJJ-MM-TT',crop}] */
function cropList(p){var a=(p.crops&&p.crops.length)?p.crops:(p.crop?[{from:'1900-01-01',crop:p.crop}]:[]);return a.slice().sort(function(x,y){return x.from.localeCompare(y.from)})}
function cropAt(p,date){var a=cropList(p),r=null;a.forEach(function(e){if(e.from<=date&&(!e.to||date<=e.to))r=e});return r?r.crop:(a[0]&&date<a[0].from?a[0].crop:'')}
function dShort(x){return new Date(x+'T12:00').toLocaleDateString('de-LU')}
function cropSpan(e){return (e.from<'1950'?'bisher':'ab '+dShort(e.from))+(e.to?' bis '+dShort(e.to):'')}
function curCrop(p){return cropAt(p,toLocalInput().slice(0,10))}
function parColor(p){return cropCol(curCrop(p),p.kind)}
function parcels(){return D.settings.parcels||[]}
function damages(){return D.settings.damages||[]}
function parcelById(id){return parcels().filter(function(p){return p.id===id})[0]}
function savePar(a){return guard(Store.setting({parcels:a}))}
function saveDmg(a){return guard(Store.setting({damages:a}))}
function dmgYear(d){return +String(d.date).slice(0,4)}
function dmgTotal(d){return Math.round((d.ar||0)*(d.price||0)*100)/100}
function fmtAr(ar){return N2.format(Math.round(ar*100)/100)+' ar'}
function fmtArea(m2){var ar=m2/100;return fmtAr(ar)+(ar>=100?' ('+N2.format(Math.round(ar)/100)+' ha)':'')}
function numIn(v){var x=parseFloat(String(v).replace(',','.'));return isNaN(x)?null:x}
/* Fläche in m² aus Breiten-/Längengraden (lokal ebene Näherung, für Felder auf Zentimeter genau genug) */
function polyArea(pts){
  var n=pts.length;if(n<3)return 0;
  var la0=pts[0][0],lo0=pts[0][1],kx=111320*Math.cos(la0*Math.PI/180),ky=110574,a=0,i,p,q;
  for(i=0;i<n;i++){p=pts[i];q=pts[(i+1)%n];a+=((p[1]-lo0)*kx)*((q[0]-la0)*ky)-((q[1]-lo0)*kx)*((p[0]-la0)*ky)}
  return Math.abs(a)/2;
}
function inPolyLL(lat,lon,pts){var c=false,n=pts.length,i,j;for(i=0,j=n-1;i<n;j=i++){if((pts[i][0]>lat)!==(pts[j][0]>lat)&&lon<(pts[j][1]-pts[i][1])*(lat-pts[i][0])/(pts[j][0]-pts[i][0])+pts[i][1])c=!c}return c}
function parRings(p){return p.rings&&p.rings.length?p.rings:[p.pts]}
function ringsArea(rs){return rs.reduce(function(s,r){return s+polyArea(r)},0)}
function parBox(p){var b=[1e9,1e9,-1e9,-1e9];parRings(p).forEach(function(r){r.forEach(function(q){b[0]=Math.min(b[0],q[1]);b[1]=Math.min(b[1],q[0]);b[2]=Math.max(b[2],q[1]);b[3]=Math.max(b[3],q[0])})});return b}
function parTotal(id,year){return damages().filter(function(d){return d.parcelId===id&&(year==null||dmgYear(d)===year)}).reduce(function(s,d){return s+dmgTotal(d)},0)}


/* ----- Katasterparzelle aus dem Geoportail (INSPIRE-Dienst) holen ----- */
var CADBASE='https://wms.inspire.geoportail.lu/geoserver/cp/';
function cadUrls(lat,lon){
  var d=0.00002,b1=[lon-d,lat-d,lon+d,lat+d].join(','),b2=[lat-d,lon-d,lat+d,lon+d].join(',');
  return [
    CADBASE+'ows?service=WFS&version=1.0.0&request=GetFeature&typeName=CP.CadastralParcel&outputFormat=application/json&srsName=EPSG:4326&maxFeatures=5&bbox='+b1+',EPSG:4326',
    CADBASE+'ows?service=WFS&version=2.0.0&request=GetFeature&typeNames=CP.CadastralParcel&outputFormat=application/json&srsName=urn:ogc:def:crs:EPSG::4326&count=5&bbox='+b2+',urn:ogc:def:crs:EPSG::4326',
    CADBASE+'wms?service=WMS&version=1.1.1&request=GetFeatureInfo&layers=CP.CadastralParcel&query_layers=CP.CadastralParcel&styles=&srs=EPSG:4326&bbox='+b1+'&width=101&height=101&x=50&y=50&info_format=application/json&feature_count=5'
  ];
}
function cadRings(g){return !g?[]:g.type==='Polygon'?[g.coordinates[0]]:g.type==='MultiPolygon'?g.coordinates.map(function(p){return p[0]}):[]}
function cadPick(js,lat,lon){
  var fs=(js&&js.features)||[],best=null;
  fs.forEach(function(f){cadRings(f.geometry).forEach(function(r){
    if(!r||r.length<4)return;
    var pts=r.map(function(c){return [c[1],c[0]]});                       /* GeoJSON: lon,lat */
    if(!(pts[0][0]>49&&pts[0][0]<50.3)&&(r[0][0]>49&&r[0][0]<50.3))pts=r.map(function(c){return [c[0],c[1]]}); /* vertauschte Achsen */
    if(!(pts[0][0]>49&&pts[0][0]<50.3&&pts[0][1]>5.6&&pts[0][1]<6.6))return;
    if(pts.length>1&&pts[0][0]===pts[pts.length-1][0]&&pts[0][1]===pts[pts.length-1][1])pts.pop();
    var hit=inPolyLL(lat,lon,pts);
    if(!best||(hit&&!best.hit)||(hit===best.hit&&polyArea(pts)>polyArea(best.pts)))best={pts:pts,hit:hit,ref:(f.properties&&(f.properties.label||f.properties.nationalCadastralReference||f.properties.inspireId||f.id))||''};
  })});
  return best;
}
function cadFetch(lat,lon){
  var urls=cadUrls(lat,lon),errs=[],i=0;
  function next(){
    if(i>=urls.length)return Promise.reject(new Error(errs.join(' · ')));
    var u=urls[i++],ctl=window.AbortController?new AbortController():null,t=setTimeout(function(){ctl&&ctl.abort()},12000);
    return fetch(u,ctl?{signal:ctl.signal}:{}).then(function(r){clearTimeout(t);if(!r.ok)throw new Error('HTTP '+r.status);return r.json()})
      .then(function(js){var b=cadPick(js,lat,lon);if(!b)throw new Error('keine Parzelle an dieser Stelle');return b})
      .catch(function(e){clearTimeout(t);errs.push(e&&e.message||'Fehler');return next()});
  }
  return next();
}

/* ----- zeichnen: Punkte mit dem Fadenkreuz setzen ----- */
function nearFirst(pts){var q=toScr(pts[0][0],pts[0][1]);return Math.hypot(q.x-W/2,q.y-H/2)<26}
function polyDraw(title,done,initial){
  var pts=initial?initial.slice():[];
  switchTab('map');
  var ob=$('#pOk'),nb=$('#pNo'),row=ob.parentNode,t0=ob.textContent,t1=nb.textContent;
  var undo=document.createElement('button'),cancel=document.createElement('button'),cad=document.createElement('button');
  undo.type=cancel.type=cad.type='button';undo.className=cancel.className=cad.className='btn sm';cad.textContent='Kataster';undo.textContent='Zurück';cancel.textContent='Abbrechen';
  row.appendChild(undo);row.appendChild(cad);row.appendChild(cancel);
  var sel=[];
  function upd(){$('#placeTitle').textContent=title+' · '+(sel.length?sel.length+(sel.length===1?' Parzelle · ':' Parzellen · ')+fmtArea(ringsArea(sel.map(function(x){return x.pts}))):pts.length+(pts.length===1?' Punkt':' Punkte')+(pts.length>2?' · '+fmtArea(polyArea(pts)):''));S.parDraw={pts:pts,rings:sel.map(function(x){return x.pts})};dirty=true}
  function finishSel(){var rs=sel.map(function(x){return x.pts}),refs=sel.map(function(x){return x.ref}).filter(Boolean);cleanup();endPlace();done(rs[0],rs,refs)}
  function cleanup(){ob.textContent=t0;nb.textContent=t1;undo.remove();cad.remove();cancel.remove();S.parDraw=null}
  ob.textContent='Punkt setzen';nb.textContent='Fertig';upd();
  undo.onclick=function(){if(sel.length)sel.pop();else pts.pop();upd()};
  cad.onclick=function(){
    cad.disabled=true;cad.textContent='Lade …';
    cadFetch(+S.view.lat,+S.view.lon).then(function(r){
      pts.length=0;var np=r.pts.map(function(q){return [+q[0].toFixed(6),+q[1].toFixed(6)]}),ref=r.ref?String(r.ref):'',k=sel.findIndex(function(x){return (ref&&x.ref===ref)||(x.pts[0][0]===np[0][0]&&x.pts[0][1]===np[0][1])});
      if(k>-1){sel.splice(k,1);upd();toast('Parzelle abgewählt.');return}
      sel.push({pts:np,ref:ref});upd();fitBox(parBox({rings:sel.map(function(x){return x.pts}),pts:np}));
      toast((r.hit?'Parzelle übernommen. ':'Nächste Parzelle übernommen, bitte prüfen. ')+'Weitere Parzelle: Fadenkreuz darauf, „Kataster“. Nochmal dieselbe tippen wählt sie ab. Dann „Fertig“.')
    },function(e){toast('Kataster nicht verfügbar ('+(e&&e.message||'Fehler')+'). Bitte von Hand einzeichnen.')})
    .then(function(){cad.disabled=false;cad.textContent='Kataster'});
  };
  cancel.onclick=function(){cleanup();endPlace()};
  S.placing={
    ok:function(){if(sel.length){toast('Mit „Kataster“ weitere Parzellen wählen oder „Fertig“ tippen. „Zurück“ entfernt die letzte.');return}if(pts.length>2&&nearFirst(pts)){cleanup();endPlace();done(pts);return}pts.push([+S.view.lat.toFixed(6),+S.view.lon.toFixed(6)]);upd()},
    no:function(){if(sel.length){finishSel();return}if(pts.length<3){toast('Mindestens 3 Punkte nötig.');return}cleanup();endPlace();done(pts)}
  };
  renderAll();
}
function parcelNew(){
  closeSheet();
  if(S.tab!=='map')switchTab('map');
  toast('Karte verschieben, bis das Fadenkreuz auf einer Ecke der Fläche liegt, dann „Punkt setzen“.');
  polyDraw('Neue Fläche',function(pts,rs,refs){parcelForm({id:uid('f'),name:'',kind:'feld',crop:'',note:refs&&refs.length?'Kataster: '+refs.join(', '):'',pts:pts,rings:rs&&rs.length>1?rs:null,m2:rs?ringsArea(rs):polyArea(pts)},false)});
}
function parcelForm(d,edit){
  if(!d.crops)d.crops=cropList(d);d.crop='';d.edIdx=null;var today=toLocalInput().slice(0,10);
  openSheet('<h2>'+(edit?'Fläche bearbeiten':'Neue Fläche')+'</h2>'+
    '<div class="field"><span class="lbl">Berechnete Größe</span><div class="big" id="pf-area">'+fmtArea(d.m2)+'</div></div>'+
    '<label class="field"><span class="lbl">Name</span><input type="text" id="pf-name" value="'+esc(d.name)+'" placeholder="z. B. Maisfeld Eichberg" autocomplete="off"></label>'+
    '<div class="field"><span class="lbl">Art</span><div class="seg" id="pf-kind">'+Object.keys(PKIND).map(function(k){return '<button type="button" data-v="'+k+'" aria-pressed="'+(d.kind===k)+'">'+PKIND[k]+'</button>'}).join('')+'</div></div>'+
    '<div class="grid2"><label class="field"><span class="lbl">Kultur / Bestand (neu) <i id="pf-sw" style="display:inline-block;width:12px;height:12px;border-radius:3px;vertical-align:-1px;background:'+cropCol(d.crop,d.kind)+'"></i></span><input type="text" id="pf-crop" value="'+esc(d.crop||'')+'" list="pfCrops" placeholder="z. B. Mais" autocomplete="off"><datalist id="pfCrops">'+CROPS.map(function(c){return '<option value="'+esc(c)+'">'}).join('')+'</datalist></label>'+
    '<label class="field"><span class="lbl">von</span><input type="date" id="pf-from" value="'+esc(d.from||today)+'"></label></div>'+
    '<label class="field"><span class="lbl">bis (leer = offen)</span><input type="date" id="pf-to" value="'+esc(d.to||'')+'"></label>'+
    '<p class="hint">Neue Kultur mit Zeitraum eintragen (z. B. Mais bis 10.9., Zwischenfrucht ab 15.9.). Dazwischen gilt das Feld als leer. Tippe einen Eintrag unten an, um ihn zu ändern.</p><div class="rows" id="pf-hist"></div>'+
    '<label class="field"><span class="lbl">Notiz</span><textarea rows="2" id="pf-note">'+esc(d.note||'')+'</textarea></label>'+
    '<div class="btnrow"><button class="btn" id="pf-redraw" type="button">Neu einzeichnen</button></div>'+
    '<div class="btnrow"><button class="btn primary" id="pf-save" type="button" style="flex:2">Speichern</button><button class="btn" id="pf-cancel" type="button" style="flex:1">Abbrechen</button></div>');
  function grab(){d.name=$('#pf-name').value.trim();d.crop=$('#pf-crop').value.trim();d.from=$('#pf-from').value||today;d.to=$('#pf-to').value||'';d.note=$('#pf-note').value.trim()}
  function hist(){var a=cropList({crops:d.crops});$('#pf-hist').innerHTML=a.map(function(e,i){return  '<div class="row" data-ed="'+i+'" style="cursor:pointer"><span class="mk sq" style="background:'+cropCol(e.crop,d.kind)+'">'+esc(e.crop.slice(0,1).toUpperCase())+'</span><span class="rt"><b>'+esc(e.crop)+'</b><small>'+esc(cropSpan(e))+'</small></span><button type="button" class="btn sm" data-hx="'+i+'" aria-label="Eintrag entfernen">✕</button></div>'}).join('');
    $$('#pf-hist [data-hx]').forEach(function(b){b.onclick=function(ev){ev.stopPropagation();var l=cropList({crops:d.crops});l.splice(+b.dataset.hx,1);d.crops=l;d.edIdx=null;hist()}});
    $$('#pf-hist [data-ed]').forEach(function(r){r.onclick=function(){var e=cropList({crops:d.crops})[+r.dataset.ed];d.crops=cropList({crops:d.crops});d.edIdx=+r.dataset.ed;$('#pf-crop').value=e.crop;$('#pf-from').value=e.from<'1950'?today:e.from;$('#pf-to').value=e.to||'';$('#pf-sw').style.background=cropCol(e.crop,d.kind);$('#pf-crop').scrollIntoView({block:'center'})}})}
  hist();$('#pf-crop').addEventListener('input',function(){$('#pf-sw').style.background=cropCol($('#pf-crop').value,d.kind)});
  $('#pf-kind').addEventListener('click',function(e){var b=e.target.closest('button[data-v]');if(!b)return;d.kind=b.dataset.v;$$('#pf-kind button').forEach(function(x){x.setAttribute('aria-pressed',x===b)})});
  $('#pf-cancel').onclick=closeSheet;
  $('#pf-redraw').onclick=function(){grab();closeSheet();polyDraw('Neu einzeichnen',function(pts,rs){d.pts=pts;d.rings=rs&&rs.length>1?rs:null;d.m2=rs?ringsArea(rs):polyArea(pts);parcelForm(d,edit)})};
  $('#pf-save').onclick=function(){
    grab();var cs=cropList({crops:d.crops});
    if(d.to&&d.to<d.from){toast('Das Enddatum liegt vor dem Beginn.');return}
    if(d.crop){var ne={from:d.from,crop:d.crop};if(d.to)ne.to=d.to;if(d.edIdx!=null&&cs[d.edIdx])cs[d.edIdx]=ne;else cs.push(ne);cs=cropList({crops:cs})}
    var o={id:d.id,name:d.name||PKIND[d.kind],kind:d.kind,crop:'',crops:cs,note:d.note,pts:d.pts,rings:d.rings&&d.rings.length>1?d.rings:null,m2:Math.round(d.m2*100)/100};o.crop=curCrop(o);
    var arr=parcels().slice(),i=arr.findIndex(function(x){return x.id===o.id});if(i>-1)arr[i]=o;else arr.push(o);
    savePar(arr).then(function(){toast('Fläche gespeichert');showParcel(o.id);if(S.tab==='log')renderLog()},function(){});
  };
}

/* ----- fläche ansehen ----- */
function yearBarsHtml(rows,maxv){
  return '<div class="bars">'+rows.map(function(r){return '<div class="bar"><span class="bl">'+esc(r.label)+(r.sub?'<small>'+esc(r.sub)+'</small>':'')+'</span><span class="bt"><i style="width:'+(maxv?Math.max(2,Math.round(r.v/maxv*100)):0)+'%;background:var(--kill)"></i></span><span class="bv" style="min-width:74px;text-align:right">'+EUR.format(r.v)+'</span></div>'}).join('')+'</div>';
}
function showParcel(id){
  var p=parcelById(id);if(!p)return;
  var ds=damages().filter(function(d){return d.parcelId===id}).sort(function(a,b){return String(b.date).localeCompare(String(a.date))}),tot=ds.reduce(function(s,d){return s+dmgTotal(d)},0);
  var yrs={};ds.forEach(function(d){yrs[dmgYear(d)]=(yrs[dmgYear(d)]||0)+dmgTotal(d)});
  var ylist=Object.keys(yrs).sort(),maxv=Math.max.apply(null,ylist.map(function(y){return yrs[y]}).concat([0]));
  openSheet('<h2>'+esc(p.name)+'</h2><dl class="kv"><dt>Art</dt><dd>'+esc(PKIND[p.kind]||'')+'</dd>'+(curCrop(p)?'<dt>Kultur</dt><dd><i style="display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:6px;background:'+parColor(p)+'"></i>'+esc(curCrop(p))+'</dd>':(cropList(p).length?'<dt>Kultur</dt><dd>derzeit leer</dd>':''))+((cropList(p).length>1||cropList(p).some(function(e){return e.to}))?'<dt>Verlauf</dt><dd>'+cropList(p).map(function(e){return esc(e.crop)+' ('+esc(cropSpan(e))+')'}).join(' → ')+'</dd>':'')+'<dt>Fläche</dt><dd><b>'+fmtArea(p.m2)+'</b></dd>'+(ds.length?'<dt>Schäden gesamt</dt><dd><b>'+EUR.format(tot)+'</b></dd>':'')+(p.note?'<dt>Notiz</dt><dd>'+esc(p.note)+'</dd>':'')+'</dl>'+
    (ylist.length>1?'<div class="field"><span class="lbl">Vergleich nach Jahren</span>'+yearBarsHtml(ylist.map(function(y,i){var prev=i?yrs[ylist[i-1]]:null,dl=prev?Math.round((yrs[y]-prev)/prev*100):null;return {label:y,v:yrs[y],sub:dl==null?'':(dl>0?'+':'')+dl+' % zum Vorjahr'}}),maxv)+'</div>':'')+
    '<div class="field"><span class="lbl">Wildschäden</span>'+(ds.length?'<div class="rows">'+ds.map(function(d){return '<button class="row" type="button" data-did="'+esc(d.id)+'"><span class="mk sq" style="background:var(--kill)">€</span><span class="rt"><b>'+EUR.format(dmgTotal(d))+'</b><small>festgestellt '+esc(new Date(d.date+'T12:00').toLocaleDateString('de-LU'))+' · '+fmtAr(d.ar)+' × '+EUR.format(d.price)+'/ar'+(d.cause?' · '+esc(d.cause):'')+(cropAt(p,d.date)?' · '+esc(cropAt(p,d.date)):'')+'</small></span></button>'}).join('')+'</div>':'<p class="hint">Noch kein Schaden eingetragen.</p>')+'</div>'+
    '<div class="btnrow"><button class="btn primary" id="pa-dmg" type="button">+ Schaden eintragen</button><button class="btn" id="pa-map" type="button">Auf Karte</button></div>'+
    '<div class="btnrow"><button class="btn" id="pa-edit" type="button">Bearbeiten</button><button class="btn danger" id="pa-del" type="button">Löschen</button><button class="btn" id="pa-close" type="button">Schließen</button></div>');
  $('#pa-close').onclick=closeSheet;
  $('#pa-dmg').onclick=function(){damageForm(id,null)};
  $('#pa-map').onclick=function(){closeSheet();S.parHi=id;switchTab('map');fitBox(parBox(p));renderAll()};
  $('#pa-edit').onclick=function(){var c=clone(p);parcelForm(c,true)};
  $$('#sheetBody [data-did]').forEach(function(b){b.onclick=function(){var d=damages().filter(function(x){return x.id===b.dataset.did})[0];if(d)damageForm(id,d)}});
  var del=$('#pa-del');del.onclick=function(){if(del.dataset.s!=='1'){del.dataset.s='1';del.textContent=ds.length?'Wirklich löschen? Auch '+ds.length+' Schäden gehen verloren.':'Wirklich löschen?';return}
    guard(Store.setting({parcels:parcels().filter(function(x){return x.id!==id}),damages:damages().filter(function(x){return x.parcelId!==id})})).then(function(){if(S.parHi===id)S.parHi=null;closeSheet();toast('Gelöscht');if(S.tab==='log')renderLog()},function(){})};
}

/* ----- schaden eintragen ----- */
function lastPrice(pid){var p=parcelById(pid),a=damages().slice().sort(function(x,y){return String(y.date).localeCompare(String(x.date))}),m=a.filter(function(d){return d.parcelId===pid})[0]||(p&&curCrop(p)?a.filter(function(d){var q=parcelById(d.parcelId);return q&&cropAt(q,d.date)===curCrop(p)})[0]:null);return m?m.price:null}
function damageForm(pid,dm){
  var ps=parcels();if(!ps.length){toast('Zeichne zuerst eine Fläche.');return}
  var d=dm?clone(dm):{id:uid('w'),parcelId:pid||ps[0].id,date:toLocalInput().slice(0,10),cause:'Schwarzwild',ar:null,price:lastPrice(pid||ps[0].id),note:''};
  openSheet('<h2>'+(dm?'Schaden bearbeiten':'Wildschaden eintragen')+'</h2>'+
    '<label class="field"><span class="lbl">Fläche</span><select id="dm-par">'+ps.map(function(p){return '<option value="'+esc(p.id)+'"'+(p.id===d.parcelId?' selected':'')+'>'+esc(p.name)+' ('+fmtAr(p.m2/100)+')</option>'}).join('')+'</select></label>'+
    '<div class="grid2"><label class="field"><span class="lbl">Festgestellt am</span><input type="date" id="dm-date" value="'+esc(d.date)+'"></label>'+
    '<label class="field"><span class="lbl">Verursacher</span><select id="dm-cause">'+opts(CAUSES,d.cause)+'</select></label></div>'+
    '<div class="grid2"><label class="field"><span class="lbl">Geschädigte Fläche (ar)</span><input type="text" inputmode="decimal" id="dm-ar" value="'+(d.ar==null?'':String(d.ar).replace('.',','))+'" placeholder="z. B. 12,5"></label>'+
    '<label class="field"><span class="lbl">Preis pro ar (€)</span><input type="text" inputmode="decimal" id="dm-price" value="'+(d.price==null?'':String(d.price).replace('.',','))+'" placeholder="z. B. 8,50"></label></div>'+
    '<div class="btnrow"><button class="btn sm" id="dm-all" type="button">Ganze Fläche übernehmen</button></div>'+
    '<div class="field"><span class="lbl">Gesamtbetrag</span><div class="big" id="dm-tot">–</div></div>'+
    '<label class="field"><span class="lbl">Notiz</span><textarea rows="2" id="dm-note">'+esc(d.note||'')+'</textarea></label>'+
    '<div class="btnrow"><button class="btn primary" id="dm-save" type="button" style="flex:2">Speichern</button><button class="btn" id="dm-cancel" type="button" style="flex:1">Abbrechen</button></div>'+(dm?'<button class="btn danger" id="dm-del" type="button">Schaden löschen</button>':''));
  function calc(){var ar=numIn($('#dm-ar').value),pr=numIn($('#dm-price').value);$('#dm-tot').textContent=ar!=null&&pr!=null?EUR.format(Math.round(ar*pr*100)/100):'–'}
  calc();
  ['#dm-ar','#dm-price'].forEach(function(s){$(s).addEventListener('input',calc)});
  $('#dm-par').onchange=function(e){var lp=lastPrice(e.target.value);if(lp!=null&&!$('#dm-price').value){$('#dm-price').value=String(lp).replace('.',',');calc()}};
  $('#dm-all').onclick=function(){var p=parcelById($('#dm-par').value);if(p){$('#dm-ar').value=String(Math.round(p.m2)/100).replace('.',',');calc()}};
  $('#dm-cancel').onclick=closeSheet;
  $('#dm-save').onclick=function(){
    var ar=numIn($('#dm-ar').value),pr=numIn($('#dm-price').value);
    if(ar==null||ar<=0){toast('Bitte die geschädigte Fläche in ar eingeben.');return}
    if(pr==null||pr<0){toast('Bitte den Preis pro ar eingeben.');return}
    if(!$('#dm-date').value){toast('Bitte angeben, wann der Schaden festgestellt wurde.');return}
    var o={id:d.id,parcelId:$('#dm-par').value,date:$('#dm-date').value,cause:$('#dm-cause').value,ar:ar,price:pr,note:$('#dm-note').value.trim()};
    var arr=damages().slice(),i=arr.findIndex(function(x){return x.id===o.id});if(i>-1)arr[i]=o;else arr.push(o);
    saveDmg(arr).then(function(){toast('Schaden gespeichert · '+EUR.format(dmgTotal(o)));showParcel(o.parcelId);if(S.tab==='stats')renderStats()},function(){});
  };
  var del=$('#dm-del');if(del)del.onclick=function(){if(del.dataset.s!=='1'){del.dataset.s='1';del.textContent='Wirklich löschen?';return}
    saveDmg(damages().filter(function(x){return x.id!==d.id})).then(function(){showParcel(d.parcelId);toast('Gelöscht')},function(){})};
}


/* ----- Gesamtfläche je Kultur ----- */
function cropSums(Y){
  var by={},tot=0,n=0,leer=0;
  parcels().forEach(function(p){
    var cs;if(Y==null||Y==='all')cs=[curCrop(p)].filter(Boolean);
    else{var a=cropList(p),y0=Y+'-01-01',y1=Y+'-12-31';cs=a.filter(function(e){return e.from<=y1&&(!e.to||e.to>=y0)}).map(function(e){return e.crop});cs=cs.filter(function(c,i){return cs.indexOf(c)===i})}
    tot+=p.m2;n++;
    if(!cs.length){leer+=p.m2;return}
    cs.forEach(function(c){var k=c.toLowerCase();(by[k]=by[k]||{crop:c,m2:0,n:0}).m2+=p.m2;by[k].n++});
  });
  return {rows:Object.keys(by).map(function(k){return by[k]}).sort(function(a,b){return b.m2-a.m2}),tot:tot,n:n,leer:leer};
}
function cropSumHtml(Y,card){
  var r=cropSums(Y);if(!r.n)return '';
  var mx=Math.max.apply(null,r.rows.map(function(x){return x.m2}).concat([r.leer,1]));
  function row(lbl,m2,n,col){return '<div class="bar"><span class="bl"><i style="display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px;background:'+col+'"></i>'+esc(lbl)+'<small>'+n+(n===1?' Fläche':' Flächen')+'</small></span><span class="bt"><i style="width:'+Math.max(2,Math.round(m2/mx*100))+'%;background:'+col+'"></i></span><span class="bv" style="min-width:92px;text-align:right">'+fmtArea(m2)+'</span></div>'}
  var h=(card?'<div class="card"><h2 class="sec">Fläche nach Kultur'+(Y==null||Y==='all'?' · aktuell':' · '+Y)+'</h2>':'<div class="field" style="margin:0 0 12px"><span class="lbl">Fläche nach Kultur · aktuell</span>')+
    '<div class="bars">'+r.rows.map(function(x){return row(x.crop,x.m2,x.n,cropCol(x.crop,'feld'))}).join('')+(r.leer?row('Ohne Kultur / leer',r.leer,parcels().filter(function(p){return !curCrop(p)}).length||1,'#9AA0A6'):'')+'</div>'+
    '<p class="hint" style="margin:8px 0 0"><b>Gesamt: '+fmtArea(r.tot)+'</b> auf '+r.n+(r.n===1?' Fläche':' Flächen')+(Y!=null&&Y!=='all'?'. Hatte eine Fläche im Jahr mehrere Kulturen, zählt sie bei jeder.':'.')+'</p></div>';
  return h;
}

/* ----- liste im Einträge-Tab ----- */
function parcelListHtml(){
  var ps=parcels().slice().sort(function(a,b){return nat(a.name,b.name)});
  if(!ps.length)return '<div class="empty">Noch keine Flächen. Tippe auf „+ Fläche“ und zeichne ein Feld oder eine Waldparzelle ein. Die Größe wird berechnet, danach kannst du Wildschäden mit Preis pro ar eintragen.</div>';
  return cropSumHtml(null,false)+'<div class="rows">'+ps.map(function(p){var t=parTotal(p.id);return '<button class="row" type="button" data-par="'+esc(p.id)+'"><span class="mk sq" style="background:'+parColor(p)+'">'+(PGLY[p.kind]||'S')+'</span><span class="rt"><b>'+esc(p.name)+'</b><small>'+fmtArea(p.m2)+(curCrop(p)?' · '+esc(curCrop(p)):'')+(t?' · Schäden '+EUR.format(t):'')+'</small></span></button>'}).join('')+'</div>';
}
function bindParcelRows(){$$('#logBody [data-par]').forEach(function(b){b.onclick=function(){showParcel(b.dataset.par)}});var n=$('#newPar');if(n)n.onclick=parcelNew}

/* ----- statistik: wildschaden im jahresvergleich ----- */
function damageCardHtml(Y){
  var ds=damages(),h='<div class="card"><h2 class="sec">Wildschaden</h2>';
  if(!ds.length){return h+'<p class="hint">Noch kein Wildschaden eingetragen. Zeichne unter „Eintragen → Fläche“ ein Feld oder eine Waldparzelle ein und trage dort Schäden ein. Hier siehst du dann die Jahre im Vergleich.</p><div class="btnrow"><button class="btn" id="dmNew" type="button">+ Fläche einzeichnen</button></div></div>'}
  var by={};ds.forEach(function(d){var y=dmgYear(d);(by[y]=by[y]||{eur:0,ar:0}).eur+=dmgTotal(d);by[y].ar+=d.ar||0});
  var ys=Object.keys(by).map(Number).sort(function(a,b){return a-b}),maxv=Math.max.apply(null,ys.map(function(y){return by[y].eur})),dy=Y==='all'?ys[ys.length-1]:+Y;
  h+='<div class="bars">'+ys.map(function(y,i){var prev=i?by[ys[i-1]].eur:null,dl=prev?Math.round((by[y].eur-prev)/prev*100):null;
    return '<div class="bar"><span class="bl">'+(y===dy?'<b>'+y+'</b>':y)+'<small>'+fmtAr(by[y].ar)+(dl==null?'':' · '+(dl>0?'+':'')+dl+' % zu '+ys[i-1])+'</small></span><span class="bt"><i style="width:'+Math.max(2,Math.round(by[y].eur/maxv*100))+'%;background:var(--kill)"></i></span><span class="bv" style="min-width:74px;text-align:right">'+EUR.format(by[y].eur)+'</span></div>'}).join('')+'</div>';
  var rows=parcels().map(function(p){return {p:p,e:parTotal(p.id,dy),b:parTotal(p.id,dy-1),a:parTotal(p.id,dy+1)}}).filter(function(r){return r.e||r.b||r.a}).sort(function(x,y){return y.e-x.e});
  if(rows.length){
    h+='<h3 class="lbl" style="margin:14px 0 6px">Nach Fläche · '+dy+'</h3><div class="rows">'+rows.map(function(r){var f=function(v){return v?EUR.format(v):'–'};
      return '<button class="row" type="button" data-par="'+esc(r.p.id)+'"><span class="mk sq" style="background:'+parColor(r.p)+'">'+(PGLY[r.p.kind]||'S')+'</span><span class="rt"><b>'+esc(r.p.name)+' · '+f(r.e)+'</b><small>'+(dy-1)+': '+f(r.b)+' · '+(dy+1)+': '+f(r.a)+'</small></span></button>'}).join('')+'</div>';
  }
  return h+'<div class="btnrow"><button class="btn" id="dmNew" type="button">+ Schaden eintragen</button><button class="btn" id="dmCsv" type="button">Als CSV</button></div></div>';
}
function dmgCsv(){
  var rows=[['Festgestellt am','Jahr','Fläche','Art','Kultur','Größe der Fläche (ar)','Verursacher','Geschädigt (ar)','Preis pro ar (EUR)','Gesamt (EUR)','Notiz']];
  damages().slice().sort(function(a,b){return String(a.date).localeCompare(String(b.date))}).forEach(function(d){var p=parcelById(d.parcelId)||{};
    rows.push([d.date,dmgYear(d),p.name||'',PKIND[p.kind]||'',(p.id?cropAt(p,d.date):'')||'',p.m2?(p.m2/100).toFixed(2).replace('.',','):'',d.cause||'',String(d.ar).replace('.',','),Number(d.price).toFixed(2).replace('.',','),dmgTotal(d).toFixed(2).replace('.',','),d.note||'']);});
  return '﻿'+rows.map(function(r){return r.map(function(c){c=String(c);return /[;"\n]/.test(c)?'"'+c.replace(/"/g,'""')+'"':c}).join(';')}).join('\r\n');
}
function bindDamage(){
  var n=$('#dmNew');if(n)n.onclick=function(){if(!parcels().length)parcelNew();else pickParcelFor()};
  var c=$('#dmCsv');if(c)c.onclick=function(){saveFile({filename:'wildschaden-'+toLocalInput().slice(0,10)+'.csv',data:dmgCsv()}).then(function(){toast('CSV gespeichert')}).catch(function(e){if(!e||e.code!=='declined')toast('Speichern nicht möglich.')})};
  $$('#statsBody [data-par]').forEach(function(b){b.onclick=function(){showParcel(b.dataset.par)}});
}
function pickParcelFor(){
  var ps=parcels().slice().sort(function(a,b){return nat(a.name,b.name)});
  openSheet('<h2>Für welche Fläche?</h2><div class="rows">'+ps.map(function(p){return '<button class="row" type="button" data-par="'+esc(p.id)+'"><span class="mk sq" style="background:'+parColor(p)+'">'+(PGLY[p.kind]||'S')+'</span><span class="rt"><b>'+esc(p.name)+'</b><small>'+fmtArea(p.m2)+'</small></span></button>'}).join('')+'</div><div class="btnrow"><button class="btn" id="pp-new" type="button">+ Neue Fläche</button><button class="btn" id="pp-close" type="button">Abbrechen</button></div>');
  $('#pp-close').onclick=closeSheet;$('#pp-new').onclick=parcelNew;
  $$('#sheetBody [data-par]').forEach(function(b){b.onclick=function(){damageForm(b.dataset.par,null)}});
}

/* ----- karte ----- */
function drawParcels(v){
  if(S.layers.par!==false)parcels().forEach(function(p){
    var rs=parRings(p).map(function(r){return r.map(function(q){return toScr(q[0],q[1])})}),a=[].concat.apply([],rs),col=parColor(p),hi=S.parHi===p.id,xs=a.map(function(q){return q.x}),ys=a.map(function(q){return q.y}),
      x0=Math.min.apply(null,xs),x1=Math.max.apply(null,xs),y0=Math.min.apply(null,ys),y1=Math.max.apply(null,ys);
    if(x1<-20||x0>W+20||y1<-20||y0>H+20)return;
    ctx.beginPath();rs.forEach(function(r){r.forEach(function(q,i){i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y)});ctx.closePath()});
    ctx.globalAlpha=hi?.3:.2;ctx.fillStyle=col;ctx.fill();ctx.globalAlpha=1;ctx.lineJoin='round';ctx.setLineDash([]);
    ctx.lineWidth=hi?6:5;ctx.strokeStyle=pal.surface;ctx.globalAlpha=.8;ctx.stroke();ctx.globalAlpha=1;ctx.lineWidth=hi?3.5:2.2;ctx.strokeStyle=col;ctx.stroke();
    if(x1-x0>70){ctx.font='700 13px "Atkinson Hyperlegible",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';var t=parTotal(p.id);halo(p.name+' · '+fmtAr(p.m2/100),(x0+x1)/2,(y0+y1)/2,col)}
  });
  if(S.parDraw){
    var pts=S.parDraw.pts.map(function(q){return toScr(q[0],q[1])}),c={x:W/2,y:H/2},i;
    (S.parDraw.rings||[]).forEach(function(r){ctx.beginPath();r.forEach(function(q,k){var u=toScr(q[0],q[1]);k?ctx.lineTo(u.x,u.y):ctx.moveTo(u.x,u.y)});ctx.closePath();ctx.globalAlpha=.22;ctx.fillStyle=pal.accent;ctx.fill();ctx.globalAlpha=1;ctx.setLineDash([]);ctx.lineWidth=6;ctx.strokeStyle=pal.surface;ctx.globalAlpha=.85;ctx.stroke();ctx.globalAlpha=1;ctx.lineWidth=3;ctx.strokeStyle=pal.accent;ctx.stroke()});
    if(pts.length){
      ctx.lineJoin='round';ctx.lineCap='round';ctx.beginPath();pts.forEach(function(q,k){k?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y)});
      ctx.setLineDash([]);ctx.lineWidth=6;ctx.strokeStyle=pal.surface;ctx.globalAlpha=.85;ctx.stroke();ctx.globalAlpha=1;ctx.lineWidth=3;ctx.strokeStyle=pal.accent;ctx.stroke();
      ctx.beginPath();ctx.moveTo(pts[pts.length-1].x,pts[pts.length-1].y);ctx.lineTo(c.x,c.y);ctx.setLineDash([6,6]);ctx.lineWidth=2;ctx.strokeStyle=pal.accent;ctx.stroke();ctx.setLineDash([]);
      var nr=pts.length>2&&Math.hypot(pts[0].x-c.x,pts[0].y-c.y)<26;
      if(pts.length>2){ctx.beginPath();ctx.arc(pts[0].x,pts[0].y,nr?15:11,0,7);ctx.lineWidth=2.5;ctx.strokeStyle=pal.accent;ctx.globalAlpha=nr?1:.6;ctx.stroke();ctx.globalAlpha=1}
      var okb=$('#pOk'),wt=nr?'Fläche schließen':'Punkt setzen';if(okb&&okb.textContent!==wt)okb.textContent=wt;
      pts.forEach(function(q){ctx.beginPath();ctx.arc(q.x,q.y,5,0,7);ctx.fillStyle=pal.surface;ctx.fill();ctx.beginPath();ctx.arc(q.x,q.y,3.2,0,7);ctx.fillStyle=pal.accent;ctx.fill()});
    }
  }
}
function parcelHit(px,py){
  if(S.layers.par===false)return null;var g=fromScr(px,py),best=null;
  parcels().forEach(function(p){if(parRings(p).some(function(r){return inPolyLL(g.lat,g.lon,r)}))best=p});
  return best;
}
