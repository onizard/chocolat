// Fabrique « Flashcards Norah.pdf » : des cartes à imprimer en recto verso.
// Recto = français, verso = anglais. Chaque feuille A4 porte 12 cartes (3 × 4).
// Sur les pages verso, les colonnes sont inversées pour que chaque mot anglais
// tombe exactement derrière son mot français (impression « bord long »).
//
// Le vocabulaire est lu directement dans ../index.html : ajouter un mot au site
// l'ajoute aussi aux cartes.
//
// Usage : NODE_PATH=$(npm root -g) node anglais/imprimer/build_pdf.js [sortie.pdf]
// (Playwright et Chromium sont nécessaires. Les polices sont intégrées si
// `python3 anglais/mac/build_dmg.py` a accès à Internet ; sinon polices de secours.)
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ICI = __dirname;
const SITE = path.join(ICI, '..', 'index.html');
const SORTIE = process.argv[2] || path.join(ICI, 'dist', 'Flashcards Norah.pdf');
const PAR_PAGE = 12, COLS = 3;

function polices() {
  try {
    return execFileSync('python3', ['-c',
      'import sys; sys.path.insert(0, sys.argv[1]); import build_dmg; print(build_dmg.polices_integrees() or "")',
      path.join(ICI, '..', 'mac')], { encoding: 'utf8', maxBuffer: 1 << 26 });
  } catch (e) { return ''; }
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function taille(txt) {
  const n = txt.length;
  return n <= 10 ? 't1' : n <= 18 ? 't2' : n <= 30 ? 't3' : n <= 45 ? 't4' : 't5';
}

(async () => {
  const navigateur = await chromium.launch({ executablePath: fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined });
  const page = await navigateur.newPage();
  await page.goto('file://' + SITE);
  const themes = await page.evaluate(() => THEMES.map(t => ({ nom: t.nom, sous: t.sous, cards: t.cards.map(c => ({ fr: c.fr, en: c.en, note: c.note })) })));

  // Découpage en feuilles : chaque leçon commence sur une nouvelle feuille,
  // pour pouvoir n'imprimer que certaines leçons.
  const feuilles = [];
  let num = 0;
  const sommaire = [];
  for (const t of themes) {
    const debut = feuilles.length;
    for (let i = 0; i < t.cards.length; i += PAR_PAGE) {
      feuilles.push({ theme: t, cartes: t.cards.slice(i, i + PAR_PAGE).map(c => ({ ...c, num: ++num })) });
    }
    // page PDF : 1-2 = mode d'emploi, puis 2 pages par feuille
    sommaire.push({ nom: t.nom, sous: t.sous, n: t.cards.length, de: 3 + debut * 2, a: 2 + feuilles.length * 2 });
  }

  const carte = (c, face, theme) => {
    if (!c) return '<div class="carte vide"></div>';
    const txt = face === 'fr' ? c.fr : c.en;
    const note = face === 'en' && c.note ? `<p class="note">${esc(c.note)}</p>` : '';
    return `<div class="carte ${face}">
      <div class="haut"><span class="tag">${face === 'fr' ? 'FRANÇAIS' : 'ENGLISH'}</span><span class="num">${c.num}</span></div>
      <div class="mot ${taille(txt)}" ${face === 'en' ? 'lang="en"' : ''}>${esc(txt)}</div>
      ${note}
      <div class="bas">${esc(theme.nom)}</div>
    </div>`;
  };
  const grille = (f, face) => {
    const cases = Array.from({ length: PAR_PAGE }, (_, i) => f.cartes[i]);
    if (face === 'en') {  // miroir horizontal, ligne par ligne
      const lignes = [];
      for (let i = 0; i < PAR_PAGE; i += COLS) lignes.push(...cases.slice(i, i + COLS).reverse());
      return lignes.map(c => carte(c, face, f.theme)).join('');
    }
    return cases.map(c => carte(c, face, f.theme)).join('');
  };

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">${polices()}
<style>
@page { size: A4; margin: 0 }
:root { --encre:#1D2333; --doux:#586079; --fr:#2F5DB8; --en:#B83A45; --miel:#F2B415; --trait:#9AA3B5;
  --display:"Fredoka","Trebuchet MS",sans-serif; --texte:"Atkinson Hyperlegible","Segoe UI",sans-serif; }
* { box-sizing:border-box; margin:0; padding:0 }
body { font-family:var(--texte); color:var(--encre); background:#fff }
.page { width:210mm; height:297mm; position:relative; page-break-after:always; overflow:hidden }
.grille { position:absolute; left:10.5mm; top:12.5mm; width:189mm; height:272mm;
  display:grid; grid-template-columns:repeat(3, 63mm); grid-template-rows:repeat(4, 68mm) }
.carte { border:0.3mm dashed var(--trait); padding:5mm 5mm 4mm; display:flex; flex-direction:column; align-items:center; text-align:center; position:relative }
.carte.vide { border-color:transparent }
.carte::before { content:""; position:absolute; left:0; right:0; top:0; height:2.2mm }
.carte.fr::before { background:var(--fr) }
.carte.en::before { background:var(--en) }
.haut { width:100%; display:flex; justify-content:space-between; align-items:center; margin-top:1mm }
.tag { font-size:7pt; font-weight:700; letter-spacing:.08em }
.fr .tag { color:var(--fr) } .en .tag { color:var(--en) }
.num { font-size:7pt; color:var(--doux); font-variant-numeric:tabular-nums }
.mot { flex:1; display:flex; align-items:center; justify-content:center; font-family:var(--display); font-weight:600; line-height:1.15; overflow-wrap:anywhere; text-wrap:balance; padding:2mm 0 }
.t1 { font-size:27pt } .t2 { font-size:21pt } .t3 { font-size:16pt } .t4 { font-size:13.5pt } .t5 { font-size:12pt }
.en .mot { letter-spacing:.01em }
.note { font-size:7.5pt; color:var(--doux); line-height:1.3; margin-bottom:2mm }
.bas { font-size:6.5pt; color:var(--doux); text-transform:uppercase; letter-spacing:.08em }
/* Mode d'emploi */
.guide { padding:20mm 20mm; display:flex; flex-direction:column; gap:7mm }
.guide h1 { font-family:var(--display); font-weight:700; font-size:30pt; line-height:1.1 }
.guide h2 { font-family:var(--display); font-weight:600; font-size:15pt; margin-bottom:2mm }
.guide p, .guide li { font-size:11pt; line-height:1.5 }
.guide ol { padding-left:6mm; display:flex; flex-direction:column; gap:1.5mm }
.entete { display:flex; align-items:center; gap:5mm }
.sous { color:var(--doux); font-size:12pt; margin-top:1mm }
table { border-collapse:collapse; width:100%; font-size:10.5pt }
td, th { text-align:left; padding:1.6mm 2mm; border-bottom:0.2mm solid #D5DBE7 }
th { font-size:8pt; letter-spacing:.08em; text-transform:uppercase; color:var(--doux) }
td.n, th.n { text-align:right; font-variant-numeric:tabular-nums; white-space:nowrap }
.encadre { border:0.4mm solid var(--miel); background:#FFF8E1; border-radius:3mm; padding:4mm 5mm }
.verso-blanc { display:flex; align-items:center; justify-content:center; color:#B7BECC; font-size:10pt }
</style></head><body>
<section class="page guide">
  <div class="entete">
    <svg width="22mm" height="22mm" viewBox="0 0 64 64"><ellipse cx="22" cy="20" rx="11" ry="8" fill="#E5ECFA" stroke="#2F5DB8" stroke-width="2" transform="rotate(-25 22 20)"/><ellipse cx="40" cy="18" rx="11" ry="8" fill="#E5ECFA" stroke="#2F5DB8" stroke-width="2" transform="rotate(25 40 18)"/><ellipse cx="32" cy="38" rx="18" ry="15" fill="#F2B415"/><path d="M24 25.5v25M32 23v30M40 25.5v25" stroke="#1D2333" stroke-width="4.5"/><circle cx="47" cy="34" r="2.3" fill="#1D2333"/></svg>
    <div><h1>Norah's Spelling Bee</h1><p class="sous">Flashcards d'anglais 6e · ${num} cartes à imprimer</p></div>
  </div>
  <div class="encadre"><h2>Imprimer</h2><ol>
    <li>Imprime en <b>recto verso</b>, retournement sur le <b>bord long</b>, à <b>taille réelle (100 %)</b>, sans « ajuster à la page ».</li>
    <li>Coupe le long des pointillés. Chaque carte a un numéro identique au recto et au verso.</li>
    <li>Pas d'impression recto verso ? Imprime les pages impaires, remets la pile dans le bac, puis imprime les pages paires.</li>
  </ol></div>
  <div><h2>Les leçons</h2>
  <p style="margin-bottom:2mm">Chaque leçon commence sur une nouvelle feuille : pour n'en imprimer qu'une, indique ses pages.</p>
  <table><thead><tr><th>Leçon</th><th class="n">Cartes</th><th class="n">Pages</th></tr></thead><tbody>
  ${sommaire.map(s => `<tr><td><b>${esc(s.nom)}</b> · <span style="color:var(--doux)">${esc(s.sous)}</span></td><td class="n">${s.n}</td><td class="n">${s.de}–${s.a}</td></tr>`).join('')}
  </tbody></table></div>
  <div><h2>S'entraîner</h2><ol>
    <li>Regarde le côté français, écris le mot anglais sur une feuille, puis retourne la carte pour vérifier l'orthographe lettre par lettre.</li>
    <li>Fais deux tas : « je sais » et « à revoir ». Recommence avec le tas « à revoir » jusqu'à ce qu'il soit vide.</li>
    <li>Le lendemain, fais l'inverse : de l'anglais vers le français.</li>
  </ol></div>
</section>
<section class="page verso-blanc">Page laissée blanche (verso du mode d'emploi)</section>
${feuilles.map(f => `<section class="page"><div class="grille">${grille(f, 'fr')}</div></section>
<section class="page"><div class="grille">${grille(f, 'en')}</div></section>`).join('\n')}
</body></html>`;

  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  fs.mkdirSync(path.dirname(SORTIE), { recursive: true });
  await page.pdf({ path: SORTIE, format: 'A4', printBackground: true, preferCSSPageSize: true });
  await navigateur.close();
  console.log(`Créé : ${SORTIE} (${num} cartes, ${2 + feuilles.length * 2} pages)`);
})();
