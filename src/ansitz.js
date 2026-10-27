/* ---------- Kanzel-Bauart und Ansitz-Reservierungen ---------- */
var SUBK={closed:'Geschlossen',mobile:'Mobil',open:'Offen'};
function kGlyph(o){if(o.type==='kanzel'&&o.sub)return {closed:'K',mobile:'Km',open:'Ko'}[o.sub];return FAC[o.type]?FAC[o.type].glyph:'·'}
function reservs(){return D.settings.reservations||[]}
function saveRes(a){return guard(Store.setting({reservations:a}))}
function resStart(r){return new Date(r.date+'T'+(r.from||'00:00'))}
function resEnd(r){var s=resStart(r);if(!r.to)return new Date(r.date+'T23:59');var e=new Date(r.date+'T'+r.to);if(e<=s)e.setDate(e.getDate()+1);return e}
function resUpcoming(){var n=new Date();return reservs().filter(function(r){return resEnd(r)>=n}).sort(function(a,b){return resStart(a)-resStart(b)})}
function resNow(){return memo('ra'+new Date().toISOString().slice(0,13),function(){var m={},n=new Date(),eod=new Date();eod.setHours(23,59,59,999);reservs().forEach(function(r){if(resEnd(r)>n&&resStart(r)<=eod)m[r.seatId]=true});return m})}
function resDot(x,y){var o=11*MKS;ctx.beginPath();ctx.arc(x+o,y-o,6.5*MKS,0,7);ctx.fillStyle=pal.surface;ctx.fill();ctx.beginPath();ctx.arc(x+o,y-o,4.5*MKS,0,7);ctx.fillStyle='#E08A00';ctx.fill()}
function seatsList(){return D.markers.filter(function(m){return m.type==='kanzel'||m.type==='bock'}).sort(function(a,b){return nat(a.name||'',b.name||'')})}
function seatName(id){var m=postMarker(id);return m?(m.name||FAC[m.type].label):'Gelöschter Stand'}
function fmtRes(r){return resStart(r).toLocaleDateString('de-LU',{weekday:'short',day:'2-digit',month:'2-digit'})+' · '+(r.from||'')+(r.to?'–'+r.to:'')}
function resRowsHtml(list,showSeat){return '<div class="rows">'+list.map(function(r){return '<button class="row" type="button" data-rid="'+esc(r.id)+'"><span class="mk sq" style="background:#E08A00">R</span><span class="rt"><b>'+(showSeat?esc(seatName(r.seatId))+' · ':'')+esc(fmtRes(r))+'</b><small>'+(r.who?esc(r.who):'ohne Namen')+(r.note?' · '+esc(r.note):'')+'</small></span></button>'}).join('')+'</div>'}
function resSectionHtml(){var up=resUpcoming();return '<h2 class="sec">Ansitz-Reservierungen</h2><div class="toolbar"><button class="btn" id="rNew" type="button">+ Ansitz reservieren</button></div>'+(up.length?resRowsHtml(up,true):'<div class="empty">Keine anstehenden Reservierungen.</div>')}
function seatResHtml(o){var up=resUpcoming().filter(function(r){return r.seatId===o.id});return '<div class="field"><span class="lbl">Ansitz-Reservierungen</span>'+(up.length?resRowsHtml(up.slice(0,4),false):'<p class="hint">Keine anstehenden Reservierungen.</p>')+'<button type="button" class="btn sm" id="d-res">Reservieren</button></div>'}
function bindResRows(root){$$('[data-rid]',root).forEach(function(b){b.onclick=function(){var r=reservs().filter(function(x){return x.id===b.dataset.rid})[0];if(r)resForm(r.seatId,r)}})}
function bindSeatRes(kind,o){var b=$('#d-res');if(b)b.onclick=function(){resForm(o.id,null)};bindResRows($('#sheetBody'))}
function resForm(seatId,r){
  var seats=seatsList();if(!seats.length){toast('Lege zuerst eine Kanzel an.');return}
  var d=r?clone(r):{id:uid('r'),seatId:seatId||seats[0].id,date:toLocalInput().slice(0,10),from:'16:00',to:'22:00',who:'',note:''},names={},confirmed=false;
  reservs().forEach(function(x){if(x.who)names[x.who]=1});
  var pre=[['Morgen','05:00','09:00'],['Abend','16:00','22:00'],['Nacht','21:00','05:00'],['Ganztags','00:00','23:59']];
  openSheet('<h2>'+(r?'Reservierung bearbeiten':'Ansitz reservieren')+'</h2>'+
    '<label class="field"><span class="lbl">Kanzel / Stand</span><select id="rs-seat">'+seats.map(function(m){return '<option value="'+esc(m.id)+'"'+(m.id===d.seatId?' selected':'')+'>'+esc(m.name||FAC[m.type].label)+(m.sub?' ('+SUBK[m.sub]+')':'')+'</option>'}).join('')+(postMarker(d.seatId)?'':'<option value="'+esc(d.seatId)+'" selected>Gelöschter Stand</option>')+'</select></label>'+
    '<label class="field"><span class="lbl">Datum</span><input type="date" id="rs-date" value="'+esc(d.date)+'"></label>'+
    '<div class="field"><span class="lbl">Zeitraum</span><div class="btnrow">'+pre.map(function(p,i){return '<button type="button" class="btn sm" data-pi="'+i+'">'+p[0]+'</button>'}).join('')+'</div></div>'+
    '<div class="grid2"><label class="field"><span class="lbl">Von</span><input type="time" id="rs-from" value="'+esc(d.from||'')+'"></label><label class="field"><span class="lbl">Bis</span><input type="time" id="rs-to" value="'+esc(d.to||'')+'"></label></div>'+
    '<label class="field"><span class="lbl">Wer sitzt an</span><input type="text" id="rs-who" value="'+esc(d.who||'')+'" list="rsDl" autocomplete="off"><datalist id="rsDl">'+Object.keys(names).map(function(n){return '<option value="'+esc(n)+'">'}).join('')+'</datalist></label>'+
    '<label class="field"><span class="lbl">Notiz</span><input type="text" id="rs-note" value="'+esc(d.note||'')+'" autocomplete="off"></label>'+
    '<div class="warnbox" id="rs-warn" hidden></div>'+
    '<div class="btnrow"><button class="btn primary" id="rs-save" type="button" style="flex:2">Speichern</button><button class="btn" id="rs-cancel" type="button" style="flex:1">Abbrechen</button></div>'+(r?'<button class="btn danger" id="rs-del" type="button">Reservierung löschen</button>':''));
  $('#rs-cancel').onclick=closeSheet;
  $$('#sheetBody [data-pi]').forEach(function(b){b.onclick=function(){var p=pre[+b.dataset.pi];$('#rs-from').value=p[1];$('#rs-to').value=p[2];confirmed=false;$('#rs-warn').hidden=true}});
  $$('#sheetBody select,#sheetBody input').forEach(function(x){x.addEventListener('input',function(){confirmed=false;$('#rs-warn').hidden=true})});
  $('#rs-save').onclick=function(){
    var o={id:d.id,seatId:$('#rs-seat').value,date:$('#rs-date').value,from:$('#rs-from').value,to:$('#rs-to').value,who:$('#rs-who').value.trim(),note:$('#rs-note').value.trim()};
    if(!o.date||!o.from){toast('Bitte Datum und Beginn angeben.');return}
    var s=resStart(o),e=resEnd(o),cf=reservs().filter(function(x){return x.id!==o.id&&x.seatId===o.seatId&&resStart(x)<e&&resEnd(x)>s});
    if(cf.length&&!confirmed){confirmed=true;var w=$('#rs-warn');w.hidden=false;w.textContent='Überschneidung: '+cf.map(function(x){return (x.who||'ohne Namen')+', '+fmtRes(x)}).join(' / ')+'. Tippe nochmal auf Speichern, um trotzdem zu reservieren.';return}
    var arr=reservs().slice(),i=arr.findIndex(function(x){return x.id===o.id});if(i>-1)arr[i]=o;else arr.push(o);
    saveRes(arr).then(function(){closeSheet();toast('Reserviert');if(S.tab==='hunt')renderHunt()},function(){});
  };
  var del=$('#rs-del');if(del)del.onclick=function(){if(del.dataset.s!=='1'){del.dataset.s='1';del.textContent='Wirklich löschen?';return}
    saveRes(reservs().filter(function(x){return x.id!==d.id})).then(function(){closeSheet();toast('Gelöscht');if(S.tab==='hunt')renderHunt()},function(){})};
}
