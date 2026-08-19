/* ============================================================
   Chocolat — schémas animés
   Périmètre volontairement restreint : gainage, respiration,
   mobilité et erreurs de technique. Un schéma par exercice réel,
   jamais par « famille de mouvement ».
   La musculation renvoie vers MuscleWiki : bibliothèque vidéo
   complète sur ces gestes-là, là où ces schémas n'apporteraient rien.

   Le paramètre « ventre » anime la paroi abdominale : elle rentre
   (vert) ou bombe en cône (rouge). C'est l'information qu'aucune
   vidéo de face ne montre.
   ============================================================ */
(function(global){
'use strict';

const L = { lomb:20, thor:24, cerv:11, cou:11, headR:9, bras:25, avantBras:24, cuisse:39, jambe:37, pied:13 };
const COL = { corps:'#16283C', membre:'#41566C', actif:'#E0A33C', ventre:'#1C6E68',
              ventreErr:'#A93B2C', sol:'#B6C3CC', appui:'#9FB0BC' };
const W = { bras:[4.4,3.3,2.6], jambe:[6,4.6,3.4,2.4] };

const rad = d => d*Math.PI/180;
const f   = n => Math.round(n*10)/10;
function pt(p, ang, len){ return [p[0]+len*Math.cos(rad(ang)), p[1]-len*Math.sin(rad(ang))]; }
function lerp(a,b,u){ return a+(b-a)*u; }
function ease(u){ return u<0.5 ? 2*u*u : 1-Math.pow(-2*u+2,2)/2; }
function lerpVal(a,b,u){
  if(typeof a === 'number') return lerp(a,b,u);
  if(Array.isArray(a)) return a.map((v,i)=>lerpVal(v,b[i],u));
  if(a && typeof a === 'object'){ const o={}; for(const k in a) o[k]=lerpVal(a[k],b[k],u); return o; }
  return b;
}

/* pose de référence : debout, de profil, face à droite */
const BASE = {
  x:0, y:0, face:1,
  spine:[90,90,90], tete:90,
  brasP:[-90,-90], brasL:[-90,-90],
  jambeP:[-90,-90,0], jambeL:[-90,-90,0],
  ventre:0, cone:0
};
const P = o => Object.assign({}, BASE, o);

const DOS    = {face:-1, spine:[0,0,0], tete:0, x:0, y:0};        // sur le dos, tête à droite
const VENTRE = {face:1};                                           // ventrale : la paroi pend vers le sol
const QUATRE = {face:1, spine:[8,8,8], tete:8};                    // à quatre pattes

/* ---------- squelette ---------- */
function squelette(p){
  const hanche = [p.x, p.y];
  const s = [hanche];
  let c = hanche;
  [L.lomb, L.thor, L.cerv].forEach((len,i)=>{ c = pt(c, p.spine[i], len); s.push(c); });
  const cou = s[3];
  const tete = pt(cou, p.tete, L.cou);
  const epaule = s[2];
  const bras = a => { const co = pt(epaule, a[0], L.bras); return [epaule, co, pt(co, a[1], L.avantBras)]; };
  const jambe = a => { const g = pt(hanche, a[0], L.cuisse), ch = pt(g, a[1], L.jambe);
                       return [hanche, g, ch, pt(ch, a[2], L.pied)]; };

  const sternum = [lerp(s[1][0], s[2][0], .55), lerp(s[1][1], s[2][1], .55)];
  let tx = s[2][0]-hanche[0], ty = s[2][1]-hanche[1];
  const tl = Math.hypot(tx,ty)||1; tx/=tl; ty/=tl;
  const n = [p.face*-ty, p.face*tx];
  const ep = 9.5;
  const dep = (q,k)=>[q[0]+n[0]*ep*k, q[1]+n[1]*ep*k];

  const hautV = dep(sternum,.95), basV = dep(hanche,.8);
  const saillie = ep*0.3 + p.ventre*15;
  const mid = [(hautV[0]+basV[0])/2, (hautV[1]+basV[1])/2];
  const cA = [lerp(mid[0],hautV[0],.45)+n[0]*saillie*(1-p.cone*.55), lerp(mid[1],hautV[1],.45)+n[1]*saillie*(1-p.cone*.55)];
  const cB = [lerp(mid[0],basV[0],.45)+n[0]*saillie*(1-p.cone*.55),  lerp(mid[1],basV[1],.45)+n[1]*saillie*(1-p.cone*.55)];
  const hautAv = dep(cou,.5), basAr = dep(hanche,-.85), hautAr = dep(cou,-.7), milAr = dep(s[1],-.95);

  const ligne = `M${f(hautV[0])} ${f(hautV[1])} C${f(cA[0])} ${f(cA[1])}, ${f(cB[0])} ${f(cB[1])}, ${f(basV[0])} ${f(basV[1])}`;
  const contour = `M${f(basAr[0])} ${f(basAr[1])} Q${f(milAr[0])} ${f(milAr[1])}, ${f(hautAr[0])} ${f(hautAr[1])}`
    + ` L${f(hautAv[0])} ${f(hautAv[1])} L${f(hautV[0])} ${f(hautV[1])}`
    + ` C${f(cA[0])} ${f(cA[1])}, ${f(cB[0])} ${f(cB[1])}, ${f(basV[0])} ${f(basV[1])} Z`;

  return {hanche, s, cou, tete, epaule, teteAng:p.tete, face:p.face,
    brasP:bras(p.brasP), brasL:bras(p.brasL), jambeP:jambe(p.jambeP), jambeL:jambe(p.jambeL),
    ventre:{ligne, contour, cone:p.cone}};
}

/* ---------- dessin ---------- */
function quad(a,b,wa,wb){
  const dx=b[0]-a[0], dy=b[1]-a[1], l=Math.hypot(dx,dy)||1, nx=-dy/l, ny=dx/l;
  return `M${f(a[0]+nx*wa)} ${f(a[1]+ny*wa)} L${f(b[0]+nx*wb)} ${f(b[1]+ny*wb)}`
       + ` L${f(b[0]-nx*wb)} ${f(b[1]-ny*wb)} L${f(a[0]-nx*wa)} ${f(a[1]-ny*wa)} Z`;
}
function membre(pts, ws, col, op){
  const o = op ? ` opacity="${op}"` : '';
  let g = '';
  for(let i=0;i<pts.length-1;i++) g += `<path d="${quad(pts[i],pts[i+1],ws[i],ws[i+1])}" fill="${col}"${o}/>`;
  pts.forEach((q,i)=>{ g += `<circle cx="${f(q[0])}" cy="${f(q[1])}" r="${f(ws[i])}" fill="${col}"${o}/>`; });
  return g;
}
// palette claire, pour les fonds sombres
const COL_CLAIR = {corps:'#FFFFFF', membre:'#FFFFFF', actif:'#FFD37A', ventre:'#7FE3D8',
                   ventreErr:'#FF9382', sol:'#7E95A8', appui:'#8FA6BB'};

function dessine(k, opt){
  const o = opt||{}, v = k.ventre, C = o.clair ? COL_CLAIR : COL;
  let g = '';
  if(o.banc){ g += `<rect x="${o.banc[0]}" y="${o.banc[1]}" width="${o.banc[2]}" height="${o.banc[3]}" rx="3" fill="${C.appui}"/>`; }
  const opL = (o.opacL !== undefined) ? o.opacL : .3;
  g += membre(k.jambeL, W.jambe, C.membre, opL);
  // bras du dessus : opaque quand il est levé et porteur de sens (planches latérales)
  if(o.brasLPlein) g += membre(k.brasL, W.bras, C.corps);
  else g += membre(k.brasL, W.bras, C.membre, opL);
  g += `<path d="${v.contour}" fill="${C.corps}"/>`;
  g += `<path d="${v.ligne}" fill="none" stroke="${v.cone>0.35?C.ventreErr:C.ventre}" stroke-width="3.2" stroke-linecap="round"/>`;
  g += `<g transform="translate(${f(k.tete[0])},${f(k.tete[1])}) rotate(${f(-k.teteAng)})">`
     + `<ellipse rx="${L.headR+1.2}" ry="${L.headR-1}" fill="${C.corps}"/>`
     + `<circle cx="${f((L.headR+1.2)*0.72*k.face)}" cy="1.5" r="1.9" fill="#fff" opacity=".85"/></g>`;
  g += membre(k.jambeP, W.jambe, C.corps);
  g += membre(k.brasP,  W.bras,  C.corps);
  [k.jambeP[1], k.jambeP[2], k.brasP[1]].forEach(q=>{
    g += `<circle cx="${f(q[0])}" cy="${f(q[1])}" r="1.9" fill="#fff" opacity=".55"/>`;
  });
  if(o.charge){ const m=k.brasP[2];
    g += `<rect x="${f(m[0]-9)}" y="${f(m[1]-3.5)}" width="18" height="7" rx="3.5" fill="${C.actif}"/>`; }
  if(o.elastique){ const m=k.brasP[2];
    g += `<path d="M${f(m[0])} ${f(m[1])} L${f(m[0]-70)} ${f(m[1]-6)}" stroke="${C.actif}" stroke-width="2.4" stroke-dasharray="5 4" fill="none"/>`; }
  return g;
}

/* ============================================================
   POSES — gainage, mobilité, erreurs
   Convention : 90 = vers le haut, 0 = vers la droite.
   ============================================================ */
const MOUV = {

  respiration9090:{
    nom:'Respiration 90/90', vue:[-135,-72,290,115], sol:10, duree:6500,
    cles:[
      {t:0,   label:'Inspire — les côtes s\'écartent sur les côtés', p:P({...DOS, ventre:.16,
        brasP:[190,190], brasL:[192,192], jambeP:[90,180,120], jambeL:[92,178,120]})},
      {t:.4,  label:'Expire 5 secondes — le ventre rentre', p:P({...DOS, ventre:-.3,
        brasP:[190,190], brasL:[192,192], jambeP:[90,180,120], jambeL:[92,178,120]})},
      {t:.7,  label:'Poumons vides, 2 secondes', p:P({...DOS, ventre:-.36,
        brasP:[190,190], brasL:[192,192], jambeP:[90,180,120], jambeL:[92,178,120]})},
      {t:1,   label:'Inspire — les côtes s\'écartent sur les côtés', p:P({...DOS, ventre:.16,
        brasP:[190,190], brasL:[192,192], jambeP:[90,180,120], jambeL:[92,178,120]})}
    ]},

  deadbug:{
    nom:'Dead bug', vue:[-150,-82,330,125], sol:10, duree:5600,
    cles:[
      {t:0,   label:'Bras tendus au sol derrière la tête, genoux à 90°', p:P({...DOS, ventre:-.22,
        brasP:[-10,-10], brasL:[-12,-12], jambeP:[90,180,120], jambeL:[92,178,120]})},
      {t:.4,  label:'Un bras monte, la jambe opposée s\'allonge — expire', p:P({...DOS, ventre:-.34,
        brasP:[85,85], brasL:[-12,-12], jambeP:[90,180,120], jambeL:[176,176,150]})},
      {t:.58, label:'Les lombaires ne décollent pas d\'un millimètre', p:P({...DOS, ventre:-.34,
        brasP:[85,85], brasL:[-12,-12], jambeP:[90,180,120], jambeL:[176,176,150]})},
      {t:1,   label:'Retour lent, inspire', p:P({...DOS, ventre:-.22,
        brasP:[-10,-10], brasL:[-12,-12], jambeP:[90,180,120], jambeL:[92,178,120]})}
    ]},

  reverseCrunch:{
    nom:'Reverse crunch contrôlé', vue:[-140,-90,300,130], sol:10, duree:5200,
    cles:[
      {t:0,   label:'Départ — bas du dos au sol', p:P({...DOS, ventre:-.14,
        brasP:[190,190], brasL:[192,192], jambeP:[95,178,125], jambeL:[97,176,125]})},
      {t:.35, label:'Expire — seul le bassin s\'enroule', p:P({...DOS, ventre:-.34, y:-10,
        spine:[-16,-11,-4], tete:0,
        brasP:[188,188], brasL:[190,190], jambeP:[55,165,110], jambeL:[57,163,110]})},
      {t:.5,  label:'Épaules, nuque et tête ne quittent pas le sol', p:P({...DOS, ventre:-.34, y:-10,
        spine:[-16,-11,-4], tete:0,
        brasP:[188,188], brasL:[190,190], jambeP:[55,165,110], jambeL:[57,163,110]})},
      {t:1,   label:'Descente en 3 secondes', p:P({...DOS, ventre:-.14,
        brasP:[190,190], brasL:[192,192], jambeP:[95,178,125], jambeL:[97,176,125]})}
    ]},

  hollow:{
    nom:'Hollow body hold', vue:[-150,-80,320,125], sol:10, duree:4600,
    cles:[
      {t:0,   label:'Lombaires collées au sol', p:P({...DOS, ventre:-.3, y:2,
        spine:[8,6,4], tete:4, brasP:[6,4], brasL:[8,6], jambeP:[175,175,150], jambeL:[177,177,150]})},
      {t:.5,  label:'Si le dos décolle : remonte bras et jambes', p:P({...DOS, ventre:-.35, y:2,
        spine:[10,7,4], tete:5, brasP:[10,8], brasL:[12,10], jambeP:[170,170,150], jambeL:[172,172,150]})},
      {t:1,   label:'Lombaires collées au sol', p:P({...DOS, ventre:-.3, y:2,
        spine:[8,6,4], tete:4, brasP:[6,4], brasL:[8,6], jambeP:[175,175,150], jambeL:[177,177,150]})}
    ]},

  plancheRKC:{
    nom:'Planche RKC', vue:[-120,-72,270,115], sol:0, duree:4800,
    cles:[
      {t:0,   label:'Bassin en rétroversion, fessiers serrés', p:P({...VENTRE, x:0, y:-24,
        spine:[1,1,1], tete:1, ventre:-.26,
        brasP:[-90,0], brasL:[-92,2], jambeP:[186,186,-95], jambeL:[188,188,-95]})},
      {t:.5,  label:'Coudes tirés vers les pieds — 15 secondes maximum', p:P({...VENTRE, x:0, y:-26,
        spine:[2,2,2], tete:2, ventre:-.34,
        brasP:[-90,0], brasL:[-92,2], jambeP:[187,187,-95], jambeL:[189,189,-95]})},
      {t:1,   label:'Bassin en rétroversion, fessiers serrés', p:P({...VENTRE, x:0, y:-24,
        spine:[1,1,1], tete:1, ventre:-.26,
        brasP:[-90,0], brasL:[-92,2], jambeP:[186,186,-95], jambeL:[188,188,-95]})}
    ]},

  plancheLaterale:{
    nom:'Planche latérale', vue:[-115,-85,255,130], sol:0, duree:6000,
    opt:{brasLPlein:true, opacL:.5},
    cles:[
      {t:0,   label:'Épaule au-dessus du coude, hanche haute', p:P({face:1, x:0, y:-16,
        spine:[13,13,13], tete:13, ventre:-.24,
        brasP:[-90,0], brasL:[78,80], jambeP:[192,192,180], jambeL:[188,188,180]})},
      {t:.34, label:'Ligne oreille — épaule — hanche — cheville', p:P({face:1, x:0, y:-16,
        spine:[13,13,13], tete:13, ventre:-.24,
        brasP:[-90,0], brasL:[78,80], jambeP:[192,192,180], jambeL:[188,188,180]})},
      {t:.67, label:'Pieds empilés, le corps ne bouge pas — 25 secondes', p:P({face:1, x:0, y:-16,
        spine:[13,13,13], tete:13, ventre:-.24,
        brasP:[-90,0], brasL:[78,80], jambeP:[192,192,180], jambeL:[188,188,180]})},
      {t:1,   label:'Épaule au-dessus du coude, hanche haute', p:P({face:1, x:0, y:-16,
        spine:[13,13,13], tete:13, ventre:-.24,
        brasP:[-90,0], brasL:[78,80], jambeP:[192,192,180], jambeL:[188,188,180]})}
    ]},

  copenhagen:{
    nom:'Copenhagen plank', vue:[-125,-85,265,130], sol:0, duree:5000,
    opt:{banc:[-95,-16,54,7], brasLPlein:true, opacL:.5},
    cles:[
      {t:0,   label:'Jambe du dessus posée sur une chaise', p:P({face:1, x:0, y:-14,
        spine:[11,11,11], tete:11, ventre:-.16,
        brasP:[-90,0], brasL:[78,80], jambeP:[188,188,180], jambeL:[176,176,180]})},
      {t:.42, label:'Décolle la jambe du dessous et serre les cuisses', p:P({face:1, x:0, y:-19,
        spine:[13,13,13], tete:13, ventre:-.3,
        brasP:[-90,0], brasL:[78,80], jambeP:[186,186,180], jambeL:[192,192,180]})},
      {t:.7,  label:'Adducteurs et obliques profonds — 20 secondes', p:P({face:1, x:0, y:-19,
        spine:[13,13,13], tete:13, ventre:-.32,
        brasP:[-90,0], brasL:[78,80], jambeP:[186,186,180], jambeL:[192,192,180]})},
      {t:1,   label:'Jambe du dessus posée sur une chaise', p:P({face:1, x:0, y:-14,
        spine:[11,11,11], tete:11, ventre:-.16,
        brasP:[-90,0], brasL:[78,80], jambeP:[188,188,180], jambeL:[176,176,180]})}
    ]},

  shoulderTaps:{
    nom:'Shoulder taps en planche', vue:[-120,-80,270,120], sol:0, duree:5000,
    cles:[
      {t:0,   label:'Planche bras tendus, pieds écartés', p:P({...VENTRE, x:0, y:-46,
        spine:[3,3,3], tete:3, ventre:-.24,
        brasP:[-90,-90], brasL:[-92,-88], jambeP:[203,203,-95], jambeL:[206,206,-95]})},
      {t:.4,  label:'Touche l\'épaule opposée — le bassin ne bascule pas', p:P({...VENTRE, x:0, y:-46,
        spine:[3,3,3], tete:3, ventre:-.34,
        brasP:[-25,-210], brasL:[-92,-88], jambeP:[203,203,-95], jambeL:[206,206,-95]})},
      {t:.58, label:'C\'est ça, l\'anti-rotation', p:P({...VENTRE, x:0, y:-46,
        spine:[3,3,3], tete:3, ventre:-.34,
        brasP:[-25,-210], brasL:[-92,-88], jambeP:[203,203,-95], jambeL:[206,206,-95]})},
      {t:1,   label:'Repose et alterne', p:P({...VENTRE, x:0, y:-46,
        spine:[3,3,3], tete:3, ventre:-.24,
        brasP:[-90,-90], brasL:[-92,-88], jambeP:[203,203,-95], jambeL:[206,206,-95]})}
    ]},

  renegade:{
    nom:'Renegade row', vue:[-120,-80,270,120], sol:0, duree:5000, opt:{charge:true},
    cles:[
      {t:0,   label:'Planche sur les haltères, pieds écartés', p:P({...VENTRE, x:0, y:-48,
        spine:[3,3,3], tete:3, ventre:-.24,
        brasP:[-90,-90], brasL:[-92,-88], jambeP:[204,204,-95], jambeL:[207,207,-95]})},
      {t:.4,  label:'Tire l\'haltère sans que le bassin tourne', p:P({...VENTRE, x:0, y:-48,
        spine:[3,3,3], tete:3, ventre:-.34,
        brasP:[-118,-142], brasL:[-92,-88], jambeP:[204,204,-95], jambeL:[207,207,-95]})},
      {t:.58, label:'Même travail anti-rotation que le Pallof', p:P({...VENTRE, x:0, y:-48,
        spine:[3,3,3], tete:3, ventre:-.34,
        brasP:[-118,-142], brasL:[-92,-88], jambeP:[204,204,-95], jambeL:[207,207,-95]})},
      {t:1,   label:'Repose et alterne', p:P({...VENTRE, x:0, y:-48,
        spine:[3,3,3], tete:3, ventre:-.24,
        brasP:[-90,-90], brasL:[-92,-88], jambeP:[204,204,-95], jambeL:[207,207,-95]})}
    ]},

  birdDog:{
    nom:'Bird dog', vue:[-110,-95,235,130], sol:2, duree:5400,
    cles:[
      {t:0,   label:'Dos plat, bassin neutre', p:P({...QUATRE, y:-39, ventre:-.14,
        brasP:[-95,-88], brasL:[-97,-86], jambeP:[-90,180,160], jambeL:[-92,-182,160]})},
      {t:.42, label:'Expire — rien ne bouge dans le bassin', p:P({...QUATRE, y:-39, ventre:-.28,
        brasP:[8,6], brasL:[-97,-86], jambeP:[-90,180,160], jambeL:[-180,-180,160]})},
      {t:.58, label:'Un verre d\'eau tiendrait sur le bas du dos', p:P({...QUATRE, y:-39, ventre:-.28,
        brasP:[8,6], brasL:[-97,-86], jambeP:[-90,180,160], jambeL:[-180,-180,160]})},
      {t:1,   label:'Retour lent', p:P({...QUATRE, y:-39, ventre:-.14,
        brasP:[-95,-88], brasL:[-97,-86], jambeP:[-90,180,160], jambeL:[-92,-182,160]})}
    ]},

  vacuum:{
    nom:'Vacuum abdominal', vue:[-110,-95,235,130], sol:2, duree:7500,
    cles:[
      {t:0,   label:'Position de départ, respiration normale', p:P({...QUATRE, y:-39, ventre:.28,
        brasP:[-95,-88], brasL:[-97,-86], jambeP:[-90,180,160], jambeL:[-92,-182,160]})},
      {t:.24, label:'Expire tout l\'air, jusqu\'au bout', p:P({...QUATRE, y:-39, ventre:-.08,
        brasP:[-95,-88], brasL:[-97,-86], jambeP:[-90,180,160], jambeL:[-92,-182,160]})},
      {t:.44, label:'Poumons vides : aspire le ventre sous les côtes', p:P({...QUATRE, y:-39, ventre:-.52,
        brasP:[-95,-88], brasL:[-97,-86], jambeP:[-90,180,160], jambeL:[-92,-182,160]})},
      {t:.8,  label:'Tiens 10 à 15 secondes sans inspirer', p:P({...QUATRE, y:-39, ventre:-.56,
        brasP:[-95,-88], brasL:[-97,-86], jambeP:[-90,180,160], jambeL:[-92,-182,160]})},
      {t:1,   label:'Relâche et respire', p:P({...QUATRE, y:-39, ventre:.28,
        brasP:[-95,-88], brasL:[-97,-86], jambeP:[-90,180,160], jambeL:[-92,-182,160]})}
    ]},

  pallof:{
    nom:'Pallof press', vue:[-115,-108,235,215], sol:78, duree:5200, opt:{elastique:true},
    cles:[
      {t:0,   label:'Câble sur le côté, mains contre le sternum', p:P({x:0, y:0, ventre:-.14,
        brasP:[-55,60], brasL:[-57,58], jambeP:[-85,-92,0], jambeL:[-95,-88,0]})},
      {t:.4,  label:'Pousse — le buste ne tourne pas d\'un degré', p:P({x:0, y:0, ventre:-.3,
        brasP:[0,0], brasL:[-2,-2], jambeP:[-85,-92,0], jambeL:[-95,-88,0]})},
      {t:.62, label:'Tiens 2 secondes, puis reviens', p:P({x:0, y:0, ventre:-.32,
        brasP:[0,0], brasL:[-2,-2], jambeP:[-85,-92,0], jambeL:[-95,-88,0]})},
      {t:1,   label:'Câble sur le côté, mains contre le sternum', p:P({x:0, y:0, ventre:-.14,
        brasP:[-55,60], brasL:[-57,58], jambeP:[-85,-92,0], jambeL:[-95,-88,0]})}
    ]},

  suitcase:{
    nom:'Suitcase carry', vue:[-105,-108,215,215], sol:78, duree:4600, opt:{charge:true},
    cles:[
      {t:0,   label:'Une seule charge, buste parfaitement droit', p:P({x:0, y:0, ventre:-.2,
        brasP:[-90,-90], brasL:[-88,-88], jambeP:[-72,-96,0], jambeL:[-108,-84,0]})},
      {t:.5,  label:'Aucune inclinaison : les obliques résistent', p:P({x:0, y:-3, ventre:-.3,
        brasP:[-90,-90], brasL:[-88,-88], jambeP:[-108,-84,0], jambeL:[-72,-96,0]})},
      {t:1,   label:'30 à 40 mètres par bras', p:P({x:0, y:0, ventre:-.2,
        brasP:[-90,-90], brasL:[-88,-88], jambeP:[-72,-96,0], jambeL:[-108,-84,0]})}
    ]},

  pontFessier:{
    nom:'Pont fessier', vue:[-140,-80,300,128], sol:10, duree:4800,
    cles:[
      {t:0,   label:'Départ, bassin au sol, talons près des fesses', p:P({...DOS, ventre:-.1,
        brasP:[190,190], brasL:[192,192], jambeP:[133,-109,180], jambeL:[135,-107,180]})},
      {t:.4,  label:'Monte par les fessiers, pas par les lombaires', p:P({...DOS, y:-16,
        spine:[-25,-17,-2], tete:0, ventre:-.28,
        brasP:[190,190], brasL:[192,192], jambeP:[159,-95,180], jambeL:[161,-93,180]})},
      {t:.6,  label:'Épaule, hanche et genou alignés — serre 2 secondes', p:P({...DOS, y:-17,
        spine:[-26,-18,-2], tete:0, ventre:-.3,
        brasP:[190,190], brasL:[192,192], jambeP:[160,-94,180], jambeL:[162,-92,180]})},
      {t:1,   label:'Redescends lentement', p:P({...DOS, ventre:-.1,
        brasP:[190,190], brasL:[192,192], jambeP:[133,-109,180], jambeL:[135,-107,180]})}
    ]},

  psoas:{
    nom:'Étirement du psoas', vue:[-105,-105,220,175], sol:38, duree:6000,
    cles:[
      {t:0,   label:'Chevalier servant, genou arrière au sol', p:P({x:-20, y:-1, ventre:.12,
        spine:[88,88,88], tete:88,
        brasP:[-88,-88], brasL:[-86,-86], jambeP:[-3,-90,0], jambeL:[-90,180,160]})},
      {t:.38, label:'Rentre le ventre, puis avance le bassin', p:P({x:-6.7, y:1.3, ventre:-.26,
        spine:[95,93,91], tete:91,
        brasP:[88,88], brasL:[-86,-86], jambeP:[-3,-111,0], jambeL:[-110,180,160]})},
      {t:.72, label:'Cuisses ouvertes à plus de 90° — 45 secondes', p:P({x:-5, y:1.6, ventre:-.3,
        spine:[97,95,92], tete:92,
        brasP:[89,89], brasL:[-86,-86], jambeP:[-3,-113,0], jambeL:[-113,180,160]})},
      {t:1,   label:'Chevalier servant, genou arrière au sol', p:P({x:-20, y:-1, ventre:.12,
        spine:[88,88,88], tete:88,
        brasP:[-88,-88], brasL:[-86,-86], jambeP:[-3,-90,0], jambeL:[-90,180,160]})}
    ]},

  tableInversee:{
    nom:'Table inversée', vue:[-92,-78,180,105], sol:0, duree:5600,
    cles:[
      {t:0,   label:'Assis, mains au sol derrière, bras verrouillés', p:P({face:-1, x:-10, y:-27,
        spine:[30,30,30], tete:5, ventre:.06,
        brasP:[-90,-90], brasL:[-92,-88], jambeP:[166,-101,180], jambeL:[167,-101,178]})},
      {t:.4,  label:'Monte le bassin par les fessiers, côtes basses', p:P({face:-1, x:-10, y:-45,
        spine:[5,5,5], tete:-2, ventre:-.05,
        brasP:[-90,-90], brasL:[-92,-88], jambeP:[193,-101,180], jambeL:[194,-101,178]})},
      {t:.62, label:'Tronc et cuisses alignés — tiens 2 secondes', p:P({face:-1, x:-10, y:-45,
        spine:[5,5,5], tete:-2, ventre:-.05,
        brasP:[-90,-90], brasL:[-92,-88], jambeP:[193,-101,180], jambeL:[194,-101,178]})},
      {t:1,   label:'Redescends lentement, sans t\'asseoir lourdement', p:P({face:-1, x:-10, y:-27,
        spine:[30,30,30], tete:5, ventre:.06,
        brasP:[-90,-90], brasL:[-92,-88], jambeP:[166,-101,180], jambeL:[167,-101,178]})}
    ]},

  /* ---------- erreurs ---------- */

  errCrunch:{
    nom:'Crunch : le bombement en cône', erreur:true, vue:[-135,-92,290,132], sol:10, duree:5200,
    cles:[
      {t:0,   label:'Départ, pieds à plat, orteils vers l\'avant', p:P({...DOS, ventre:.12, cone:0,
        brasP:[44,-54], brasL:[40,-60], jambeP:[140,-109,180], jambeL:[142,-107,180]})},
      {t:.18, label:'Le buste s\'enroule — le ventre pousse en pointe', p:P({...DOS, ventre:.95, cone:1,
        spine:[26,16,6], tete:-18,
        brasP:[54,-44], brasL:[50,-50], jambeP:[140,-109,180], jambeL:[142,-107,180]})},
      {t:.3,  label:'Le buste s\'enroule — le ventre pousse en pointe', p:P({...DOS, ventre:.95, cone:1,
        spine:[26,16,6], tete:-18,
        brasP:[54,-44], brasL:[50,-50], jambeP:[140,-109,180], jambeL:[142,-107,180]})},
      {t:.48, label:'Et on recommence, série après série', p:P({...DOS, ventre:.12, cone:0,
        brasP:[44,-54], brasL:[40,-60], jambeP:[140,-109,180], jambeL:[142,-107,180]})},
      {t:.66, label:'Répété, cela distend la ligne blanche', p:P({...DOS, ventre:.98, cone:1,
        spine:[27,17,6], tete:-19,
        brasP:[54,-44], brasL:[50,-50], jambeP:[140,-109,180], jambeL:[142,-107,180]})},
      {t:.78, label:'Répété, cela distend la ligne blanche', p:P({...DOS, ventre:.98, cone:1,
        spine:[27,17,6], tete:-19,
        brasP:[54,-44], brasL:[50,-50], jambeP:[140,-109,180], jambeL:[142,-107,180]})},
      {t:1,   label:'Départ, pieds à plat, orteils vers l\'avant', p:P({...DOS, ventre:.12, cone:0,
        brasP:[44,-54], brasL:[40,-60], jambeP:[140,-109,180], jambeL:[142,-107,180]})}
    ]},

  errPlanche:{
    nom:'Planche : le bassin qui s\'affaisse', erreur:true, vue:[-120,-72,270,115], sol:0, duree:4800,
    cles:[
      {t:0,   label:'Début de série, alignement correct', p:P({...VENTRE, x:0, y:-24,
        spine:[1,1,1], tete:1, ventre:-.22, cone:0,
        brasP:[-90,0], brasL:[-92,2], jambeP:[186,186,-95], jambeL:[188,188,-95]})},
      {t:.55, label:'Fatigue : le bassin tombe, le dos se creuse', p:P({...VENTRE, x:0, y:-14,
        spine:[16,14,12], tete:10, ventre:.78, cone:.6,
        brasP:[-90,0], brasL:[-92,2], jambeP:[180,180,-95], jambeL:[182,182,-95]})},
      {t:.8,  label:'Arrête la série ici plutôt que d\'aller à l\'échec', p:P({...VENTRE, x:0, y:-13,
        spine:[17,15,12], tete:10, ventre:.82, cone:.65,
        brasP:[-90,0], brasL:[-92,2], jambeP:[180,180,-95], jambeL:[182,182,-95]})},
      {t:1,   label:'Début de série, alignement correct', p:P({...VENTRE, x:0, y:-24,
        spine:[1,1,1], tete:1, ventre:-.22, cone:0,
        brasP:[-90,0], brasL:[-92,2], jambeP:[186,186,-95], jambeL:[188,188,-95]})}
    ]},

  errJambesTendues:{
    nom:'Relevé de jambes tendues', erreur:true, vue:[-150,-88,320,130], sol:10, duree:5000,
    cles:[
      {t:0,   label:'Jambes en haut, dos encore plaqué', p:P({...DOS, ventre:-.08, cone:0,
        brasP:[190,190], brasL:[192,192], jambeP:[92,92,140], jambeL:[94,94,140]})},
      {t:.5,  label:'En descendant, les lombaires décollent', p:P({...DOS, ventre:.85, cone:.75, y:-2,
        spine:[-10,-5,2], tete:4,
        brasP:[180,180], brasL:[181,181], jambeP:[168,168,150], jambeL:[170,170,150]})},
      {t:.7,  label:'La pression pousse la paroi vers l\'avant', p:P({...DOS, ventre:.92, cone:.8, y:-2,
        spine:[-11,-5,2], tete:4,
        brasP:[180,180], brasL:[181,181], jambeP:[172,172,150], jambeL:[174,174,150]})},
      {t:1,   label:'Jambes en haut, dos encore plaqué', p:P({...DOS, ventre:-.08, cone:0,
        brasP:[190,190], brasL:[192,192], jambeP:[92,92,140], jambeL:[94,94,140]})}
    ]}
};

/* ============================================================
   RENDU
   ============================================================ */
const NS = 'http://www.w3.org/2000/svg';
const reduit = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;

function poseA(m, u, brut){
  const c = m.cles;
  let r = {p:c[c.length-1].p, label:c[c.length-1].label};
  for(let i=0;i<c.length-1;i++){
    if(u>=c[i].t && u<=c[i+1].t){
      const span = (c[i+1].t-c[i].t)||1, k = ease((u-c[i].t)/span);
      r = {p: lerpVal(c[i].p, c[i+1].p, k), label: k<0.5? c[i].label : c[i+1].label};
      break;
    }
  }
  if(!brut && m._dy) r.p = Object.assign({}, r.p, {y: r.p.y - m._dy});
  return r;
}

// point le plus bas de la silhouette, épaisseurs comprises
function basSilhouette(k, p){
  let tx = k.s[2][0]-k.hanche[0], ty = k.s[2][1]-k.hanche[1];
  const tl = Math.hypot(tx,ty)||1; tx/=tl; ty/=tl;
  const epV = Math.abs(p.face*tx)*9.5;
  let bas = -Infinity;
  k.s.forEach(q=>{ bas = Math.max(bas, q[1]+epV); });
  bas = Math.max(bas, k.tete[1]+L.headR+1);
  [[k.jambeP,W.jambe],[k.jambeL,W.jambe],[k.brasP,W.bras],[k.brasL,W.bras]].forEach(([pts,ws])=>{
    pts.forEach((q,i)=>{ bas = Math.max(bas, q[1]+ws[i]); });
  });
  return bas;
}

// calibrage : rien ne passe sous la ligne de sol
function limiteSol(m){
  if(m._dy !== undefined) return m._dy;
  if(m.sol === undefined || m.sol === null){ m._dy = 0; return 0; }
  let pire = 0;
  for(let u=0; u<=1.0001; u+=0.02){
    const {p} = poseA(m, Math.min(u,1), true);
    const bas = basSilhouette(squelette(p), p);
    if(bas > m.sol) pire = Math.max(pire, bas - m.sol);
  }
  m._dy = Math.round(pire*10)/10;
  return m._dy;
}

function monte(hote, id){
  const m = MOUV[id];
  if(!m) return null;
  limiteSol(m);
  hote.innerHTML = '';
  hote.classList.add('anim-hote');
  if(m.erreur) hote.classList.add('anim-err');

  const svg = document.createElementNS(NS,'svg');
  svg.setAttribute('viewBox', m.vue.join(' '));
  svg.setAttribute('class','anim-svg');
  svg.setAttribute('role','img');
  svg.setAttribute('aria-label', m.nom);
  hote.appendChild(svg);

  const legende = document.createElement('div');
  legende.className = 'anim-legende';
  hote.appendChild(legende);

  const btn = document.createElement('button');
  btn.className = 'anim-btn'; btn.type = 'button';
  hote.appendChild(btn);

  let joue = !reduit, t0 = performance.now(), raf = null, visible = true;

  function image(now){
    const u = joue ? ((now - t0) % m.duree) / m.duree : 0.5;
    const {p, label} = poseA(m, u);
    svg.innerHTML =
      (m.sol !== undefined && m.sol !== null
        ? `<line x1="${m.vue[0]}" y1="${m.sol}" x2="${m.vue[0]+m.vue[2]}" y2="${m.sol}" stroke="${COL.sol}" stroke-width="2" stroke-dasharray="6 6"/>` : '')
      + dessine(squelette(p), m.opt||{});
    legende.textContent = label;
    if(joue && visible) raf = requestAnimationFrame(image); else raf = null;
  }
  function relance(){ if(!raf && joue && visible){ t0 = performance.now(); raf = requestAnimationFrame(image); } }

  btn.addEventListener('click', e=>{
    e.stopPropagation();
    joue = !joue;
    btn.classList.toggle('pause', joue);
    btn.setAttribute('aria-label', joue?'Mettre en pause':'Lancer l\'animation');
    if(joue){ t0 = performance.now(); relance(); } else image(performance.now());
  });
  btn.classList.toggle('pause', joue);
  btn.setAttribute('aria-label', joue?'Mettre en pause':'Lancer l\'animation');

  if('IntersectionObserver' in global){
    new IntersectionObserver(es=>{ visible = es[0].isIntersecting; if(visible) relance(); },
      {threshold:0.05}).observe(hote);
  }
  image(performance.now());
  return true;
}

function monteTous(racine){
  (racine||document).querySelectorAll('[data-anim]').forEach(el=>{
    if(el.dataset.montee==='1') return;
    if(monte(el, el.dataset.anim)) el.dataset.montee='1';
  });
}

global.Mouvements = {MOUV, monte, monteTous, squelette, dessine, poseA, limiteSol, basSilhouette, COL,
  liste:()=>Object.keys(MOUV)};
})(window);
