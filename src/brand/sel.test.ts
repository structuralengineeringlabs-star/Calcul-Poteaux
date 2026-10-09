import { describe, it, expect } from 'vitest';
import { SEL, SEL_LOGO_URL, SEL_COPYRIGHT, estLogoSEL, selLogoSVG } from './sel';
import { DEFAULT_INFO, migrateProject, newColumn } from '../store';
import { calculerPoteau, nomenclature } from '../eurocode';
import { buildSheet, toDXF, toSVG } from '../drawing';

describe('Identité Structural & Engineering Labs', () => {
  it('logo fidèle au modèle fourni (hexagone, pavé, textes, couleur d\'accent)', () => {
    const svg = selLogoSVG();
    for (const t of ['M24 4 L44 14 L44 34 L24 44 L4 34 L4 14 Z', 'S.E.L.', 'STRUCTURAL', 'ENGINEERING LABS', '#3a9bd5']) expect(svg).toContain(t);
  });
  it('identité appliquée par défaut : entreprise, coordonnées, copyright, logo', () => {
    expect(DEFAULT_INFO.entreprise).toBe('Structural & Engineering Labs');
    expect(DEFAULT_INFO.email).toBe(SEL.email);
    expect(DEFAULT_INFO.contact).toBe('+237 651 135 605');
    expect(DEFAULT_INFO.copyright).toBe(SEL_COPYRIGHT);
    expect(estLogoSEL(DEFAULT_INFO.customLogo)).toBe(true);
  });
  it('migration : identité d\'exemple remplacée ; tout ancien logo remplacé une fois par le logo S.E.L.', () => {
    const base = { format: 'poteaux-ec2', version: 2, columns: [newColumn('P1')] };
    const m1 = migrateProject({ ...base, info: { entreprise: 'SEL Expertise & Design', customLogo: null } });
    expect(m1.info.entreprise).toBe('Structural & Engineering Labs');
    expect(m1.info.customLogo).toBe(SEL_LOGO_URL);
    const m2 = migrateProject({ ...base, info: { entreprise: 'Autre bureau', customLogo: 'data:image/png;base64,AAAA' } });
    expect(m2.info.entreprise).toBe('Autre bureau');            // raison sociale conservée
    expect(m2.info.customLogo).toBe(SEL_LOGO_URL);              // logo remplacé (format < 3)
    expect(m2.notes.some(n => n.includes('Logo remplacé'))).toBe(true);
    const m3 = migrateProject({ ...base, version: 3, info: { entreprise: 'Autre bureau', customLogo: 'data:image/png;base64,AAAA' } });
    expect(m3.info.customLogo).toBe('data:image/png;base64,AAAA'); // logo choisi après la v3.15 : respecté
  });
  it('plans : logo dessiné en vectoriel (SVG et DXF, pavé plein SOLID, texte blanc)', () => {
    const c = newColumn('P1'); const r = calculerPoteau(c.materials, c.geometry, c.loads, c.rebar, c.fire);
    const n = nomenclature(c.geometry, c.rebar, r.mat.cNom, r.geom.A, r.anchorage, r.ties, r.section);
    const d = buildSheet(r, c.geometry, c.rebar, n, { owner: SEL.entreprise, title: 'P1', subtitle: '', number: 'N', revision: 'A', date: '01/10/2026', author: 'A', approver: 'B', project: 'P', client: 'C', docType: 'Plan', logo: SEL_LOGO_URL, logoSEL: true }, 'C30/37', 'B500', 'XC4');
    const svg = toSVG(d), dxf = new TextDecoder('latin1').decode(toDXF(d));
    expect(svg).not.toContain('<image');
    expect(svg).toContain('S.E.L.');
    expect(dxf).toContain('\r\nSOLID\r\n');
    expect(dxf).toContain('S-LOGO');
    expect(dxf).toContain('STRUCTURAL &');
    expect(dxf).toMatch(/TEXT\r\n\s*8\r\nS-LOGO\r\n\s*62\r\n7\r\n/);
  });
});
