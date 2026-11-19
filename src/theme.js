/* ---------- Darstellung: Automatisch, Hell, Dunkel ---------- */
function themeNow(){try{var t=localStorage.getItem('revierbuch.theme');return t==='light'||t==='dark'?t:'auto'}catch(e){return 'auto'}}
function themeCardHtml(){
  var t=themeNow();
  return '<div class="card"><h2 class="sec">Darstellung</h2><p class="hint">Automatisch folgt der Einstellung deines Handys.</p><div class="seg" data-theme-seg>'+
    [['auto','Automatisch'],['light','Hell'],['dark','Dunkel']].map(function(o){return '<button type="button" data-th="'+o[0]+'" aria-pressed="'+(t===o[0])+'">'+o[1]+'</button>'}).join('')+'</div></div>';
}
document.addEventListener('click',function(e){
  var b=e.target.closest&&e.target.closest('button[data-th]');if(!b)return;
  try{if(b.dataset.th==='auto')localStorage.removeItem('revierbuch.theme');else localStorage.setItem('revierbuch.theme',b.dataset.th)}catch(x){}
  location.reload();
});
