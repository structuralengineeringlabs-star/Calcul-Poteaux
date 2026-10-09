/**
 * Génération directe des PDF (sans boîte d'impression du navigateur) — pdfmake, chargé à la demande.
 *  - buildNotePDF : note de calcul A4 (sommaire et listes avec numéros de page réels, en-têtes,
 *    pieds de page « Page n / N », équations encadrées et numérotées, tableaux, figures vectorielles).
 *  - buildPlansPDF : plans de ferraillage A3 paysage, une page par poteau, à l'échelle indiquée.
 * Le contenu provient des mêmes blocs que l'aperçu HTML (note.ts).
 */
import { estLogoSEL, selLogoSVG, SEL } from '../brand/sel';
import type { Content, TDocumentDefinitions, ContentText, TableCell, CustomTableLayout } from 'pdfmake/interfaces';
import { buildNoteDoc, type NoteBlock, type NoteColumn, type NoteOptions } from './note';
import { buildSheet, toSVG } from '../drawing';
import { concreteLabel } from '../eurocode';
import type { ProjectInfo } from '../store';

const BLEU = '#0f3d5c', BLEU2 = '#1d6fa5', GRIS = '#555555';
const MM = 72 / 25.4;

// ---------------------------------------------------------------------------
// HTML restreint → fragments de texte pdfmake
// ---------------------------------------------------------------------------

type Run = { text: string; bold?: boolean; italics?: boolean; sub?: boolean; sup?: boolean; color?: string; fontSize?: number; background?: string };
const ENT: Record<string, string> = { '&lt;': '<', '&gt;': '>', '&amp;': '&', '&quot;': '"', '&#39;': "'", '&nbsp;': '\u00a0' };
/** Caractères absents de la police (Roboto) remplacés par un équivalent. */
const glyphes = (s: string) => s.replace(/\u202f/g, '\u2009').replace(/→/g, '›').replace(/∅/g, 'Ø');
const STATUT: Record<string, { t?: string; color: string }> = { ok: { color: '#166534' }, ko: { color: '#991b1b' }, nv: { color: '#92400e' }, info: { color: '#4b5563' } };

