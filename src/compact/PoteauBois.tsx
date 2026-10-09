/** Poteaux en bois (v4.2) : section, paramètres EN 1995, vérifications, note imprimable. */
import { useState, type ReactNode } from 'react';
import { CLASSES_BOIS, classeBois, gammaMBois, type Duree } from '../eurocodes/ec5';
import type { DonneesPoteauBois, ResultatPoteauBois } from '../bois/poteauBois';
import type { Geometry, Loads } from '../eurocode';
import type { ProjectInfo } from '../store';
import { CarteChargesPoteau } from './PoteauAcier';
import NoteStructuree, { type SectionNote } from './NoteStructuree';

const fr = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d).replace('.', ',') : '—');
function Ligne({ label, children }: { label: ReactNode; children: ReactNode }) {
  return <label className="flex items-center justify-between gap-3 min-h-9 text-[13px] text-gray-700"><span>{label}</span>{children}</label>;
}
function Nombre({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  const [t, setT] = useState(String(value).replace('.', ','));
  return <input aria-label={label} inputMode="decimal" value={t} onChange={e => { setT(e.target.value); const v = parseFloat(e.target.value.replace(',', '.')); if (Number.isFinite(v)) onChange(v); }}
    onBlur={() => setT(String(value).replace('.', ','))} className="w-28 h-8 px-2 text-right text-[13px] tabular-nums border border-gray-200 rounded-md bg-white" />;
}
function Carte({ titre, children }: { titre: string; children: ReactNode }) {
  return <section className="bg-white border border-gray-200 rounded-xl p-4"><h3 className="text-[11px] font-bold uppercase tracking-wider text-primary mb-2">{titre}</h3><div className="space-y-1">{children}</div></section>;
}

export function DonneesPoteauBoisCarte({ w, setW, G, setG, L, setL }: { w: DonneesPoteauBois; setW: (v: DonneesPoteauBois) => void; G: Geometry; setG: (v: Geometry) => void; L: Loads; setL: (v: Loads) => void }) {
  const c = classeBois(w.classe);
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Carte titre="Section en bois">
        <Ligne label="Classe de résistance"><select aria-label="Classe de résistance" value={w.classe} onChange={e => setW({ ...w, classe: e.target.value, gM: gammaMBois(classeBois(e.target.value)!) })} className="h-8 border border-gray-200 rounded-md px-2 text-[13px] w-44">
          {CLASSES_BOIS.map(x => <option key={x.nom} value={x.nom}>{x.nom} ({x.type === 'massif' ? 'massif' : 'lamellé-collé'})</option>)}</select></Ligne>
        <Ligne label="Largeur b (mm)"><Nombre label="Largeur b (mm)" value={w.b} onChange={v => setW({ ...w, b: v })} /></Ligne>
        <Ligne label="Hauteur h (mm)"><Nombre label="Hauteur h (mm)" value={w.h} onChange={v => setW({ ...w, h: v })} /></Ligne>
        <Ligne label="Hauteur L (m)"><Nombre label="Hauteur L (m)" value={G.L} onChange={v => setG({ ...G, L: v })} /></Ligne>
        {c && <p className="text-[12px] text-gray-600 tabular-nums">fc,0,k = {c.fc0k} · fm,k = {c.fmk} MPa · E0,05 = {c.E005} MPa · ρmean = {c.rhomean} kg/m³</p>}
      </Carte>
      <CarteChargesPoteau L={L} setL={setL} />
    </div>
  );
}

