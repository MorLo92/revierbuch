/* ---------- Android-App (Capacitor): Dateien speichern, Zurück-Taste ---------- */
function isNative(){try{return !!(window.Capacitor&&Capacitor.isNativePlatform&&Capacitor.isNativePlatform())}catch(e){return false}}
function nPlug(n){try{if(!window.Capacitor)return null;var p=Capacitor.Plugins&&Capacitor.Plugins[n];if(!p&&Capacitor.registerPlugin&&Capacitor.PluginHeaders&&[].some.call(Capacitor.PluginHeaders,function(h){return h.name===n}))p=Capacitor.registerPlugin(n);return p||null}catch(e){return null}}
function nativeSave(o){
  var fs=nPlug('Filesystem');if(!isNative()||!fs)return null;
  function w(dir){return fs.writeFile({path:'Revierbuch/'+o.filename,data:o.data,directory:dir,encoding:'utf8',recursive:true})}
  return w('DOCUMENTS').then(function(r){r.docs=true;return r},function(){return w('CACHE')}).then(function(r){
    var sh=nPlug('Share');
    setTimeout(function(){toast(r.docs?'Gespeichert unter Dokumente/Revierbuch':'Datei bereit: im Menü „Speichern“ oder „Senden“ wählen')},60);
    if(sh&&r&&r.uri)return sh.share({title:o.filename,url:r.uri,dialogTitle:'Datei speichern oder senden'}).catch(function(){}).then(function(){return{status:'saved'}});
    return{status:'saved'};
  },function(e){return Promise.reject({code:'unavailable',message:String(e&&e.message||e)})});
}
function backPress(){
  var v=document.getElementById('phv');if(v){v.remove();return}
  var g=$('#guide');if(g&&!g.hidden&&S.guide){stopGuide();return}
  var sh=$('#sheet');if(sh&&!sh.hidden){closeSheet();return}
  if(S.tab!=='start'){switchTab('start');return}
  var a=nPlug('App');if(a&&a.exitApp)a.exitApp();
}
(function(){
  var a=nPlug('App');if(!isNative()||!a||!a.addListener)return;
  try{a.addListener('backButton',function(){try{backPress()}catch(e){}})}catch(e){}
})();

/* Track im Hintergrund: Vordergrunddienst mit Benachrichtigung */
var bgId=null,bgWant=false;
function trkBg(on){
  var g=nPlug('BackgroundGeolocation');if(!isNative()||!g)return;
  bgWant=on;
  if(!on){if(bgId!=null){var i=bgId;bgId=null;try{g.removeWatcher({id:i})}catch(e){}}return}
  if(bgId!=null)return;
  var ln=nPlug('LocalNotifications');
  Promise.resolve(ln&&ln.requestPermissions?ln.requestPermissions().catch(function(){}):0).then(function(){
    return g.addWatcher({backgroundTitle:'Aufzeichnung läuft',backgroundMessage:'Revierbuch zeichnet deinen Track auf.',requestPermissions:true,stale:false,distanceFilter:5},function(l,e){
      if(e){if(e.code==='NOT_AUTHORIZED')toast('Standort im Hintergrund nicht erlaubt: In den Android-Einstellungen für Revierbuch „Immer“ oder „Beim Verwenden der App“ wählen.');return}
      if(!l||!S.rec)return;
      S.gps={lat:l.latitude,lon:l.longitude,acc:l.accuracy,t:l.time||Date.now()};S.gpsState='on';trkPoint();
    })}).then(function(id){if(bgWant&&bgId==null)bgId=id;else if(!bgWant){try{g.removeWatcher({id:id})}catch(e){}}}).catch(function(){});
}
