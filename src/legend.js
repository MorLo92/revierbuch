/* ---------- Legende: aufklappbares Feld unten rechts auf der Karte ---------- */
var LEG_KEY='revierbuch.legend';
S.facHide={};S.spHide={};S.legOpen=false;
(function(){try{var j=JSON.parse(localStorage.getItem(LEG_KEY)||'null');if(j){
  if(j.layers)Object.keys(j.layers).forEach(function(k){S.layers[k]=!!j.layers[k]});
  S.facHide=j.facHide||{};S.spHide=j.spHide||{}}}catch(e){}})();
function legSave(){try{localStorage.setItem(LEG_KEY,JSON.stringify({layers:S.layers,facHide:S.facHide,spHide:S.spHide}))}catch(e){}}
function legOn(k){return k==='par'?S.layers.par!==false:!!S.layers[k]}

(function(){
  var st=document.createElement('style');
  st.textContent=
  '.legpanel{position:absolute;right:max(16px,env(safe-area-inset-right,0px));bottom:70px;width:min(280px,calc(100% - 32px));max-height:calc(100% - 130px);min-height:140px;overflow-y:auto;overscroll-behavior:contain;touch-action:pan-y;background:var(--surface);color:var(--ink);border:1px solid var(--line);border-radius:14px;box-shadow:var(--shadow);padding:10px 10px 12px}'+
  '.legpanel[hidden],.maptools .rb[hidden]{display:none}'+
  '.legpanel h4{margin:10px 4px 6px;font:700 12px/1 var(--font-body,inherit);letter-spacing:.08em;text-transform:uppercase;color:var(--ink-2)}'+
  '.legpanel .lgtop{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:2px}'+
  '.legpanel .lgtop b{font:700 16px/1 var(--font-display,inherit);letter-spacing:.06em;text-transform:uppercase}'+
  '.legpanel .lgreset{border:0;background:none;color:var(--accent);font-weight:700;font-size:13px;min-height:32px;padding:0 6px;text-decoration:underline}'+
  '.lgrow{display:flex;align-items:center;gap:10px;width:100%;min-height:40px;border:0;background:none;color:var(--ink);padding:4px 6px;border-radius:8px;text-align:left;font-size:14px}'+
  '.lgrow:active{background:var(--bg)}'+
  '.lgrow .sw{flex:none;width:24px;height:24px;border-radius:7px;background:var(--c,var(--ink-2));color:var(--on-mark,#fff);display:grid;place-items:center;font:700 11px/1 var(--font-body,inherit)}'+
  '.lgrow .sw.round{border-radius:50%}'+
  '.lgrow .tx{flex:1;min-width:0}'+
  '.lgrow .n{color:var(--ink-2);font-size:12px;font-variant-numeric:tabular-nums}'+
  '.lgrow .ck{flex:none;width:20px;height:20px;border-radius:6px;border:2px solid var(--ink-2);display:grid;place-items:center}'+
  '.lgrow .ck svg{width:14px;height:14px;stroke:var(--accent-ink,#fff);fill:none;stroke-width:3;stroke-linecap:round;stroke-linejoin:round;opacity:0}'+
  '.lgrow[aria-pressed="true"] .ck{background:var(--accent);border-color:var(--accent)}'+
  '.lgrow[aria-pressed="true"] .ck svg{opacity:1}'+
  '.lgrow[aria-pressed="false"] .sw{opacity:.35}.lgrow[aria-pressed="false"] .tx{color:var(--ink-2)}'+
  '.lgsub{margin-left:18px;border-left:2px solid var(--line);padding-left:4px}'+
  '.lgsub.off{opacity:.45}';
  document.head.appendChild(st);
  var host=document.getElementById('viewMap');
  var b=document.createElement('button');b.type='button';b.id='legBtn';b.className='rb';b.setAttribute('aria-label','Legende');b.setAttribute('aria-expanded','false');b.setAttribute('aria-controls','legPanel');
  b.innerHTML='<svg viewBox="0 0 24 24"><path d="M4 6h3M10 6h10M4 12h3M10 12h10M4 18h3M10 18h10"/></svg>';
  var p=document.createElement('div');p.id='legPanel';p.className='legpanel';p.hidden=true;p.setAttribute('role','group');p.setAttribute('aria-label','Legende');
  host.appendChild(p);(host.querySelector('.maptools')||host).appendChild(b);
  b.onclick=function(){S.legOpen=!S.legOpen;legRender()};
  p.addEventListener('click',function(e){
    var t=e.target.closest('[data-lg]');if(!t)return;
    var k=t.dataset.lg,v=t.dataset.v;
    if(k==='reset'){Object.keys(S.layers).forEach(function(x){S.layers[x]=true});S.facHide={};S.spHide={}}
    else if(k==='l'){S.layers[v]=!legOn(v)}
    else if(k==='f'){if(S.facHide[v])delete S.facHide[v];else S.facHide[v]=1}
    else if(k==='s'){if(S.spHide[v])delete S.spHide[v];else S.spHide[v]=1}
    else if(k==='x'){S.legOpen=false}
    legSave();renderLayers();dirty=true;
  });
})();

