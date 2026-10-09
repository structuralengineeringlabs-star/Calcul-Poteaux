import { BOIS_DEFAUT, type DonneesPoteauBois } from './bois/poteauBois';
import { ACIER_DEFAUT, type DonneesPoteauAcier } from './acier/poteauAcier';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Materials, Geometry, Loads, Rebar, FireInput } from './eurocode';
import { log } from './diagnostics';
import { SEL, SEL_COPYRIGHT, SEL_LOGO_URL } from './brand/sel';

export interface ProjectInfo {
  projet: string; reference: string; auteur: string; entreprise: string; adresse: string;
  contact: string; email: string; date: string; client: string; titreNote: string;
  showLogo: boolean; customLogo: string | null;
  verificateur?: string; approbateur?: string; revision?: string; copyright?: string;
  sousTitre?: string;      // sous-titre du cartouche (ex. « POTEAUX BÉTON ARMÉ »)
  mentions?: string;       // mentions libres en fin de note (limites, confidentialité…)
  revisions?: Revision[];  // tableau des révisions de la note
}

export interface Revision { indice: string; date: string; objet: string; auteur: string }

export interface ColumnData {
  id: string; name: string;
  materials: Materials; geometry: Geometry; loads: Loads; rebar: Rebar; fire: FireInput;
  /** Matériau du poteau (v4.1) : béton armé (défaut) ou acier ; données du profilé métallique. */
  materiau?: 'ba' | 'acier' | 'bois';
  acier?: DonneesPoteauAcier;
  bois?: DonneesPoteauBois;
}

export const DEFAULT_MATERIALS: Materials = {
  concreteClass: '30', fck: 30, steelGrade: '500', fyk: 500, exposureClass: 'XC4', structuralClass: 'S4',
  deltaCdev: 10, alphaCC: 1.0, gammaC: 1.5, gammaS: 1.15, classMode: 'saisi', designLife: 50,
  qualityControl: false, compactCover: false, annex: 'FR',
};
export const DEFAULT_GEOMETRY: Geometry = {
  shape: 'rect', params: { b: 30, h: 40 }, L: 3.5, beta: 1.0, coeffA: 0.7, coeffB: 1.1, coeffC: 0.7, phi_ef: 2.0,
  braced: true, lengthMode: 'beta', k1: 0.4, k2: 0.4, phiMode: 'calcule', secondOrderMethod: 'courbure',
  RH: 70, t0: 28, cement: 'N', Tmean: 20,
};
export const DEFAULT_LOADS: Loads = {
  solicitationType: 'compression', NEd: 1500, MEd_user: 80, MEd_z: 0, VEd: 0, VEd_b: 0, TEd: 0, Nqp: 0, Ncar: 0,
  loadMode: 'GQ', NG: 700, NQ: 370, psi2: 0.3, psi1: 0.5, selfWeight: true, Mh_top: 80, Mh_bot: 40, curvH: 'simple',
  Mb_top: 0, Mb_bot: 0, curvB: 'simple', transverse: false, Mqp_h: 0,
};
export const DEFAULT_REBAR: Rebar = {
  phiL: 16, nBars: 4, phiW: 8, spacing: 200, anchoringFactor: 50, overlapFactor: 50, numAnchors: 1, numLaps: 1,
  anchorMode: 'calcule', bond: 'bonne', lapPercent: 100,
};
export const DEFAULT_FIRE: FireInput = { R: 60, l0fiFactor: 0.7, muFi: 0 };
/** Identité S.E.L. (logo, coordonnées, copyright) : appliquée par défaut et par le bouton « Identité S.E.L. ». */
export const IDENTITE_SEL: Partial<ProjectInfo> = {
  entreprise: SEL.entreprise, auteur: SEL.entreprise, contact: SEL.telephone, email: SEL.email,
  copyright: SEL_COPYRIGHT, customLogo: SEL_LOGO_URL, showLogo: true,
};

export const DEFAULT_INFO: ProjectInfo = {
  projet: 'Projet de Construction R+4', reference: 'PO-2026-001', auteur: SEL.entreprise,
  entreprise: SEL.entreprise, adresse: 'Douala, Cameroun', contact: SEL.telephone,
  email: SEL.email, date: new Date().toLocaleDateString('fr-FR'),
  client: 'SCI Horizon Immobilier', titreNote: 'Dimensionnement de Poteaux (EC2)', sousTitre: 'Poteaux béton armé', showLogo: true, customLogo: SEL_LOGO_URL,
  verificateur: '', approbateur: '', revision: 'A', copyright: SEL_COPYRIGHT,
  mentions: 'Note établie à l\'aide d\'un outil de pré-dimensionnement. Les résultats doivent être vérifiés et validés par un ingénieur structure qualifié.',
  revisions: [{ indice: 'A', date: new Date().toLocaleDateString('fr-FR'), objet: 'Première émission', auteur: '' }],
};

