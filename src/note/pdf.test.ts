import { describe, it, expect, beforeAll } from 'vitest';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
// construction navigateur de pdfmake, utilisable sous Node
import pdfMake from 'pdfmake/build/pdfmake.js';
// polices virtuelles de pdfmake
import vfs from 'pdfmake/build/vfs_fonts.js';
import { calculerPoteau, nomenclature } from '../eurocode';
import { newColumn, DEFAULT_INFO } from '../store';
import { noteDefinition, plansDefinition, runs, nomFichier } from './pdf';
import { fingerprint } from './note';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';

(pdfMake as unknown as { addVirtualFileSystem: (v: unknown) => void }).addVirtualFileSystem(vfs);
const buffer = (d: TDocumentDefinitions) => new Promise<Uint8Array>(ok => (pdfMake as unknown as { createPdf: (d: TDocumentDefinitions) => { getBuffer: (cb: (b: Uint8Array) => void) => void } }).createPdf(d).getBuffer(ok));
async function lire(buf: Uint8Array) {
  const pdf = await getDocument({ data: buf.slice(), useSystemFonts: false, disableFontFace: true }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const c = await (await pdf.getPage(i)).getTextContent();
    let s = '', y: number | null = null;
    for (const it of c.items as { str: string; transform: number[]; hasEOL?: boolean }[]) {
      if (y !== null && Math.abs(it.transform[5] - y) > 2) s += '\n';
      s += it.str; y = it.transform[5];
    }
    pages.push(s);
  }
  const meta = await pdf.getMetadata();
  const vue = await (await pdf.getPage(1)).getViewport({ scale: 1 });
  return { pages, meta: meta.info as Record<string, string>, nb: pdf.numPages, format: [vue.width, vue.height].map(v => Math.round(v / 72 * 25.4)) };
}

const col = (name: string, patch: Parameters<typeof newColumn>[1] = {}) => {
  const c = newColumn(name, patch);
  const calc = calculerPoteau(c.materials, c.geometry, c.loads, c.rebar, c.fire);
  return { ...c, calc, nomen: nomenclature(c.geometry, c.rebar, calc.mat.cNom, calc.geom.A, calc.anchorage, calc.ties, calc.section) };
};
const cols = [col('P1'), col('P2', { geometry: { ...newColumn('x').geometry, shape: 'T', params: { ba: 25, ha: 40, bs: 60, hs: 15 } }, rebar: { ...newColumn('x').rebar, nBars: 8 } })];
const info = { ...DEFAULT_INFO, entreprise: 'Bureau Été & Cie', verificateur: 'Ing. B' };

describe('PDF de la note (axes A à E)', () => {
  let note: Awaited<ReturnType<typeof lire>>;
  beforeAll(async () => { note = await lire(await buffer(noteDefinition(info, cols, '9.9.9', { includePlans: false }))); }, 60_000);

  it('A4, métadonnées renseignées', () => {
    expect(note.format).toEqual([210, 297]);
    expect(note.meta.Title).toContain(info.reference);
    expect(note.meta.Creator).toBe('Poteaux EC2 v9.9.9');
    expect(note.meta.Keywords).toContain('ID ');
  });
  it('sommaire et listes : chaque numéro de page renvoie à la bonne page', () => {
    const tdm = note.pages.slice(1, 5).join('\n');
    const titres = [...tdm.matchAll(/^(\d+(?:\.\d+)?)\s+(.+?)\s*(\d+)$/gm)];
    expect(titres.length).toBeGreaterThan(20);
    for (const [, num, titre, p] of titres) expect(note.pages[+p - 1], `${num} ${titre} p.${p}`).toMatch(new RegExp(`^${num.replace('.', '\\.')}\\s+${titre.slice(0, 15).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'm'));
    for (const lib of ['Figure', 'Tableau', 'Équation']) {
      const e = [...tdm.matchAll(new RegExp(`^${lib} (\\d+) — .*?(\\d+)$`, 'gm'))];
      expect(e.length, lib).toBeGreaterThan(lib === 'Figure' ? 3 : 10);
      for (const [, n, p] of e) expect(note.pages[+p - 1], `${lib} ${n} p.${p}`).toContain(`${lib} ${n} —`);
    }
  });
  it('en-têtes et pieds de page sur chaque page sauf la garde', () => {
    expect(note.pages[0]).not.toContain('Page 1 /');
    for (let i = 1; i < note.nb; i++) expect(note.pages[i]).toContain(`Page ${i + 1} / ${note.nb}`);
  });
  it('valeurs identiques au calcul (MEd, NEd, taux, identifiant)', () => {
    const tout = note.pages.join('\n');
    const f = (v: number, d: number) => v.toFixed(d).replace('.', ',');
    const d = cols[0].calc.directions[0];
    expect(tout).toContain(`${f(d.MEd, 1)} kNm`);
    expect(tout).toContain(f(cols[0].calc.util, 2));
    expect(tout).toContain(fingerprint({ name: 'P1', materials: cols[0].materials, geometry: cols[0].geometry, loads: cols[0].loads, rebar: cols[0].rebar, fire: cols[0].fire }));
  });
  it('contenu documentaire : garde, révisions, références datées, données d\'entrée, plans séparés', () => {
    const tout = note.pages.join('\n');
    for (const t of ['Tableau des révisions', 'Identifiant de calcul', 'EN 1992-1-1:2004 + AC:2010 + A1:2014', 'Données d\'entrée du poteau P1', '-plans-A3.pdf', 'Bureau Été & Cie'])
      expect(tout).toContain(t);
  });
});

describe('PDF des plans A3', () => {
  it('une page A3 paysage par poteau', async () => {
    const p = await lire(await buffer(plansDefinition(info, cols, '9.9.9')));
    expect(p.nb).toBe(2);
    expect(p.format).toEqual([420, 297]);
  }, 60_000);
});

describe('Conversion du texte et nommage', () => {
  it('indices, gras, statuts, entités et glyphes de remplacement', () => {
    const r = runs('f<sub>cd</sub> = <b>20</b> &lt; <span class="st ok">Conforme</span> → S4 1\u202f514');
    expect(r.find(x => x.text === 'cd')?.sub).toBe(true);
    expect(r.find(x => x.text === '20')?.bold).toBe(true);
    expect(r.map(x => x.text).join('')).toContain('< ');
    expect(r.find(x => x.text === 'Conforme')?.color).toBe('#166534');
    expect(r.map(x => x.text).join('')).not.toMatch(/[→\u202f]/);
  });
  it('nom de fichier sûr', () => {
    expect(nomFichier('PO-2026/001', 'P1 angle', 'note-de-calcul', 'ind-B', '2026-10-01')).toBe('PO-2026-001_P1-angle_note-de-calcul_ind-B_2026-10-01.pdf');
    expect(nomFichier('Réf é', 'x')).toBe('Ref-e_x.pdf');
  });
  it('identifiant de calcul stable et sensible aux données', () => {
    expect(fingerprint({ a: 1 })).toBe(fingerprint({ a: 1 }));
    expect(fingerprint({ a: 1 })).not.toBe(fingerprint({ a: 2 }));
  });
});
