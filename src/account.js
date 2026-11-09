/* ---------- Konto und Gruppen (Supabase, ohne Zusatzbibliothek) ---------- */
var SB={url:'https://vwcfcuwnevbgqeggkfgo.supabase.co',key:'sb_publishable_0ZAiISZ7mC8T6krAQwYi5g_FRbvKhF5'};
var ACC={sess:null,name:'',groups:null,cur:null};
var PRIV_VER='1',PRIV_CONTACT={name:'',mail:''};
var ACC_CAT=[['installations','Einrichtungen'],['reservations','Reservierungen'],['kills','Abschüsse'],['sightings','Sichtungen'],['hunts','Drückjagden'],['plan','Abschussplan'],['parcels','Flächen'],['damages','Wildschäden'],['tracks','Tracks'],['photos','Fotos']];
var ACC_APPROX=['kills','sightings'];
var ACC_LVL={none:'Nichts',approx:'Ungefähr',read:'Lesen',write:'Schreiben'};
var ACC_GAST={installations:'read',sightings:'approx',kills:'approx',hunts:'read'};

(function(){try{var j=JSON.parse(localStorage.getItem('revierbuch.sess')||'null');if(j&&j.refresh)ACC.sess=j;ACC.name=localStorage.getItem('revierbuch.accname')||''}catch(e){}})();
function accSaveSess(){try{if(ACC.sess)localStorage.setItem('revierbuch.sess',JSON.stringify(ACC.sess));else{localStorage.removeItem('revierbuch.sess');localStorage.removeItem('revierbuch.accname')}}catch(e){}}
function accSetSess(r){ACC.sess={access:r.access_token,refresh:r.refresh_token,exp:Date.now()+(r.expires_in||3600)*1000-30000,uid:r.user&&r.user.id,email:r.user&&r.user.email};accSaveSess()}
function accMsg(e){
  var m=(e&&e.message)||'';
  if(e instanceof TypeError||/Failed to fetch|NetworkError|Load failed/i.test(m))return 'Keine Verbindung. Bitte später noch einmal versuchen.';
  if(/Invalid login credentials/i.test(m))return 'E-Mail oder Passwort stimmt nicht.';
  if(/already registered|already been registered/i.test(m))return 'Diese E-Mail ist bereits registriert.';
  if(/not confirmed/i.test(m))return 'Bitte zuerst den Link in der Bestätigungs-Mail öffnen.';
  if(/rate limit|too many/i.test(m))return 'Zu viele Versuche. Bitte in einigen Minuten noch einmal.';
  if(/at least|weak/i.test(m))return 'Das Passwort ist zu schwach (mindestens 8 Zeichen).';
  if(/valid email|invalid format/i.test(m))return 'Bitte eine gültige E-Mail-Adresse eingeben.';
  return m||'Unbekannter Fehler.';
}
function sbRaw(path,opt,token){
  opt=opt||{};var h={apikey:SB.key,'Content-Type':'application/json'};
  if(token)h.Authorization='Bearer '+token;
  Object.keys(opt.headers||{}).forEach(function(k){h[k]=opt.headers[k]});
  return fetch(SB.url+path,{method:opt.method||'GET',headers:h,body:opt.body!=null?JSON.stringify(opt.body):undefined}).then(function(r){
    return r.text().then(function(t){var j=null;try{j=t?JSON.parse(t):null}catch(_){}
      if(!r.ok){var er=new Error((j&&(j.message||j.msg||j.error_description||j.error))||('Fehler '+r.status));er.status=r.status;er.code=j&&j.code;throw er}
      return j})});
}
function accFresh(){
  if(!ACC.sess)return Promise.reject(new Error('Nicht angemeldet'));
  if(ACC.sess.exp>Date.now())return Promise.resolve();
  return sbRaw('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:ACC.sess.refresh}}).then(accSetSess,function(e){
    if(e.status>=400&&e.status<500){ACC.sess=null;accSaveSess();renderHeader()}
    throw e});
}
function sbApi(path,opt){return accFresh().then(function(){return sbRaw(path,opt,ACC.sess.access)})}
function sbq(path){return sbApi('/rest/v1/'+path)}
function sbRpc(fn,args){return sbApi('/rest/v1/rpc/'+fn,{method:'POST',body:args||{}})}
function accUid(){return ACC.sess&&ACC.sess.uid}
function inList(a){return 'in.('+a.map(encodeURIComponent).join(',')+')'}