const newId = () => Math.random().toString(36).slice(2, 10);
export const newColumn = (name = 'P1', base?: Partial<ColumnData>): ColumnData => ({
  id: newId(), name,
  materials: { ...DEFAULT_MATERIALS, ...(base?.materials ?? {}) },
  geometry: { ...DEFAULT_GEOMETRY, ...(base?.geometry ?? {}), params: { ...(base?.geometry?.params ?? DEFAULT_GEOMETRY.params) } },
  loads: { ...DEFAULT_LOADS, ...(base?.loads ?? {}) },
  rebar: { ...DEFAULT_REBAR, ...(base?.rebar ?? {}) },
  fire: { ...DEFAULT_FIRE, ...(base?.fire ?? {}) },
  materiau: base?.materiau ?? 'ba',
  acier: { ...ACIER_DEFAUT, ...(base?.acier ?? {}) },
  bois: { ...BOIS_DEFAUT, ...(base?.bois ?? {}) },
});

export const FORMAT_VERSION = 3; // 3 : logo remplacé par le logo S.E.L. (v3.15)
export interface ProjectFile { format: 'poteaux-ec2'; version: number; info: ProjectInfo; columns: ColumnData[] }

// ---------------------------------------------------------------------------
// Migration et assainissement des projets enregistrés
// ---------------------------------------------------------------------------

