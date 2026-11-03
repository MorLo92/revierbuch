/* ---------- Wildart-Köpfe als Marker (Abschuss rot, Sichtung grün) ---------- */
var SP_ICO={"Rehwild":[["f","M17.5 19 Q24 15.5 30.5 19 L28 31 Q24 37.5 20 31 Z"],["r","M24 35.6 m-1.7 0 a1.7 1.1 0 1 0 3.4 0 a1.7 1.1 0 1 0 -3.4 0"],["r","M20.3 22.5 m-1.1 0 a1.1 1.1 0 1 0 2.2 0 a1.1 1.1 0 1 0 -2.2 0"],["r","M27.7 22.5 m-1.1 0 a1.1 1.1 0 1 0 2.2 0 a1.1 1.1 0 1 0 -2.2 0"],["f","M17 20 L7.5 16 Q8 22.5 15.5 24.5 Z"],["f","M31 20 L40.5 16 Q40 22.5 32.5 24.5 Z"],["s","M20.5 17.5 L19 10 M19.4 13.8 L16.4 11.6",1.9],["s","M27.5 17.5 L29 10 M28.6 13.8 L31.6 11.6",1.9]],"Rotwild":[["f","M17.5 19 Q24 15.5 30.5 19 L28 31 Q24 37.5 20 31 Z"],["r","M24 35.6 m-1.7 0 a1.7 1.1 0 1 0 3.4 0 a1.7 1.1 0 1 0 -3.4 0"],["r","M20.3 22.5 m-1.1 0 a1.1 1.1 0 1 0 2.2 0 a1.1 1.1 0 1 0 -2.2 0"],["r","M27.7 22.5 m-1.1 0 a1.1 1.1 0 1 0 2.2 0 a1.1 1.1 0 1 0 -2.2 0"],["f","M17.5 20 L11 18 Q11.5 23 16.5 24 Z"],["f","M30.5 20 L37 18 Q36.5 23 31.5 24 Z"],["s","M20.5 18 L17.5 11 L13 4.5 M18 12.5 L12.5 12.2 M15.5 8.2 L11 8.2 M19.5 14.5 L22.5 10.5 M16.2 10.5 L19.2 6.2",1.9],["s","M27.5 18 L30.5 11 L35 4.5 M30 12.5 L35.5 12.2 M32.5 8.2 L37 8.2 M28.5 14.5 L25.5 10.5 M31.8 10.5 L28.8 6.2",1.9]],"Damwild":[["f","M17.5 19 Q24 15.5 30.5 19 L28 31 Q24 37.5 20 31 Z"],["r","M24 35.6 m-1.7 0 a1.7 1.1 0 1 0 3.4 0 a1.7 1.1 0 1 0 -3.4 0"],["r","M20.3 22.5 m-1.1 0 a1.1 1.1 0 1 0 2.2 0 a1.1 1.1 0 1 0 -2.2 0"],["r","M27.7 22.5 m-1.1 0 a1.1 1.1 0 1 0 2.2 0 a1.1 1.1 0 1 0 -2.2 0"],["f","M17.5 20 L11 18.5 Q11.5 23 16.5 24 Z"],["f","M30.5 20 L37 18.5 Q36.5 23 31.5 24 Z"],["f","M20.5 18 L19.5 13 L11.5 14 L12 10.5 L9 9 L12 7.5 L10.5 4.5 L14.5 5.5 L16 2.5 L18 6 L21.5 4.5 L21.5 12 Z"],["f","M27.5 18 L28.5 13 L36.5 14 L36 10.5 L39 9 L36 7.5 L37.5 4.5 L33.5 5.5 L32 2.5 L30 6 L26.5 4.5 L26.5 12 Z"]],"Muffelwild":[["f","M18 18 Q24 15 30 18 L29 30 Q24 36.5 19 30 Z"],["r","M24 34.4 m-1.9 0 a1.9 1.2 0 1 0 3.8 0 a1.9 1.2 0 1 0 -3.8 0"],["r","M20.5 22 m-1.1 0 a1.1 1.1 0 1 0 2.2 0 a1.1 1.1 0 1 0 -2.2 0"],["r","M27.5 22 m-1.1 0 a1.1 1.1 0 1 0 2.2 0 a1.1 1.1 0 1 0 -2.2 0"],["f","M17.5 18.5 L11 17 Q11.5 21 16.8 22 Z"],["f","M30.5 18.5 L37 17 Q36.5 21 31.2 22 Z"],["s","M19.5 18.5 C9.5 15 5.5 26 11.5 30 C15.5 32 18 28.5 15.5 26",3.3],["s","M28.5 18.5 C38.5 15 42.5 26 36.5 30 C32.5 32 30 28.5 32.5 26",3.3]],"Schwarzwild":[["f","M18.5 16.5 L20 9.5 L22.3 14.5 L24 8.5 L25.7 14.5 L28 9.5 L29.5 16.5 Z"],["f","M15.5 20 L13.5 9 L22 15.5 Z"],["f","M32.5 20 L34.5 9 L26 15.5 Z"],["f","M14.5 19 Q24 13 33.5 19 L32 27 L30.5 38.5 Q24 41.5 17.5 38.5 L16 27 Z"],["f","M17.5 36.5 Q12 36.5 11.5 28.5 Q14.5 32.5 19 33 Z"],["f","M30.5 36.5 Q36 36.5 36.5 28.5 Q33.5 32.5 29 33 Z"],["rs","M18.4 35.2 a5.6 3.1 0 1 0 11.2 0 a5.6 3.1 0 1 0 -11.2 0",1.4],["r","M21.200000000000003 35.2 a0.9 1.1 0 1 0 1.8 0 a0.9 1.1 0 1 0 -1.8 0"],["r","M25 35.2 a0.9 1.1 0 1 0 1.8 0 a0.9 1.1 0 1 0 -1.8 0"],["r","M18.1 23.5 a1.4 1.4 0 1 0 2.8 0 a1.4 1.4 0 1 0 -2.8 0"],["r","M27.1 23.5 a1.4 1.4 0 1 0 2.8 0 a1.4 1.4 0 1 0 -2.8 0"]],"Fuchs":[["f","M24 38.5 L13.5 27.5 L12.5 11.5 L20 18 L28 18 L35.5 11.5 L34.5 27.5 Z"],["r","M24 37.4 m-1.6 0 a1.6 1.4 0 1 0 3.2 0 a1.6 1.4 0 1 0 -3.2 0"],["rs","M17.5 23.5 L20.8 24.6 M30.5 23.5 L27.2 24.6",1.6]],"Dachs":[["f","M24 38.5 L16.5 29 Q13.5 19 24 16.5 Q34.5 19 31.5 29 Z"],["f","M13 17.5 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0"],["f","M29 17.5 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0"],["rs","M20 17.5 L21.5 31",3],["rs","M28 17.5 L26.5 31",3],["r","M24 37.2 m-1.5 0 a1.5 1.3 0 1 0 3 0 a1.5 1.3 0 1 0 -3 0"]],"Marder":[["f","M17 20 Q24 15.5 31 20 L29 30.5 Q24 37.5 19 30.5 Z"],["f","M11.2 17.5 a4.3 4.3 0 1 0 8.6 0 a4.3 4.3 0 1 0 -8.6 0"],["f","M28.2 17.5 a4.3 4.3 0 1 0 8.6 0 a4.3 4.3 0 1 0 -8.6 0"],["r","M24 35 m-1.5 0 a1.5 1.2 0 1 0 3 0 a1.5 1.2 0 1 0 -3 0"],["r","M20.3 23 m-1.1 0 a1.1 1.1 0 1 0 2.2 0 a1.1 1.1 0 1 0 -2.2 0"],["r","M27.7 23 m-1.1 0 a1.1 1.1 0 1 0 2.2 0 a1.1 1.1 0 1 0 -2.2 0"],["r","M20.5 31 Q24 34 27.5 31 L26.5 33.5 Q24 35.5 21.5 33.5 Z"]],"Marderhund":[["f","M13 22 Q13.5 14 24 14 Q34.5 14 35 22 L38.5 26.5 L33.5 27.5 L35.5 33 L28.5 32.5 L24 38 L19.5 32.5 L12.5 33 L14.5 27.5 L9.5 26.5 Z"],["f","M13.3 14.5 a3.2 3.2 0 1 0 6.4 0 a3.2 3.2 0 1 0 -6.4 0"],["f","M28.3 14.5 a3.2 3.2 0 1 0 6.4 0 a3.2 3.2 0 1 0 -6.4 0"],["r","M13.5 21.5 Q24 17.5 34.5 21.5 L33.5 26 Q24 22.5 14.5 26 Z"],["f","M19.2 23 m-1.1 0 a1.1 1.1 0 1 0 2.2 0 a1.1 1.1 0 1 0 -2.2 0"],["f","M28.8 23 m-1.1 0 a1.1 1.1 0 1 0 2.2 0 a1.1 1.1 0 1 0 -2.2 0"],["r","M24 34 m-1.8 0 a1.8 1.5 0 1 0 3.6 0 a1.8 1.5 0 1 0 -3.6 0"]],"Waschbär":[["f","M12 24.5 Q12 15 24 15 Q36 15 36 24.5 Q36 32.5 24 37 Q12 32.5 12 24.5 Z"],["f","M13 18.5 L13.5 9.5 L20.5 15.5 Z"],["f","M35 18.5 L34.5 9.5 L27.5 15.5 Z"],["r","M12.5 22 Q18 19 22 23 L24 22 L26 23 Q30 19 35.5 22 L35 27.5 Q30 28.5 26 25.5 L24 26.5 L22 25.5 Q18 28.5 13 27.5 Z"],["f","M18.2 24.3 m-1.3 0 a1.3 1.3 0 1 0 2.6 0 a1.3 1.3 0 1 0 -2.6 0"],["f","M29.8 24.3 m-1.3 0 a1.3 1.3 0 1 0 2.6 0 a1.3 1.3 0 1 0 -2.6 0"],["r","M24 32.5 m-2 0 a2 1.7 0 1 0 4 0 a2 1.7 0 1 0 -4 0"]],"Wildgans":[["f","M27.5 22 C30 28 30 34 27.5 41 L36 41 C34.5 33 33 27 31 21.5 Z"],["f","M24 20.5 m-6 0 a6 5.2 0 1 0 12 0 a6 5.2 0 1 0 -12 0"],["f","M19 18.5 L8 22.5 L19.5 25 Z"],["r","M25 19.5 m-1.2 0 a1.2 1.2 0 1 0 2.4 0 a1.2 1.2 0 1 0 -2.4 0"],["f","M22 23 C24 28 26 33 25 41 L33 41 C32 33 29 27 28 22 Z"]],"Sonstiges":[["f","M24 38 C16.5 38 14.5 31.5 19.5 27.8 C22.2 25.8 25.8 25.8 28.5 27.8 C33.5 31.5 31.5 38 24 38 Z"],["f","M15 22.5 m-2.6 0 a2.6 3.4 -20 1 0 5.2 0 a2.6 3.4 -20 1 0 -5.2 0"],["f","M20.5 16 m-2.7 0 a2.7 3.6 0 1 0 5.4 0 a2.7 3.6 0 1 0 -5.4 0"],["f","M27.5 16 m-2.7 0 a2.7 3.6 0 1 0 5.4 0 a2.7 3.6 0 1 0 -5.4 0"],["f","M33 22.5 m-2.6 0 a2.6 3.4 20 1 0 5.2 0 a2.6 3.4 20 1 0 -5.2 0"]]};
var SP_P2={};
function spOps(sp){
  var k=SP_ICO[sp]?sp:'Sonstiges';
  if(!SP_P2[k])SP_P2[k]=SP_ICO[k].map(function(o){return {k:o[0],p:new Path2D(o[1]),w:o[2]||1.6}});
  return SP_P2[k];
}
/* Kopf in eine Kreisfläche (Radius R, Mitte x,y) zeichnen; dot = Farbe des Punkts */
function spHead(x,y,R,sp,dot){
  ctx.save();ctx.translate(x,y);var k=R/22.5;ctx.scale(k,k);ctx.translate(-24,-24);
  ctx.translate(24,25);ctx.scale(.84,.84);ctx.translate(-24,-24);
  ctx.lineCap='round';ctx.lineJoin='round';
  spOps(sp).forEach(function(o){
    if(o.k==='f'){ctx.fillStyle='#fff';ctx.fill(o.p)}
    else if(o.k==='r'){ctx.fillStyle=dot;ctx.fill(o.p)}
    else{ctx.lineWidth=o.w;ctx.strokeStyle=o.k==='s'?'#fff':dot;ctx.stroke(o.p)}
  });
  ctx.restore();
}
function spMark(x,y,sp,sel,n,isSight){
  var dot=isSight?pal.sicht:pal.kill;
  ctx.save();ctx.translate(x,y);ctx.scale(MKS,MKS);
  ctx.beginPath();ctx.arc(0,0,sel?18:15.5,0,7);ctx.fillStyle=sel?pal.ink:pal.surface;ctx.fill();
  ctx.beginPath();ctx.arc(0,0,13.5,0,7);ctx.fillStyle=dot;ctx.fill();
  spHead(0,0,13.5,sp,dot);
  if(isSight&&n>1){
    ctx.beginPath();ctx.arc(10.5,-10.5,7.5,0,7);ctx.fillStyle=pal.surface;ctx.fill();
    ctx.beginPath();ctx.arc(10.5,-10.5,6,0,7);ctx.fillStyle=pal.ink;ctx.fill();
    ctx.fillStyle=pal.surface;ctx.font='700 10px "Barlow Condensed",Arial Narrow,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(n>99?'99':n),10.5,-10);
  }
  ctx.restore();
}
/* kleines Rund-Symbol für Listen (HTML) */
function spBadge(kind,o){
  var sp=SP_ICO[o.species]?o.species:'Sonstiges',col=kind==='kill'?'var(--kill)':'var(--sicht)',n=kind==='sight'?(o.count||1):0;
  var ops=SP_ICO[sp].map(function(p){var c=p[0],d=p[1],w=p[2]||1.6;
    if(c==='f')return '<path d="'+d+'" fill="#fff"/>';
    if(c==='r')return '<path d="'+d+'" style="fill:'+col+'"/>';
    return '<path d="'+d+'" fill="none" stroke-width="'+w+'" stroke-linecap="round" stroke-linejoin="round" '+(c==='s'?'stroke="#fff"':'style="stroke:'+col+'"')+'/>'}).join('');
  return '<span class="mk spb" style="background:transparent;position:relative"><svg viewBox="0 0 48 48" width="28" height="28" aria-hidden="true"><circle cx="24" cy="24" r="23" style="fill:'+col+'"/><g transform="translate(24 25) scale(.84) translate(-24 -24)">'+ops+'</g></svg>'+(n>1?'<b style="position:absolute;right:-5px;top:-5px;min-width:15px;height:15px;border-radius:8px;background:var(--ink);color:var(--surface);font:700 10px/15px var(--font-body,inherit);text-align:center;padding:0 3px">'+n+'</b>':'')+'</span>';
}
