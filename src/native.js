/* ---------- Android-App (Capacitor): Dateien speichern, Zurück-Taste ---------- */
function isNative(){try{return !!(window.Capacitor&&Capacitor.isNativePlatform&&Capacitor.isNativePlatform())}catch(e){return false}}
function nPlug(n){try{return window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins[n]||null}catch(e){return null}}
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