function legRow(k,v,on,label,sw,n,cls){
  return '<button type="button" class="lgrow" data-lg="'+k+'" data-v="'+esc(v)+'" aria-pressed="'+on+'">'+sw+'<span class="tx">'+esc(label)+'</span>'+(n!=null?'<span class="n">'+n+'</span>':'')+'<span class="ck"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span></button>';
}
function legSw(c,txt,round){return '<span class="sw'+(round?' round':'')+'" style="--c:var('+c+')">'+(txt||'')+'</span>'}
function legRender(){
  var b=$('#legBtn'),p=$('#legPanel');if(!b||!p)return;
  var gone=!!S.placing||!!S.guide||!!S.draw;
  b.hidden=gone;b.classList.toggle('on',!!S.legOpen);b.setAttribute('aria-expanded',S.legOpen?'true':'false');
  p.hidden=gone||!S.legOpen;if(p.hidden)return;
  var keep=p.scrollTop;
  var fac=G('markers'),si=G('sightings'),ki=G('kills'),cnt={},spc={},i;
  fac.forEach(function(o){cnt[o.type]=(cnt[o.type]||0)+1});
  si.concat(ki).forEach(function(o){if(o.species)spc[o.species]=(spc[o.species]||0)+1});
  var types=Object.keys(FAC).filter(function(t){return cnt[t]});
  var sp=Object.keys(spc).sort(function(a,b){return a.localeCompare(b,'de')});
  var h='<div class="lgtop"><b>Legende</b><span><button type="button" class="lgreset" data-lg="reset">Alles anzeigen</button><button type="button" class="lgreset" data-lg="x" aria-label="Schließen" style="text-decoration:none;font-size:18px">✕</button></span></div>'+
    '<h4>Karte</h4>'+
    legRow('l','lots',legOn('lots'),'Meine Lose',legSw('--accent'))+
    legRow('l','all',legOn('all'),'Alle Lose',legSw('--ink-2'))+
    legRow('l','par',legOn('par'),'Flächen',legSw('--futter'))+
    '<h4>Einträge</h4>'+
    legRow('l','fac',legOn('fac'),'Einrichtungen',legSw('--kanzel','K',true),fac.length);
  if(types.length){
    h+='<div class="lgsub'+(legOn('fac')?'':' off')+'">';
    types.forEach(function(t){h+=legRow('f',t,!S.facHide[t],FAC[t].label,legSw(FAC[t].c,FAC[t].glyph,true),cnt[t])});
    h+='</div>';
  }
  h+=legRow('l','sight',legOn('sight'),'Sichtungen',legSw('--sicht','S',true),si.length)+
     legRow('l','kill',legOn('kill'),'Abschüsse',legSw('--kill','A',true),ki.length);
  if(sp.length){
    h+='<h4>Wildarten</h4><div class="lgsub'+((legOn('sight')||legOn('kill'))?'':' off')+'">';
    sp.forEach(function(s){h+=legRow('s',s,!S.spHide[s],s,legSw('--ink-2',s.charAt(0)),spc[s])});
    h+='</div>';
  }
  p.innerHTML=h;p.scrollTop=keep;
}