/* Status oben und Karte in "Daten" */
function accPill(st){
  if(ACC.sess&&S.ready){st.className='pill ok';st.lastChild.textContent=ACC.name||'Angemeldet';st.title='Angemeldet als '+ACC.sess.email+'. Tippen für Konto und Gruppen.'}
  else if(S.ready)st.title='Die Daten bleiben nur in diesem Browser. Tippen für Anmelden und Gruppen.';
}
function accCardHtml(){
  return '<div class="card"><h2 class="sec">Konto und Gruppen</h2><p class="hint">'+(ACC.sess?'Angemeldet als '+esc(ACC.sess.email)+'.':'Freiwillig: Mit einem Konto kannst du Informationen mit anderen Jägern deines Loses teilen. Ohne Konto bleibt alles wie bisher auf diesem Gerät.')+'</p><div class="btnrow"><button class="btn primary" type="button" data-accopen>'+(ACC.sess?'Konto und Gruppen öffnen':'Anmelden oder registrieren')+'</button></div></div>';
}
document.addEventListener('click',function(e){if(e.target.closest('[data-accopen]'))accSheet()});

/* ---------- Ansichten ---------- */
function accShell(title,body){openSheet('<h2>'+esc(title)+'</h2>'+body)}
function accLoading(t){accShell(t||'Konto','<p class="hint">Lade …</p>')}
function accErrView(e,back){
  accShell('Fehler','<p class="warnbox">'+esc(accMsg(e))+'</p><div class="btnrow"><button class="btn primary" type="button" data-acc="'+(back||'home')+'">Noch einmal</button><button class="btn" type="button" data-acc="close">Schließen</button></div>');
}
function accSheet(){
  if(!ACC.sess){accAuthView('login');return}
  accLoading();
  accLoadAll().then(function(ok){if(ok)accHome()},function(e){accErrView(e,'home')});
}
function accAuthView(mode,msg,mail){
  var reg=mode==='reg';
  accShell(reg?'Registrieren':'Anmelden',
   '<p class="hint">Ein Konto ist freiwillig. Ohne Konto bleibt dein Revierbuch wie bisher nur auf diesem Gerät. Mit Konto kannst du später Einträge mit anderen Jägern deines Loses teilen. Es wird nichts automatisch hochgeladen.</p>'+
   '<div class="seg" style="margin:8px 0 12px"><button type="button" data-acc="mode" data-v="login" aria-pressed="'+!reg+'">Anmelden</button><button type="button" data-acc="mode" data-v="reg" aria-pressed="'+reg+'">Registrieren</button></div>'+
   (reg?'<label class="field"><span class="lbl">Anzeigename (für andere Mitglieder sichtbar)</span><input type="text" id="ac-name" maxlength="60" autocomplete="nickname"></label>':'')+
   '<label class="field"><span class="lbl">E-Mail</span><input type="email" id="ac-mail" autocomplete="email" inputmode="email" autocapitalize="none" value="'+esc(mail||'')+'"></label>'+
   '<label class="field"><span class="lbl">Passwort'+(reg?' (mindestens 8 Zeichen)':'')+'</span><input type="password" id="ac-pw" autocomplete="'+(reg?'new':'current')+'-password"></label>'+
   '<p class="warnbox" id="ac-msg"'+(msg?'':' hidden')+'>'+esc(msg||'')+'</p>'+
   '<div class="btnrow"><button class="btn primary" type="button" data-acc="'+(reg?'signup':'login')+'" style="flex:2">'+(reg?'Konto erstellen':'Anmelden')+'</button><button class="btn" type="button" data-acc="close" style="flex:1">Abbrechen</button></div>'+
   (reg?'':'<div class="btnrow"><button class="btn sm" type="button" data-acc="forgot">Passwort vergessen?</button></div>'));
}
function accNote(t,bad){var n=$('#ac-msg');if(!n)return;n.hidden=!t;n.textContent=t||'';n.style.background=bad===false?'var(--bg)':''}

