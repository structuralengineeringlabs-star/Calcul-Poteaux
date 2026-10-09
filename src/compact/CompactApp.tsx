import EditeurSectionPoteau from './EditeurSectionPoteau';
import { calculerPoteauAcier, geometriePoteau, ACIER_DEFAUT } from '../acier/poteauAcier';
import { calculerPoteauBois, BOIS_DEFAUT } from '../bois/poteauBois';
import { planchePoteau } from '../plans/planPoteau';
import { PlanPoteauCarte, ImpressionPlanPoteau } from './PlanPoteauCarte';
import { classeBois } from '../eurocodes/ec5';
import { DonneesPoteauBoisCarte, ParametresPoteauBois, VerifsPoteauBois, DocumentsPoteauBois, NotePoteauBois } from './PoteauBois';
import { chargesPoteauAcier, DonneesPoteauAcierCarte, ParametresPoteauAcier, VerifsPoteauAcier, DocumentsPoteauAcier, NotePoteauAcier } from './PoteauAcier';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { estLogoSEL, selLogoSVG, SEL_LOGO_URL } from '../brand/sel';
import { Menu as MenuIcon, Check, X, AlertTriangle, ChevronDown, ChevronRight, Plus, Copy, Trash2, Download, Upload, FileText, Settings, Info, Pencil, Wand2 } from 'lucide-react';
import { calculerPoteau, nomenclature as computeNomenclature, CONCRETE_CLASSES, concreteLabel, ADVANCED_FIELDS, type Shape, type Verdict } from '../eurocode';
import { buildSheet, buildSectionPreview, toDXF, toSVG } from '../drawing';
import { makeZip, dataUrlToFile } from '../zip';
import { useProject, IDENTITE_SEL, DEFAULT_MATERIALS, DEFAULT_GEOMETRY, DEFAULT_LOADS, DEFAULT_FIRE, DEFAULT_REBAR } from '../store';
import { log, buildReport, getLog, clearLog } from '../diagnostics';
import ErrorBoundary from '../ErrorBoundary';
import { APP_VERSION } from '../version';
import { AIDE, type Aide } from './aide';
import ManuelView from '../manuel/ManuelView';
import { buildNoteHTML } from '../note/note';
import { genererPdf, nomFichier } from '../note/pdf';
import type { ProjectInfo, Revision } from '../store';
import { buildChecklist, proposeRebar, type CheckItem, type Proposal, type Status } from './analysis';

// ---------------------------------------------------------------------------
// Éléments de saisie denses
// ---------------------------------------------------------------------------

function NumInput({ value, onChange, step, min, w = 'w-24', invalid = false }: { value: number | undefined; onChange: (v: number) => void; step?: number; min?: number; w?: string; invalid?: boolean }) {
  const [txt, setTxt] = useState(String(value ?? 0));
  const focused = useRef(false);
  useEffect(() => { if (!focused.current) setTxt(String(value ?? 0)); }, [value]);
  return (
    <input type="number" inputMode="decimal" step={step ?? 'any'} min={min} value={txt}
      onFocus={() => { focused.current = true; }}
      onBlur={() => { focused.current = false; setTxt(String(value ?? 0)); }}
      onChange={e => { setTxt(e.target.value); const v = parseFloat(e.target.value.replace(',', '.')); if (Number.isFinite(v)) onChange(v); }}
      aria-invalid={invalid || undefined}
      className={`${w} h-8 px-2 text-right text-[13px] tabular-nums border rounded-md outline-none focus:ring-2 ${invalid ? 'border-red-400 bg-red-50 focus:ring-red-200' : 'border-gray-200 bg-white focus:border-primary focus:ring-primary/15'}`} />
  );
}

function TextInput({ value, onChange, w = 'w-64', placeholder }: { value: string | undefined; onChange: (v: string) => void; w?: string; placeholder?: string }) {
  return <input type="text" value={value ?? ''} placeholder={placeholder} onChange={e => onChange(e.target.value)}
    className={`${w} h-8 px-2 text-[13px] border border-gray-200 rounded-md bg-white focus:border-primary focus:ring-2 focus:ring-primary/15 outline-none`} />;
}

const MODEL_KEY = 'poteaux-ec2-modele-entreprise';
const MODEL_FIELDS: (keyof ProjectInfo)[] = ['entreprise', 'adresse', 'contact', 'email', 'customLogo', 'showLogo', 'copyright', 'mentions', 'auteur', 'verificateur', 'approbateur'];

function Sel({ value, onChange, options, w = 'w-44' }: { value: string; onChange: (v: string) => void; options: [string, string][]; w?: string }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className={`${w} h-8 px-2 text-[13px] border border-gray-200 rounded-md bg-white focus:border-primary outline-none`}>
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}

/** Bouton « ? » : bulle d'aide (définition, valeur usuelle, référence), fermée par Échap ou clic extérieur. */
function HelpButton({ label, aide }: { label: string; aide: Aide }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const out = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', out); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', out); document.removeEventListener('keydown', esc); };
  }, [open]);
  return (
    <span ref={ref} className="relative inline-block align-middle ml-1">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label={`Aide : ${label}`}
        className={`w-4 h-4 rounded-full text-[10px] font-bold leading-4 text-center ${open ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600 hover:bg-primary-light hover:text-primary'} focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50`}>?</button>
      {open && (
        <span role="tooltip" className="absolute z-30 left-0 top-6 w-72 max-w-[80vw] bg-white border border-gray-200 shadow-lg rounded-lg p-3 text-[12px] text-gray-700 leading-snug font-normal">
          <span className="block">{aide.def}</span>
          {aide.usuel && <span className="block mt-1.5"><b>Valeur usuelle :</b> {aide.usuel}</span>}
          {aide.ref && <span className="block mt-1.5 text-gray-500">{aide.ref}</span>}
        </span>
      )}
    </span>
  );
}

const aideDe = (label: ReactNode): Aide | undefined => {
  if (typeof label !== 'string') return undefined;
  return AIDE[label] ?? (label.startsWith('VEd') ? { def: 'Effort tranchant de calcul dans le plan indiqué.', ref: 'EC2 §6.2' } : undefined);
};

