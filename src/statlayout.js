/* ---------- Statistik anpassen: Karten verschieben und ein-/ausblenden ---------- */
var STAT_CARDS=[['kill','Abschüsse (gesamt, Wildart, Kanzel, Monat)'],['seen','Gesehenes Wild'],['jz','Jagdzeiten heute'],['crop','Fläche nach Kultur'],['lotplan','Abschussplan 2024/2027 (meine Lose)'],['dmg','Wildschaden'],['plan','Abschussplan (eigene Zahlen)']];
var STAT_GRP={total:'kill',sp:'kill',kz:'kill',mo:'kill'};
function statCid(el){var r=statCid0(el);return STAT_GRP[r]||r}
function statCid0(el){
  var t=((el.querySelector('h2.sec')||el.querySelector('.lbl')||{}).textContent||'').trim();
  if(t.indexOf('Abschüsse gesamt')===0)return 'total';if(t.indexOf('Nach Wildart')===0)return 'sp';if(t.indexOf('Nach Kanzel')===0)return 'kz';if(t.indexOf('Nach Monat')===0)return 'mo';if(t.indexOf('Gesehenes Wild')===0)return 'seen';
  if(t.indexOf('Jagdzeiten')===0)return 'jz';if(t.indexOf('Fläche nach Kultur')===0)return 'crop';if(t.indexOf('Abschussplan')===0)return t.indexOf('meine Lose')>-1?'lotplan':'plan';if(t.indexOf('Wildschaden')===0)return 'dmg';
  return '';
}
function statHid(){
  var raw=D.settings.statHidden||[],out=[];
  raw.forEach(function(id){if(!STAT_GRP[id]&&out.indexOf(id)<0)out.push(id)});
  if(raw.indexOf('kill')>-1||['total','sp','kz','mo'].every(function(x){return raw.indexOf(x)>-1}))out.push('kill');
  return out;
}
function statOrder(){
  var known=STAT_CARDS.map(function(c){return c[0]}),sv=(D.settings.statOrder||[]).map(function(id){return STAT_GRP[id]||id}).filter(function(id,i,a){return known.indexOf(id)>-1&&a.indexOf(id)===i});
  return sv.concat(known.filter(function(id){return sv.indexOf(id)<0}));
}
function statLayout(){
  var box=$('#statsBody');if(!box)return;
  var hid=statHid(),ord=statOrder(),cards=$$('#statsBody > .card');
  cards.forEach(function(c){c.dataset.cid=statCid(c)});
  ord.forEach(function(id){cards.filter(function(c){return c.dataset.cid===id}).forEach(function(c){if(hid.indexOf(id)>-1)c.remove();else box.appendChild(c)})});
  var old=$('#stLay');if(old)old.remove();
  var bt=document.createElement('button');bt.id='stLay';bt.type='button';bt.setAttribute('aria-label','Statistik anpassen');bt.title='Anordnen und auswählen';
  bt.innerHTML='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/></svg>';
  bt.style.cssText='position:fixed;right:14px;bottom:calc(72px + env(safe-area-inset-bottom,0px));width:42px;height:42px;border-radius:50%;border:1px solid var(--line,#0003);background:var(--surface);color:var(--ink);box-shadow:0 2px 8px #0003;display:flex;align-items:center;justify-content:center;padding:0;z-index:5';
  box.appendChild(bt);bt.onclick=function(){statLayoutSheet()};
}
function statLayoutSheet(){
  var ord=statOrder(),hid=statHid(),names={};STAT_CARDS.forEach(function(c){names[c[0]]=c[1]});
  openSheet('<h2>Statistik anpassen</h2><p class="hint" style="margin-bottom:10px">Halte den Griff <b>⋮⋮</b> gedrückt und ziehe die Karte an die gewünschte Stelle. Mit dem Haken blendest du eine Karte ein oder aus.</p><div class="rows" id="sl-rows" style="touch-action:pan-y"></div>'+
    '<div class="btnrow" style="margin-top:12px"><button class="btn primary" id="sl-save" type="button" style="flex:2">Fertig</button><button class="btn" id="sl-reset" type="button" style="flex:1">Zurücksetzen</button></div>');
  function paint(){
    $('#sl-rows').innerHTML=ord.map(function(id){var on=hid.indexOf(id)<0;return '<div class="row" data-id="'+id+'" style="cursor:default;align-items:center;gap:8px;background:var(--surface)"><span data-h aria-label="Verschieben" style="touch-action:none;cursor:grab;flex:none;width:34px;height:40px;display:flex;align-items:center;justify-content:center;font-size:20px;color:var(--ink-2);letter-spacing:-3px;user-select:none">⋮⋮</span><label style="display:flex;align-items:center;gap:10px;flex:1;min-width:0"><input type="checkbox" data-sh="'+id+'"'+(on?' checked':'')+' style="width:22px;height:22px;flex:none"><span class="rt"><b style="font-weight:'+(on?600:400)+';'+(on?'':'opacity:.55')+'">'+esc(names[id])+'</b></span></label></div>'}).join('');
    $$('#sl-rows [data-sh]').forEach(function(c){c.onchange=function(){var k=hid.indexOf(c.dataset.sh);if(c.checked&&k>-1)hid.splice(k,1);else if(!c.checked&&k<0)hid.push(c.dataset.sh);paint()}});
    $$('#sl-rows [data-h]').forEach(function(h){
      h.addEventListener('pointerdown',function(e){
        e.preventDefault();var row=h.parentNode,rows=$$('#sl-rows .row'),from=rows.indexOf(row),sy=e.clientY,to=from,
            step=rows.length>1?Math.abs(rows[1].offsetTop-rows[0].offsetTop):row.offsetHeight;
        try{h.setPointerCapture(e.pointerId)}catch(_){}
        row.style.zIndex='3';row.style.boxShadow='0 4px 14px #0004';row.style.transition='none';
        rows.forEach(function(r){if(r!==row)r.style.transition='transform .12s'});
        var mv=function(ev){
          var dy=ev.clientY-sy;row.style.transform='translateY('+dy+'px)';
          to=Math.max(0,Math.min(rows.length-1,from+Math.round(dy/step)));
          rows.forEach(function(r,i){if(r===row)return;var s=0;if(from<to&&i>from&&i<=to)s=-step;else if(to<from&&i>=to&&i<from)s=step;r.style.transform=s?'translateY('+s+'px)':''});
          var sc=$('#sheet');if(sc){var bx=sc.getBoundingClientRect();if(ev.clientY<bx.top+40)sc.scrollTop-=8;else if(ev.clientY>bx.bottom-40)sc.scrollTop+=8}
        },up=function(){
          h.removeEventListener('pointermove',mv);h.removeEventListener('pointerup',up);h.removeEventListener('pointercancel',up);
          if(to!==from)ord.splice(to,0,ord.splice(from,1)[0]);paint();
        };
        h.addEventListener('pointermove',mv);h.addEventListener('pointerup',up);h.addEventListener('pointercancel',up);
      });
    });
  }
  paint();
  $('#sl-reset').onclick=function(){ord=STAT_CARDS.map(function(c){return c[0]});hid=[];paint()};
  $('#sl-save').onclick=function(){guard(Store.setting({statOrder:ord,statHidden:hid})).then(function(){closeSheet();renderStats()},function(){})};
}