var PRIV_HTML=function(){
  var who=(PRIV_CONTACT.name||PRIV_CONTACT.mail)?esc(PRIV_CONTACT.name)+(PRIV_CONTACT.mail?', '+esc(PRIV_CONTACT.mail):''):'[Name und Kontakt-E-Mail der verantwortlichen Person – noch einzutragen]';
  return '<h3>1. Wer ist verantwortlich?</h3><p>'+who+'. Diese App ist ein privates Hilfsmittel zur Verwaltung von Jagdrevieren.</p>'+
  '<h3>2. Welche Daten werden verarbeitet?</h3><p>Nur wenn du ein Konto anlegst: E-Mail-Adresse, Anzeigename, Passwort (nur als Prüfwert gespeichert), Zugehörigkeit zu Gruppen und Rollen sowie deine Zustimmung mit Datum. Später zusätzlich die Einträge, die du bewusst mit einer Gruppe teilst (zum Beispiel Einrichtungen, Abschüsse, Sichtungen, jeweils mit Position, Zeit und Wildart).</p>'+
  '<h3>3. Was bleibt auf deinem Gerät?</h3><p>Alle Einträge, die du nicht teilst, bleiben ausschließlich in deinem Browser bzw. auf deinem Gerät. Ohne Konto werden keine Daten an einen Server gesendet.</p>'+
  '<h3>4. Wer kann was sehen?</h3><p>Geteilte Einträge sehen die Mitglieder der Gruppen, die das jeweilige Los verwalten, entsprechend ihrer Rolle. Die Rolle legt der Administrator der Gruppe fest. Mitglieder mit der Stufe „Ungefähr“ sehen Positionen nur auf etwa 100 Meter gerundet. Dein Anzeigename ist für Mitglieder deiner Gruppen sichtbar.</p>'+
  '<h3>5. Zweck und Rechtsgrundlage</h3><p>Zweck ist das Teilen von Revierinformationen innerhalb von Jagdgruppen. Rechtsgrundlage ist deine Einwilligung (Art. 6 Abs. 1 lit. a DSGVO), die du jederzeit widerrufen kannst.</p>'+
  '<h3>6. Speicherung und Dienstleister</h3><p>Die Daten werden bei Supabase gespeichert. Die Datenbank liegt in Frankfurt am Main (EU). Eine Weitergabe zu Werbezwecken findet nicht statt.</p>'+
  '<h3>7. Speicherdauer</h3><p>Deine Daten werden gespeichert, solange dein Konto besteht. Auf Wunsch werden Konto und zugehörige Daten gelöscht.</p>'+
  '<h3>8. Deine Rechte</h3><p>Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch. Wende dich dazu an die oben genannte Kontaktadresse. Du kannst dich außerdem bei der zuständigen Aufsichtsbehörde beschweren, in Luxemburg ist das die Commission nationale pour la protection des données (CNPD, cnpd.lu).</p>'+
  '<p class="hint">Fassung 1</p>';
};
function accPrivacy(){
  accShell('Datenschutzerklärung','<div class="privtxt" style="max-height:46vh;overflow:auto;border:1px solid var(--line);border-radius:10px;padding:4px 12px 8px;background:var(--bg);font-size:14px;line-height:1.45">'+PRIV_HTML()+'</div>'+
   '<label class="lgrow" style="margin-top:10px;min-height:44px;gap:10px"><input type="checkbox" id="ac-ok" style="width:22px;height:22px;flex:none"><span class="tx">Ich habe die Datenschutzerklärung gelesen und akzeptiere sie.</span></label>'+
   '<p class="warnbox" id="ac-msg" hidden></p>'+
   '<div class="btnrow"><button class="btn primary" type="button" data-acc="consent" style="flex:2">Akzeptieren</button><button class="btn" type="button" data-acc="logout" style="flex:1">Abmelden</button></div>');
}

