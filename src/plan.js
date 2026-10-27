/* ---------- Abschussplan: Soll/Ist-Vergleich ---------- */
var CATS={all:'Alle',m:'männlich',w:'weiblich',juv:'Jungtiere'};
function planOf(y){return (D.settings.plans&&D.settings.plans[y])||[]}
function planCount(l,kills,y){return kills.filter(function(k){return new Date(k.ts).getFullYear()===y&&k.species===l.species&&(l.cat==='all'||(l.cat==='m'&&k.sex==='m')||(l.cat==='w'&&k.sex==='w')||(l.cat==='juv'&&k.age==='juv'))}).length}
function planCardHtml(Y,kills){
  var y=Y==='all'?new Date().getFullYear():+Y,pl=planOf(y),h='<div class="card"><h2 class="sec">Abschussplan '+y+'</h2>';
  if(!pl.length)h+='<p class="hint">Noch kein Plan für '+y+'. Trage ein, wie viele Stücke je Wildart geplant sind, dann siehst du hier, wie weit du bist.</p>';
  else{
    h+='<div class="bars">'+pl.map(function(l){
      var n=planCount(l,kills,y),t=l.target||0,over=n>t,pct=t?Math.min(100,Math.round(n/t*100)):(n?100:0);
      var st=over?'überschritten (+'+(n-t)+')':n>=t&&t>0?'erfüllt':'noch '+(t-n)+' offen';
      return '<div class="bar"><span class="bl">'+esc(l.species)+(l.cat!=='all'?' · '+CATS[l.cat]:'')+'<small>'+st+'</small></span><span class="bt"><i style="width:'+pct+'%'+(over?';background:var(--kill)':'')+'"></i></span><span class="bv">'+n+'/'+t+'</span></div>'}).join('')+'</div>';
  }
  h+='<div class="btnrow"><button class="btn" id="plEdit" type="button">'+(pl.length?'Plan bearbeiten':'Plan eintragen')+'</button></div>'+
    '<p class="hint">Gezählt werden die Abschüsse im Kalenderjahr '+y+(Y==='all'?' (wähle oben ein Jahr für ein anderes Jahr)':'')+'.</p></div>';
  return h;
}
function bindPlan(Y){var b=$('#plEdit');if(b)b.onclick=function(){planSheet(Y==='all'?new Date().getFullYear():+Y)}}
function planSheet(y){
  var lines=planOf(y).map(function(l){return Object.assign({id:uid('p')},l)});
  openSheet('<h2>Abschussplan '+y+'</h2><p class="hint">Je Zeile eine Wildart, optional eingeschränkt auf männlich, weiblich oder Jungtiere, mit der geplanten Stückzahl.</p><div id="pl-list"></div>'+
    '<div class="btnrow"><button class="btn" id="pl-add" type="button">+ Zeile</button>'+(planOf(y-1).length&&!lines.length?'<button class="btn" id="pl-prev" type="button">Plan '+(y-1)+' übernehmen</button>':'')+'</div>'+
    '<div class="btnrow"><button class="btn primary" id="pl-save" type="button" style="flex:2">Speichern</button><button class="btn" id="pl-cancel" type="button" style="flex:1">Abbrechen</button></div>');
  function paint(){
    var box=$('#pl-list');
    box.innerHTML=lines.length?lines.map(function(l,i){return '<div class="plrow"><label class="field"><select data-i="'+i+'" data-f="species">'+opts(SPECIES,l.species)+'</select></label>'+
      '<label class="field"><select data-i="'+i+'" data-f="cat">'+Object.keys(CATS).map(function(k){return '<option value="'+k+'"'+(l.cat===k?' selected':'')+'>'+CATS[k]+'</option>'}).join('')+'</select></label>'+
      '<label class="field"><input type="number" inputmode="numeric" min="0" step="1" data-i="'+i+'" data-f="target" value="'+(l.target==null?'':l.target)+'" placeholder="Soll"></label>'+
      '<button class="btn sm danger" type="button" data-rm="'+i+'" aria-label="Zeile entfernen">✕</button></div>'}).join(''):'<p class="hint">Noch keine Zeilen.</p>';
    $$('#pl-list [data-f]').forEach(function(n){n.addEventListener('input',function(){var l=lines[+n.dataset.i];l[n.dataset.f]=n.dataset.f==='target'?Math.max(0,parseInt(n.value,10)||0):n.value})});
    $$('#pl-list [data-rm]').forEach(function(b){b.onclick=function(){lines.splice(+b.dataset.rm,1);paint()}});
  }
  paint();
  $('#pl-cancel').onclick=closeSheet;
  $('#pl-add').onclick=function(){lines.push({id:uid('p'),species:'Rehwild',cat:'all',target:0});paint()};
  var pv=$('#pl-prev');if(pv)pv.onclick=function(){lines=planOf(y-1).map(function(l){return Object.assign({},l,{id:uid('p')})});paint();pv.remove()};
  $('#pl-save').onclick=function(){
    var m=Object.assign({},D.settings.plans||{});m[y]=lines.map(function(l){return {id:l.id,species:l.species,cat:l.cat||'all',target:l.target||0}});
    guard(Store.setting({plans:m})).then(function(){closeSheet();toast('Plan gespeichert')},function(){});
  };
}