export function ParametresPoteauBois({ w, setW }: { w: DonneesPoteauBois; setW: (v: DonneesPoteauBois) => void }) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Carte titre="Matériau et durée des charges (EN 1995-1-1)">
        <Ligne label="Classe de service"><select aria-label="Classe de service" value={w.classeService} onChange={e => setW({ ...w, classeService: Number(e.target.value) as 1 | 2 | 3 })} className="h-8 border border-gray-200 rounded-md px-2 text-[13px] w-44">
          <option value={1}>1 (intérieur chauffé)</option><option value={2}>2 (abrité)</option><option value={3}>3 (extérieur)</option></select></Ligne>
        <Ligne label="Durée de la charge variable"><select aria-label="Durée de la charge variable" value={w.dureeQ} onChange={e => setW({ ...w, dureeQ: e.target.value as Duree })} className="h-8 border border-gray-200 rounded-md px-2 text-[13px] w-44">
          {(['longue', 'moyenne', 'courte'] as Duree[]).map(d => <option key={d} value={d}>{d}</option>)}</select></Ligne>
        <Ligne label="γM"><Nombre label="γM" value={w.gM} onChange={v => setW({ ...w, gM: v })} /></Ligne>
      </Carte>
      <Carte titre="Flambement et feu">
        <Ligne label="βy = Lcr,y / L"><Nombre label="βy" value={w.betaY} onChange={v => setW({ ...w, betaY: v })} /></Ligne>
        <Ligne label="βz = Lcr,z / L"><Nombre label="βz" value={w.betaZ} onChange={v => setW({ ...w, betaZ: v })} /></Ligne>
        <Ligne label="Résistance au feu (4 faces)"><select aria-label="Résistance au feu" value={w.feuR} onChange={e => setW({ ...w, feuR: Number(e.target.value) })} className="h-8 border border-gray-200 rounded-md px-2 text-[13px] w-44">
          {[0, 30, 60, 90].map(v => <option key={v} value={v}>{v ? `R${v}` : 'non vérifiée'}</option>)}</select></Ligne>
      </Carte>
    </div>
  );
}