function accLoadAll(){
  var uid=accUid();
  return Promise.all([sbq('profiles?select=display_name&id=eq.'+uid),sbq('consents?select=doc_version&doc_version=eq.'+PRIV_VER)]).then(function(r){
    ACC.name=(r[0][0]&&r[0][0].display_name)||'';try{localStorage.setItem('revierbuch.accname',ACC.name)}catch(_){}
    renderHeader();
    if(!r[1].length){accPrivacy();return false}
    return accLoadGroups().then(function(){return true});
  });
}
function accLoadGroups(){
  var uid=accUid();
  return sbq('group_members?select=group_id,is_admin,role_id&user_id=eq.'+uid).then(function(ms){
    if(!ms.length){ACC.groups=[];return}
    var ids=ms.map(function(m){return m.group_id});
    return Promise.all([sbq('groups?select=id,name&id='+inList(ids)),sbq('group_roles?select=id,group_id,name&group_id='+inList(ids)),sbq('group_lots?select=group_id,lot_id,approved&group_id='+inList(ids))]).then(function(r){
      ACC.groups=ms.map(function(m){
        var g=r[0].filter(function(x){return x.id===m.group_id})[0]||{name:'?'},ro=r[1].filter(function(x){return x.id===m.role_id})[0];
        return {id:m.group_id,name:g.name,admin:m.is_admin,role:m.is_admin?'Administrator':(ro?ro.name:'ohne Rolle'),lots:r[2].filter(function(x){return x.group_id===m.group_id})};
      }).sort(function(a,b){return a.name.localeCompare(b.name,'de')});
    });
  });
}
function lotSort(a,b){return (parseInt(a,10)||0)-(parseInt(b,10)||0)||String(a).localeCompare(String(b))}
function lotChip(l){return '<span class="pill'+(l.approved?'':' busy')+'" title="'+(l.approved?'aktiv':'wartet auf Freigabe')+'"><i></i><span>Los '+esc(l.lot_id)+(l.approved?'':' · wartet')+'</span></span>'}
function accHome(){
  var gs=ACC.groups||[];
  accShell('Konto und Gruppen',
   '<div class="rows"><div class="lotrow"><span><b>'+esc(ACC.name||'Ohne Namen')+'</b><br><small>'+esc(ACC.sess.email)+'</small></span><button class="btn sm" type="button" data-acc="rename">Name ändern</button></div></div>'+
   '<h3 style="margin:14px 0 6px">Meine Gruppen</h3>'+
   (gs.length?'<div class="rows">'+gs.map(function(g){return '<div class="lotrow" style="flex-wrap:wrap"><span style="flex:1;min-width:140px"><b>'+esc(g.name)+'</b><br><small>'+esc(g.role)+' · '+g.lots.length+' Los'+(g.lots.length===1?'':'e')+'</small></span><button class="btn sm" type="button" data-acc="group" data-v="'+esc(g.id)+'">Öffnen</button></div>'}).join('')+'</div>':'<p class="hint">Du bist noch in keiner Gruppe.</p>')+
   '<div class="btnrow" style="margin-top:8px"><button class="btn primary" type="button" data-acc="newgroup">+ Gruppe erstellen</button></div>'+
   '<h3 style="margin:14px 0 6px">Einladung einlösen</h3>'+
   '<div class="btnrow"><input type="text" id="ac-code" placeholder="Einladungscode" autocomplete="off" autocapitalize="none" style="flex:1;min-width:140px"><button class="btn" type="button" data-acc="join">Beitreten</button></div>'+
   '<p class="warnbox" id="ac-msg" hidden></p>'+
   '<div class="btnrow" style="margin-top:16px"><button class="btn" type="button" data-acc="logout">Abmelden</button><button class="btn" type="button" data-acc="close">Schließen</button></div>'+
   '<p class="hint">Geteilt wird noch nichts. Zuerst richten wir Gruppen, Lose und Rollen ein.</p>');
}
function accNewGroup(){
  var mine=(D.settings.myLots||[]).slice().sort(function(a,b){return a-b});
  accShell('Gruppe erstellen',
   '<label class="field"><span class="lbl">Name der Gruppe</span><input type="text" id="ac-gname" maxlength="80" placeholder="z. B. Jagdgesellschaft Beispiel" autocomplete="off"></label>'+
   '<div class="field"><span class="lbl">Lose der Gruppe</span>'+
   (mine.length?'<div class="rows">'+mine.map(function(n){return '<label class="lgrow" style="min-height:42px"><input type="checkbox" class="ac-lot" value="'+n+'" checked style="width:22px;height:22px;flex:none"><span class="tx">Los '+n+'</span></label>'}).join('')+'</div>':'<p class="hint">Du hast noch kein Los gewählt. Gib die Losnummer unten ein.</p>')+
   '<div class="btnrow"><input type="text" id="ac-lotx" inputmode="numeric" placeholder="Weitere Losnummern, z. B. 12, 14" style="flex:1"></div></div>'+
   '<p class="hint">Ein Los gehört zuerst der Gruppe, die es als erste einträgt. Fordert eine weitere Gruppe dasselbe Los an, muss ein Administrator der ersten Gruppe zustimmen. Es werden automatisch die Rollen „Jäger“ und „Gast“ angelegt, die du danach anpassen kannst.</p>'+
   '<p class="warnbox" id="ac-msg" hidden></p>'+
   '<div class="btnrow"><button class="btn primary" type="button" data-acc="creategroup" style="flex:2">Erstellen</button><button class="btn" type="button" data-acc="home" style="flex:1">Zurück</button></div>');
}

