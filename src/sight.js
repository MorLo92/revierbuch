/* ---------- Wildsichtung: "gemischt" nur bei Gruppen, Verteilung ♂ / ♀ / unbekannt ---------- */
(function(){var st=document.createElement('style');st.textContent='.seg button[hidden]{display:none}.grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.grid3 .field{margin:0}';document.head.appendChild(st)})();
function brkHtml(d){
  function inp(id,l,v){return '<label class="field"><span class="lbl">'+l+'</span><input type="number" inputmode="numeric" min="0" step="1" id="'+id+'" value="'+(v?v:'')+'" placeholder="0"></label>'}
  return '<div class="field" id="f-brk" hidden><span class="lbl">Verteilung (optional)</span><div class="grid3">'+inp('f-cm','♂ männlich',d.cm)+inp('f-cf','♀ weiblich',d.cf)+inp('f-cu','unbekannt',d.cu)+'</div><p class="hint" id="f-brkh"></p></div>';
}
function brkNum(id){var n=$(id),v=n?parseInt(n.value,10):0;return isFinite(v)&&v>0?v:0}
function sightChips(sex){$$('[data-f="sex"] button').forEach(function(x){x.setAttribute('aria-pressed',x.dataset.v===sex)})}
function sightSync(init){
  var f=S.form;if(!f||f.kind!=='sight')return;var d=f.d,one=(d.count||1)<=1;
  if(!init&&one&&d.sex==='g'){d.sex='u';sightChips('u')}
  var g=$('[data-f="sex"] button[data-v="g"]');if(g)g.hidden=one&&d.sex!=='g';
  var br=$('#f-brk');if(br)br.hidden=one;
  var h=$('#f-brkh');if(h){var m=brkNum('#f-cm'),w=brkNum('#f-cf'),u=brkNum('#f-cu'),sum=m+w+u;
    h.textContent=sum>0&&sum!==(d.count||1)?'Die Anzahl wird beim Speichern auf die Summe ('+sum+') gesetzt.':''}
  if(init){
    var bind=function(){var m=brkNum('#f-cm'),w=brkNum('#f-cf'),u=brkNum('#f-cu'),sum=m+w+u;
      d.cm=m;d.cf=w;d.cu=u;
      if(sum>0){d.count=sum;var c=$('[data-f="count"]');if(c)c.value=sum;
        var cls=(m?1:0)+(w?1:0)+(u?1:0);d.sex=cls>1?'g':m?'m':w?'w':'u';sightChips(d.sex)}
      sightSync(false)};
    ['#f-cm','#f-cf','#f-cu'].forEach(function(id){var n=$(id);if(n){n.addEventListener('input',bind);n.addEventListener('change',bind)}});
  }
}
function brkSave(d,o){
  var m=d.cm||0,w=d.cf||0,u=d.cu||0,sum=m+w+u;
  if(sum>0){o.cm=m;o.cf=w;o.cu=u;o.count=sum}
}
function brkRow(o){return (o.cm||o.cf||o.cu)?'<dt>Verteilung</dt><dd>♂ '+(o.cm||0)+' · ♀ '+(o.cf||0)+' · unbekannt '+(o.cu||0)+'</dd>':''}
