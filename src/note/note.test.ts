import { describe, it, expect } from 'vitest';
import { calculerPoteau, nomenclature } from '../eurocode';
import { buildNoteHTML, type NoteColumn } from './note';
import { newColumn, DEFAULT_INFO } from '../store';

const col = (name: string, patch: Parameters<typeof newColumn>[1] = {}): NoteColumn => {
  const c = newColumn(name, patch);
  const calc = calculerPoteau(c.materials, c.geometry, c.loads, c.rebar, c.fire);
  return { ...c, calc, nomen: nomenclature(c.geometry, c.rebar, calc.mat.cNom, calc.geom.A, calc.anchorage, calc.ties, calc.section) };
};

describe('Note de calcul', () => {
  const html = buildNoteHTML({ ...DEFAULT_INFO, entreprise: 'Bureau <Test> & Cie' }, [col('P1'), col('P2')], '3.7.0', { includePlans: true });
  it('structure : garde, sommaire, listes, chapitres, synthèse, annexes', () => {
    for (const t of ['Tableau des révisions', 'Sommaire', 'Liste des figures', 'Liste des tableaux', 'Liste des équations',
      'Objet de la note', 'Références normatives', 'Poteau P1', 'Poteau P2', 'Synthèse du projet', 'Données d\'entrée et documents associés', 'plans-A3.pdf'])
      expect(html).toContain(t);
  });
  it('numérotation continue des équations, tableaux et figures, avec renvois du sommaire', () => {
    const eqs = [...html.matchAll(/<div class="eq" id="eq-(\d+)"/g)].map(m => +m[1]);
    expect(eqs.length).toBeGreaterThan(20);
    expect(eqs).toEqual(eqs.map((_, i) => i + 1));
    for (const id of ['eq-1', 'tab-1', 'fig-1', 'h-1', 'h-3-1']) expect(html).toContain(`href="#${id}"`);
  });
  it('pagination : en-têtes, pieds de page et compteur de pages', () => {
    expect(html).toContain('counter(page) " / " counter(pages)');
    expect(html).toContain('string-set: entreprise');
    expect(html).toContain('size: A3 landscape');
  });
  it('les textes saisis sont échappés', () => {
    expect(html).toContain('Bureau &lt;Test&gt; &amp; Cie');
    expect(html).not.toContain('Bureau <Test>');
  });
  it('chaque équation porte sa référence normative', () => {
    const refs = [...html.matchAll(/<div class="eq-ref">([^<]*)<\/div>/g)].map(m => m[1]);
    expect(refs.every(r => r.length > 0)).toBe(true);
    expect(refs.some(r => r.includes('5.33'))).toBe(true);
  });
});