/* Gruppen-Detail */
function permSel(role,cat,val){
  var opts=['none'].concat(ACC_APPROX.indexOf(cat)>-1?['approx']:[]).concat(['read','write']);
  return '<label class="lgrow" style="min-height:40px;gap:8px"><span class="tx">'+esc(ACC_CAT.filter(function(c){return c[0]===cat})[0][1])+'</span><select data-acc-perm="'+esc(role)+'" data-cat="'+cat+'" style="flex:none;min-width:110px">'+opts.map(function(o){return '<option value="'+o+'"'+((val||'none')===o?' selected':'')+'>'+ACC_LVL[o]+'</option>'}).join('')+'</select></label>';
}
function accGroup(gid){
  ACC.cur=gid;accLoading('Gruppe');
  var g=(ACC.groups||[]).filter(function(x){return x.id===gid})[0];if(!g){accHome();return}
  return Promise.all([
    sbq('group_roles?select=id,name,perms&group_id=eq.'+gid+'&order=name'),
    sbq('group_members?select=user_id,is_admin,role_id&group_id=eq.'+gid),
    sbq('group_lots?select=lot_id,approved&group_id=eq.'+gid),
    g.admin?sbq('group_invites?select=code,role_id,expires_at,max_uses,uses&group_id=eq.'+gid):Promise.resolve([]),
    g.admin?sbRpc('lot_requests',{}).catch(function(){return []}):Promise.resolve([])
  ]).then(function(r){
    var ids=r[1].map(function(m){return m.user_id});
    return sbq('profiles?select=id,display_name&id='+inList(ids)).then(function(pf){
      ACC.det={g:g,roles:r[0],members:r[1],lots:r[2].sort(function(a,b){return lotSort(a.lot_id,b.lot_id)}),invites:r[3],reqs:r[4],names:{}};
      pf.forEach(function(p){ACC.det.names[p.id]=p.display_name});accGroupView();
    });
  }).catch(function(e){accErrView(e,'home')});
}
function accGroupView(msg,newCode){
  var d=ACC.det,g=d.g,uid=accUid(),adm=g.admin;
  var roleName=function(id){var r=d.roles.filter(function(x){return x.id===id})[0];return r?r.name:'ohne Rolle'};
  var h='<p class="hint">'+(adm?'Du bist Administrator dieser Gruppe.':'Deine Rolle: '+esc(g.role)+'.')+'</p>';
  h+='<h3 style="margin:10px 0 6px">Lose</h3><div style="display:flex;flex-wrap:wrap;gap:6px">'+d.lots.map(function(l){return '<span style="display:inline-flex;align-items:center;gap:4px">'+lotChip(l)+(adm?'<button class="btn sm" type="button" data-acc="rmlot" data-v="'+esc(l.lot_id)+'" aria-label="Los '+esc(l.lot_id)+' entfernen" style="min-height:28px;padding:0 8px">✕</button>':'')+'</span>'}).join('')+'</div>';
  if(d.lots.some(function(l){return !l.approved}))h+='<p class="hint">„wartet“: Ein Administrator der Gruppe, die das Los schon verwaltet, muss zustimmen. Bis dahin siehst du dort nichts.</p>';
  if(adm)h+='<div class="btnrow" style="margin-top:8px"><input type="text" id="ac-addlot" inputmode="numeric" placeholder="Losnummer" style="flex:1;min-width:110px"><button class="btn" type="button" data-acc="addlot">Los hinzufügen</button></div>';
  var rq=d.reqs.filter(function(q){return q.group_id!==g.id&&d.lots.some(function(l){return l.approved&&l.lot_id===q.lot_id})});
  if(rq.length)h+='<h3 style="margin:14px 0 6px">Anfragen anderer Gruppen</h3><div class="rows">'+rq.map(function(q){return '<div class="lotrow" style="flex-wrap:wrap"><span style="flex:1;min-width:150px"><b>'+esc(q.group_name)+'</b><br><small>möchte Los '+esc(q.lot_id)+(q.requested_by?' · '+esc(q.requested_by):'')+'</small></span><button class="btn sm primary" type="button" data-acc="approve" data-g="'+esc(q.group_id)+'" data-v="'+esc(q.lot_id)+'">Freigeben</button><button class="btn sm danger" type="button" data-acc="reject" data-g="'+esc(q.group_id)+'" data-v="'+esc(q.lot_id)+'">Ablehnen</button></div>'}).join('')+'</div>';
  h+='<h3 style="margin:14px 0 6px">Mitglieder ('+d.members.length+')</h3><div class="rows">'+d.members.map(function(m){
    var me=m.user_id===uid,val=m.is_admin?'admin':(m.role_id||'');
    return '<div class="lotrow" style="flex-wrap:wrap"><span style="flex:1;min-width:130px"><b>'+esc(d.names[m.user_id]||'Mitglied')+'</b>'+(me?' <small>(du)</small>':'')+'</span>'+
      (adm?'<select data-acc-mrole="'+esc(m.user_id)+'" style="flex:none;min-width:130px"><option value="admin"'+(val==='admin'?' selected':'')+'>Administrator</option>'+d.roles.map(function(r){return '<option value="'+esc(r.id)+'"'+(val===r.id?' selected':'')+'>'+esc(r.name)+'</option>'}).join('')+'</select>'+(me?'':'<button class="btn sm danger" type="button" data-acc="rmmember" data-v="'+esc(m.user_id)+'">Entfernen</button>'):'<small>'+(m.is_admin?'Administrator':esc(roleName(m.role_id)))+'</small>')+'</div>';
  }).join('')+'</div>';
  if(adm){
    h+='<h3 style="margin:14px 0 6px">Rollen und Rechte</h3><p class="hint">Lege pro Rolle fest, was die Mitglieder sehen oder eintragen dürfen. „Ungefähr“ zeigt Positionen nur auf etwa 100 m gerundet. Administratoren dürfen alles.</p>';
    h+=d.roles.map(function(r){var n=d.members.filter(function(m){return !m.is_admin&&m.role_id===r.id}).length;
      return '<details class="card" style="padding:10px 12px;margin:0 0 8px"><summary style="min-height:36px;display:flex;align-items:center;gap:8px"><b>'+esc(r.name)+'</b> <small>'+n+' Mitglied'+(n===1?'':'er')+'</small></summary>'+
       '<label class="field" style="margin-top:8px"><span class="lbl">Name der Rolle</span><input type="text" maxlength="40" value="'+esc(r.name)+'" data-acc-rname="'+esc(r.id)+'"></label>'+
       ACC_CAT.map(function(c){return permSel(r.id,c[0],(r.perms||{})[c[0]])}).join('')+
       '<div class="btnrow"><button class="btn sm danger" type="button" data-acc="rmrole" data-v="'+esc(r.id)+'">Rolle löschen</button></div></details>'}).join('');
    h+='<div class="btnrow"><input type="text" id="ac-nrole" maxlength="40" placeholder="Neue Rolle, z. B. Forst" style="flex:1;min-width:120px"><button class="btn" type="button" data-acc="addrole">Rolle anlegen</button></div>';
    h+='<h3 style="margin:14px 0 6px">Einladungen</h3>';
    if(newCode)h+='<div class="card" style="border:2px solid var(--accent)"><p class="hint">Einladungscode (läuft in 7 Tagen ab):</p><p style="font:700 22px/1.2 var(--font-mono,monospace);letter-spacing:.05em;margin:4px 0 8px;word-break:break-all">'+esc(newCode.match(/.{1,4}/g).join('-'))+'</p><div class="btnrow"><button class="btn sm primary" type="button" data-acc="sharecode" data-v="'+esc(newCode)+'">Teilen</button></div></div>';
    h+='<div class="btnrow"><select id="ac-irole" style="flex:1;min-width:120px">'+d.roles.map(function(r){return '<option value="'+esc(r.id)+'">'+esc(r.name)+'</option>'}).join('')+'</select><select id="ac-iuses" style="flex:none"><option value="1">1 Person</option><option value="5">5 Personen</option><option value="20">20 Personen</option></select><button class="btn" type="button" data-acc="mkinvite">Code erzeugen</button></div>';
    var act=d.invites.filter(function(i){return new Date(i.expires_at)>new Date()&&i.uses<i.max_uses});
    if(act.length)h+='<div class="rows">'+act.map(function(i){return '<div class="lotrow" style="flex-wrap:wrap"><span style="flex:1;min-width:150px"><code>'+esc(i.code.match(/.{1,4}/g).join('-'))+'</code><br><small>'+esc(roleName(i.role_id))+' · '+i.uses+'/'+i.max_uses+' genutzt</small></span><button class="btn sm" type="button" data-acc="sharecode" data-v="'+esc(i.code)+'">Teilen</button><button class="btn sm danger" type="button" data-acc="rminvite" data-v="'+esc(i.code)+'">Löschen</button></div>'}).join('')+'</div>';
  }
  h+='<p class="warnbox" id="ac-msg"'+(msg?'':' hidden')+'>'+esc(msg||'')+'</p>';
  h+='<div class="btnrow" style="margin-top:14px">'+(adm?'<button class="btn danger" type="button" data-acc="delgroup">Gruppe löschen</button>':'<button class="btn danger" type="button" data-acc="leave">Gruppe verlassen</button>')+'<button class="btn" type="button" data-acc="home">Zurück</button></div>';
  accShell(g.name,h);
}