export function runs(html: string, base: Omit<Run, 'text'> = {}): Run[] {
  const out: Run[] = [];
  const stack: Omit<Run, 'text'>[] = [base];
  const re = /<(\/?)([a-z0-9]+)([^>]*)>|([^<]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const cur = stack[stack.length - 1];
    if (m[4] !== undefined) {
      const t = glyphes(m[4].replace(/&[a-z#0-9]+;/gi, e => ENT[e] ?? e));
      if (t) out.push({ ...cur, text: t });
      continue;
    }
    const close = m[1] === '/', tag = m[2].toLowerCase(), attrs = m[3] ?? '';
    if (tag === 'br') { out.push({ ...cur, text: '\n' }); continue; }
    if (close) { if (stack.length > 1) stack.pop(); continue; }
    const next = { ...cur };
    if (tag === 'b' || tag === 'strong') next.bold = true;
    else if (tag === 'i' || tag === 'em') next.italics = true;
    else if (tag === 'sub') { next.sub = true; }
    else if (tag === 'sup') { next.sup = true; }
    else if (tag === 'span') {
      const st = /class="st (\w+)"/.exec(attrs);
      if (st) { next.bold = true; next.color = STATUT[st[1]]?.color ?? GRIS; next.fontSize = 8; }
      if (/eq-note/.test(attrs)) { next.italics = false; next.fontSize = 8; next.color = GRIS; }
    }
    stack.push(next);
  }
  return out;
}
const txt = (html: string, base: Omit<Run, 'text'> = {}): ContentText => ({ text: runs(html, base) as ContentText['text'] });

// ---------------------------------------------------------------------------
// Mises en page des tableaux
// ---------------------------------------------------------------------------

const layoutTable: CustomTableLayout = {
  hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => '#c8d4de', vLineColor: () => '#c8d4de',
  fillColor: (row: number) => (row === 0 ? '#e8f1f8' : null), paddingLeft: () => 4, paddingRight: () => 4, paddingTop: () => 2.5, paddingBottom: () => 2.5,
};
const layoutEq: CustomTableLayout = {
  hLineWidth: () => 0, vLineWidth: (i: number) => (i === 0 ? 2 : 0), vLineColor: () => BLEU2, fillColor: () => '#f6f8fa',
  paddingLeft: () => 6, paddingRight: () => 4, paddingTop: () => 3, paddingBottom: () => 3,
};
const layoutBox = (fill: string, line: string): CustomTableLayout => ({
  hLineWidth: () => 0.7, vLineWidth: () => 0.7, hLineColor: () => line, vLineColor: () => line, fillColor: () => fill,
  paddingLeft: () => 7, paddingRight: () => 7, paddingTop: () => 5, paddingBottom: () => 5,
});
const ALERT = { ok: ['#ecfdf5', '#86efac'], ko: ['#fef2f2', '#fca5a5'], nv: ['#fffbeb', '#fcd34d'] } as const;

const LARGEUR = (210 - 20 - 16) * MM; // largeur utile A4 (marges 20 et 16 mm)

function blocContent(b: NoteBlock): Content {
  switch (b.k) {
    case 'h1': return { text: `${b.num}   ${glyphes(b.title)}`, style: 'h1', tocItem: 'sommaire', pageBreak: 'before', headlineLevel: 1, tocStyle: { bold: true }, tocMargin: [0, 6, 0, 0], id: b.id } as Content;
    case 'h2': return { text: `${b.num}   ${glyphes(b.title)}`, style: 'h2', tocItem: 'sommaire', headlineLevel: 2, tocMargin: [18, 1, 0, 0], id: b.id } as Content;
    case 'h3': return { text: glyphes(b.title), style: 'h3', headlineLevel: 3 } as Content;
    case 'p': return { ...txt(b.html), style: 'p' };
    case 'list': return { ul: b.items.map(i => txt(i)), style: 'p', margin: [0, 2, 0, 4] };
    case 'eq': {
      const corps: Run[] = [...runs(b.sym, { italics: true }), ...(b.num ? [{ text: ' = ' }, ...runs(b.num, { color: '#333333' })] : []), { text: ' = ' }, ...runs(b.res, { bold: true })];
      return {
        unbreakable: true, margin: [0, 2, 0, 3], stack: [
          { text: `Équation ${b.no} — ${glyphes(b.label)}`, style: 'eqLabel', tocItem: 'equations', id: b.id },
          { table: { widths: ['*', 'auto', 22], body: [[
            { text: corps as ContentText['text'], fontSize: 9.5 },
            { text: glyphes(b.ref), fontSize: 7, color: GRIS, margin: [4, 1.5, 0, 0] },
            { text: `(${b.no})`, bold: true, alignment: 'right' },
          ]] }, layout: layoutEq },
        ],
      } as Content;
    }
    case 'table': {
      const al = (j: number) => (b.align[j] === 'r' ? 'right' : b.align[j] === 'c' ? 'center' : 'left');
      const widths = b.head.map((_, j) => (b.align[j] === 'l' && (j === 0 || b.head.length <= 3) ? '*' : 'auto'));
      if (!widths.includes('*')) widths[0] = '*';
      const body: TableCell[][] = [
        b.head.map((h, j) => ({ ...txt(h, { bold: true }), alignment: al(j) }) as TableCell),
        ...b.rows.map(r => r.map((c, j) => ({ ...txt(c), alignment: al(j) }) as TableCell)),
      ];
      const tableau: Content = { table: { headerRows: 1, dontBreakRows: true, keepWithHeaderRows: 1, widths, body }, layout: layoutTable, fontSize: 8.5, margin: [0, 0, 0, 6] };
      const legende: Content = { text: `Tableau ${b.no} — ${glyphes(b.caption)}`, style: 'caption', tocItem: 'tableaux', id: b.id };
      return b.rows.length <= 12 ? { stack: [legende, tableau], unbreakable: true } as Content : { stack: [legende, tableau] };
    }
    case 'fig': return {
      unbreakable: true, margin: [0, 4, 0, 6], stack: [
        // dimensions bornées : largeur demandée, hauteur au plus 110 mm (l'attribut width="100%" du SVG est retiré)
        { svg: b.svg.replace(/\swidth="100%"/, ''), fit: [Math.max(80, LARGEUR * b.width), 110 * MM], alignment: 'center' },
        { text: `Figure ${b.no} — ${glyphes(b.caption)}`, style: 'caption', alignment: 'center', margin: [0, 3, 0, 0], tocItem: 'figures', id: b.id },
      ],
    } as Content;
    case 'alert': {
      const [fill, line] = ALERT[b.kind];
      return { table: { widths: ['*'], body: [[{ stack: [txt(b.html), ...(b.items.length ? [{ ul: b.items.map(i => txt(i)), margin: [0, 2, 0, 0] } as Content] : [])] }]] }, layout: layoutBox(fill, line), margin: [0, 3, 0, 5], fontSize: 9 };
    }
  }
}

/** Logo du cartouche : image PNG/JPEG ou SVG (URL data:). */
function logoContent(url: string | null | undefined, fit: [number, number]): Content | null {
  if (!url) return null;
  if (/^data:image\/(png|jpe?g)/i.test(url)) return { image: url, fit, alignment: 'right' } as Content;
  const m = /^data:image\/svg\+xml(;base64)?,(.*)$/s.exec(url);
  if (m) { try { return { svg: m[1] ? atob(m[2]) : decodeURIComponent(m[2]), fit, alignment: 'right' } as Content; } catch { return null; } }
  return null;
}

// ---------------------------------------------------------------------------
// Cartouche S.E.L. (Cartouche_SEL.html, version impression)
// ---------------------------------------------------------------------------

const lab = (t: string): Content => ({ text: t.toUpperCase(), fontSize: 6, bold: true, color: SEL.attenue, characterSpacing: 0.8, margin: [0, 0, 0, 2] });

/** Cartouche à trois cellules : logo | projet et référence | rédacteur, date, titre. */
function cartoucheSEL(info: ProjectInfo, petit = false): Content {
  const logo = info.showLogo ? (estLogoSEL(info.customLogo) || !info.customLogo ? { svg: selLogoSVG(), fit: petit ? [92, 20] : [150, 34] } as Content : logoContent(info.customLogo, petit ? [92, 20] : [150, 34])) : null;
  const sous = (info.sousTitre || 'Poteaux béton armé').toUpperCase();
  const c1: TableCell = { stack: [logo ?? { text: info.entreprise, bold: true }], fillColor: '#f2f8fd', margin: petit ? [2, 2, 2, 2] : [6, 24, 6, 8] };
  const c2: TableCell = { stack: petit
    ? [{ text: glyphes(info.projet).toUpperCase(), fontSize: 7, bold: true }, { text: info.reference, fontSize: 7, bold: true, color: SEL.accent }]
    : [lab('Projet / Affaire'), { text: glyphes(info.projet).toUpperCase(), fontSize: 11, bold: true, margin: [0, 0, 0, 8] }, lab('Référence dossier'), { text: info.reference, fontSize: 10, bold: true, color: SEL.accent, characterSpacing: 0.5 }],
    margin: petit ? [4, 2, 4, 2] : [8, 8, 8, 8] };
  const c3: TableCell = { stack: petit
    ? [{ text: 'NOTE DE CALCUL', fontSize: 7, bold: true, color: SEL.accent, characterSpacing: 1.5, alignment: 'right' }, { text: sous, fontSize: 6, bold: true, color: SEL.attenue, alignment: 'right' }]
    : [
      { columns: [{ stack: [lab('Rédacteur'), { text: glyphes(info.auteur || info.entreprise), fontSize: 8.5 }] }, { stack: [lab('Date'), { text: info.date, fontSize: 8.5 }], alignment: 'right', width: 52 }] },
      { canvas: [{ type: 'line', x1: 0, y1: 6, x2: 150, y2: 6, lineWidth: 0.5, lineColor: '#9aa8b8' }] },
      { text: 'NOTE DE CALCUL', fontSize: 11, bold: true, color: SEL.accent, characterSpacing: 2.4, alignment: 'center', margin: [0, 6, 0, 1] },
      { text: sous, fontSize: 8.5, bold: true, color: SEL.attenue, characterSpacing: 1, alignment: 'center' },
    ], margin: petit ? [4, 2, 4, 2] : [8, 8, 8, 8] };
  return {
    table: { widths: ['*', '*', '*'], body: [[c1, c2, c3]] },
    layout: { hLineWidth: () => (petit ? 0.6 : 1.4), vLineWidth: (i: number) => (petit ? 0.6 : i === 0 || i === 3 ? 1.4 : 0.8), hLineColor: () => '#000000', vLineColor: () => '#000000' },
  } as Content;
}

// ---------------------------------------------------------------------------
// Note de calcul
// ---------------------------------------------------------------------------

export function noteDefinition(info: ProjectInfo, cols: NoteColumn[], version: string, opts: NoteOptions): TDocumentDefinitions {
  const { D, meta } = buildNoteDoc(info, cols, version, opts);
  const copyright = info.copyright || `© ${new Date().getFullYear()} ${info.entreprise}`;
  const cell = (k: string, v: string, bold = false): TableCell => ({ stack: [{ text: k, fontSize: 6.5, color: GRIS }, { text: glyphes(v || '—'), bold, fontSize: 8.5 }] });
  const logo = info.showLogo ? logoContent(info.customLogo, [150, 55]) : null;
  void logo;
  const garde: Content[] = [
    cartoucheSEL(info),
    { text: `${info.entreprise} · ${info.adresse} · ${info.contact} · ${info.email}`, fontSize: 7.5, color: GRIS, margin: [0, 4, 0, 0] },
    { text: `Client : ${info.client}`.toUpperCase(), fontSize: 11, color: GRIS, margin: [0, 150, 0, 6], characterSpacing: 0.5 },
    { text: glyphes(meta.title), fontSize: 24, bold: true, color: BLEU },
    { text: `Note de calcul — ${cols.length > 1 ? `${cols.length} poteaux (${cols.map(c => c.name).join(', ')})` : `poteau ${cols[0]?.name ?? ''}`}`, fontSize: 12, margin: [0, 6, 0, 110] },
    { table: { widths: ['*', '*', '*', '*'], body: [
      [cell('Référence', info.reference, true), cell('Indice', info.revision || 'A', true), cell('Date', info.date, true), cell('Type de document', 'Note de calcul', true)],
      [cell('Identifiant de calcul', meta.id, true), { ...(cell('Généré le', meta.generated) as object), colSpan: 2 } as TableCell, {}, cell('Logiciel', `Poteaux EC2 v${meta.version}`)],
      [cell('Établi par', info.auteur), cell('Vérifié par', info.verificateur || ''), cell('Approuvé par', info.approbateur || ''), cell('Référentiel', `NF EN 1992-1-1${meta.annex === 'FR' ? ' + AN' : ''}`)],
    ] }, layout: { hLineWidth: () => 0.8, vLineWidth: () => 0.8 } },
    { text: 'Tableau des révisions', bold: true, fontSize: 9, margin: [0, 10, 0, 3] },
    { table: { widths: [40, 70, '*', 110], body: [
      ['Indice', 'Date', 'Objet', 'Auteur'].map(h => ({ text: h, fontSize: 7, color: GRIS })),
      ...(info.revisions ?? []).map(r => [r.indice, r.date, r.objet, r.auteur].map(v => ({ text: glyphes(v || ''), fontSize: 8.5 }))),
    ] }, layout: { hLineWidth: () => 0.6, vLineWidth: () => 0.6 } },
    { table: { widths: ['*', '*', '*'], heights: [62], body: [['Établi par', 'Vérifié par', 'Approuvé par'].map(t => ({ text: t, fontSize: 7, color: GRIS }))] }, margin: [0, 12, 0, 0], layout: { hLineWidth: () => 0.6, vLineWidth: () => 0.6, hLineColor: () => '#999', vLineColor: () => '#999' } },
    { text: copyright, fontSize: 7, color: '#777777', margin: [0, 6, 0, 0] },
  ];
  const listes: Content[] = [
    { toc: { id: 'sommaire', title: { text: 'Sommaire', style: 'tocTitle' }, numberStyle: { bold: false } }, pageBreak: 'before' } as Content,
    { toc: { id: 'figures', title: { text: 'Liste des figures', style: 'tocTitle' } } } as Content,
    { toc: { id: 'tableaux', title: { text: 'Liste des tableaux', style: 'tocTitle' } } } as Content,
    { toc: { id: 'equations', title: { text: 'Liste des équations', style: 'tocTitle' } } } as Content,
  ];
  return {
    pageSize: 'A4', pageMargins: [20 * MM, 27 * MM, 16 * MM, 18 * MM],
    info: { title: `${meta.title} — ${info.reference}`, author: info.auteur || info.entreprise, subject: `Note de calcul — ${info.projet}`,
      keywords: `Eurocode 2, poteau, béton armé, ${cols.map(c => c.name).join(', ')}, ID ${meta.id}`, creator: `Poteaux EC2 v${version}`, producer: `Poteaux EC2 v${version} (pdfmake)` },
    defaultStyle: { font: 'Roboto', fontSize: 9.5, lineHeight: 1.2 },
    styles: {
      h1: { fontSize: 15, bold: true, color: BLEU, margin: [0, 0, 0, 8] },
      h2: { fontSize: 11.5, bold: true, color: BLEU, margin: [0, 10, 0, 4] },
      h3: { fontSize: 10, bold: true, color: '#333333', margin: [0, 6, 0, 2] },
      p: { alignment: 'justify', margin: [0, 2, 0, 3] },
      caption: { fontSize: 8.5, bold: true, color: BLEU, margin: [0, 4, 0, 2] },
      eqLabel: { fontSize: 7, color: GRIS, margin: [0, 0, 0, 1] },
      tocTitle: { fontSize: 13, bold: true, color: BLEU, margin: [0, 10, 0, 6] },
    },
    header: (page: number) => (page === 1 ? null : { stack: [cartoucheSEL(info, true), { text: `ID ${meta.id}`, fontSize: 6, color: GRIS, alignment: 'right', margin: [0, 1, 0, 0] }], margin: [20 * MM, 7 * MM, 16 * MM, 0] }) as Content,
    footer: (page: number, pages: number) => (page === 1 ? null : { columns: [
      { text: copyright, fontSize: 6.5, color: '#777777', width: '*' },
      { text: `Poteaux EC2 v${version} · ${meta.generated}`, fontSize: 6.5, color: '#777777', alignment: 'center', width: 'auto', margin: [8, 0, 8, 0] },
      { text: `Page ${page} / ${pages}`, fontSize: 8, alignment: 'right', width: 'auto' },
    ], margin: [20 * MM, 6 * MM, 16 * MM, 0] }) as Content,
    // jamais de titre isolé en bas de page
    pageBreakBefore: (node, following) => !!node.headlineLevel && following.length < 3,
    content: [...garde, ...listes, ...D.blocks.map(blocContent)],
  };
}

// ---------------------------------------------------------------------------
// Plans A3
// ---------------------------------------------------------------------------

export function plansDefinition(info: ProjectInfo, cols: NoteColumn[], version: string): TDocumentDefinitions {
  const pages: Content[] = [];
  for (const c of cols) {
    if (!c.calc.section) continue;
    const sheet = buildSheet(c.calc, c.geometry, c.rebar, c.nomen, {
      owner: info.entreprise, title: `${info.titreNote} — ${c.name}`, subtitle: '', number: `${info.reference}-${c.name}`, revision: info.revision || 'A',
      date: info.date, author: info.auteur, approver: info.approbateur || info.verificateur || '—', project: info.projet, client: info.client,
      docType: 'Plan de ferraillage', logo: info.showLogo ? info.customLogo : null, logoSEL: info.showLogo && estLogoSEL(info.customLogo),
    }, concreteLabel(c.materials.fck), `B${c.materials.fyk}`, c.materials.exposureClass);
    pages.push({ svg: toSVG(sheet, { background: '#ffffff' }).replace('width="100%"', ''), width: 420 * MM, ...(pages.length ? { pageBreak: 'before' } : {}) } as Content);
  }
  return {
    pageSize: 'A3', pageOrientation: 'landscape', pageMargins: [0, 0, 0, 0],
    info: { title: `Plans de ferraillage — ${info.reference}`, author: info.auteur || info.entreprise, subject: info.projet, creator: `Poteaux EC2 v${version}`, producer: `Poteaux EC2 v${version} (pdfmake)` },
    defaultStyle: { font: 'Roboto' },
    content: pages.length ? pages : [{ text: 'Aucun plan disponible pour ces poteaux.' }],
  };
}

// ---------------------------------------------------------------------------
// Production des fichiers (pdfmake chargé à la demande)
// ---------------------------------------------------------------------------

type PdfMake = { createPdf: (d: TDocumentDefinitions) => { getBlob: (cb: (b: Blob) => void) => void; getBuffer: (cb: (b: Uint8Array) => void) => void }; addVirtualFileSystem: (v: unknown) => void };
let charge: Promise<PdfMake> | null = null;
export function chargerPdfMake(): Promise<PdfMake> {
  charge ??= Promise.all([import('pdfmake/build/pdfmake'), import('pdfmake/build/vfs_fonts')]).then(([pm, vfs]) => {
    const pdfMake = ((pm as unknown as { default?: PdfMake }).default ?? pm) as unknown as PdfMake;
    const v = (vfs as unknown as { default?: unknown }).default ?? vfs;
    const fs = (v as { pdfMake?: { vfs: unknown } }).pdfMake?.vfs ?? (v as { vfs?: unknown }).vfs ?? v;
    pdfMake.addVirtualFileSystem(fs);
    return pdfMake;
  });
  return charge;
}

export async function pdfBlob(def: TDocumentDefinitions): Promise<Blob> {
  const pdfMake = await chargerPdfMake();
  return new Promise<Blob>((ok, ko) => { try { pdfMake.createPdf(def).getBlob(ok); } catch (e) { ko(e); } });
}

/** Nom de fichier sûr : référence_poteau_indice_date.pdf */
export function nomFichier(...parts: string[]): string {
  return parts.filter(Boolean).join('_').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') + '.pdf';
}

/** Génère le PDF dans un Web Worker (interface non bloquée) ; repli sur le fil principal si indisponible. */
export async function genererPdf(kind: 'note' | 'plans', info: ProjectInfo, cols: NoteColumn[], version: string): Promise<Blob> {
  if (typeof Worker !== 'undefined') {
    try {
      const buf = await new Promise<Uint8Array>((ok, ko) => {
        const w = new Worker(new URL('./pdf.worker.ts', import.meta.url), { type: 'module' });
        w.onmessage = (e: MessageEvent<{ ok: boolean; buf?: Uint8Array; message?: string }>) => { w.terminate(); if (e.data.ok && e.data.buf) ok(e.data.buf); else ko(new Error(e.data.message)); };
        w.onerror = (e) => { w.terminate(); ko(new Error(e.message || 'Web Worker indisponible')); };
        w.postMessage(JSON.parse(JSON.stringify({ kind, info, cols, version })));
      });
      return new Blob([buf as BlobPart], { type: 'application/pdf' });
    } catch { /* repli ci-dessous */ }
  }
  return pdfBlob(kind === 'note' ? noteDefinition(info, cols, version, { includePlans: false }) : plansDefinition(info, cols, version));
}