function Row({ label, unit, hint, children }: { label: ReactNode; unit?: string; hint?: string; children: ReactNode }) {
  const aide = aideDe(label);
  return (
    <div className="grid grid-cols-[1fr_auto_2.75rem] items-center gap-2 py-1 border-b border-gray-100 last:border-0">
      <div className="text-[13px] text-gray-700 leading-tight">{label}{aide && <HelpButton label={String(label)} aide={aide} />}{hint && <div className="text-[11px] text-gray-400">{hint}</div>}</div>
      <div className="justify-self-end">{children}</div>
      <span className="text-[11px] text-gray-400">{unit}</span>
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode }) {
  return (
    <label className="flex items-center gap-2 py-1.5 text-[13px] text-gray-700 cursor-pointer border-b border-gray-100 last:border-0">
      <input type="checkbox" className="accent-[var(--color-primary)]" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function Card({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{title}</h3>{right}
      </div>
      {children}
    </div>
  );
}

/**
 * Panneau repliable : défilement automatique à l'ouverture, libellé explicite, résumé des valeurs
 * lorsqu'il est fermé, compteur de réglages modifiés, ouverture automatique en cas d'erreur,
 * état mémorisé (y compris en changeant d'étape), accessible au clavier (aria-expanded).
 */
function Collapsible({ id, title, summary, modified = 0, hasError = false, children }: {
  id: string; title: string; summary?: ReactNode; modified?: number; hasError?: boolean; children: ReactNode;
}) {
  const key = `poteaux-ec2-panneau-${id}`;
  const [open, setOpen] = useState<boolean>(() => { try { return localStorage.getItem(key) === '1'; } catch { return false; } });
  const ref = useRef<HTMLDivElement>(null);
  const scrollOnOpen = useRef(false);
  useEffect(() => { try { localStorage.setItem(key, open ? '1' : '0'); } catch { /* stockage indisponible */ } }, [key, open]);
  useEffect(() => { if (hasError) { scrollOnOpen.current = !open; setOpen(true); } }, [hasError]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (open && scrollOnOpen.current) {
      scrollOnOpen.current = false;
      requestAnimationFrame(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  }, [open]);
  const toggle = () => { scrollOnOpen.current = !open; setOpen(!open); };
  return (
    <div ref={ref} className={`scroll-mt-20 rounded-xl border transition-colors ${hasError ? 'border-red-300 bg-red-50/30' : open ? 'border-primary/40 bg-white' : 'border-dashed border-gray-300 bg-gray-50/60'}`}>
      <button type="button" onClick={toggle} aria-expanded={open} aria-controls={`${id}-contenu`}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-left rounded-xl hover:bg-primary-light/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
        <ChevronRight size={16} className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-90 text-primary' : 'text-gray-500'}`} />
        <span className="flex-1 text-[13px] font-semibold text-gray-700">{title}</span>
        {hasError && <span className="text-[11px] font-semibold bg-red-100 text-red-700 rounded-full px-2 py-0.5">À corriger</span>}
        {modified > 0 && <span className="text-[11px] font-semibold bg-primary-light text-primary rounded-full px-2 py-0.5">{modified} réglage{modified > 1 ? 's' : ''} modifié{modified > 1 ? 's' : ''}</span>}
        <span className="text-[12px] font-semibold text-primary whitespace-nowrap">{open ? 'Masquer' : 'Afficher'}</span>
      </button>
      {!open && summary && <div className="pl-10 pr-4 pb-2.5 -mt-1 text-[12px] text-gray-500 leading-relaxed">{summary}</div>}
      {open && <div id={`${id}-contenu`} role="region" aria-label={title} className="px-4 pb-4">{children}</div>}
    </div>
  );
}

const STATUS: Record<Status, { icon: ReactNode; cls: string; label: string }> = {
  ok: { icon: <Check size={14} />, cls: 'text-green-700 bg-green-50 border-green-200', label: 'Conforme' },
  ko: { icon: <X size={14} />, cls: 'text-red-700 bg-red-50 border-red-200', label: 'Non conforme' },
  nv: { icon: <AlertTriangle size={14} />, cls: 'text-amber-700 bg-amber-50 border-amber-200', label: 'Non vérifié' },
  warn: { icon: <AlertTriangle size={14} />, cls: 'text-amber-700 bg-amber-50 border-amber-200', label: 'À examiner' },
  info: { icon: <Info size={14} />, cls: 'text-gray-600 bg-gray-50 border-gray-200', label: 'Information' },
};
const VERDICT: Record<Verdict, { cls: string; label: string }> = {
  OK: { cls: 'bg-green-600', label: 'Conforme' }, KO: { cls: 'bg-red-600', label: 'Non conforme' }, NV: { cls: 'bg-amber-500', label: 'Non vérifié' },
};
const fr = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d).replace('.', ',') : '∞');
const download = (data: BlobPart, name: string, type: string) => {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const SHAPES: [Shape, string][] = [['rect', 'Rectangulaire'], ['circ', 'Circulaire'], ['hex', 'Hexagonale'], ['demi', 'Demi-cercle'], ['quart', 'Quart de cercle'], ['L', 'En L'], ['T', 'En T'], ['croix', 'En croix']];
const SHAPE_PARAMS: Record<Shape, { k: string; label: string; def: number }[]> = {
  rect: [{ k: 'b', label: 'Largeur b', def: 30 }, { k: 'h', label: 'Hauteur h', def: 40 }],
  circ: [{ k: 'd', label: 'Diamètre D', def: 40 }],
  hex: [{ k: 'a', label: 'Côté a', def: 25 }],
  demi: [{ k: 'r', label: 'Rayon R', def: 40 }],
  quart: [{ k: 'r', label: 'Rayon R', def: 50 }],
  L: [{ k: 'b1', label: 'Aile verticale : épaisseur', def: 20 }, { k: 'h1', label: 'Aile verticale : hauteur', def: 60 }, { k: 'b2', label: 'Aile horizontale : longueur', def: 40 }, { k: 'h2', label: 'Aile horizontale : épaisseur', def: 20 }],
  T: [{ k: 'ba', label: 'Âme : épaisseur', def: 25 }, { k: 'ha', label: 'Âme : hauteur', def: 40 }, { k: 'bs', label: 'Table : largeur', def: 60 }, { k: 'hs', label: 'Table : épaisseur', def: 15 }],
  croix: [{ k: 'b1', label: 'Branche verticale : épaisseur', def: 20 }, { k: 'h1', label: 'Branche verticale : hauteur', def: 60 }, { k: 'b2', label: 'Branche horizontale : longueur', def: 60 }, { k: 'h2', label: 'Branche horizontale : épaisseur', def: 20 }],
};
const EXPOSURES = ['X0', 'XC1', 'XC2', 'XC3', 'XC4', 'XD1', 'XD2', 'XD3', 'XS1', 'XS2', 'XS3', 'XF1', 'XF2', 'XF3', 'XF4', 'XA1', 'XA2', 'XA3'];
const PHI = [6, 8, 10, 12, 14, 16, 20, 25, 32, 40];

type Step = 'donnees' | 'armatures' | 'verifs' | 'documents';
// EN 1990 tableau A1.1 : [code, libellé, ψ1, ψ2]
const USAGE: [string, string, number, number][] = [
  ['A', 'A — Habitation', 0.5, 0.3], ['B', 'B — Bureaux', 0.5, 0.3], ['C', 'C — Lieux de réunion', 0.7, 0.6],
  ['D', 'D — Commerces', 0.7, 0.6], ['E', 'E — Stockage', 0.9, 0.8], ['H', 'H — Toitures', 0, 0],
];

// ---------------------------------------------------------------------------
// Application compacte
// ---------------------------------------------------------------------------

export default function CompactApp({ initialView = 'app' }: { initialView?: 'app' | 'reglages' | 'manuel' }) {
  const P = useProject();
  const { materials: M, geometry: G, loads: Ld, rebar: R, fire: F, setMaterials, setGeometry, setLoads, setRebar, setFire, info } = P;
  const [step, setStep] = useState<Step>('donnees');
  const [view, setView] = useState<'app' | 'reglages' | 'manuel'>(initialView);
  const [bienvenue, setBienvenue] = useState<boolean>(() => { try { return localStorage.getItem('poteaux-ec2-bienvenue') !== 'vu'; } catch { return false; } });
  const fermerBienvenue = () => { setBienvenue(false); try { localStorage.setItem('poteaux-ec2-bienvenue', 'vu'); } catch { /* ignoré */ } };
  const [menuOpen, setMenuOpen] = useState(false);
  const [resultsOpen, setResultsOpen] = useState(false);
  useEffect(() => { setResultsOpen(false); }, [step, view]);
  useEffect(() => {
    if (!menuOpen && !resultsOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setMenuOpen(false); setResultsOpen(false); } };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen, resultsOpen]);
  // Raccourcis : Alt + 1 à Alt + 4 pour les étapes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      const k = ['1', '2', '3', '4'].indexOf(e.key);
      if (k >= 0) { e.preventDefault(); setView('app'); setStep((['donnees', 'armatures', 'verifs', 'documents'] as Step[])[k]); }
    };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, []);
  const [noteScope, setNoteScope] = useState<'actif' | 'projet'>('actif');
  const [pdfEtat, setPdfEtat] = useState<{ enCours: string | null; message: string | null }>({ enCours: null, message: null });
  const [modelMsg, setModelMsg] = useState<string | null>(null);
  const setInfo = (patch: Partial<ProjectInfo>) => P.setInfo({ ...info, ...patch });
  const [openCheck, setOpenCheck] = useState<string | null>(null);

  const calc = useMemo(() => calculerPoteau(M, G, Ld, R, F), [M, G, Ld, R, F]);
  // Poteau métallique (v4.1) : moteur EN 1993 indépendant du béton armé
  const acierMode = P.materiau === 'acier';
  const chA = useMemo(() => chargesPoteauAcier(Ld, G, geometriePoteau(P.acier).G), [Ld, G, P.acier]);
  const rA = useMemo(() => calculerPoteauAcier({ L: G.L, NEd: chA.NEd, My: chA.My, Mz: chA.Mz, etaFi: chA.etaFi, acier: P.acier }), [G.L, chA, P.acier]);
  const [noteAcier, setNoteAcier] = useState(false);
  // Poteau en bois (v4.2)
  const boisMode = P.materiau === 'bois';
  const masseBois = useMemo(() => (classeBois(P.bois.classe)?.rhomean ?? 420) * P.bois.b * P.bois.h * 1e-6, [P.bois]);
  const chB = useMemo(() => chargesPoteauAcier(Ld, G, masseBois), [Ld, G, masseBois]);
  const rB = useMemo(() => {
    const gq = (Ld.loadMode ?? 'direct') === 'GQ';
    const NG = gq ? (Ld.NG ?? 0) + chB.pp : chB.NEd / 1.35, NQ = gq ? Ld.NQ ?? 0 : 0; // saisie directe : traitée comme permanente (sécuritaire)
    const partG = chB.NEd > 0 ? 1.35 * NG / chB.NEd : 1;
    const My = Math.max(Math.abs(chB.My[0]), Math.abs(chB.My[1])), Mz = Math.max(Math.abs(chB.Mz[0]), Math.abs(chB.Mz[1]));
    return calculerPoteauBois({ L: G.L, NG, NQ, NEd: chB.NEd, My, Mz, MyG: My * partG, MzG: Mz * partG, psiFi: Ld.psi2 ?? 0.3, bois: P.bois });
  }, [Ld, G.L, chB, P.bois]);
  const [noteBois, setNoteBois] = useState(false);
  const [planImpr, setPlanImpr] = useState(false);
  // Pastille de l'en-tête : verdict et taux de travail maximal du matériau actif (acier ou bois)
  const verdictMat: Verdict = boisMode ? (rB.verdict === 'conforme' ? 'OK' : 'KO') : (rA.verdict === 'conforme' ? 'OK' : 'KO');
  const tauxMat = boisMode
    ? Math.max(rB.rQ.e623, rB.rQ.e624, rB.rQ.e635, rB.rG?.e623 ?? 0, rB.rG?.e624 ?? 0, rB.rG?.e635 ?? 0, rB.rQ.sc / (Math.min(rB.rQ.kcy, rB.rQ.kcz) * rB.rQ.fc0d))
    : Math.max(rA.section, rA.eq661, rA.eq662, chA.NEd * 1e3 / rA.NbRd);
  const cartouche = { projet: P.info.projet, client: P.info.client, repere: P.active.name, reference: P.info.reference, indice: P.info.revision ?? 'A', auteur: P.info.auteur, verificateur: P.info.verificateur };
  const feuillesPoteau = useMemo(() => (acierMode ? planchePoteau({ type: 'acier', r: rA, nuance: P.acier.nuance, L: G.L }, cartouche)
    : boisMode ? planchePoteau({ type: 'bois', r: rB, L: G.L, classeService: P.bois.classeService, feuR: P.bois.feuR }, cartouche) : []),
    [acierMode, boisMode, rA, rB, P.acier.nuance, P.bois.classeService, P.bois.feuR, G.L, cartouche.projet, cartouche.client, cartouche.repere, cartouche.reference, cartouche.indice, cartouche.auteur, cartouche.verificateur]); // eslint-disable-line react-hooks/exhaustive-deps
  const checks = useMemo(() => buildChecklist(calc, Ld), [calc, Ld]);
  const nomen = useMemo(() => computeNomenclature(G, R, calc.mat.cNom, calc.geom.A, calc.anchorage, calc.ties, calc.section), [G, R, calc]);
  const sectionSvg = useMemo(() => { const d = buildSectionPreview(calc, R); return d ? toSVG(d, { strokeScale: Math.max(d.w, d.h) / 160 }) : null; }, [calc, R]);
  const allResults = useMemo(() => P.columns.map(c => ({ c, r: c.id === P.activeId ? calc : calculerPoteau(c.materials, c.geometry, c.loads, c.rebar, c.fire) })), [P.columns, P.activeId, calc]);
  const counts = useMemo(() => ({
    ko: checks.filter(c => c.status === 'ko').length, nv: checks.filter(c => c.status === 'nv' || c.status === 'warn').length,
    ok: checks.filter(c => c.status === 'ok').length,
  }), [checks]);

  const isRectLike = G.shape === 'rect' || G.shape === 'circ';
  const bad = (...fields: string[]) => fields.some(f => calc.errorFields.includes(f));
  // ---- Options avancées : résumé, réglages modifiés, erreurs
  const advModified = [
    M.alphaCC !== DEFAULT_MATERIALS.alphaCC, M.gammaC !== DEFAULT_MATERIALS.gammaC, M.gammaS !== DEFAULT_MATERIALS.gammaS,
    M.deltaCdev !== DEFAULT_MATERIALS.deltaCdev, (M.classMode ?? 'saisi') !== DEFAULT_MATERIALS.classMode || M.structuralClass !== DEFAULT_MATERIALS.structuralClass,
    (G.secondOrderMethod ?? 'courbure') !== DEFAULT_GEOMETRY.secondOrderMethod, (G.lengthMode ?? 'beta') !== DEFAULT_GEOMETRY.lengthMode,
    (G.phiMode ?? 'saisi') !== DEFAULT_GEOMETRY.phiMode, G.RH !== DEFAULT_GEOMETRY.RH, G.t0 !== DEFAULT_GEOMETRY.t0, (G.Tmean ?? 20) !== DEFAULT_GEOMETRY.Tmean,
    (G.cement ?? 'N') !== DEFAULT_GEOMETRY.cement, (Ld.VEd ?? 0) > 0, (Ld.VEd_b ?? 0) > 0, (Ld.TEd ?? 0) > 0, (Ld.Mqp_h ?? 0) > 0,
    F.R !== DEFAULT_FIRE.R, F.l0fiFactor !== DEFAULT_FIRE.l0fiFactor, (F.muFi ?? 0) !== (DEFAULT_FIRE.muFi ?? 0),
  ].filter(Boolean).length;
  const advError = calc.errorFields.some(f => ADVANCED_FIELDS.includes(f) && f !== 'lapPercent');
  const advSummary = [
    `αcc ${fr(M.alphaCC ?? 1, 2)}`, `γc/γs ${fr(M.gammaC ?? 1.5, 2)}/${fr(M.gammaS ?? 1.15, 2)}`, `Δcdev ${M.deltaCdev} mm`, `classe ${calc.mat.structuralClass}`,
    `2nd ordre : ${G.secondOrderMethod === 'rigidite' ? 'rigidité' : 'courbure'} nominale`, `l0 par ${G.lengthMode === 'k' ? 'k1, k2' : 'β'}`,
    `φef ${G.phiMode === 'calcule' ? `calculé (φ∞ = ${calc.geom.phiInf !== null ? fr(calc.geom.phiInf) : '—'})` : `saisi ${fr(G.phi_ef ?? 0)}`}`,
    (Ld.VEd || Ld.VEd_b || Ld.TEd) ? `V ${fr(Ld.VEd ?? 0, 0)}/${fr(Ld.VEd_b ?? 0, 0)} kN, T ${fr(Ld.TEd ?? 0, 0)} kNm` : 'sans effort tranchant',
    F.R > 0 ? `feu R${F.R}` : 'sans exigence feu',
  ].join(' · ');
  // ---- Ancrages : résumé et réglages modifiés
  const anchModified = [(R.anchorMode ?? 'calcule') !== DEFAULT_REBAR.anchorMode, (R.bond ?? 'bonne') !== DEFAULT_REBAR.bond,
    (R.lapPercent ?? 100) !== DEFAULT_REBAR.lapPercent, R.numAnchors !== DEFAULT_REBAR.numAnchors, R.numLaps !== DEFAULT_REBAR.numLaps].filter(Boolean).length;
  const anchSummary = calc.anchorage
    ? `lbd ${fr(calc.anchorage.lbd, 0)} mm · l0 ${fr(calc.anchorage.l0, 0)} mm · adhérence ${R.bond === 'mediocre' ? 'médiocre' : 'bonne'} · ${R.lapPercent ?? 100} % recouverts · ${R.numAnchors} ancrage(s), ${R.numLaps} recouvrement(s)`
    : undefined;
  const planLabels = G.shape === 'rect' ? ['Plan de h', 'Plan de b'] : G.shape === 'circ' ? ['Plan principal', 'Plan perpendiculaire'] : ['Plan principal I (fort)', 'Plan principal II (faible)'];
  const gov = calc.governing;

  const setShape = (shape: Shape) => {
    const params: Record<string, number> = {};
    for (const p of SHAPE_PARAMS[shape]) params[p.k] = p.def;
    const minBars = shape === 'hex' ? 6 : shape === 'L' || shape === 'T' ? (shape === 'T' ? 8 : 6) : shape === 'croix' ? 12 : shape === 'demi' ? 6 : shape === 'quart' ? 6 : 4;
    setGeometry({ ...G, shape, params });
    if (R.nBars < minBars) setRebar({ ...R, nBars: minBars });
  };

  // ------------------------------- Étape 1 --------------------------------
  const stepDonnees = (
    <div className="space-y-4">
      {calc.errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-red-700 mb-1">Données à corriger</h3>
          {calc.errors.map((e, i) => <p key={i} className="text-[12px] text-red-800">{e}</p>)}
        </div>
      )}
      <div className="grid md:grid-cols-2 gap-4">
        <Card title="Géométrie">
          <Row label="Forme de section"><Sel value={G.shape} onChange={v => setShape(v as Shape)} options={SHAPES} /></Row>
          {SHAPE_PARAMS[G.shape].map(p => (
            <Row key={p.k} label={p.label} unit="mm"><NumInput invalid={bad(`param:${p.k}`)} value={Math.round((G.params[p.k] ?? 0) * 10 * 100) / 100} onChange={v => setGeometry({ ...G, params: { ...G.params, [p.k]: v / 10 } })} /></Row>
          ))}
          <EditeurSectionPoteau G={G} setParams={params => setGeometry({ ...G, params })} />
          <Row label="Hauteur libre l" unit="m"><NumInput invalid={bad('L')} step={0.05} value={G.L} onChange={v => setGeometry({ ...G, L: v })} /></Row>
          <Row label="Structure"><Sel value={G.braced === false ? '0' : '1'} onChange={v => setGeometry({ ...G, braced: v === '1', beta: v === '1' ? 1 : 2 })} options={[['1', 'Contreventée'], ['0', 'Non contreventée']]} /></Row>
          {(G.lengthMode ?? 'beta') === 'beta' && (
            <Row label="Liaisons (β)" hint={`l0 = ${fr(calc.geom.l0)} m`}>
              <Sel value={String(G.beta)} onChange={v => setGeometry({ ...G, beta: parseFloat(v) })}
                options={G.braced === false ? [['2', 'Encastré – libre (2,0)'], ['1', 'Encastré – guidé (1,0)']] : [['1', 'Articulé – articulé (1,0)'], ['0.7', 'Articulé – encastré (0,7)'], ['0.5', 'Encastré – encastré (0,5)']]} w="w-56" />
            </Row>
          )}
        </Card>
        <Card title="Matériaux">
          <Row label="Béton"><Sel value={String(M.fck)} onChange={v => setMaterials({ ...M, fck: parseInt(v), concreteClass: v })} options={CONCRETE_CLASSES.map(c => [String(c.fck), c.label])} w="w-32" /></Row>
          <Row label="Acier"><Sel value={String(M.fyk)} onChange={v => setMaterials({ ...M, fyk: parseInt(v), steelGrade: v })} options={[['400', 'B400'], ['500', 'B500'], ['550', 'B550']]} w="w-32" /></Row>
          <Row label="Classe d'exposition" hint={`cnom = ${calc.mat.cNom} mm ; classe mini. ${concreteLabel(calc.mat.minClassFck)}`}><Sel value={M.exposureClass} onChange={v => setMaterials({ ...M, exposureClass: v })} options={EXPOSURES.map(e => [e, e])} w="w-32" /></Row>
          <Row label="Paramètres nationaux"><Sel value={M.annex ?? 'FR'} onChange={v => setMaterials({ ...M, annex: v as 'FR' | 'EC2' })} options={[['FR', 'Annexe France'], ['EC2', 'Valeurs recommandées']]} w="w-40" /></Row>
        </Card>
        <Card title="Charges (effort normal)">
          <Row label="Type de sollicitation"><Sel value={Ld.solicitationType === 'cisaillement' ? 'compression' : Ld.solicitationType} onChange={v => setLoads({ ...Ld, solicitationType: v as typeof Ld.solicitationType })} options={[['compression', 'Compression centrée'], ['flexion_composee', 'Flexion composée'], ['traction', 'Traction']]} /></Row>
          <Row label="Saisie"><Sel value={Ld.loadMode ?? 'direct'} onChange={v => setLoads({ ...Ld, loadMode: v as 'GQ' | 'direct' })} options={[['GQ', 'Charges G et Q'], ['direct', 'Valeurs ELU']]} /></Row>
          {(Ld.loadMode ?? 'direct') === 'GQ' ? (<>
            <Row label="Permanentes G" unit="kN"><NumInput invalid={bad('GQ')} value={Ld.NG} onChange={v => setLoads({ ...Ld, NG: v })} /></Row>
            <Row label="Exploitation Q" unit="kN"><NumInput invalid={bad('GQ')} value={Ld.NQ} onChange={v => setLoads({ ...Ld, NQ: v })} /></Row>
            <Row label="Catégorie d'usage (EN 1990, A1.1)">
              <Sel value={USAGE.find(u => u[2] === (Ld.psi1 ?? 0.5) && u[3] === (Ld.psi2 ?? 0.3))?.[0] ?? 'X'} onChange={v => { const u = USAGE.find(x => x[0] === v); if (u) setLoads({ ...Ld, psi1: u[2], psi2: u[3] }); }}
                options={[...USAGE.map(u => [u[0], u[1]] as [string, string]), ['X', 'Personnalisée']]} w="w-52" />
            </Row>
            <Row label="ψ1 / ψ2" hint="ψ1 : feu (AN France) ; ψ2 : quasi-permanent"><div className="flex gap-1"><NumInput w="w-16" step={0.1} value={Ld.psi1 ?? 0.5} onChange={v => setLoads({ ...Ld, psi1: v })} /><NumInput w="w-16" step={0.1} value={Ld.psi2} onChange={v => setLoads({ ...Ld, psi2: v })} /></div></Row>
          </>) : (
            <Row label="NEd (ELU)" unit="kN"><NumInput invalid={bad('NEd')} value={Ld.NEd} onChange={v => setLoads({ ...Ld, NEd: v })} /></Row>
          )}
          <Toggle checked={!!Ld.selfWeight} onChange={v => setLoads({ ...Ld, selfWeight: v })} label="Ajouter le poids propre du poteau" />
          <div className="mt-2 grid grid-cols-3 gap-2 text-center text-[11px]">
            <div className="rounded-md bg-primary-light py-1"><div className="text-gray-500">NEd</div><b className="text-primary">{fr(calc.loads.NEd, 0)} kN</b></div>
            <div className="rounded-md bg-gray-50 py-1"><div className="text-gray-500">Ncar</div><b>{calc.loads.Ncar > 0 ? fr(calc.loads.Ncar, 0) : '—'}</b></div>
            <div className="rounded-md bg-gray-50 py-1"><div className="text-gray-500">Nqp</div><b>{calc.loads.Nqp > 0 ? fr(calc.loads.Nqp, 0) : '—'}</b></div>
          </div>
        </Card>
        <Card title="Moments du 1er ordre (ELU)">
          {Ld.solicitationType !== 'flexion_composee' ? (
            <p className="text-[13px] text-gray-500 py-2">Compression centrée : seuls l'imperfection et l'excentricité minimale sont pris en compte. Choisir « Flexion composée » pour saisir des moments.</p>
          ) : (<>
            {(['h', 'b'] as const).map((k, i) => (
              <div key={k} className="pb-1">
                <div className="text-[11px] font-semibold text-gray-500 pt-1">{planLabels[i]}</div>
                <Row label="Tête / pied" unit="kNm">
                  <div className="flex gap-1">
                    <NumInput w="w-20" value={k === 'h' ? Ld.Mh_top : Ld.Mb_top} onChange={v => setLoads(k === 'h' ? { ...Ld, Mh_top: v } : { ...Ld, Mb_top: v })} />
                    <NumInput w="w-20" value={k === 'h' ? Ld.Mh_bot : Ld.Mb_bot} onChange={v => setLoads(k === 'h' ? { ...Ld, Mh_bot: v } : { ...Ld, Mb_bot: v })} />
                  </div>
                </Row>
                {!(G.shape === 'circ' && k === 'b') && (
                  <Row label="Courbure"><Sel value={(k === 'h' ? Ld.curvH : Ld.curvB) ?? 'simple'} onChange={v => setLoads(k === 'h' ? { ...Ld, curvH: v as 'simple' | 'double' } : { ...Ld, curvB: v as 'simple' | 'double' })} options={[['simple', 'Simple'], ['double', 'Double']]} w="w-32" /></Row>
                )}
              </div>
            ))}
            <Toggle checked={!!Ld.transverse} onChange={v => setLoads({ ...Ld, transverse: v })} label="Moments dus à des charges transversales" />
          </>)}
        </Card>
      </div>

      <Collapsible id="options-avancees" title="Options avancées : coefficients, fluage, longueur efficace, effort tranchant, ELS, feu"
        summary={advSummary} modified={advModified} hasError={advError}>
        <div className="grid md:grid-cols-2 gap-4">
          <Card title="Coefficients et durabilité">
            <Row label="αcc"><Sel value={String(M.alphaCC ?? 1)} onChange={v => setMaterials({ ...M, alphaCC: parseFloat(v) })} options={[['1', '1,0'], ['0.85', '0,85']]} w="w-24" /></Row>
            <Row label="γc / γs">
              <div className="flex gap-1"><NumInput invalid={bad('gammaC')} w="w-16" step={0.05} value={M.gammaC} onChange={v => setMaterials({ ...M, gammaC: v })} /><NumInput invalid={bad('gammaS')} w="w-16" step={0.05} value={M.gammaS} onChange={v => setMaterials({ ...M, gammaS: v })} /></div>
            </Row>
            <Row label="Classe structurale" hint={calc.mat.structuralClassNote ?? undefined}>
              <Sel value={M.classMode === 'calcule' ? 'calc' : M.structuralClass} onChange={v => setMaterials(v === 'calc' ? { ...M, classMode: 'calcule' } : { ...M, classMode: 'saisi', structuralClass: v })}
                options={[['calc', `Calculée (${calc.mat.structuralClass})`], ...['S1', 'S2', 'S3', 'S4', 'S5', 'S6'].map(c => [c, c] as [string, string])]} w="w-36" />
            </Row>
            {M.classMode === 'calcule' && <Row label="Durée d'utilisation"><Sel value={String(M.designLife ?? 50)} onChange={v => setMaterials({ ...M, designLife: parseInt(v) as 25 | 50 | 100 })} options={[['25', '25 ans'], ['50', '50 ans'], ['100', '100 ans']]} w="w-28" /></Row>}
            <Row label="Δcdev" unit="mm" hint="10 recommandé ; moins avec assurance qualité"><NumInput invalid={bad('deltaCdev')} value={M.deltaCdev} onChange={v => setMaterials({ ...M, deltaCdev: v })} /></Row>
          </Card>
          <Card title="Second ordre">
            <Row label="Méthode"><Sel value={G.secondOrderMethod ?? 'courbure'} onChange={v => setGeometry({ ...G, secondOrderMethod: v as 'courbure' | 'rigidite' })} options={[['courbure', 'Courbure nominale'], ['rigidite', 'Rigidité nominale']]} /></Row>
            <Row label="Longueur efficace"><Sel value={G.lengthMode ?? 'beta'} onChange={v => setGeometry({ ...G, lengthMode: v as 'beta' | 'k' })} options={[['beta', 'Coefficient β'], ['k', 'Souplesses k1, k2']]} /></Row>
            {G.lengthMode === 'k' && <Row label="k1 (tête) / k2 (pied)" hint="0,1 encastré ; 1000 articulé"><div className="flex gap-1"><NumInput invalid={bad('k1k2')} w="w-16" value={G.k1} onChange={v => setGeometry({ ...G, k1: v })} /><NumInput invalid={bad('k1k2')} w="w-16" value={G.k2} onChange={v => setGeometry({ ...G, k2: v })} /></div></Row>}
            <Row label="Fluage φef"><Sel value={G.phiMode ?? 'saisi'} onChange={v => setGeometry({ ...G, phiMode: v as 'saisi' | 'calcule' })} options={[['calcule', `Calculé (φ∞ = ${calc.geom.phiInf !== null ? fr(calc.geom.phiInf) : '—'})`], ['saisi', 'Saisi']]} /></Row>
            {G.phiMode === 'calcule'
              ? <Row label="RH / t0" unit="% / j"><div className="flex gap-1"><NumInput invalid={bad('RH')} w="w-16" value={G.RH} onChange={v => setGeometry({ ...G, RH: v })} /><NumInput invalid={bad('t0')} w="w-16" value={G.t0} onChange={v => setGeometry({ ...G, t0: v })} /></div></Row>
              : <Row label="φef saisi"><NumInput invalid={bad('phi_ef')} step={0.1} value={G.phi_ef} onChange={v => setGeometry({ ...G, phi_ef: v })} /></Row>}
            {G.phiMode === 'calcule' && <Row label="Température moyenne" unit="°C" hint="Durcissement (annexe B, B.10)"><NumInput invalid={bad('Tmean')} value={G.Tmean ?? 20} onChange={v => setGeometry({ ...G, Tmean: v })} /></Row>}
            {G.phiMode === 'calcule' && <Row label="Classe de ciment"><Sel value={G.cement ?? 'N'} onChange={v => setGeometry({ ...G, cement: v as 'S' | 'N' | 'R' })} options={[['S', 'S (lent)'], ['N', 'N (normal)'], ['R', 'R (rapide)']]} w="w-32" /></Row>}
          </Card>
          <Card title="Effort tranchant et torsion">
            {isRectLike ? (<>
              <Row label={`VEd ${planLabels[0].toLowerCase()}`} unit="kN"><NumInput value={Ld.VEd} onChange={v => setLoads({ ...Ld, VEd: v })} /></Row>
              {G.shape === 'rect' && <Row label="VEd plan de b" unit="kN"><NumInput value={Ld.VEd_b} onChange={v => setLoads({ ...Ld, VEd_b: v })} /></Row>}
              <Row label="TEd" unit="kNm"><NumInput value={Ld.TEd} onChange={v => setLoads({ ...Ld, TEd: v })} /></Row>
            </>) : <p className="text-[13px] text-gray-500 py-2">Calcul réservé aux sections rectangulaires et circulaires.</p>}
          </Card>
          <Card title="ELS et fissuration">
            {(Ld.loadMode ?? 'direct') === 'direct' && (<>
              <Row label="Ncar (caractéristique)" unit="kN"><NumInput value={Ld.Ncar} onChange={v => setLoads({ ...Ld, Ncar: v })} /></Row>
              <Row label="Nqp (quasi-permanent)" unit="kN"><NumInput value={Ld.Nqp} onChange={v => setLoads({ ...Ld, Nqp: v })} /></Row>
            </>)}
            <Row label="Mqp plan de h" unit="kNm" hint={`wmax = ${calc.crack.wmax ?? 'à fixer'} mm`}><NumInput value={Ld.Mqp_h} onChange={v => setLoads({ ...Ld, Mqp_h: v })} /></Row>
          </Card>
          <Card title="Résistance au feu">
            <Row label="Durée requise"><Sel value={String(F.R)} onChange={v => setFire({ ...F, R: parseInt(v) })} options={[['0', 'Sans objet'], ['30', 'R30'], ['60', 'R60'], ['90', 'R90'], ['120', 'R120'], ['180', 'R180'], ['240', 'R240']]} w="w-32" /></Row>
            <Row label="l0,fi"><Sel value={String(F.l0fiFactor)} onChange={v => setFire({ ...F, l0fiFactor: parseFloat(v) })} options={[['0.5', '0,5 l (étage courant)'], ['0.7', '0,7 l (dernier niveau)'], ['1', 'l'], ['0', 'l0 à froid']]} /></Row>
            <Row label="μfi imposé" hint="0 = μfi = ηfi (sécuritaire)"><NumInput step={0.05} value={F.muFi} onChange={v => setFire({ ...F, muFi: v })} /></Row>
          </Card>
        </div>
      </Collapsible>
    </div>
  );

  // ------------------------------- Étape 2 --------------------------------
  const [proposals, setProposals] = useState<Proposal[] | null>(null);
  const [searching, setSearching] = useState(false);
  useEffect(() => { setProposals(null); }, [M, G, Ld, F]);
  const runProposal = () => {
    setSearching(true);
    setTimeout(() => { setProposals(proposeRebar(M, G, Ld, R, F)); setSearching(false); }, 20);
  };
  const stepArmatures = (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <Card title="Armatures longitudinales">
          <Row label="Diamètre Φl" unit="mm"><Sel value={String(R.phiL)} onChange={v => setRebar({ ...R, phiL: parseInt(v) })} options={PHI.filter(p => p >= 8).map(p => [String(p), `HA${p}`])} w="w-24" /></Row>
          <Row label="Nombre de barres"><NumInput invalid={bad('nBars')} min={1} value={R.nBars} onChange={v => setRebar({ ...R, nBars: Math.max(1, Math.round(v)) })} /></Row>
          <Row label="As fourni / requis" unit="cm²"><span className="text-[13px] tabular-nums"><b>{fr(calc.As_prov)}</b> / {Number.isFinite(calc.As_def) ? fr(calc.As_def) : '> 8 %'}</span></Row>
          <Row label="Taux d'armatures ρ" unit="%"><span className="text-[13px] tabular-nums">{fr(calc.rho)}</span></Row>
        </Card>
        <Card title="Armatures transversales">
          <Row label="Diamètre Φt" unit="mm"><Sel value={String(R.phiW)} onChange={v => setRebar({ ...R, phiW: parseInt(v) })} options={PHI.filter(p => p <= 16).map(p => [String(p), `HA${p}`])} w="w-24" /></Row>
          <Row label="Espacement courant" unit="mm" hint={calc.ties ? `max. ${fr(calc.ties.sCurrentMax, 0)} mm` : undefined}><NumInput invalid={bad('spacing')} value={R.spacing} onChange={v => setRebar({ ...R, spacing: Math.round(v) })} /></Row>
          {calc.ties && <Row label="Abouts / recouvrements" unit="mm"><span className="text-[13px] tabular-nums">{fr(calc.ties.sEnd, 0)} / {fr(calc.ties.sLap, 0)}</span></Row>}
          <Row label="Nombre de cadres"><span className="text-[13px] tabular-nums">{nomen.nb_cadres} ({calc.section?.ties.length ?? 1} par niveau)</span></Row>
        </Card>
      </div>

      <Card title="Proposition automatique" right={
        <button onClick={runProposal} disabled={searching} className="flex items-center gap-1.5 text-[12px] font-semibold text-white bg-primary rounded-md px-3 h-8 disabled:opacity-50">
          <Wand2 size={14} />{searching ? 'Recherche…' : 'Proposer'}
        </button>}>
        {proposals === null ? <p className="text-[13px] text-gray-500 py-1">Recherche les ferraillages conformes les plus légers pour la section et les charges actuelles.</p>
          : proposals.length === 0 ? <p className="text-[13px] text-red-600 py-1">Aucun ferraillage courant ne convient : augmenter la section de béton.</p>
          : (
            <table className="w-full text-[13px] mt-1">
              <thead className="text-[11px] text-gray-500"><tr><th className="text-left py-1">Armatures</th><th className="text-left">Cadres</th><th className="text-right">As (cm²)</th><th className="text-right">Taux ELU</th><th className="text-right">kg/m</th><th></th></tr></thead>
              <tbody>
                {proposals.map((p, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="py-1.5 font-semibold">{p.nBars} HA{p.phiL}</td><td>HA{p.phiW} e={p.spacing}</td>
                    <td className="text-right tabular-nums">{fr(p.As)}</td><td className="text-right tabular-nums">{fr(p.util)}</td><td className="text-right tabular-nums">{fr(p.mass, 1)}</td>
                    <td className="text-right"><button onClick={() => setRebar({ ...R, phiL: p.phiL, nBars: p.nBars, phiW: p.phiW, spacing: p.spacing })} className="text-primary text-[12px] font-semibold hover:underline">Appliquer</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </Card>

      <Collapsible id="ancrages" title="Ancrages et recouvrements" summary={anchSummary} modified={anchModified} hasError={calc.errorFields.includes('lapPercent')}>
        <div className="grid md:grid-cols-2 gap-4">
          <Card title="Paramètres">
            <Row label="Longueurs"><Sel value={R.anchorMode ?? 'calcule'} onChange={v => setRebar({ ...R, anchorMode: v as 'calcule' | 'saisi' })} options={[['calcule', 'Calculées (§8.4, §8.7)'], ['saisi', 'Saisies en k·Φ']]} /></Row>
            {(R.anchorMode ?? 'calcule') === 'calcule' ? (<>
              <Row label="Adhérence"><Sel value={R.bond ?? 'bonne'} onChange={v => setRebar({ ...R, bond: v as 'bonne' | 'mediocre' })} options={[['bonne', 'Bonne'], ['mediocre', 'Médiocre']]} w="w-32" /></Row>
              <Row label="Barres recouvertes" unit="%"><NumInput invalid={bad('lapPercent')} value={R.lapPercent} onChange={v => setRebar({ ...R, lapPercent: v })} /></Row>
            </>) : (<>
              <Row label="Ancrage" unit="×Φ"><NumInput value={R.anchoringFactor} onChange={v => setRebar({ ...R, anchoringFactor: v })} /></Row>
              <Row label="Recouvrement" unit="×Φ"><NumInput value={R.overlapFactor} onChange={v => setRebar({ ...R, overlapFactor: v })} /></Row>
            </>)}
            <Row label="Zones d'ancrage / recouvrement"><div className="flex gap-1"><NumInput w="w-16" value={R.numAnchors} onChange={v => setRebar({ ...R, numAnchors: Math.round(v) })} /><NumInput w="w-16" value={R.numLaps} onChange={v => setRebar({ ...R, numLaps: Math.round(v) })} /></div></Row>
          </Card>
          <Card title="Résultats">
            {calc.anchorage ? (<>
              <Row label="lb,rqd" unit="mm"><span className="text-[13px] tabular-nums">{fr(calc.anchorage.lb_rqd, 0)}</span></Row>
              <Row label="lbd (ancrage)" unit="mm"><b className="text-[13px] tabular-nums">{fr(calc.anchorage.lbd, 0)}</b></Row>
              <Row label="l0 (recouvrement)" unit="mm"><b className="text-[13px] tabular-nums">{fr(calc.anchorage.l0, 0)} ({fr(calc.anchorage.l0 / R.phiL, 0)}Φ)</b></Row>
              <Row label="Barres" ><span className="text-[13px]">{calc.anchorage.state === 'compression' ? 'comprimées' : 'tendues (enveloppe)'}</span></Row>
            </>) : <p className="text-[13px] text-gray-500">—</p>}
          </Card>
        </div>
      </Collapsible>

      <Card title="Nomenclature">
        <table className="w-full text-[13px]">
          <thead className="text-[11px] text-gray-500"><tr><th className="text-left py-1">Rep.</th><th className="text-left">Désignation</th><th className="text-right">Nb</th><th className="text-right">Longueur (m)</th><th className="text-right">Masse (kg)</th></tr></thead>
          <tbody>
            <tr className="border-t border-gray-100"><td className="py-1">1</td><td>{R.nBars} HA{R.phiL}</td><td className="text-right">{R.nBars}</td><td className="text-right tabular-nums">{fr(nomen.L_barre)}</td><td className="text-right tabular-nums">{fr(nomen.weightL, 1)}</td></tr>
            <tr className="border-t border-gray-100"><td className="py-1">2</td><td>Cadres HA{R.phiW}</td><td className="text-right">{nomen.nb_cadres}</td><td className="text-right tabular-nums">{fr(nomen.L_cadre)}</td><td className="text-right tabular-nums">{fr(nomen.weightW, 1)}</td></tr>
            <tr className="border-t border-gray-200 font-bold"><td className="py-1" colSpan={4}>Total</td><td className="text-right tabular-nums">{fr(nomen.totalWeight, 1)}</td></tr>
          </tbody>
        </table>
      </Card>
    </div>
  );

  // ------------------------------- Étape 3 --------------------------------
  const [filter, setFilter] = useState<'all' | 'issues'>('all');
  const groups = useMemo(() => {
    const list = filter === 'issues' ? checks.filter(c => c.status === 'ko' || c.status === 'nv' || c.status === 'warn') : checks;
    const m = new Map<string, CheckItem[]>();
    for (const c of list) { if (!m.has(c.group)) m.set(c.group, []); m.get(c.group)!.push(c); }
    return [...m.entries()];
  }, [checks, filter]);
  const stepVerifs = (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-[12px]">
        {([['all', `Toutes (${checks.length})`], ['issues', `À traiter (${counts.ko + counts.nv})`]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} className={`px-3 h-7 rounded-full border ${filter === k ? 'bg-primary text-white border-primary' : 'bg-white border-gray-200 text-gray-600'}`}>{l}</button>
        ))}
      </div>
      {groups.map(([g, items]) => (
        <div key={g} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 px-4 pt-3 pb-1">{g}</h3>
          {items.map(c => {
            const st = STATUS[c.status]; const open = openCheck === c.id;
            return (
              <div key={c.id} className="border-t border-gray-100">
                <button onClick={() => setOpenCheck(open ? null : c.id)} className="w-full grid grid-cols-[1.5rem_1fr_auto_1rem] items-center gap-2 px-4 py-2 text-left hover:bg-gray-50">
                  <span className={`w-6 h-6 rounded-full border flex items-center justify-center ${st.cls}`} title={st.label}>{st.icon}</span>
                  <span className="text-[13px]"><span className="font-medium">{c.title}</span> <span className="text-[11px] text-gray-400">{c.ref}</span></span>
                  <span className="text-[12px] tabular-nums text-right text-gray-700">{c.value}{c.limit && <span className="text-gray-400"> · {c.limit}</span>}</span>
                  {c.details.length > 0 ? (open ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : <span />}
                </button>
                {open && c.details.length > 0 && (
                  <ul className="px-12 pb-3 space-y-1 text-[12px] text-gray-600 list-disc">{c.details.map((d, i) => <li key={i}>{d}</li>)}</ul>
                )}
              </div>
            );
          })}
        </div>
      ))}
      {calc.warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 space-y-1">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Avertissements</h3>
          {calc.warnings.map((w, i) => <p key={i} className="text-[12px] text-amber-800">{w}</p>)}
        </div>
      )}
    </div>
  );

  // ------------------------------- Étape 4 --------------------------------
  const sheet = useMemo(() => calc.section ? buildSheet(calc, G, R, nomen, {
    owner: info.entreprise, title: `${info.titreNote} — ${P.active.name}`, subtitle: '', number: `${info.reference}-${P.active.name}`,
    revision: info.revision || 'A', date: info.date, author: info.auteur, approver: info.approbateur || info.verificateur || '—', project: info.projet, client: info.client, docType: 'Plan de ferraillage', logo: info.showLogo ? info.customLogo : null, logoSEL: info.showLogo && estLogoSEL(info.customLogo),
  }, concreteLabel(M.fck), `B${M.fyk}`, M.exposureClass) : null, [calc, G, R, nomen, info, P.active.name, M.fck, M.fyk, M.exposureClass]);
  const sheetSvg = useMemo(() => (sheet ? toSVG(sheet, { background: '#fff' }) : null), [sheet]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const exportCsv = () => {
    const head = ['Poteau', 'Section', 'l (m)', 'NEd (kN)', 'MEd (kNm)', 'Armatures', 'Cadres', 'As,req (cm²)', 'As,prov (cm²)', 'Taux ELU', 'Verdict'];
    const rows = allResults.map(({ c, r }) => [c.name, r.section?.label ?? c.geometry.shape, c.geometry.L, r.loads.NEd.toFixed(1), (r.governing?.MEd ?? 0).toFixed(1),
      `${c.rebar.nBars} HA${c.rebar.phiL}`, `HA${c.rebar.phiW} e=${c.rebar.spacing}`, Number.isFinite(r.As_def) ? r.As_def.toFixed(2) : '>8%', r.As_prov.toFixed(2), Number.isFinite(r.util) ? r.util.toFixed(2) : '∞', VERDICT[r.verdict].label]);
    download('\ufeff' + [head, ...rows].map(r => r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(';')).join('\r\n'), `${info.reference || 'projet'}-recapitulatif.csv`, 'text/csv');
  };
  const colonnesNote = () => {
    const list = noteScope === 'actif' ? allResults.filter(x => x.c.id === P.activeId) : allResults;
    return list.map(({ c, r }) => ({ ...c, calc: r, nomen: computeNomenclature(c.geometry, c.rebar, r.mat.cNom, r.geom.A, r.anchorage, r.ties, r.section) }));
  };
  const dateIso = () => new Date().toISOString().slice(0, 10);
  /** PDF produit directement par l'application : aucune boîte d'impression, identique dans tous les navigateurs. */
  const telechargerPdf = async (quoi: 'note' | 'plans') => {
    if (pdfEtat.enCours) return;
    const cols = colonnesNote();
    const portee = noteScope === 'actif' ? P.active.name : 'projet';
    setPdfEtat({ enCours: quoi === 'note' ? 'Génération de la note…' : 'Génération des plans…', message: null });
    const t0 = performance.now();
    try {
      await new Promise(r => setTimeout(r, 30)); // laisse l'interface afficher la progression
      const blob = await genererPdf(quoi, info, cols, APP_VERSION); // Web Worker : interface non bloquée
      const nom = nomFichier(info.reference || 'poteaux', portee, quoi === 'note' ? 'note-de-calcul' : 'plans-A3', `ind-${info.revision || 'A'}`, dateIso());
      download(blob, nom, 'application/pdf');
      log('info', `PDF ${quoi} généré (${cols.length} poteau(x), ${Math.round(blob.size / 1024)} Ko, ${Math.round(performance.now() - t0)} ms)`);
      setPdfEtat({ enCours: null, message: `${nom} téléchargé.` });
    } catch (e) {
      log('error', `Échec de la génération du PDF (${quoi})`, e);
      setPdfEtat({ enCours: null, message: 'La génération du PDF a échoué. Le rapport de diagnostic (Réglages) contient le détail.' });
    }
  };
  /** Aperçu paginé à l'écran, dans un vrai onglet (adresse blob:), avec impression par le navigateur. */
  const apercuNote = () => {
    const cols = colonnesNote();
    log('info', `Aperçu de la note (${cols.length} poteau(x))`);
    import('../../node_modules/pagedjs/dist/paged.polyfill.min.js?raw').then(({ default: pagedSrc }) => {
      const html = buildNoteHTML(info, cols, APP_VERSION, { includePlans: false }, pagedSrc);
      const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
      const w = window.open(url, '_blank');
      if (!w) { log('warn', 'Onglet de l\'aperçu bloqué : téléchargement du fichier HTML'); download(html, `${info.reference || 'note'}.html`, 'text/html'); }
      setTimeout(() => URL.revokeObjectURL(url), 120_000);
    }).catch(e => log('error', 'Chargement de Paged.js impossible', e));
  };
  const stepDocuments = (
    <div className="space-y-4">
      <div className="grid md:grid-cols-3 gap-4">
        <Card title="Note de calcul">
          <Row label="Contenu"><Sel value={noteScope} onChange={v => setNoteScope(v as 'actif' | 'projet')} options={[['actif', `Poteau ${P.active.name}`], ['projet', `Projet (${P.columns.length} poteaux)`]]} w="w-40" /></Row>
          <p className="text-[12px] text-gray-500 my-2">PDF A4 produit par l'application : page de garde, sommaire et listes paginés, données d'entrée en annexe. Les plans forment un PDF A3 séparé.</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => telechargerPdf('note')} disabled={!!pdfEtat.enCours} className="flex items-center gap-2 text-[13px] font-semibold text-white bg-primary rounded-md px-3 h-9 disabled:opacity-60"><FileText size={15} />{pdfEtat.enCours === 'Génération de la note…' ? pdfEtat.enCours : 'Télécharger la note (PDF)'}</button>
            <button onClick={() => telechargerPdf('plans')} disabled={!!pdfEtat.enCours} className="flex items-center gap-1.5 text-[13px] font-semibold border border-gray-200 rounded-md px-3 h-9 disabled:opacity-60"><Download size={15} />{pdfEtat.enCours === 'Génération des plans…' ? pdfEtat.enCours : 'Plans A3 (PDF)'}</button>
          </div>
          <button onClick={apercuNote} className="mt-2 text-[12px] font-semibold text-primary hover:underline">Aperçu à l'écran</button>
          {pdfEtat.message && <p role="status" className="text-[12px] text-gray-600 mt-1">{pdfEtat.message}</p>}
        </Card>
        <Card title="Plan de ferraillage">
          <p className="text-[13px] text-gray-600 mb-3">Plan A3 : coupe, élévation, nomenclature, cartouche ISO 7200.</p>
          <div className="flex gap-2">
            <button disabled={!sheet} onClick={() => { if (!sheet) return; log('info', `Export DXF ${P.active.name}`); download(toDXF(sheet), `${info.reference}-${P.active.name}.dxf`, 'application/dxf'); }} className="flex items-center gap-1.5 text-[13px] font-semibold text-white bg-primary rounded-md px-3 h-9 disabled:opacity-40"><Download size={15} />DXF</button>
            <button disabled={!sheetSvg} onClick={() => sheetSvg && download(sheetSvg, `${info.reference}-${P.active.name}.svg`, 'image/svg+xml')} className="flex items-center gap-1.5 text-[13px] font-semibold border border-gray-200 rounded-md px-3 h-9 disabled:opacity-40"><Download size={15} />SVG</button>
          </div>
          {info.customLogo && info.showLogo && sheet && (
            <button onClick={() => {
              const logo = dataUrlToFile(info.customLogo!); const base = `${info.reference}-${P.active.name}`;
              const lisez = `Plan ${base}.dxf (DXF R12, unités : mm papier, format A3).\r\n\r\nLe format DXF R12 n'incorpore pas d'image : le logo est fourni séparément (logo.${logo?.ext}).\r\nPour l'insérer : commande IMAGE (AutoCAD) ou Insertion > Image, puis placer le fichier dans le cadre « LOGO » du cartouche\r\n(coin supérieur droit, 28 × 8 mm).\r\n\r\nLe cartouche est un bloc « CARTOUCHE » à attributs : modifier les champs avec la commande ATTEDIT (ou double-clic).\r\n`;
              const files = [{ name: `${base}.dxf`, data: toDXF(sheet) }, { name: 'LISEZMOI.txt', data: new TextEncoder().encode(lisez) }];
              if (logo) files.push({ name: `logo.${logo.ext}`, data: logo.data });
              log('info', `Export DXF + logo (ZIP) ${P.active.name}`);
              download(makeZip(files), `${base}-dxf.zip`, 'application/zip');
            }} className="mt-2 flex items-center gap-1.5 text-[12px] font-semibold text-primary hover:underline"><Download size={13} />DXF + logo (ZIP)</button>
          )}
        </Card>
        <Card title="Projet">
          <p className="text-[13px] text-gray-600 mb-3">Sauvegarde de tous les poteaux et du cartouche dans un fichier.</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => download(P.exportProject(), `${info.reference || 'projet'}.poteaux.json`, 'application/json')} className="flex items-center gap-1.5 text-[13px] font-semibold border border-gray-200 rounded-md px-3 h-9"><Download size={15} />Enregistrer</button>
            <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 text-[13px] font-semibold border border-gray-200 rounded-md px-3 h-9"><Upload size={15} />Ouvrir</button>
            <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={async e => {
              const file = e.target.files?.[0]; if (!file) return;
              setImportMsg(P.importProject(await file.text()) ?? 'Projet chargé.'); e.target.value = '';
            }} />
          </div>
          {importMsg && <p className="text-[12px] mt-2 text-gray-600">{importMsg}</p>}
        </Card>
      </div>
      <Card title={`Récapitulatif du projet — ${P.columns.length} poteau(x)`} right={<button onClick={exportCsv} className="text-[12px] font-semibold text-primary hover:underline">Exporter en CSV</button>}>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="text-[11px] text-gray-500"><tr><th className="text-left py-1">Poteau</th><th className="text-left">Section</th><th className="text-right">NEd (kN)</th><th className="text-right">MEd (kNm)</th><th className="text-left pl-3">Armatures</th><th className="text-right">Taux</th><th className="text-right">Verdict</th></tr></thead>
            <tbody>
              {allResults.map(({ c, r }) => (
                <tr key={c.id} onClick={() => P.setActiveId(c.id)} className={`border-t border-gray-100 cursor-pointer hover:bg-gray-50 ${c.id === P.activeId ? 'bg-primary-light/50' : ''}`}>
                  <td className="py-1.5 font-semibold">{c.name}</td><td className="text-gray-600">{r.section?.label ?? c.geometry.shape}</td>
                  <td className="text-right tabular-nums">{fr(r.loads.NEd, 0)}</td><td className="text-right tabular-nums">{fr(r.governing?.MEd ?? 0, 1)}</td>
                  <td className="pl-3">{c.rebar.nBars} HA{c.rebar.phiL} · HA{c.rebar.phiW} e={c.rebar.spacing}</td>
                  <td className="text-right tabular-nums">{fr(r.util)}</td>
                  <td className="text-right"><span className={`inline-block px-2 py-0.5 rounded-full text-white text-[11px] ${VERDICT[r.verdict].cls}`}>{VERDICT[r.verdict].label}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {sheetSvg && (
        <Card title="Aperçu du plan">
          <div className="overflow-auto rounded-lg border border-gray-100 bg-gray-50 p-2"><div className="min-w-[760px] bg-white" dangerouslySetInnerHTML={{ __html: sheetSvg }} /></div>
        </Card>
      )}
    </div>
  );

  // ------------------------------- Réglages --------------------------------
  const logoRef = useRef<HTMLInputElement>(null);
  const modelFileRef = useRef<HTMLInputElement>(null);
  const revs = info.revisions ?? [];
  const setRev = (i: number, patch: Partial<Revision>) => setInfo({ revisions: revs.map((r, j) => (j === i ? { ...r, ...patch } : r)) });
  const applyModel = (m: Partial<ProjectInfo>) => { const patch: Partial<ProjectInfo> = {}; for (const k of MODEL_FIELDS) if (k in m) (patch as Record<string, unknown>)[k] = m[k]; setInfo(patch); };
  const viewReglages = (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <Card title="Entreprise (en-tête et cartouche)">
          <Row label="Raison sociale"><TextInput value={info.entreprise} onChange={v => setInfo({ entreprise: v })} /></Row>
          <Row label="Adresse"><TextInput value={info.adresse} onChange={v => setInfo({ adresse: v })} /></Row>
          <Row label="Téléphone"><TextInput value={info.contact} onChange={v => setInfo({ contact: v })} /></Row>
          <Row label="Courriel"><TextInput value={info.email} onChange={v => setInfo({ email: v })} /></Row>
          <Row label="Copyright" hint="Pied de page de la note"><TextInput value={info.copyright} placeholder={`© ${new Date().getFullYear()} ${info.entreprise}`} onChange={v => setInfo({ copyright: v })} /></Row>
          <div className="flex items-center gap-3 py-2">
            <div className="w-40 h-16 rounded-md border border-dashed border-gray-300 flex items-center justify-center bg-white p-1 overflow-hidden">
              <img src={info.customLogo || SEL_LOGO_URL} alt="Logo" className="max-w-full max-h-full" />
            </div>
            <div className="space-y-1">
              <button onClick={() => logoRef.current?.click()} className="text-[12px] font-semibold border border-gray-200 rounded-md px-3 h-8 hover:bg-gray-50">Choisir un autre logo…</button>
              {!estLogoSEL(info.customLogo) && <button onClick={() => setInfo({ customLogo: SEL_LOGO_URL, showLogo: true })} className="block text-[12px] font-semibold text-primary hover:underline">Rétablir le logo S.E.L.</button>}
              <p className="text-[11px] text-gray-500">{estLogoSEL(info.customLogo) || !info.customLogo ? 'Logo S.E.L. (intégré, vectoriel)' : 'Logo personnalisé'}</p>
              <p className="text-[11px] text-gray-400">PNG, JPG ou SVG, 1 Mo maximum.</p>
            </div>
            <input ref={logoRef} type="file" accept="image/png,image/jpeg,image/svg+xml" className="hidden" onChange={e => {
              const file = e.target.files?.[0]; e.target.value = ''; if (!file) return;
              if (file.size > 1024 * 1024) { setModelMsg('Logo trop volumineux (1 Mo maximum).'); return; }
              const rd = new FileReader(); rd.onload = () => setInfo({ customLogo: String(rd.result), showLogo: true }); rd.readAsDataURL(file);
            }} />
          </div>
          <Toggle checked={info.showLogo} onChange={v => setInfo({ showLogo: v })} label="Afficher le logo sur la note" />
        </Card>
        <Card title="Projet">
          <Row label="Projet"><TextInput value={info.projet} onChange={v => setInfo({ projet: v })} /></Row>
          <Row label="Client / maître d'ouvrage"><TextInput value={info.client} onChange={v => setInfo({ client: v })} /></Row>
          <Row label="Référence du document"><TextInput value={info.reference} onChange={v => setInfo({ reference: v })} w="w-40" /></Row>
          <Row label="Titre de la note"><TextInput value={info.titreNote} onChange={v => setInfo({ titreNote: v })} /></Row>
          <Row label="Sous-titre du cartouche"><TextInput value={info.sousTitre} placeholder="Poteaux béton armé" onChange={v => setInfo({ sousTitre: v })} /></Row>
          <Row label="Date d'édition"><TextInput value={info.date} onChange={v => setInfo({ date: v })} w="w-32" /></Row>
          <Row label="Indice de révision"><TextInput value={info.revision} onChange={v => setInfo({ revision: v })} w="w-20" /></Row>
        </Card>
        <Card title="Intervenants">
          <Row label="Établi par"><TextInput value={info.auteur} onChange={v => setInfo({ auteur: v })} /></Row>
          <Row label="Vérifié par"><TextInput value={info.verificateur} onChange={v => setInfo({ verificateur: v })} /></Row>
          <Row label="Approuvé par"><TextInput value={info.approbateur} onChange={v => setInfo({ approbateur: v })} /></Row>
        </Card>
        <Card title="Mentions en fin de note">
          <textarea value={info.mentions ?? ''} onChange={e => setInfo({ mentions: e.target.value })} rows={5}
            className="w-full text-[13px] border border-gray-200 rounded-md p-2 focus:border-primary outline-none" />
        </Card>
      </div>
      <Card title="Tableau des révisions" right={<button onClick={() => setInfo({ revisions: [...revs, { indice: String.fromCharCode(65 + revs.length), date: new Date().toLocaleDateString('fr-FR'), objet: '', auteur: info.auteur }] })} className="text-[12px] font-semibold text-primary hover:underline">+ Ajouter une révision</button>}>
        <table className="w-full text-[13px]">
          <thead className="text-[11px] text-gray-500"><tr><th className="text-left py-1 w-16">Indice</th><th className="text-left w-32">Date</th><th className="text-left">Objet</th><th className="text-left w-48">Auteur</th><th /></tr></thead>
          <tbody>
            {revs.map((r, i) => (
              <tr key={i} className="border-t border-gray-100">
                <td className="py-1"><TextInput w="w-14" value={r.indice} onChange={v => setRev(i, { indice: v })} /></td>
                <td><TextInput w="w-28" value={r.date} onChange={v => setRev(i, { date: v })} /></td>
                <td><TextInput w="w-full" value={r.objet} onChange={v => setRev(i, { objet: v })} /></td>
                <td><TextInput w="w-44" value={r.auteur} onChange={v => setRev(i, { auteur: v })} /></td>
                <td className="text-right"><button title="Supprimer" onClick={() => setInfo({ revisions: revs.filter((_, j) => j !== i) })} className="text-gray-400 hover:text-red-600"><Trash2 size={14} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Card title="Modèle d'entreprise">
        <p className="text-[13px] text-gray-600 mb-2">Enregistre l'identité (raison sociale, coordonnées, logo, copyright, mentions, intervenants) pour la réappliquer aux nouveaux projets.</p>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => { setInfo(IDENTITE_SEL); setModelMsg('Identité Structural & Engineering Labs appliquée.'); }} className="text-[13px] font-semibold text-white bg-primary rounded-md px-3 h-9">Identité S.E.L.</button>
          <button onClick={() => { const m: Partial<ProjectInfo> = {}; for (const k of MODEL_FIELDS) (m as Record<string, unknown>)[k] = info[k]; try { localStorage.setItem(MODEL_KEY, JSON.stringify(m)); setModelMsg('Modèle enregistré dans ce navigateur.'); } catch { setModelMsg('Enregistrement impossible (stockage indisponible).'); } }} className="text-[13px] font-semibold border border-gray-200 rounded-md px-3 h-9 hover:bg-gray-50">Enregistrer comme modèle</button>
          <button onClick={() => { try { const raw = localStorage.getItem(MODEL_KEY); if (raw) { applyModel(JSON.parse(raw)); setModelMsg('Modèle appliqué.'); } else setModelMsg('Aucun modèle enregistré.'); } catch { setModelMsg('Modèle illisible.'); } }} className="text-[13px] font-semibold border border-gray-200 rounded-md px-3 h-9 hover:bg-gray-50">Appliquer le modèle</button>
          <button onClick={() => { const m: Partial<ProjectInfo> = {}; for (const k of MODEL_FIELDS) (m as Record<string, unknown>)[k] = info[k]; download(JSON.stringify({ format: 'poteaux-ec2-modele', version: 1, modele: m }, null, 2), 'modele-entreprise.json', 'application/json'); }} className="flex items-center gap-1.5 text-[13px] font-semibold border border-gray-200 rounded-md px-3 h-9 hover:bg-gray-50"><Download size={15} />Exporter</button>
          <button onClick={() => modelFileRef.current?.click()} className="flex items-center gap-1.5 text-[13px] font-semibold border border-gray-200 rounded-md px-3 h-9 hover:bg-gray-50"><Upload size={15} />Importer</button>
          <input ref={modelFileRef} type="file" accept=".json" className="hidden" onChange={async e => {
            const file = e.target.files?.[0]; e.target.value = ''; if (!file) return;
            try { const j = JSON.parse(await file.text()); if (j.format !== 'poteaux-ec2-modele') throw 0; applyModel(j.modele); setModelMsg('Modèle importé et appliqué.'); } catch { setModelMsg('Fichier de modèle non reconnu.'); }
          }} />
        </div>
        {modelMsg && <p className="text-[12px] text-gray-600 mt-2">{modelMsg}</p>}
      </Card>
      <Card title="Diagnostic">
        <p className="text-[13px] text-gray-600 mb-2">Le journal enregistre les erreurs et les opérations importantes ({getLog().length} entrée(s)). En cas d'anomalie, téléchargez le rapport et joignez-le à votre signalement : il contient la version, le navigateur, la taille d'écran et le journal, mais pas le détail de vos projets.</p>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => download(buildReport({ projet: { poteaux: P.columns.length, reference: info.reference } }), 'diagnostic-poteaux-ec2.json', 'application/json')} className="flex items-center gap-1.5 text-[13px] font-semibold border border-gray-200 rounded-md px-3 h-9 hover:bg-gray-50"><Download size={15} />Télécharger le rapport</button>
          <button onClick={() => { clearLog(); setModelMsg('Journal vidé.'); }} className="text-[13px] font-semibold border border-gray-200 rounded-md px-3 h-9 hover:bg-gray-50">Vider le journal</button>
        </div>
      </Card>
    </div>
  );

  // ------------------------------- Mise en page ---------------------------
  const STEPS: { id: Step; n: number; label: string; badge?: ReactNode }[] = [
    { id: 'donnees', n: 1, label: 'Données' },
    { id: 'armatures', n: 2, label: acierMode || boisMode ? 'Paramètres' : 'Armatures' },
    { id: 'verifs', n: 3, label: 'Vérifications', badge: counts.ko > 0 ? <span className="ml-1.5 text-[10px] bg-red-600 text-white rounded-full px-1.5">{counts.ko}</span> : null },
    { id: 'documents', n: 4, label: 'Documents' },
  ];
  const [renaming, setRenaming] = useState<string | null>(null);

  const railContent = (<>
        <div className="px-4 py-4 border-b border-gray-100">
          {info.showLogo && (info.customLogo && !estLogoSEL(info.customLogo)
            ? <img src={info.customLogo} alt="Logo" className="max-h-10 mb-1.5" />
            : <div role="img" aria-label="Logo Structural & Engineering Labs" className="w-[190px] max-w-full mb-1" dangerouslySetInnerHTML={{ __html: selLogoSVG() }} />)}
          {!(info.showLogo && (!info.customLogo || estLogoSEL(info.customLogo))) && <div className="text-[13px] font-black tracking-tight text-gray-800 leading-tight">{info.entreprise}</div>}
          <div className="text-[11px] text-gray-500 leading-tight">Poteaux béton armé, acier, bois · EC2 · EC3 · EC5</div>
        </div>
        <div className="px-4 pt-3 pb-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Projet</div>
          <div className="text-[13px] font-semibold leading-tight">{info.projet}</div>
          <div className="text-[11px] text-gray-500">{info.reference}</div>
        </div>
        <div className="px-2 flex-1 overflow-y-auto">
          <div className="px-2 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">Poteaux</div>
          {allResults.map(({ c, r }) => (
            <div key={c.id} onClick={() => { P.setActiveId(c.id); setMenuOpen(false); }}
              className={`group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer ${c.id === P.activeId ? 'bg-primary-light text-primary' : 'hover:bg-gray-50'}`}>
              <span className={`w-2 h-2 rounded-full ${VERDICT[r.verdict].cls}`} title={VERDICT[r.verdict].label} />
              {renaming === c.id ? (
                <input autoFocus defaultValue={c.name} className="flex-1 min-w-0 text-[13px] border border-primary rounded px-1"
                  onBlur={e => { P.renameColumn(c.id, e.target.value || c.name); setRenaming(null); }}
                  onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
              ) : (
                <span className="flex-1 min-w-0 text-[13px] font-medium truncate" onDoubleClick={() => setRenaming(c.id)}>{c.name}
                  <span className="text-[11px] text-gray-400 font-normal"> · {c.materiau === 'bois' ? (({ classe, b, h }) => `${classe} ${b}×${h}`)({ ...BOIS_DEFAUT, ...c.bois }) : c.materiau === 'acier' ? (({ profil, nuance }) => `${profil} ${nuance}`)({ ...ACIER_DEFAUT, ...c.acier }) : `${c.rebar.nBars} HA${c.rebar.phiL}`}</span></span>
              )}
              <button title="Renommer" onClick={e => { e.stopPropagation(); setRenaming(c.id); }} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-primary"><Pencil size={12} /></button>
              {P.columns.length > 1 && <button title="Supprimer" onClick={e => { e.stopPropagation(); if (confirm(`Supprimer le poteau ${c.name} ?`)) P.removeColumn(c.id); }} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600"><Trash2 size={12} /></button>}
            </div>
          ))}
          <div className="flex gap-1 px-2 pt-2">
            <button onClick={() => P.addColumn(false)} className="flex-1 flex items-center justify-center gap-1 text-[12px] font-semibold text-primary border border-primary/30 rounded-md h-8 hover:bg-primary-light"><Plus size={13} />Nouveau</button>
            <button onClick={() => P.addColumn(true)} title="Dupliquer le poteau actif" className="flex items-center justify-center gap-1 text-[12px] font-semibold text-gray-600 border border-gray-200 rounded-md h-8 px-2 hover:bg-gray-50"><Copy size={13} /></button>
          </div>
        </div>
        <div className="border-t border-gray-100 p-2 space-y-1">
          <button onClick={() => { setView(view === 'reglages' ? 'app' : 'reglages'); setMenuOpen(false); }} className={`w-full flex items-center gap-2 px-2 h-8 rounded-md text-[12px] ${view === 'reglages' ? 'bg-primary-light text-primary font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}><Settings size={14} />Cartouche et réglages</button>
          <button onClick={() => { setView(view === 'manuel' ? 'app' : 'manuel'); setMenuOpen(false); }} className={`w-full flex items-center gap-2 px-2 h-8 rounded-md text-[12px] ${view === 'manuel' ? 'bg-primary-light text-primary font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}><Info size={14} />Manuel d'utilisation</button>
          <p className="px-2 pt-1 text-[10px] text-gray-400 leading-tight">{info.copyright || `© ${new Date().getFullYear()} ${info.entreprise}`} · v{APP_VERSION}</p>
        </div>
</>);
  const resultsContent = (<>
            <div className={`${VERDICT[calc.verdict].cls} text-white px-5 py-4`}>
              <div className="text-[11px] uppercase tracking-wider opacity-80">Verdict — {P.active.name}</div>
              <div className="text-xl font-black">{VERDICT[calc.verdict].label}</div>
              <div className="mt-2 h-1.5 bg-white/30 rounded-full overflow-hidden"><div className="h-full bg-white" style={{ width: `${Math.min(100, (Number.isFinite(calc.util) ? calc.util : 1) * 100)}%` }} /></div>
              <div className="text-[12px] mt-1 opacity-90">Taux de travail ELU : {fr(calc.util)}</div>
            </div>
            <div className="p-5 space-y-4">
              {sectionSvg && <div className="max-w-[200px] mx-auto" dangerouslySetInnerHTML={{ __html: sectionSvg }} />}
              <div className="text-center text-[12px] text-gray-500 -mt-2">{calc.section?.label} · {R.nBars} HA{R.phiL} · HA{R.phiW} e={R.spacing}</div>
              <dl className="text-[13px] divide-y divide-gray-100">
                {[
                  ['NEd', `${fr(calc.loads.NEd, 0)} kN`],
                  ['MEd (déterminant)', `${fr(gov?.MEd ?? 0, 1)} kNm`],
                  ['MRd', gov?.MRd != null ? `${fr(gov.MRd, 1)} kNm` : '—'],
                  ['λ / λlim', gov ? `${fr(gov.lambda, 1)} / ${Number.isFinite(gov.lambdaLim) ? fr(gov.lambdaLim, 1) : '∞'}` : '—'],
                  ['As requis / fourni', `${Number.isFinite(calc.As_def) ? fr(calc.As_def) : '> 8 %'} / ${fr(calc.As_prov)} cm²`],
                  ['ρ', `${fr(calc.rho)} %`],
                  ['Enrobage cnom', `${calc.mat.cNom} mm`],
                  ...(calc.fire.computed ? [['Feu', calc.fire.valid ? `${fr(calc.fire.R, 0)} min (R${calc.fire.Rreq})` : 'hors domaine']] : []),
                  ['Acier du poteau', `${fr(nomen.totalWeight, 1)} kg`],
                ].map(([k, v]) => <div key={k} className="flex justify-between py-1.5"><dt className="text-gray-500">{k}</dt><dd className="font-semibold tabular-nums">{v}</dd></div>)}
              </dl>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-md bg-green-50 py-1.5"><div className="text-lg font-black text-green-700">{counts.ok}</div><div className="text-[10px] text-green-700">conformes</div></div>
                <div className="rounded-md bg-red-50 py-1.5"><div className="text-lg font-black text-red-700">{counts.ko}</div><div className="text-[10px] text-red-700">non conf.</div></div>
                <div className="rounded-md bg-amber-50 py-1.5"><div className="text-lg font-black text-amber-700">{counts.nv}</div><div className="text-[10px] text-amber-700">à examiner</div></div>
              </div>
              {counts.ko > 0 && (
                <div className="space-y-1">
                  {checks.filter(c => c.status === 'ko').slice(0, 6).map(c => (
                    <button key={c.id} onClick={() => { setView('app'); setStep('verifs'); setFilter('issues'); setOpenCheck(c.id); setResultsOpen(false); }} className="w-full text-left text-[12px] text-red-700 hover:underline flex gap-1.5"><X size={13} className="mt-0.5 shrink-0" />{c.title}</button>
                  ))}
                </div>
              )}
              {calc.warnings.length > 0 && (
                <button onClick={() => { setView('app'); setStep('verifs'); setResultsOpen(false); }} className="w-full text-left text-[12px] text-amber-700 flex gap-1.5"><AlertTriangle size={13} className="mt-0.5 shrink-0" />{calc.warnings.length} avertissement(s)</button>
              )}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button onClick={() => telechargerPdf('note')} disabled={!!pdfEtat.enCours} className="text-[12px] font-semibold border border-gray-200 rounded-md h-9 hover:bg-gray-50 disabled:opacity-60">Note (PDF)</button>
                <button disabled={!sheet} onClick={() => { if (!sheet) return; log('info', `Export DXF ${P.active.name}`); download(toDXF(sheet), `${info.reference}-${P.active.name}.dxf`, 'application/dxf'); }} className="text-[12px] font-semibold border border-gray-200 rounded-md h-9 hover:bg-gray-50 disabled:opacity-40">Plan DXF</button>
              </div>
            </div>
</>);

  // Empreinte des résultats (attribut data-*) : permet aux tests de bout en bout de vérifier qu'une commande agit sur le calcul
  const empreinte = JSON.stringify({
    v: calc.verdict, u: Math.round(calc.util * 1e4), ned: Math.round(calc.loads.NEd * 10), nqp: Math.round(calc.loads.Nqp * 10), ncar: Math.round(calc.loads.Ncar * 10),
    d: calc.directions.map(d => [Math.round(d.MEd * 100), d.MRd === null ? null : Math.round(d.MRd * 100), Math.round(d.lambdaLim * 100), Math.round(d.phiEf * 1000)]),
    cnom: calc.mat.cNom, cls: calc.mat.structuralClass, fcd: Math.round(calc.mat.fcd * 100), fyd: Math.round(calc.mat.fyd * 100),
    as: [Math.round(calc.As_prov * 100), Number.isFinite(calc.As_def) ? Math.round(calc.As_def * 100) : -1], l0: Math.round(calc.geom.l0 * 1000),
    phi: calc.geom.phiInf === null ? null : Math.round(calc.geom.phiInf * 1000), fire: Math.round(calc.fire.R * 10), fireOk: calc.fire.ok,
    sh: calc.shear.dirs.map(x => [Math.round(x.VEd * 10), Math.round(x.interaction * 1e4), Math.round(x.Asw_req)]), crack: Math.round(calc.crack.wk * 1e4), els: Math.round(calc.els.sigma_c * 100),
    anc: calc.anchorage ? [Math.round(calc.anchorage.lbd), Math.round(calc.anchorage.l0)] : null, ties: calc.ties ? [calc.ties.sEnd, calc.ties.sLap] : null,
    kg: Math.round(nomen.totalWeight * 10), chk: calc.checks.map(c => (c.ok ? 1 : 0)).join(''), n: checks.length, err: calc.errors.length,
  });

  // Notes acier et bois : affichées seules (l'interface n'est ni visible ni imprimée)
  if (planImpr && (acierMode || boisMode)) return <ImpressionPlanPoteau feuilles={feuillesPoteau} onFermer={() => setPlanImpr(false)} />;
  if (noteAcier && acierMode) return <NotePoteauAcier r={rA} info={P.info} nom={P.active.name} charges={chA} L={G.L} onFermer={() => setNoteAcier(false)} />;
  if (noteBois && boisMode) return <NotePoteauBois r={rB} info={P.info} nom={P.active.name} NEd={chB.NEd} L={G.L} onFermer={() => setNoteBois(false)} />;
  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 flex" data-empreinte={empreinte} data-verdict={boisMode ? (rB.verdict === 'conforme' ? 'OK' : 'KO') : acierMode ? (rA.verdict === 'conforme' ? 'OK' : 'KO') : calc.verdict} data-materiau={P.materiau}>
      {/* Rail gauche : projet et poteaux (tiroir sur petit écran) */}
      <aside className="hidden md:flex w-60 shrink-0 h-screen sticky top-0 bg-white border-r border-gray-200 flex-col" aria-label="Projet et poteaux">{railContent}</aside>
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label="Menu du projet">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMenuOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 max-w-[85vw] bg-white shadow-xl flex flex-col">
            <button onClick={() => setMenuOpen(false)} aria-label="Fermer le menu" className="absolute right-2 top-2 w-8 h-8 flex items-center justify-center rounded-md text-gray-500 hover:bg-gray-100"><X size={16} /></button>
            {railContent}
          </aside>
        </div>
      )}

      {/* Zone centrale */}
      <main className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 h-14 bg-white/95 backdrop-blur border-b border-gray-200 px-2 md:px-6 flex items-center gap-1">
          <button onClick={() => setMenuOpen(true)} aria-label="Ouvrir le menu" className="md:hidden w-9 h-9 shrink-0 flex items-center justify-center rounded-md text-gray-600 hover:bg-gray-100"><MenuIcon size={18} /></button>
          <div className="text-[15px] font-bold mr-2 md:mr-4 truncate max-w-[9rem] md:max-w-none shrink-0">{view === 'reglages' ? 'Cartouche et réglages' : view === 'manuel' ? "Manuel d'utilisation" : P.active.name}</div>
          {view !== 'app' && <button onClick={() => setView('app')} className="text-[13px] font-semibold text-primary shrink-0">← Retour au calcul</button>}
          {view === 'app' && (
            <nav className="flex items-center gap-1 overflow-x-auto min-w-0" aria-label="Étapes du calcul">
              {STEPS.map(s => (
                <button key={s.id} onClick={() => setStep(s.id)} aria-current={step === s.id ? 'step' : undefined} aria-label={s.label} title={s.label}
                  className={`flex items-center h-9 px-2 md:px-3 rounded-md text-[13px] font-semibold whitespace-nowrap shrink-0 ${step === s.id ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                  <span className={`w-5 h-5 md:mr-2 rounded-full text-[11px] flex items-center justify-center ${step === s.id ? 'bg-white/25' : 'bg-gray-200'}`}>{s.n}</span>
                  <span className={step === s.id ? 'ml-1.5 md:ml-0' : 'hidden sm:inline sm:ml-1.5 md:ml-0'}>{s.label}</span>{s.badge}
                </button>
              ))}
            </nav>
          )}
          {acierMode || boisMode
            ? <span className={`ml-auto shrink-0 px-3 py-1 rounded-full text-white text-[12px] font-bold whitespace-nowrap ${VERDICT[verdictMat].cls}`} data-pastille="materiau">{VERDICT[verdictMat].label} · {fr(tauxMat)}</span>
            : <button onClick={() => setResultsOpen(true)} aria-label="Afficher le détail des résultats" className="ml-auto xl:hidden shrink-0">
              <span className={`px-3 py-1 rounded-full text-white text-[12px] font-bold whitespace-nowrap ${VERDICT[calc.verdict].cls}`}>{VERDICT[calc.verdict].label} · {fr(calc.util)}</span>
            </button>}
        </header>
        {/* Bande de résultats condensée (sous 1280 px, le panneau latéral est masqué) */}
        {boisMode && <div className="sticky top-14 z-10 bg-white/95 backdrop-blur border-b border-gray-200 px-3 md:px-6 py-1.5 flex flex-wrap items-center gap-x-4 text-[12px]" aria-label="Résultats bois">
          <b className={rB.verdict === 'conforme' ? 'text-green-700' : 'text-red-700'}>{rB.verdict === 'conforme' ? 'CONFORME' : 'NON CONFORME'}</b>
          <span>{rB.classe.nom} {rB.b} × {rB.h} mm</span><span>NEd <b className="tabular-nums">{fr(chB.NEd, 0)}</b> kN</span>
          <span>6.23 / 6.24 <b className="tabular-nums">{fr(Math.max(rB.rQ.e623, rB.rG?.e623 ?? 0), 2)} / {fr(Math.max(rB.rQ.e624, rB.rG?.e624 ?? 0), 2)}</b></span>
        </div>}
        {acierMode && <div className="sticky top-14 z-10 bg-white/95 backdrop-blur border-b border-gray-200 px-3 md:px-6 py-1.5 flex flex-wrap items-center gap-x-4 text-[12px]" aria-label="Résultats acier">
          <b className={rA.verdict === 'conforme' ? 'text-green-700' : 'text-red-700'}>{rA.verdict === 'conforme' ? 'CONFORME' : 'NON CONFORME'}</b>
          <span>{rA.geo.nom} {P.acier.nuance}</span><span>NEd <b className="tabular-nums">{fr(chA.NEd, 0)}</b> kN</span><span>Nb,Rd <b className="tabular-nums">{fr(rA.NbRd / 1e3, 0)}</b> kN</span>
          <span>6.61 / 6.62 <b className="tabular-nums">{fr(rA.eq661, 2)} / {fr(rA.eq662, 2)}</b></span>
        </div>}
        <div className={`${acierMode || boisMode ? 'hidden' : 'xl:hidden'} sticky top-14 z-10 bg-white/95 backdrop-blur border-b border-gray-200 px-3 md:px-6 py-1.5 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-[12px]`} aria-label="Résultats principaux">
          <span>M<sub>Ed</sub>/M<sub>Rd</sub> <b className="tabular-nums">{fr(gov?.MEd ?? 0, 1)} / {gov?.MRd != null ? fr(gov.MRd, 1) : '—'}</b> kNm</span>
          <span>λ <b className="tabular-nums">{gov ? fr(gov.lambda, 1) : '—'}</b></span>
          <span>A<sub>s</sub> <b className="tabular-nums">{Number.isFinite(calc.As_def) ? fr(calc.As_def) : '> 8 %'} / {fr(calc.As_prov)}</b> cm²</span>
          {counts.ko > 0 && <span className="text-red-700 font-semibold">{counts.ko} non conforme(s)</span>}
          <button onClick={() => setResultsOpen(true)} className="ml-auto text-primary font-semibold hover:underline">Détails</button>
        </div>
        <div className="flex-1 flex">
          <section className="flex-1 min-w-0 p-3 md:p-6 max-w-5xl">
            {P.migrationNotes.length > 0 && (
              <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3" role="status">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={16} className="text-amber-700 mt-0.5 shrink-0" />
                  <div className="flex-1 text-[12px] text-amber-900 space-y-0.5">{P.migrationNotes.map((m, i) => <p key={i} className={i === 0 ? 'font-semibold' : ''}>{m}</p>)}</div>
                  <button onClick={P.dismissMigrationNotes} className="text-[12px] font-semibold text-amber-800 hover:underline">Fermer</button>
                </div>
              </div>
            )}
            {view === 'app' && step === 'donnees' && bienvenue && (
              <div className="mb-4 bg-primary-light/60 border border-primary/20 rounded-xl px-4 py-3 flex items-start gap-3" role="status">
                <Info size={18} className="text-primary mt-0.5 shrink-0" />
                <div className="flex-1 text-[13px] text-gray-700">
                  <b>Bienvenue.</b> Renseignez les données, puis suivez les étapes 2 à 4. Les boutons <b>?</b> expliquent chaque champ ; <kbd className="px-1 border rounded text-[11px]">Alt</kbd> + <kbd className="px-1 border rounded text-[11px]">1</kbd> à <kbd className="px-1 border rounded text-[11px]">4</kbd> changent d'étape.
                  <button onClick={() => { setView('manuel'); fermerBienvenue(); }} className="ml-2 font-semibold text-primary hover:underline">Lire le parcours type</button>
                </div>
                <button onClick={fermerBienvenue} className="text-[12px] font-semibold text-gray-500 hover:text-gray-800">Masquer</button>
              </div>
            )}
            <ErrorBoundary key={`${view}-${step}-${P.activeId}`} scope={view === 'reglages' ? 'réglages' : view === 'manuel' ? 'manuel' : `étape ${STEPS.find(x => x.id === step)?.label}`} compact>
              {view === 'manuel' && <ManuelView />}
              {view === 'reglages' && viewReglages}
              {view === 'app' && step === 'donnees' && <div className="mb-4 bg-white border border-gray-200 rounded-xl px-4 py-2 flex items-center justify-between gap-3">
                <label htmlFor="materiau-poteau" className="text-[13px] font-semibold text-gray-700">Matériau du poteau</label>
                <select id="materiau-poteau" value={P.materiau} onChange={e => P.setMateriau(e.target.value as 'ba' | 'acier' | 'bois')} className="h-8 border border-gray-200 rounded-md px-2 text-[13px]">
                  <option value="ba">béton armé (EN 1992)</option><option value="acier">acier (EN 1993)</option><option value="bois">bois (EN 1995)</option></select>
              </div>}
              {view === 'app' && step === 'donnees' && (boisMode ? <DonneesPoteauBoisCarte w={P.bois} setW={P.setBois} G={G} setG={P.setGeometry} L={Ld} setL={P.setLoads} /> : acierMode ? <DonneesPoteauAcierCarte a={P.acier} setA={P.setAcier} G={G} setG={P.setGeometry} L={Ld} setL={P.setLoads} /> : stepDonnees)}
              {view === 'app' && step === 'armatures' && (boisMode ? <ParametresPoteauBois w={P.bois} setW={P.setBois} /> : acierMode ? <ParametresPoteauAcier a={P.acier} setA={P.setAcier} /> : stepArmatures)}
              {view === 'app' && step === 'verifs' && (boisMode ? <VerifsPoteauBois r={rB} /> : acierMode ? <VerifsPoteauAcier r={rA} /> : stepVerifs)}
              {view === 'app' && step === 'documents' && (boisMode ? <DocumentsPoteauBois r={rB} onNote={() => setNoteBois(true)} plan={<PlanPoteauCarte feuilles={feuillesPoteau} nom={`${P.info.reference}_${P.active.name}`} imprimer={() => setPlanImpr(true)} />} /> : acierMode ? <DocumentsPoteauAcier r={rA} info={P.info} nom={P.active.name} charges={chA} onNote={() => setNoteAcier(true)} plan={<PlanPoteauCarte feuilles={feuillesPoteau} nom={`${P.info.reference}_${P.active.name}`} imprimer={() => setPlanImpr(true)} />} /> : stepDocuments)}
            </ErrorBoundary>
            {view === 'app' && <div className="flex justify-between pt-6">
              {step !== 'donnees' ? <button onClick={() => setStep(STEPS[STEPS.findIndex(s => s.id === step) - 1].id)} className="text-[13px] font-semibold text-gray-600 hover:text-primary">← Étape précédente</button> : <span />}
              {step !== 'documents' && <button onClick={() => setStep(STEPS[STEPS.findIndex(s => s.id === step) + 1].id)} className="text-[13px] font-semibold text-white bg-primary rounded-md px-4 h-9">Étape suivante →</button>}
            </div>}
          </section>

          {/* Panneau de résultats permanent (grand écran) */}
          {!acierMode && !boisMode && <aside className="hidden xl:block w-80 shrink-0 border-l border-gray-200 bg-white h-[calc(100vh-3.5rem)] sticky top-14 overflow-y-auto" aria-label="Résultats">{resultsContent}</aside>}
        </div>
      </main>
      {resultsOpen && (
        <div className="xl:hidden fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label="Résultats du calcul">
          <div className="absolute inset-0 bg-black/30" onClick={() => setResultsOpen(false)} />
          <aside className="absolute right-0 top-0 h-full w-80 max-w-[90vw] bg-white shadow-xl overflow-y-auto">
            <button onClick={() => setResultsOpen(false)} aria-label="Fermer les résultats" className="absolute right-2 top-2 z-10 w-8 h-8 flex items-center justify-center rounded-md text-white/90 hover:bg-white/20"><X size={16} /></button>
            {resultsContent}
          </aside>
        </div>
      )}
    </div>
  );
}
