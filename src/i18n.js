/* ---------- Sprachen: Laufzeit-Übersetzer (Daten bleiben intern deutsch) ---------- */
var I18T=(LANG==='de')?null:(I18N[LANG]||null);
function langCardHtml(){
  var o=LANGS.map(function(l){return '<option value="'+l[0]+'"'+(l[0]===LANG?' selected':'')+'>'+l[1]+'</option>'}).join('');
  return '<div class="card"><h2 class="sec">Sprache</h2><p class="hint">Sprache der Oberfläche. Eingetragene Daten und Namen bleiben unverändert.</p><label class="fld" data-noi18n><select id="langSel" aria-label="Sprache" data-noi18n>'+o+'</select></label></div>';
}
document.addEventListener('change',function(e){
  if(e.target&&e.target.id==='langSel'){try{localStorage.setItem('revierbuch.lang',e.target.value)}catch(x){}location.reload()}
});
var I18_TAIL=/[\s\d.,:;()%€+\-–·\/±×]/;
var I18P=null;
function i18Pats(){
  I18P=[];Object.keys(I18T).forEach(function(k){
    if(k.indexOf('{n}')<0)return;
    var re=k.replace(/[.*+?^$()|[\]\\]/g,'\\$&').split('{n}').join('(.+?)');
    I18P.push([new RegExp('^'+re+'$'),I18T[k]]);
  });
}
function trCore(c){
  if(I18T[c]!=null)return I18T[c];
  if(!I18P)i18Pats();
  for(var pi=0;pi<I18P.length;pi++){var pm0=c.match(I18P[pi][0]);if(pm0){var t=I18P[pi][1],q=1;return t.replace(/\{n\}/g,function(){return pm0[q++]})}}
  var i=c.length,j;
  while(i>0&&I18_TAIL.test(c.charAt(i-1))){i--;
    var stem=c.slice(0,i);
    if(I18T[stem]!=null)return I18T[stem]+c.slice(i);
    var st2=stem.replace(/\s+$/,'');if(st2!==stem&&I18T[st2]!=null)return I18T[st2]+c.slice(st2.length);
  }
  var stem0=c.slice(0,i);if(i<c.length&&I18T[stem0]!=null)return I18T[stem0]+c.slice(i);
  var pm=c.match(/^([\d.,+×\-–\s]+)(\D[\s\S]*)$/);
  if(pm){var r=trCore(pm[2]);if(r!=null)return pm[1]+r}
  if(c.indexOf(' · ')>0){var parts=c.split(' · '),any=false,out=parts.map(function(p){var r=trCore(p);if(r!=null){any=true;return r}return p});if(any)return out.join(' · ')}
  if(c.indexOf(', ')>0){var p2=c.split(', '),a2=false,o2=p2.map(function(p){var r=I18T[p];if(r!=null){a2=true;return r}return p});if(a2)return o2.join(', ')}
  var ci=c.indexOf(': ');
  if(ci>0){var h=I18T[c.slice(0,ci+1)];if(h!=null){var rest=c.slice(ci+2),rr=trCore(rest);return h+' '+(rr!=null?rr:rest)}}
  return null;
}
function trStr(s){
  if(!I18T||!s)return null;
  var m=s.match(/^(\s*)([\s\S]*?)(\s*)$/);if(!m[2])return null;
  var r=trCore(m[2]);return r==null?null:m[1]+r+m[3];
}
var I18_ATTR=['placeholder','title','aria-label','alt','label'];
var I18_DONE=new WeakMap();
function i18Skip(n){
  for(var e=n.nodeType===1?n:n.parentNode;e&&e.nodeType===1;e=e.parentNode){
    var t=e.tagName;if(t==='SCRIPT'||t==='STYLE'||t==='TEXTAREA'||t==='CANVAS'||t==='CODE'||e.hasAttribute('data-noi18n')||e.isContentEditable)return true;
  }
  return false;
}
function i18Text(n){
  if(I18_DONE.get(n)===n.data)return;
  var r=trStr(n.data);
  if(r!=null&&r!==n.data){n.data=r;I18_DONE.set(n,r)}
}
function i18Attrs(el){
  if(el.nodeType!==1)return;
  I18_ATTR.forEach(function(a){
    if(!el.hasAttribute(a))return;var v=el.getAttribute(a);if(I18_DONE.get(el)&&I18_DONE.get(el)[a]===v)return;
    var r=trStr(v);if(r!=null&&r!==v){el.setAttribute(a,r);var d=I18_DONE.get(el)||{};d[a]=r;I18_DONE.set(el,d)}
  });
  if(el.tagName==='INPUT'&&(el.type==='button'||el.type==='submit')){var r2=trStr(el.value);if(r2!=null)el.value=r2}
}
function i18Walk(root){
  if(!I18T||!root)return;
  if(root.nodeType===3){if(!i18Skip(root))i18Text(root);return}
  if(root.nodeType!==1||i18Skip(root))return;
  i18Attrs(root);
  for(var c=root.firstChild;c;c=c.nextSibling){
    if(c.nodeType===3){i18Text(c)}
    else if(c.nodeType===1&&!i18Skip(c))i18Walk(c);
  }
}
if(I18T){
  document.documentElement.lang=LANG;
  var oa=window.alert,oc=window.confirm,op=window.prompt;
  window.alert=function(m){return oa.call(window,trStr(String(m))||m)};
  window.confirm=function(m){return oc.call(window,trStr(String(m))||m)};
  window.prompt=function(m,d){return op.call(window,trStr(String(m))||m,d)};
  var i18mo=new MutationObserver(function(ms){
    ms.forEach(function(m){
      if(m.type==='characterData'){if(!i18Skip(m.target))i18Text(m.target)}
      else if(m.type==='attributes'){if(!i18Skip(m.target))i18Attrs(m.target)}
      else m.addedNodes.forEach(function(n){i18Walk(n)});
    });
  });
  i18Walk(document.body);document.title=trStr(document.title)||document.title;
  i18mo.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:I18_ATTR});
}
