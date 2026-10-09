import { describe, it, expect } from 'vitest';
import { migrateProject, FORMAT_VERSION, DEFAULT_LOADS } from './store';
import { SEL_LOGO_URL } from './brand/sel';
import { validateInputsDetailed, ADVANCED_FIELDS } from './eurocode';

const v1 = {
  format: 'poteaux-ec2', version: 1, info: { projet: 'Ancien projet', customLogo: 42 },
  columns: [
    { id: 'a', name: 'P1', materials: { fck: 30, fyk: 500, exposureClass: 'XC4', structuralClass: 'S4', deltaCdev: 5, gammaC: 'x' },
      geometry: { shape: 'rect', params: { b: 30, h: 40, z: 'faux' }, L: 3.5, beta: 1 },
      loads: { solicitationType: 'flexion_composee', NEd: 1500, MEd_user: 80, MEd_z: 20 },
      rebar: { phiL: 16, nBars: 4, phiW: 8, spacing: 200 }, fire: { R: 60, l0fiFactor: 0.7 } },
    { id: 'a', name: 'P2' },
  ],
};

describe('Migration des projets (phase D)', () => {
  const m = migrateProject(v1);
  it('format ancien reconnu et mis au format courant', () => {
    expect(m.fromVersion).toBe(1);
    expect(FORMAT_VERSION).toBe(3);
    expect(m.columns).toHaveLength(2);
  });
  it('moments uniques de la v1 convertis en moments de tête et de pied', () => {
    const L = m.columns[0].loads;
    expect(L.Mh_top).toBe(80); expect(L.Mh_bot).toBe(80);
    expect(L.Mb_top).toBe(20); expect(L.Mb_bot).toBe(20);
    expect(m.notes.some(n => n.includes('converti'))).toBe(true);
  });
  it('valeurs invalides remplacées par les valeurs par défaut, avec compte rendu', () => {
    expect(m.columns[0].materials.gammaC).toBe(1.5);
    expect(m.notes.some(n => n.includes('gammaC'))).toBe(true);
    expect(m.columns[0].geometry.params).toEqual({ b: 30, h: 40 });
    expect(m.info.customLogo).toBe(SEL_LOGO_URL); // logo invalide → logo S.E.L.
  });
  it('nouveaux paramètres complétés (ψ1) et Δcdev ancien signalé', () => {
    expect(m.columns[0].loads.psi1).toBe(DEFAULT_LOADS.psi1);
    expect(m.notes.some(n => n.includes('Δcdev'))).toBe(true);
    expect(m.columns[0].materials.deltaCdev).toBe(5);
  });
  it('poteau vide complété par les valeurs par défaut, identifiants dédoublonnés', () => {
    expect(m.columns[1].geometry.shape).toBe('rect');
    expect(m.columns[1].id).not.toBe(m.columns[0].id);
  });
  it('fichier non reconnu refusé avec un message clair', () => {
    expect(() => migrateProject({ format: 'autre' })).toThrow(/non reconnu/);
    expect(() => migrateProject({ format: 'poteaux-ec2', columns: [] })).toThrow();
  });
  it('projet d\'une version plus récente signalé', () => {
    expect(migrateProject({ ...v1, version: 99 }).notes[0]).toMatch(/plus récente/);
  });
});

describe('Erreurs de saisie rattachées aux champs (phase A)', () => {
  it('γc invalide → champ « gammaC », classé dans les options avancées', () => {
    const c = migrateProject(v1).columns[0];
    const e = validateInputsDetailed({ ...c.materials, gammaC: 0.5 }, c.geometry, c.loads, c.rebar);
    expect(e.map(x => x.field)).toContain('gammaC');
    expect(ADVANCED_FIELDS).toContain('gammaC');
  });
});