/** Recopie les valeurs de même type que la valeur par défaut ; sinon la valeur par défaut est conservée. */
function sanitize<T extends object>(def: T, raw: unknown, path: string, notes: string[]): T {
  const src = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const out: Record<string, unknown> = { ...(def as Record<string, unknown>) };
  for (const [k, dv] of Object.entries(def)) {
    const v = src[k];
    if (v === undefined || v === null) continue;
    if (typeof dv === 'number') {
      if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
      else notes.push(`${path}.${k} : valeur « ${String(v)} » invalide, remplacée par ${dv}.`);
    } else if (typeof dv === 'string' || typeof dv === 'boolean') {
      if (typeof v === typeof dv) out[k] = v; else notes.push(`${path}.${k} : type inattendu, valeur par défaut conservée.`);
    } else out[k] = v; // objets et champs optionnels : repris tels quels
  }
  // champs optionnels absents des valeurs par défaut (ex. psiFi, muFi) : repris s'ils sont numériques
  for (const [k, v] of Object.entries(src)) if (!(k in def) && (typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean')) out[k] = v;
  return out as T;
}

function migrateColumn(raw: unknown, i: number, fromVersion: number, notes: string[]): ColumnData {
  const c = (raw && typeof raw === 'object' ? raw : {}) as Partial<ColumnData> & Record<string, unknown>;
  const name = typeof c.name === 'string' && c.name ? c.name : `P${i + 1}`;
  const p = `Poteau ${name}`;
  const geometry = sanitize(DEFAULT_GEOMETRY, c.geometry, `${p} — géométrie`, notes);
  const rp = (c.geometry as Geometry | undefined)?.params;
  geometry.params = rp && typeof rp === 'object'
    ? Object.fromEntries(Object.entries(rp).filter(([, v]) => typeof v === 'number' && Number.isFinite(v)))
    : { ...DEFAULT_GEOMETRY.params };
  const loads = sanitize(DEFAULT_LOADS, c.loads, `${p} — charges`, notes);
  const rawLoads = (c.loads ?? {}) as Partial<Loads>;
  if (fromVersion < 2) {
    // v1 et antérieures : moment constant saisi dans MEd_user / MEd_z
    if (rawLoads.Mh_top === undefined && typeof rawLoads.MEd_user === 'number') {
      loads.Mh_top = loads.Mh_bot = rawLoads.MEd_user; loads.curvH = 'simple';
      notes.push(`${p} : moment unique (${rawLoads.MEd_user} kNm) converti en moments de tête et de pied égaux (plan de h).`);
    }
    if (rawLoads.Mb_top === undefined && typeof rawLoads.MEd_z === 'number' && rawLoads.MEd_z !== 0) {
      loads.Mb_top = loads.Mb_bot = rawLoads.MEd_z; loads.curvB = 'simple';
      notes.push(`${p} : moment unique (${rawLoads.MEd_z} kNm) converti en moments de tête et de pied égaux (plan de b).`);
    }
    if (rawLoads.psi1 === undefined) notes.push(`${p} : ψ1 absent (nouveau paramètre), valeur par défaut ${DEFAULT_LOADS.psi1}.`);
  }
  const materials = sanitize(DEFAULT_MATERIALS, c.materials, `${p} — matériaux`, notes);
  if (fromVersion < 2 && materials.deltaCdev < 10) notes.push(`${p} : Δcdev = ${materials.deltaCdev} mm conservé ; la valeur recommandée est désormais 10 mm (§4.4.1.3).`);
  return {
    id: typeof c.id === 'string' && c.id ? c.id : newId(), name, materials, geometry, loads,
    rebar: sanitize(DEFAULT_REBAR, c.rebar, `${p} — armatures`, notes),
    fire: sanitize(DEFAULT_FIRE, c.fire, `${p} — feu`, notes),
  };
}

/** Lit un projet enregistré, quelle que soit sa version, et le met au format courant. */
export function migrateProject(raw: unknown): { info: ProjectInfo; columns: ColumnData[]; notes: string[]; fromVersion: number } {
  const p = raw as Partial<ProjectFile>;
  if (!p || p.format !== 'poteaux-ec2' || !Array.isArray(p.columns) || p.columns.length === 0) throw new Error('Fichier non reconnu : ce n\'est pas un projet de poteaux EC2.');
  const fromVersion = typeof p.version === 'number' ? p.version : 1;
  const notes: string[] = [];
  if (fromVersion > FORMAT_VERSION) notes.push(`Projet créé avec une version plus récente de l'application (format ${fromVersion}) : certains réglages peuvent être ignorés.`);
  const info = sanitize(DEFAULT_INFO, p.info, 'Cartouche', notes);
  const ri = (p.info ?? {}) as Partial<ProjectInfo>;
  info.customLogo = typeof ri.customLogo === 'string' ? ri.customLogo : null;
  // Identité d'exemple des versions précédentes (« SEL Expertise & Design », sans logo) → identité S.E.L. fournie
  if ((ri.entreprise === 'SEL Expertise & Design' || ri.entreprise === undefined) && !ri.customLogo) {
    Object.assign(info, IDENTITE_SEL);
    notes.push('Identité Structural & Engineering Labs appliquée (logo, coordonnées, copyright) à la place de l\'identité d\'exemple.');
  }
  // v3.15 : le logo est remplacé une fois par le logo S.E.L. (demande du maître d'ouvrage), quel qu'il soit
  if (fromVersion < 3 && info.customLogo !== SEL_LOGO_URL) {
    info.customLogo = SEL_LOGO_URL; info.showLogo = true;
    notes.push('Logo remplacé par le logo Structural & Engineering Labs (S.E.L.).');
  }
  info.revisions = Array.isArray(ri.revisions) ? ri.revisions.filter(r => r && typeof r === 'object').map(r => ({ indice: String(r.indice ?? ''), date: String(r.date ?? ''), objet: String(r.objet ?? ''), auteur: String(r.auteur ?? '') })) : DEFAULT_INFO.revisions;
  const columns = p.columns.map((c, i) => migrateColumn(c, i, fromVersion, notes));
  const ids = new Set<string>();
  for (const c of columns) { if (ids.has(c.id)) c.id = newId(); ids.add(c.id); }
  return { info, columns, notes, fromVersion };
}

interface Store {
  info: ProjectInfo; setInfo: (v: ProjectInfo) => void;
  columns: ColumnData[]; activeId: string; setActiveId: (id: string) => void;
  active: ColumnData;
  materials: Materials; setMaterials: (v: Materials) => void;
  geometry: Geometry; setGeometry: (v: Geometry) => void;
  loads: Loads; setLoads: (v: Loads) => void;
  rebar: Rebar; setRebar: (v: Rebar) => void;
  fire: FireInput; setFire: (v: FireInput) => void;
  materiau: 'ba' | 'acier' | 'bois'; setMateriau: (v: 'ba' | 'acier' | 'bois') => void;
  bois: DonneesPoteauBois; setBois: (v: DonneesPoteauBois) => void;
  acier: DonneesPoteauAcier; setAcier: (v: DonneesPoteauAcier) => void;
  addColumn: (duplicate?: boolean) => void;
  removeColumn: (id: string) => void;
  renameColumn: (id: string, name: string) => void;
  exportProject: () => string;
  importProject: (json: string) => string | null; // message d'erreur ou null
  migrationNotes: string[]; dismissMigrationNotes: () => void;
  resetProject: () => void;
}

const Ctx = createContext<Store | null>(null);
const KEY = 'poteaux-ec2-projet-v1';

const BACKUP_KEY = 'poteaux-ec2-projet-sauvegarde';

function load(): { info: ProjectInfo; columns: ColumnData[]; notes: string[] } {
  let raw: string | null = null;
  try { raw = localStorage.getItem(KEY); } catch { /* stockage indisponible */ }
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      const m = migrateProject(parsed);
      if (m.fromVersion < FORMAT_VERSION || m.notes.length) {
        try { localStorage.setItem(BACKUP_KEY, raw); } catch { /* ignoré */ }
        log('info', `Projet enregistré migré du format ${m.fromVersion} au format ${FORMAT_VERSION}`, m.notes);
      }
      return { info: m.info, columns: m.columns, notes: m.fromVersion < FORMAT_VERSION || m.notes.length ? [`Projet mis à jour depuis une version antérieure (sauvegarde de l'original conservée).`, ...m.notes] : [] };
    } catch (e) {
      try { localStorage.setItem(BACKUP_KEY, raw); } catch { /* ignoré */ }
      log('error', 'Projet enregistré illisible : nouveau projet créé', e);
      return { info: DEFAULT_INFO, columns: [newColumn('P1')], notes: ['Le projet enregistré était illisible : un nouveau projet a été créé. Le contenu d\'origine est conservé et peut être récupéré depuis le rapport de diagnostic.'] };
    }
  }
  return { info: DEFAULT_INFO, columns: [newColumn('P1')], notes: [] };
}