/* ---------- Aktionen ---------- */
function accBusy(b,on){if(b){b.disabled=!!on}}
function accReload(){return accLoadGroups().then(function(){return accGroup(ACC.cur)})}
function accRun(b,p,okFn,failFn){accBusy(b,true);return p.then(function(r){accBusy(b,false);if(okFn)okFn(r)},function(e){accBusy(b,false);if(failFn)failFn(e);else accNote(accMsg(e))})}
function confirm2(b,txt){if(b.dataset.s!=='1'){b.dataset.s='1';b.dataset.t=b.textContent;b.textContent=txt||'Wirklich?';setTimeout(function(){if(b.isConnected){b.dataset.s='';b.textContent=b.dataset.t}},3500);return false}return true}
function lotList(str){return String(str||'').split(/[^0-9]+/).filter(Boolean).map(function(x){return String(parseInt(x,10))}).filter(function(x,i,a){return x!=='0'&&x!=='NaN'&&a.indexOf(x)===i})}

$('#sheetBody').addEventListener('click',function(e){
  var b=e.target.closest('[data-acc]');if(!b||b.disabled)return;
  var a=b.dataset.acc,v=b.dataset.v,d=ACC.det,val=function(id){var n=$(id);return n?n.value.trim():''};
  if(a==='close'){closeSheet()}
  else if(a==='home'){accSheet()}
  else if(a==='mode'){accAuthView(v,'',val('#ac-mail'))}
  else if(a==='login'||a==='signup'){
    var mail=val('#ac-mail'),pw=($('#ac-pw')||{}).value||'',nm=val('#ac-name');
    if(!mail||!pw){accNote('Bitte E-Mail und Passwort eingeben.');return}
    if(a==='signup'&&pw.length<8){accNote('Das Passwort braucht mindestens 8 Zeichen.');return}
    if(a==='signup'&&!nm){accNote('Bitte einen Anzeigenamen eingeben.');return}
    accBusy(b,true);accNote('');
    var req=a==='login'?sbRaw('/auth/v1/token?grant_type=password',{method:'POST',body:{email:mail,password:pw}}):sbRaw('/auth/v1/signup',{method:'POST',body:{email:mail,password:pw,data:{display_name:nm}}});
    req.then(function(r){
      if(!r||!r.access_token){accBusy(b,false);accAuthView('login','Wir haben dir eine Bestätigungs-Mail geschickt. Öffne den Link darin und melde dich danach an.',mail);return}
      accSetSess(r);accSheet();
    }).catch(function(er){accBusy(b,false);accNote(accMsg(er))});
  }
  else if(a==='forgot'){
    var m2=val('#ac-mail');if(!m2){accNote('Bitte zuerst deine E-Mail eingeben.');return}
    accRun(b,sbRaw('/auth/v1/recover',{method:'POST',body:{email:m2}}),function(){accNote('Falls die Adresse registriert ist, wurde eine E-Mail zum Zurücksetzen gesendet.',false)});
  }
  else if(a==='logout'){
    var tok=ACC.sess&&ACC.sess.access;ACC.sess=null;ACC.groups=null;accSaveSess();renderHeader();
    if(tok)sbRaw('/auth/v1/logout',{method:'POST'},tok).catch(function(){});
    closeSheet();toast('Abgemeldet');
  }
  else if(a==='consent'){
    if(!($('#ac-ok')||{}).checked){accNote('Bitte die Datenschutzerklärung bestätigen.');return}
    accRun(b,sbApi('/rest/v1/consents',{method:'POST',body:{user_id:accUid(),doc_version:PRIV_VER},headers:{Prefer:'return=minimal'}}),function(){accSheet()});
  }
  else if(a==='rename'){
    accShell('Anzeigename','<label class="field"><span class="lbl">Name (für Mitglieder deiner Gruppen sichtbar)</span><input type="text" id="ac-name" maxlength="60" value="'+esc(ACC.name)+'"></label><p class="warnbox" id="ac-msg" hidden></p><div class="btnrow"><button class="btn primary" type="button" data-acc="savename" style="flex:2">Speichern</button><button class="btn" type="button" data-acc="home" style="flex:1">Abbrechen</button></div>');
  }
  else if(a==='savename'){
    var nn=val('#ac-name');if(!nn){accNote('Bitte einen Namen eingeben.');return}
    accRun(b,sbApi('/rest/v1/profiles?id=eq.'+accUid(),{method:'PATCH',body:{display_name:nn}}),function(){ACC.name=nn;try{localStorage.setItem('revierbuch.accname',nn)}catch(_){}renderHeader();accSheet()});
  }
  else if(a==='newgroup'){accNewGroup()}
  else if(a==='creategroup'){
    var gn=val('#ac-gname'),lots=$$('.ac-lot').filter(function(x){return x.checked}).map(function(x){return x.value}).concat(lotList(val('#ac-lotx')));
    lots=lots.filter(function(x,i,ar){return ar.indexOf(x)===i});
    if(!gn){accNote('Bitte einen Namen eingeben.');return}
    if(!lots.length){accNote('Bitte mindestens ein Los angeben.');return}
    accRun(b,sbRpc('create_group',{p_name:gn,p_lots:lots}),function(id){accLoadGroups().then(function(){accGroup(id)})});
  }
  else if(a==='join'){
    var code=val('#ac-code').toLowerCase().replace(/[^a-z0-9]/g,'');if(!code){accNote('Bitte den Einladungscode eingeben.');return}
    accRun(b,sbRpc('accept_invite',{p_code:code}),function(id){accLoadGroups().then(function(){toast('Du bist jetzt in der Gruppe.');accGroup(id)})});
  }
  else if(a==='group'){accGroup(v)}
  else if(a==='addlot'){
    var ls=lotList(val('#ac-addlot'));if(!ls.length){accNote('Bitte eine Losnummer eingeben.');return}
    accRun(b,Promise.all(ls.map(function(x){return sbRpc('add_lot',{p_group:ACC.cur,p_lot:x})})),function(){accReload()});
  }
  else if(a==='rmlot'){
    if(!confirm2(b,'Entfernen?'))return;
    accRun(b,sbApi('/rest/v1/group_lots?group_id=eq.'+ACC.cur+'&lot_id=eq.'+encodeURIComponent(v),{method:'DELETE'}),function(){accReload()});
  }
  else if(a==='approve'){accRun(b,sbRpc('approve_lot',{p_group:b.dataset.g,p_lot:v}),function(){toast('Freigegeben');accReload()})}
  else if(a==='reject'){
    if(!confirm2(b,'Ablehnen?'))return;
    accRun(b,sbApi('/rest/v1/group_lots?group_id=eq.'+encodeURIComponent(b.dataset.g)+'&lot_id=eq.'+encodeURIComponent(v),{method:'DELETE'}),function(){accReload()});
  }
  else if(a==='rmmember'){
    if(!confirm2(b,'Wirklich?'))return;
    accRun(b,sbApi('/rest/v1/group_members?group_id=eq.'+ACC.cur+'&user_id=eq.'+v,{method:'DELETE'}),function(){accReload()});
  }
  else if(a==='leave'){
    if(!confirm2(b,'Wirklich verlassen?'))return;
    accRun(b,sbApi('/rest/v1/group_members?group_id=eq.'+ACC.cur+'&user_id=eq.'+accUid(),{method:'DELETE'}),function(){accLoadGroups().then(accHome)});
  }
  else if(a==='delgroup'){
    if(!confirm2(b,'Gruppe wirklich löschen?'))return;
    accRun(b,sbApi('/rest/v1/groups?id=eq.'+ACC.cur,{method:'DELETE'}),function(){accLoadGroups().then(accHome)});
  }
  else if(a==='addrole'){
    var rn=val('#ac-nrole');if(!rn){accNote('Bitte einen Namen eingeben.');return}
    accRun(b,sbApi('/rest/v1/group_roles',{method:'POST',body:{group_id:ACC.cur,name:rn,perms:ACC_GAST},headers:{Prefer:'return=minimal'}}),function(){accReload()});
  }
  else if(a==='rmrole'){
    if(!confirm2(b,'Rolle löschen?'))return;
    accRun(b,sbApi('/rest/v1/group_roles?id=eq.'+v,{method:'DELETE'}),function(){accReload()});
  }
  else if(a==='mkinvite'){
    var role=val('#ac-irole'),uses=parseInt(val('#ac-iuses'),10)||1;if(!role){accNote('Bitte eine Rolle wählen.');return}
    accRun(b,sbApi('/rest/v1/group_invites',{method:'POST',body:{group_id:ACC.cur,role_id:role,max_uses:uses},headers:{Prefer:'return=representation'}}),function(r){
      var c=r&&r[0]&&r[0].code;accGroup(ACC.cur).then(function(){accGroupView('',c)})});
  }
  else if(a==='rminvite'){accRun(b,sbApi('/rest/v1/group_invites?code=eq.'+encodeURIComponent(v),{method:'DELETE'}),function(){accReload()})}
  else if(a==='sharecode'){
    var nice=v.match(/.{1,4}/g).join('-'),txt='Einladung zur Gruppe „'+d.g.name+'“ im Revierbuch: Code '+nice+' (in der App unter Daten > Konto und Gruppen > Einladung einlösen). '+location.href.split('#')[0];
    if(navigator.share)navigator.share({text:txt}).catch(function(){});
    else if(navigator.clipboard)navigator.clipboard.writeText(txt).then(function(){toast('Einladung kopiert')},function(){toast(nice)});
    else toast(nice);
  }
});
$('#sheetBody').addEventListener('change',function(e){
  var t=e.target,d=ACC.det;if(!d)return;
  if(t.dataset.accPerm){
    var r=d.roles.filter(function(x){return x.id===t.dataset.accPerm})[0],p=Object.assign({},r.perms||{});
    if(t.value==='none')delete p[t.dataset.cat];else p[t.dataset.cat]=t.value;
    sbApi('/rest/v1/group_roles?id=eq.'+r.id,{method:'PATCH',body:{perms:p}}).then(function(){r.perms=p;toast('Gespeichert')},function(er){toast(accMsg(er))});
  }else if(t.dataset.accRname!==undefined){
    var nm=t.value.trim(),r2=d.roles.filter(function(x){return x.id===t.dataset.accRname})[0];if(!nm){t.value=r2.name;return}
    sbApi('/rest/v1/group_roles?id=eq.'+r2.id,{method:'PATCH',body:{name:nm}}).then(function(){r2.name=nm;toast('Gespeichert')},function(er){t.value=r2.name;toast(accMsg(er))});
  }else if(t.dataset.accMrole){
    var uid=t.dataset.accMrole,m=d.members.filter(function(x){return x.user_id===uid})[0],toAdmin=t.value==='admin';
    if(m.is_admin&&!toAdmin&&d.members.filter(function(x){return x.is_admin}).length<2){toast('Es braucht mindestens einen Administrator.');t.value='admin';return}
    var body=toAdmin?{is_admin:true}:{is_admin:false,role_id:t.value};
    sbApi('/rest/v1/group_members?group_id=eq.'+ACC.cur+'&user_id=eq.'+uid,{method:'PATCH',body:body}).then(function(){m.is_admin=toAdmin;if(!toAdmin)m.role_id=t.value;toast('Gespeichert');if(uid===accUid())accLoadGroups()},function(er){toast(accMsg(er));accGroup(ACC.cur)});
  }
});
