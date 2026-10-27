/* ---------- Jagdzeiten (Tableau synoptique de l'ouverture de la chasse 2026/2027) ---------- */
var JZ_YEAR='2026/27';
var JZ=[
 {id:'chien',name:'Jagd mit Laufhunden (chien courant)',per:[['10-17','01-31']],fn:[]},
 {id:'hirsch',name:'Rotwild · Hirsch mit Geweih',per:[['08-01','10-16']],fn:[3,4]},
 {id:'spiesser',name:'Rotwild · Spießer (unverzweigt)',per:[['05-01','01-31']],fn:[3,4]},
 {id:'kahl',name:'Rotwild · Alttier, Schmaltier, Kalb',per:[['08-01','01-31']],fn:[3,4]},
 {id:'sau',name:'Schwarzwild',per:[['01-01','12-31']],fn:[2]},
 {id:'muffel',name:'Muffelwild',per:[['01-01','12-31']],fn:[3]},
 {id:'dam',name:'Damwild',per:[['01-01','12-31']],fn:[3]},
 {id:'bock',name:'Rehwild · Bock',per:[['04-01','01-31']],fn:[4]},
 {id:'schmal',name:'Rehwild · Schmalreh (Vorjahr geboren)',per:[['05-01','01-31']],fn:[4]},
 {id:'ricke',name:'Rehwild · Ricke und Kitz',per:[['09-15','01-31']],fn:[4]},
 {id:'hase',name:'Feldhase',per:[['10-01','12-20']],fn:[]},
 {id:'fasan',name:'Fasan',per:[['10-01','12-20']],fn:[]},
 {id:'ente',name:'Stockente',per:[['09-15','01-31']],fn:[]},
 {id:'kanin',name:'Wildkaninchen',per:[['06-01','02-29']],fn:[]},
 {id:'taubew',name:'Ringeltaube (im Wald)',per:[['09-15','01-31']],fn:[]},
 {id:'taubef',name:'Ringeltaube (im Feld)',per:[['08-01','01-31']],fn:[]},
 {id:'waschb',name:'Waschbär',per:[['01-01','12-31']],fn:[]},
 {id:'mhund',name:'Marderhund',per:[['01-01','12-31']],fn:[3]},
 {id:'bisam',name:'Bisamratte',per:[['01-01','12-31']],fn:[]},
 {id:'nerz',name:'Amerikanischer Nerz',per:[['01-01','12-31']],fn:[3]},
 {id:'nutria',name:'Nutria',per:[['01-01','12-31']],fn:[3]}
];
var JZ_FN={
 1:'Die Jagd ist von einer Stunde nach Sonnenuntergang bis eine Stunde vor Sonnenaufgang verboten.',
 2:'Schwarzwild in der Feldflur, nur in Maisfeldern: Der Zeitraum beginnt am 1. August. Jäger dürfen aber im angrenzenden Wald angestellt sein.',
 3:'Jeder Abschuss von Hirsch, Alttier, Kalb, Damwild, Muffelwild, Marderhund, Nutria und Nerz muss innerhalb von 12 Stunden der Naturverwaltung (ANF) gemeldet werden: Tel. 621 280 000 oder gibier@anf.etat.lu.',
 4:'Außerhalb des 17.10.2026 bis 31.1.2027 sind nur Pirsch („à l’approche“) und Ansitz („à l’affût“) erlaubt.'
};
var JZ_MON=['A','M','J','J','A','S','O','N','D','J','F','M'],JZ_MN=['Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez','Jan','Feb','Mär'];
var JZ_GROUPS=[['Rotwild',['hirsch','spiesser','kahl']],['Rehwild',['bock','schmal','ricke']],['Schwarz-, Dam- und Muffelwild',['sau','dam','muffel']],['Niederwild und Federwild',['hase','fasan','ente','kanin','taubew','taubef']],['Neozoen und Sonstiges',['waschb','mhund','bisam','nerz','nutria','chien']]];
function jzSel(){var s=D.settings.jzSel;return Array.isArray(s)?s:JZ.map(function(e){return e.id})}
function jzShown(){var s=jzSel();return JZ.filter(function(e){return s.indexOf(e.id)>-1})}
function jzById(id){return JZ.filter(function(e){return e.id===id})[0]}
function jzOpen(e,date){var md=String(date).slice(5,10);return e.per.some(function(p){return p[0]<=p[1]?md>=p[0]&&md<=p[1]:md>=p[0]||md<=p[1]})}
function jzDate(s){return new Date(s+'T12:00')}
function jzIso(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function jzShort(iso){return jzDate(iso).toLocaleDateString('de-LU',{day:'numeric',month:'numeric'})}
/* Zustand an einem Tag und das nächste Datum, an dem er wechselt */
function jzStatus(e,date){
  var o=jzOpen(e,date),d=jzDate(date),i;
  for(i=1;i<=366;i++){var n=new Date(d.getTime()+i*864e5);if(jzOpen(e,jzIso(n))!==o)return {open:o,change:jzIso(new Date(n.getTime()-(o?864e5:0))),always:false}}
  return {open:o,change:null,always:true};
}
function jzPeriods(e){return e.per[0][0]==='01-01'&&e.per[0][1]==='12-31'?'ganzjährig':e.per.map(function(p){return p[0].slice(3)+'.'+p[0].slice(0,2)+'.–'+p[1].slice(3)+'.'+p[1].slice(0,2)+'.'}).join(', ')}
/* Abschuss → passende Zeile(n) der Tabelle */
function jzIdsFor(k){
  var sp=k.species,m=k.sex==='m',w=k.sex==='w',j=k.age==='juv',u=k.age==='ueb';
  if(sp==='Schwarzwild')return ['sau'];if(sp==='Damwild')return ['dam'];if(sp==='Muffelwild')return ['muffel'];if(sp==='Waschbär')return ['waschb'];if(sp==='Marderhund')return ['mhund'];
  if(sp==='Rehwild'){if(j)return ['ricke'];if(m)return ['bock'];if(w)return u?['schmal']:['ricke'];return ['bock','schmal','ricke']}
  if(sp==='Rotwild'){if(j||w)return ['kahl'];if(m)return u?['spiesser']:k.age==='ad'?['hirsch']:['hirsch','spiesser'];return ['hirsch','spiesser','kahl']}
  return [];
}
function jzKillCheck(k){
  var ids=jzIdsFor(k);if(!ids.length)return null;
  var date=String(k.tsl||k.ts||'').slice(0,10);if(date.length<10)return null;
  var es=ids.map(jzById),op=es.filter(function(e){return jzOpen(e,date)}),dt=jzDate(date).toLocaleDateString('de-LU'),out=date<'2026-04-01'||date>'2027-03-31'?' (nach Tabelle '+JZ_YEAR+', andere Jahre können abweichen)':'';
  if(!op.length){var e=es[0];return {level:'closed',msg:'Schonzeit: '+e.name+' ist am '+dt+' laut Jagdzeitentabelle geschlossen. Jagdzeit: '+jzPeriods(e)+out}}
  var msg=[],e1=op[0];
  if(op.some(function(e){return e.fn.indexOf(3)>-1}))msg.push('Meldepflicht: Abschuss innerhalb von 12 Stunden an die Naturverwaltung melden (621 280 000 oder gibier@anf.etat.lu).');
  if(op.some(function(e){return e.fn.indexOf(4)>-1})&&(date<'2026-10-17'||date>'2027-01-31'))msg.push('Zu dieser Zeit nur Pirsch oder Ansitz erlaubt.');
  return {level:msg.length?'info':'ok',msg:msg.join(' ')+out}
}
function seasonCheck(){
  var f=S.form,b=$('#f-season');if(!f||f.kind!=='kill'||!b)return;
  var r=jzKillCheck(f.d);
  if(!r||r.level==='ok'||!r.msg){b.hidden=true;b.textContent='';return}
  b.hidden=false;b.textContent=r.msg;b.style.background=r.level==='closed'?'':'var(--surface-2,transparent)';b.style.color=r.level==='closed'?'':'var(--ink-2)';
}
/* ----- Karte in der Statistik ----- */
function jzCardHtml(){
  var today=toLocalInput().slice(0,10),op=[],cl=[];
  jzShown().forEach(function(e){var s=jzStatus(e,today);(s.open?op:cl).push({e:e,s:s})});
  function item(x){var t=x.s.always?'':x.s.open?' · bis '+jzShort(x.s.change):' · ab '+jzShort(x.s.change);return '<span style="white-space:nowrap">'+esc(x.e.name.replace(/^Rotwild · |^Rehwild · /,function(m){return m}))+'<small class="hint">'+t+'</small></span>'}
  return '<div class="card"><h2 class="sec">Jagdzeiten heute</h2>'+
    (op.length+cl.length?'':'<p class="hint">Keine Wildart ausgewählt.</p>')+'<p class="lbl" style="margin:0 0 4px;color:#4a7a3a">Offen ('+op.length+')</p><div style="display:flex;flex-wrap:wrap;gap:4px 14px;margin-bottom:10px">'+op.map(item).join('')+'</div>'+
    '<p class="lbl" style="margin:0 0 4px;color:#b04a48">Geschlossen ('+cl.length+')</p><div style="display:flex;flex-wrap:wrap;gap:4px 14px">'+cl.map(item).join('')+'</div>'+
    '<div class="btnrow" style="margin-top:12px"><button class="btn" id="jzAll" type="button">Ganze Tabelle '+JZ_YEAR+'</button><button class="btn" id="jzPick" type="button">Auswahl ('+jzShown().length+'/'+JZ.length+')</button></div></div>';
}
var JZ_MDAYS=[[2026,3],[2026,4],[2026,5],[2026,6],[2026,7],[2026,8],[2026,9],[2026,10],[2026,11],[2027,0],[2027,1],[2027,2]];
function jzCell(e,mi){
  var y=JZ_MDAYS[mi][0],m=JZ_MDAYS[mi][1],n=new Date(y,m+1,0).getDate(),st=[],i,prev=null,segs=[];
  for(i=1;i<=n;i++){var o=jzOpen(e,y+'-'+String(m+1).padStart(2,'0')+'-'+String(i).padStart(2,'0'));if(o!==prev){segs.push([o,i-1]);prev=o}}
  var G='#c4d79b',R='#da9694';
  if(segs.length===1)return segs[0][0]?G:R;
  return 'linear-gradient(90deg,'+segs.map(function(s,k){var a=Math.round(s[1]/n*100),b=k+1<segs.length?Math.round(segs[k+1][1]/n*100):100;return (s[0]?G:R)+' '+a+'% '+b+'%'}).join(',')+')';
}
function jzSheet(){
  var tm=new Date(),mi=JZ_MDAYS.findIndex(function(x){return x[0]===tm.getFullYear()&&x[1]===tm.getMonth()});
  openSheet('<h2>Jagdzeiten '+JZ_YEAR+'</h2><p class="hint" style="margin-bottom:10px">Grün: Jagd erlaubt, rot: verboten. Anfangs- und Enddaten gehören zur Jagdzeit. Nicht aufgeführte Arten sind das ganze Jahr geschlossen.</p>'+
    '<div style="overflow-x:auto"><div style="min-width:340px"><div style="display:flex;align-items:center;gap:0"><span style="flex:0 0 128px"></span>'+JZ_MON.map(function(c,i){return '<b style="flex:1;text-align:center;font-size:11px;'+(i===mi?'color:var(--accent)':'')+'" title="'+JZ_MN[i]+'">'+c+'</b>'}).join('')+'</div>'+
    jzShown().map(function(e){return '<div style="display:flex;align-items:stretch;border-top:1px solid var(--line,#0002);min-height:28px"><span style="flex:0 0 128px;font-size:11.5px;line-height:1.15;padding:3px 4px 3px 0;align-self:center">'+esc(e.name)+(e.fn.length?'<sup>'+e.fn.join(',')+'</sup>':'')+'</span>'+
      JZ_MON.map(function(c,i){return '<span style="flex:1;display:flex;padding:2px 1px"><i style="flex:1;border-radius:3px;background:'+jzCell(e,i)+(i===mi?';outline:2px solid var(--accent)':'')+'"></i></span>'}).join('')+'</div>'}).join('')+'</div></div>'+
    '<div style="margin-top:12px;display:grid;gap:6px">'+[1,2,3,4].map(function(n){return '<p class="hint"><sup>'+n+'</sup> '+JZ_FN[n]+'</p>'}).join('')+'</div>'+
    '<p class="hint" style="margin-top:10px">Quelle: Tableau synoptique de l’ouverture de la chasse 2026/2027 (Ministère de l’Environnement, du Climat et de la Biodiversité). Prüfe im Zweifel die amtliche Fassung.</p>'+
    '<div class="btnrow" style="margin-top:12px"><button class="btn" id="jz-pick" type="button">Auswahl ändern</button><button class="btn" id="jz-close" type="button">Schließen</button></div>');
  $('#jz-close').onclick=closeSheet;$('#jz-pick').onclick=function(){jzPickSheet(true)};
}
function jzBind(){var b=$('#jzAll');if(b)b.onclick=jzSheet;var p=$('#jzPick');if(p)p.onclick=function(){jzPickSheet(false)}}
function jzPickSheet(back){
  var sel=jzSel().slice();
  openSheet('<h2>Jagdzeiten auswählen</h2><p class="hint" style="margin-bottom:8px">Wähle die Wildarten, die in der Übersicht und in der Tabelle erscheinen sollen. Die Schonzeit-Warnung beim Abschuss gilt weiterhin für alle.</p>'+
    '<div class="btnrow" style="margin-bottom:8px"><button class="btn sm" id="jp-all" type="button">Alle</button><button class="btn sm" id="jp-sch" type="button">Schalenwild</button><button class="btn sm" id="jp-non" type="button">Keine</button></div><div id="jp-list"></div>'+
    '<div class="btnrow" style="margin-top:12px"><button class="btn primary" id="jp-save" type="button" style="flex:2">Übernehmen</button><button class="btn" id="jp-cancel" type="button" style="flex:1">Abbrechen</button></div>');
  function paint(){$('#jp-list').innerHTML=JZ_GROUPS.map(function(g){return '<p class="lbl" style="margin:10px 0 4px">'+esc(g[0])+'</p><div class="rows">'+g[1].map(jzById).map(function(e){return '<label class="row" style="cursor:pointer;gap:10px;align-items:center"><input type="checkbox" data-j="'+e.id+'"'+(sel.indexOf(e.id)>-1?' checked':'')+' style="width:22px;height:22px;flex:none"><span class="rt"><b style="font-weight:500">'+esc(e.name)+'</b></span></label>'}).join('')+'</div>'}).join('');
    $$('#jp-list [data-j]').forEach(function(c){c.onchange=function(){var k=sel.indexOf(c.dataset.j);if(c.checked&&k<0)sel.push(c.dataset.j);else if(!c.checked&&k>-1)sel.splice(k,1)}})}
  paint();
  $('#jp-all').onclick=function(){sel=JZ.map(function(e){return e.id});paint()};
  $('#jp-sch').onclick=function(){sel=['hirsch','spiesser','kahl','bock','schmal','ricke','sau','dam','muffel'];paint()};
  $('#jp-non').onclick=function(){sel=[];paint()};
  $('#jp-cancel').onclick=function(){closeSheet();if(back)jzSheet()};
  $('#jp-save').onclick=function(){guard(Store.setting({jzSel:sel})).then(function(){closeSheet();if(S.tab==='stats')renderStats();if(back)jzSheet()},function(){})};
}