export function ProjectProvider({ children }: { children: ReactNode }) {
  const init = useMemo(load, []);
  const [info, setInfo] = useState<ProjectInfo>(init.info);
  const [columns, setColumns] = useState<ColumnData[]>(init.columns);
  const [activeId, setActiveId] = useState<string>(init.columns[0].id);
  const [migrationNotes, setMigrationNotes] = useState<string[]>(init.notes);
  const active = columns.find(c => c.id === activeId) ?? columns[0];

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify({ format: 'poteaux-ec2', version: FORMAT_VERSION, info, columns } satisfies ProjectFile)); }
    catch (e) { log('warn', 'Sauvegarde automatique impossible (quota ou stockage désactivé)', e); }
  }, [info, columns]);

  const patch = <K extends keyof ColumnData>(k: K) => (v: ColumnData[K]) =>
    setColumns(cs => cs.map(c => (c.id === active.id ? { ...c, [k]: v } : c)));

  const store: Store = {
    info, setInfo, columns, activeId: active.id, setActiveId, active,
    materials: active.materials, setMaterials: patch('materials'),
    geometry: active.geometry, setGeometry: patch('geometry'),
    loads: active.loads, setLoads: patch('loads'),
    rebar: active.rebar, setRebar: patch('rebar'),
    fire: active.fire, setFire: patch('fire'),
    materiau: active.materiau ?? 'ba', setMateriau: patch('materiau') as (v: 'ba' | 'acier' | 'bois') => void,
    bois: { ...BOIS_DEFAUT, ...(active.bois ?? {}) }, setBois: patch('bois') as (v: DonneesPoteauBois) => void,
    acier: { ...ACIER_DEFAUT, ...(active.acier ?? {}) }, setAcier: patch('acier') as (v: DonneesPoteauAcier) => void,
    addColumn: (duplicate = false) => {
      const n = columns.length + 1;
      let name = `P${n}`; let k = n;
      while (columns.some(c => c.name === name)) name = `P${++k}`;
      const c = newColumn(name, duplicate ? active : undefined);
      setColumns(cs => [...cs, c]); setActiveId(c.id);
    },
    removeColumn: (id) => {
      if (columns.length <= 1) return;
      const rest = columns.filter(c => c.id !== id);
      setColumns(rest);
      if (id === active.id) setActiveId(rest[0].id);
    },
    renameColumn: (id, name) => setColumns(cs => cs.map(c => (c.id === id ? { ...c, name } : c))),
    exportProject: () => JSON.stringify({ format: 'poteaux-ec2', version: FORMAT_VERSION, info, columns } satisfies ProjectFile, null, 2),
    importProject: (json) => {
      let parsed: unknown;
      try { parsed = JSON.parse(json); } catch (e) { log('warn', 'Import : JSON invalide', e); return 'Fichier illisible : JSON invalide.'; }
      try {
        const m = migrateProject(parsed);
        setInfo(m.info); setColumns(m.columns); setActiveId(m.columns[0].id);
        setMigrationNotes(m.notes.length ? [`Projet importé (format ${m.fromVersion}).`, ...m.notes] : []);
        log('info', `Projet importé (${m.columns.length} poteaux, format ${m.fromVersion})`, m.notes);
        return null;
      } catch (e) { log('warn', 'Import refusé', e); return e instanceof Error ? e.message : 'Fichier non reconnu.'; }
    },
    migrationNotes, dismissMigrationNotes: () => setMigrationNotes([]),
    resetProject: () => { const c = newColumn('P1'); setInfo(DEFAULT_INFO); setColumns([c]); setActiveId(c.id); },
  };
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useProject(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useProject doit être utilisé dans ProjectProvider');
  return s;
}
