/* ---------- Tabs: verschieben (lang drücken) und ausblenden ---------- */
var TAB_ALL=[['start','Start'],['map','Karte'],['log','Einträge'],['hunt','Jagd'],['stats','Statistik'],['data','Daten']];
function tabList(){
  var ord=cfgOrder(CARD_CFG.tabs),hid=cfgHid(CARD_CFG.tabs),nm={};TAB_ALL.forEach(function(x){nm[x[0]]=x[1]});
  return ord.filter(function(id){return hid.indexOf(id)<0}).map(function(id){return [id,nm[id]]});
}
var tabSupT=0;
function tabSup(){if(Date.now()<tabSupT){tabSupT=0;return true}return false}
(function(){
  var bar=$('#tabs');if(!bar)return;
  bar.style.touchAction='none';bar.style.webkitTouchCallout='none';bar.style.userSelect='none';
  bar.addEventListener('contextmenu',function(e){e.preventDefault()});
  bar.addEventListener('pointerdown',function(e){
    var b=e.target.closest('button[data-t]');if(!b||e.button>0)return;
    var sx=e.clientX,sy=e.clientY,pid=e.pointerId,live=false,tm=setTimeout(begin,500);
    function stopPre(){clearTimeout(tm);bar.removeEventListener('pointermove',pre);bar.removeEventListener('pointerup',stopPre);bar.removeEventListener('pointercancel',stopPre)}
    function pre(ev){if(Math.hypot(ev.clientX-sx,ev.clientY-sy)>10)stopPre()}
    bar.addEventListener('pointermove',pre);bar.addEventListener('pointerup',stopPre);bar.addEventListener('pointercancel',stopPre);
    function begin(){
      stopPre();live=true;try{navigator.vibrate&&navigator.vibrate(20)}catch(_){}
      try{bar.setPointerCapture(pid)}catch(_){}
      var tabs=$$('#tabs button'),from=tabs.indexOf(b),to=from,w=tabs.length>1?tabs[1].getBoundingClientRect().left-tabs[0].getBoundingClientRect().left:b.offsetWidth;
      b.style.zIndex='3';b.style.transition='none';b.style.boxShadow='0 4px 14px #0004';b.style.background='var(--surface)';b.style.borderRadius='10px';
      tabs.forEach(function(x){if(x!==b)x.style.transition='transform .12s'});
      function mv(ev){
        var dx=ev.clientX-sx;b.style.transform='translateX('+dx+'px) scale(1.08)';
        to=Math.max(0,Math.min(tabs.length-1,from+Math.round(dx/w)));
        tabs.forEach(function(x,i){if(x===b)return;var s=0;if(from<to&&i>from&&i<=to)s=-w;else if(to<from&&i>=to&&i<from)s=w;x.style.transform=s?'translateX('+s+'px)':''});
      }
      function up(){
        bar.removeEventListener('pointermove',mv);bar.removeEventListener('pointerup',up);bar.removeEventListener('pointercancel',up);
        tabSupT=Date.now()+450;
        if(to!==from){
          var vis=tabs.map(function(x){return x.dataset.t});vis.splice(to,0,vis.splice(from,1)[0]);
          var full=cfgOrder(CARD_CFG.tabs),k=0,nf2=full.map(function(id){return vis.indexOf(id)>-1?vis[k++]:id});
          guard(Store.setting({tabOrder:nf2})).then(renderTabs,renderTabs);
        }else{renderTabs();setTimeout(function(){cardLayoutSheet(CARD_CFG.tabs)},350)}
      }
      bar.addEventListener('pointermove',mv);bar.addEventListener('pointerup',up);bar.addEventListener('pointercancel',up);
    }
  });
})();
