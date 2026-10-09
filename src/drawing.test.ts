import { describe, it, expect } from 'vitest';
import { calculerPoteau, nomenclature } from './eurocode';
import { buildSheet, toDXF, toSVG, LAYERS } from './drawing';
import { newColumn } from './store';
import { crc32, makeZip } from './zip';

const plan = (shape: 'rect' | 'T' | 'circ', params: Record<string, number>, logo: string | null = null) => {
  const c = newColumn('P1', { geometry: { ...newColumn('x').geometry, shape, params }, rebar: { ...newColumn('x').rebar, nBars: 8 } });
  const r = calculerPoteau(c.materials, c.geometry, c.loads, c.rebar, c.fire);
  const n = nomenclature(c.geometry, c.rebar, r.mat.cNom, r.geom.A, r.anchorage, r.ties, r.section);
  return buildSheet(r, c.geometry, c.rebar, n, { owner: 'Bureau Été & Cie', title: 'Poteau Φ16', subtitle: '', number: 'N-1', revision: 'A', date: '30/09/2026',
    author: 'A', approver: 'B', project: 'Projet', client: 'Client', docType: 'Plan de ferraillage', logo }, 'C30/37', 'B500', 'XC4');
};
const pairs = (b: Uint8Array) => { const lines = new TextDecoder('latin1').decode(b).split('\r\n'); lines.pop(); const p: [string, string][] = []; for (let i = 0; i + 1 < lines.length; i += 2) p.push([lines[i].trim(), lines[i + 1]]); return { p, n: lines.length }; };

describe('Plans et DXF (lot 3)', () => {
  const d = plan('T', { ba: 25, ha: 40, bs: 60, hs: 15 }, 'data:image/png;base64,iVBORw0KGgo=');
  const dxf = toDXF(d);
  const { p, n } = pairs(dxf);
  it('structure DXF R12 : paires code/valeur, sections équilibrées, fin de fichier', () => {
    expect(n % 2).toBe(0);
    const secs = p.filter(([c, v]) => c === '0' && (v === 'SECTION' || v === 'ENDSEC')).map(x => x[1]);
    expect(secs.filter(v => v === 'SECTION').length).toBe(secs.filter(v => v === 'ENDSEC').length);
    expect(p.find(([c, v]) => c === '1' && v === 'AC1009')).toBeTruthy();
    expect(p[p.length - 1]).toEqual(['0', 'EOF']);
  });
  it('cartouche en bloc à attributs (ATTDEF dans le bloc, ATTRIB dans l\'INSERT)', () => {
    expect(p.filter(([c, v]) => c === '0' && v === 'BLOCK').length).toBe(1);
    expect(p.find(([c, v]) => c === '2' && v === 'CARTOUCHE')).toBeTruthy();
    const attdef = p.filter(([c, v]) => c === '0' && v === 'ATTDEF').length, attrib = p.filter(([c, v]) => c === '0' && v === 'ATTRIB').length;
    expect(attdef).toBe(10); expect(attrib).toBe(10);
    expect(p.find(([c, v]) => c === '2' && v === 'PROPRIETAIRE')).toBeTruthy();
  });
  it('tous les calques utilisés sont déclarés ; hachures présentes', () => {
    const used = new Set(p.filter(([c]) => c === '8').map(x => x[1]).filter(v => v !== '0'));
    for (const l of used) expect(Object.keys(LAYERS)).toContain(l);
    expect(used.has('S-COFF-HACH')).toBe(true);
  });
  it('encodage : Φ converti en %%c, accents en Latin-1, aucun caractère hors 8 bits', () => {
    expect(p.some(([c, v]) => c === '1' && v.includes('%%c16'))).toBe(true);
    expect(dxf.every(b => b <= 255)).toBe(true);
    expect(new TextDecoder('latin1').decode(dxf)).toContain('Été');
  });
  it('nomenclature : une ligne par type de cadre (âme et table du T), avec dimensions', () => {
    const svg = toSVG(d);
    expect(svg.match(/crochets 135°/g)?.length).toBe(2);
    expect(svg).toContain('barre droite');
  });
  it('logo : image dans le SVG, zone réservée dans le DXF', () => {
    expect(toSVG(d)).toContain('<image');
    expect(p.some(([c, v]) => c === '1' && v === 'LOGO')).toBe(true);
  });
  it('cotes de position des barres en chaîne (section rectangulaire)', () => {
    const r = plan('rect', { b: 30, h: 50 });
    const cotes = r.ents.filter(e => e.t === 'text' && e.layer === 'S-COTE').length;
    expect(cotes).toBeGreaterThan(10);
  });
});

describe('Archive ZIP', () => {
  it('CRC-32 de référence', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
  });
  it('en-têtes et répertoire central', () => {
    const z = makeZip([{ name: 'a.txt', data: new TextEncoder().encode('bonjour') }, { name: 'b.dxf', data: new Uint8Array([1, 2, 3]) }]);
    const v = new DataView(z.buffer);
    expect(v.getUint32(0, true)).toBe(0x04034b50);
    expect(v.getUint32(z.length - 22, true)).toBe(0x06054b50);
    expect(v.getUint16(z.length - 22 + 10, true)).toBe(2);
  });
});