export function VerifsPoteauBois({ r }: { r: ResultatPoteauBois }) {
  return (
    <div className="space-y-4">
      <div className={`rounded-xl px-4 py-3 font-semibold text-[14px] ${r.verdict === 'conforme' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
        {r.classe.nom} {r.b} × {r.h} mm {r.verdict === 'conforme' ? '— conforme pour les vérifications effectuées' : '— non conforme'}
      </div>
      <div className="overflow-x-auto bg-white border border-gray-200 rounded-xl">
        <table className="w-full text-[13px]"><thead className="bg-gray-50"><tr>{['', 'Vérification', 'Valeur', 'Critère', 'Référence'].map(h => <th key={h} className="text-left px-3 py-2">{h}</th>)}</tr></thead>
          <tbody>{r.verifs.map(v => <tr key={v.id} className="border-t border-gray-100"><td className={`px-3 font-bold ${v.ok ? 'text-green-700' : 'text-red-600'}`}>{v.ok ? '✓' : '✗'}</td><td className="px-3 py-1.5">{v.titre}</td><td className="px-3 tabular-nums">{v.valeur}</td><td className="px-3">{v.limite}</td><td className="px-3 text-gray-500">{v.ref}</td></tr>)}</tbody></table>
      </div>
      <p className="bg-white border border-gray-200 rounded-xl p-4 text-[12.5px] text-gray-700 tabular-nums">kmod = {fr(r.kmodG, 2)} (G seul) / {fr(r.kmodQ, 2)} (G + Q) ; fc,0,d = {fr(r.rQ.fc0d)} MPa ; fm,y,d = {fr(r.rQ.fmdy)} MPa ; fm,z,d = {fr(r.rQ.fmdz)} MPa ; σm,y = {fr(r.rQ.smy)} MPa ; σm,z = {fr(r.rQ.smz)} MPa ; km = 0,7.</p>
    </div>
  );
}

export function DocumentsPoteauBois({ r, onNote, plan }: { r: ResultatPoteauBois; onNote: () => void; plan?: ReactNode }) {
  return (
    <div className="grid md:grid-cols-2 gap-4 [&>*]:min-w-0">
      {plan}
      <Carte titre="Note de calcul"><button onClick={onNote} className="w-full h-9 rounded-md bg-primary text-white font-semibold text-[13px]">Ouvrir la note bois (imprimer / PDF)</button></Carte>
      <Carte titre="Métré"><p className="text-[13px] tabular-nums">Volume : {fr(r.volume, 3)} m³ — masse : {fr(r.masse, 0)} kg</p></Carte>
    </div>
  );
}

export function NotePoteauBois({ r, info, nom, NEd, L, onFermer }: { r: ResultatPoteauBois; info: ProjectInfo; nom: string; NEd: number; L: number; onFermer: () => void }) {
  const c = r.classe, q = r.rQ;
  const ok = r.verifs.every(v => v.ok);
  const sections: SectionNote[] = [
    { titre: 'Références et hypothèses', contenu: () => <p>NF EN 1995-1-1 (§6.3.2, éq. 6.23 et 6.24, §6.3.3), NF EN 1995-1-2 (section réduite) ; classes EN 338:2016 et EN 14080:2013. kmod de chaque combinaison (G seul : permanente).</p> },
    { titre: 'Données', contenu: o => o.tab('Section et sollicitations', <table className="note-t"><tbody>
      <tr><td>Section</td><td>{c.nom} ({c.type === 'massif' ? 'bois massif' : 'lamellé-collé'}) {r.b} × {r.h} mm</td></tr>
      <tr><td>Caractéristiques</td><td>fc,0,k = {c.fc0k} ; fm,k = {c.fmk} MPa ; E0,05 = {c.E005} MPa</td></tr>
      <tr><td>Coefficients</td><td>kmod = {fr(r.kmodG)} (permanente) / {fr(r.kmodQ)} (G + Q)</td></tr>
      <tr><td>Sollicitations</td><td>L = {fr(L)} m ; NEd = {fr(NEd, 1)} kN</td></tr></tbody></table>) },
    { titre: 'Flambement et flexion composée', contenu: o => <>
      {o.eq('§6.3.2', <>λrel = (Lcr/i)/π·√(fc,0,k/E0,05) : λrel,y = {fr(q.lY, 3)}, λrel,z = {fr(q.lZ, 3)} ; kc,y = {fr(q.kcy, 3)}, kc,z = {fr(q.kcz, 3)}</>)}
      {o.eq('éq. 6.23', <>σc,0,d/(kc,y·fc,0,d) + σm,y,d/fm,y,d + km·σm,z,d/fm,z,d = {fr(Math.max(q.e623, r.rG?.e623 ?? 0), 3)} ≤ 1</>)}
      {o.eq('éq. 6.24', <>σc,0,d/(kc,z·fc,0,d) + km·σm,y,d/fm,y,d + σm,z,d/fm,z,d = {fr(Math.max(q.e624, r.rG?.e624 ?? 0), 3)} ≤ 1 (km = 0,7)</>)}
      {o.eq('éq. 6.35', q.e635 > 0 ? <>(σm,d/(kcrit·fm,d))² + σc,d/(kc,z·fc,0,d) = {fr(q.e635, 3)} ≤ 1</> : <>Déversement sans objet (λrel,m = {fr(q.lamM, 2)} ≤ 0,75)</>)}
      {r.feu && o.eq('EN 1995-1-2 §4.2.2', <>Feu : section résiduelle {fr(r.feu.bfi, 0)} × {fr(r.feu.hfi, 0)} mm (def = {fr(r.feu.def, 1)} mm) ; éq. 6.23 = {fr(r.feu.e623, 3)}, éq. 6.24 = {fr(r.feu.e624, 3)}</>)}</> },
    { titre: 'Récapitulatif des vérifications', contenu: o => o.tab('Vérifications', <table className="note-t"><thead><tr><th></th><th>Vérification</th><th>Valeur</th><th>Critère</th><th>Référence</th></tr></thead><tbody>{r.verifs.map(v => <tr key={v.id}><td>{v.ok ? '✓' : '✗'}</td><td>{v.titre}</td><td>{v.valeur}</td><td>{v.limite}</td><td>{v.ref}</td></tr>)}</tbody></table>) },
  ];
  return <NoteStructuree info={info} repere={nom} typeElement="bois" sousTitre={`Poteau en bois — ${c.nom} ${r.b} × ${r.h} mm, L = ${fr(L)} m`} verdict={ok ? 'OK' : 'KO'}
    perimetre={{ verifie: ['Flambement (§6.3.2)', 'Flexion composée (éq. 6.23, 6.24)', 'Déversement avec compression (éq. 6.35)', ...(r.feu ? ['Résistance au feu (section réduite)'] : [])], nonVerifie: ['Assemblages', 'Compression transversale en tête et en pied', ...(r.feu ? [] : ['Résistance au feu'])] }}
    sections={sections} annexe={{ classe: c.nom, b: r.b, h: r.h, L, NEd }} onFermer={onFermer} />;
}
