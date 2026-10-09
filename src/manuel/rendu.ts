import { MANUEL, type Bloc } from './contenu';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** Mise en forme en ligne : **gras**, `code`. */
export const inline = (s: string) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`(.+?)`/g, '<code>$1</code>');

export function blocHTML(b: Bloc, img: (f: string) => string, fig: { n: number }): string {
  if ('p' in b) return `<p>${inline(b.p)}</p>`;
  if ('liste' in b) return `<ul>${b.liste.map(i => `<li>${inline(i)}</li>`).join('')}</ul>`;
  if ('etapes' in b) return `<ol class="etapes">${b.etapes.map(i => `<li>${inline(i)}</li>`).join('')}</ol>`;
  if ('note' in b) return `<div class="note">${inline(b.note)}</div>`;
  if ('image' in b) { fig.n++; return `<figure><img src="${img(b.image)}" alt="${esc(b.legende)}" loading="lazy"/><figcaption>Figure ${fig.n} — ${esc(b.legende)}</figcaption></figure>`; }
  return `<table><thead><tr>${b.tableau.entetes.map(h => `<th>${inline(h)}</th>`).join('')}</tr></thead><tbody>${b.tableau.lignes.map(l => `<tr>${l.map(c => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

/** Document HTML complet (génération du PDF). */
export function manuelHTML(img: (f: string) => string, version: string): string {
  const fig = { n: 0 };
  const toc = MANUEL.map((s, i) => `<li><a href="#${s.id}">${i + 1}. ${esc(s.titre)}</a></li>`).join('');
  const body = MANUEL.map((s, i) => `<section id="${s.id}"><h1>${i + 1}. ${esc(s.titre)}</h1>${s.blocs.map(b => blocHTML(b, img, fig)).join('\n')}</section>`).join('\n');
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Manuel d'utilisation — Poteaux EC2 v${version}</title><style>
  @page { size: A4; margin: 18mm 16mm 18mm 18mm; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #111; line-height: 1.45; }
  .garde { height: 250mm; display: flex; flex-direction: column; justify-content: center; page-break-after: always; }
  .garde h1 { font-size: 26pt; color: #0f3d5c; margin: 0 0 4mm; border: 0; } .garde p { font-size: 12pt; color: #444; }
  h1 { font-size: 15pt; color: #0f3d5c; border-bottom: 1.5px solid #1d6fa5; padding-bottom: 1.5mm; page-break-before: always; }
  section:first-of-type h1 { page-break-before: auto; }
  .toc { page-break-after: always; } .toc li { margin: 1.5mm 0; } .toc a { color: #111; text-decoration: none; }
  figure { margin: 4mm 0; text-align: center; page-break-inside: avoid; } figure img { max-width: 100%; max-height: 120mm; border: 1px solid #ccc; }
  figcaption { font-size: 8.5pt; color: #0f3d5c; font-weight: bold; margin-top: 1.5mm; }
  table { width: 100%; border-collapse: collapse; margin: 3mm 0; font-size: 9pt; page-break-inside: avoid; }
  th { background: #e8f1f8; text-align: left; } th, td { border: 1px solid #c8d4de; padding: 1.5mm 2mm; vertical-align: top; }
  .note { background: #fffbeb; border: 1px solid #fcd34d; border-radius: 2mm; padding: 2.5mm 3mm; margin: 3mm 0; }
  code { font-family: Consolas, monospace; background: #f3f4f6; padding: 0 1mm; border-radius: 1mm; font-size: 9pt; }
  ol.etapes li { margin-bottom: 1.5mm; }
  </style></head><body>
  <div class="garde"><h1>Manuel d'utilisation</h1><p>Dimensionnement des poteaux aux Eurocodes — version ${esc(version)}</p><p>NF EN 1992-1-1 et son Annexe nationale · EN 1992-1-2</p></div>
  <div class="toc"><h1 style="page-break-before:auto">Sommaire</h1><ol style="list-style:none;padding:0">${toc}</ol></div>
  ${body}</body></html>`;
}

/** Version Markdown (docs/manuel/MANUEL_UTILISATEUR.md). */
export function manuelMarkdown(img: (f: string) => string, version: string): string {
  let fig = 0;
  const md = (b: Bloc): string => {
    if ('p' in b) return b.p;
    if ('liste' in b) return b.liste.map(i => `- ${i}`).join('\n');
    if ('etapes' in b) return b.etapes.map((i, k) => `${k + 1}. ${i}`).join('\n');
    if ('note' in b) return `> ${b.note}`;
    if ('image' in b) { fig++; return `![${b.legende}](${img(b.image)})\n\n*Figure ${fig} — ${b.legende}*`; }
    const t = b.tableau;
    return [`| ${t.entetes.join(' | ')} |`, `|${t.entetes.map(() => '---').join('|')}|`, ...t.lignes.map(l => `| ${l.map(c => c.replace(/\|/g, '/')).join(' | ')} |`)].join('\n');
  };
  return [`# Manuel d'utilisation — Dimensionnement des poteaux aux Eurocodes`, '', `Version ${version}. Document généré par \`npm run manuel\` à partir de \`src/manuel/contenu.ts\` ; captures d'écran régénérées à chaque version.`, '',
    '## Sommaire', '', ...MANUEL.map((s, i) => `${i + 1}. [${s.titre}](#${s.id})`), '',
    ...MANUEL.flatMap((s, i) => [`<a id="${s.id}"></a>`, `## ${i + 1}. ${s.titre}`, '', ...s.blocs.flatMap(b => [md(b), ''])])].join('\n');
}
