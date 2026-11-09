/* ---------- Willkommens-Einführung ---------- */
var WEL_KEY='revierbuch.welcome';
var WEL_STEPS=[
 ['start','Willkommen im Revierbuch','Dein Jagdbuch für die Hosentasche: Karte, Abschüsse, Sichtungen, Ansitze und Statistik, auch ohne Netz im Wald. Die Einführung dauert eine Minute. Die Sprache stellst du unter „Daten“ ein.'],
 ['map','Karte und Lose','Alle Jagdlose Luxemburgs sind auf der Karte. Tippe auf dein Los, um es als dein Los zu markieren, oder gib die Nummer unter „Daten“ ein. Rechts findest du Zoom, deinen Standort und die Legende zum Ein- und Ausblenden.'],
 ['list','Eintragen','Mit dem Knopf „Eintragen“ legst du Abschüsse, Wildsichtungen, Kanzeln und andere Einrichtungen, Flächen und Tracks an. Tipp: Auf der Karte lange drücken, um direkt an dieser Stelle etwas einzutragen.'],
 ['hunt','Abschüsse und Wildmarken','Beim Abschuss trägst du Wildart, Geschlecht, Gewicht und Wildmarke ein. Die App prüft die Jagdzeiten, warnt vor Schonzeiten und erinnert an die Meldung bei der Naturverwaltung. Unklare Treffer legen eine offene Nachsuche an.'],
 ['hunt','Ansitze und Drückjagden','Reserviere Kanzeln für einen Ansitz, damit sich niemand in die Quere kommt. Für eine Drückjagd legst du Posten an, wählst sie aus und trägst die Schützen ein. Unter „Jagd“ siehst du alles auf einen Blick.'],
 ['chart','Statistik und Abschussplan','Die Statistik zeigt Abschüsse nach Wildart, Kanzel und Monat. Mit dem Plan de tir deiner Lose siehst du, wie weit du bist. Wildschäden erfasst du mit Fläche, Preis pro ar und Jahresvergleich.'],
 ['groups','Gruppen und Konto','Ein Konto ist freiwillig. Damit legst du Gruppen für dein Los an, lädst Mitjäger per Code ein und vergibst Rollen. Ohne Konto bleibt alles nur auf deinem Gerät, erstelle dann regelmäßig eine Sicherung unter „Daten“.'],
 ['data','Als App installieren','iPhone: In Safari auf „Teilen“ tippen, dann „Zum Home-Bildschirm“. Android: In Chrome das Menü öffnen, dann „App installieren“. Die Reiter unten kannst du lang drücken, um sie zu verschieben oder auszublenden.']
];
function welView(i){
  var s=WEL_STEPS[i],n=WEL_STEPS.length,last=i===n-1;
  var dots='';for(var k=0;k<n;k++)dots+='<i style="width:8px;height:8px;border-radius:50%;background:'+(k===i?'var(--accent)':'var(--line)')+'"></i>';
  openSheet('<div style="text-align:center;padding:8px 4px 0"><div style="width:72px;height:72px;margin:0 auto 12px;border-radius:50%;background:var(--bg);display:grid;place-items:center;color:var(--accent)"><svg viewBox="0 0 24 24" style="width:38px;height:38px;stroke:currentColor;fill:none;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round">'+(ICON[s[0]]||'')+'</svg></div>'+
   '<h2 style="margin:0 0 8px">'+esc(s[1])+'</h2><p style="margin:0 0 14px;line-height:1.5;text-align:left">'+esc(s[2])+'</p>'+
   '<div style="display:flex;gap:6px;justify-content:center;margin:6px 0 14px" aria-hidden="true">'+dots+'</div></div>'+
   '<div class="btnrow">'+(i>0?'<button class="btn" type="button" data-wel="'+(i-1)+'">Zurück</button>':'<button class="btn" type="button" data-wel="x">Überspringen</button>')+
   '<button class="btn primary" type="button" data-wel="'+(last?'x':i+1)+'" style="flex:2">'+(last?'Los geht’s':'Weiter')+'</button></div>');
}
function welShow(){var t=$('#toast');if(t)t.hidden=true;welView(0)}
function welMaybe(){
  var seen=null;try{seen=localStorage.getItem(WEL_KEY)}catch(e){}
  if(seen)return;
  try{localStorage.setItem(WEL_KEY,'1')}catch(e){}
  if(S.placing||S.guide)return;
  welShow();
}
function welCardHtml(){
  return '<div class="card"><h2 class="sec">Einführung</h2><p class="hint">Eine kurze Tour durch die wichtigsten Funktionen.</p><div class="btnrow"><button class="btn" type="button" data-wel="start">Einführung ansehen</button></div></div>';
}
document.addEventListener('click',function(e){
  var b=e.target.closest('[data-wel]');if(!b)return;
  var v=b.dataset.wel;
  if(v==='start')welShow();else if(v==='x')closeSheet();else welView(parseInt(v,10));
});
setTimeout(welMaybe,900);
