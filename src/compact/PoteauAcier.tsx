/** Poteaux métalliques (v4.1) : saisie du profilé, paramètres EN 1993, vérifications, note imprimable. */
import { useState, type ReactNode } from 'react';
import { CATALOGUE, profil, proprietesLamine, TUBES, tube, proprietesTube, TABULES } from '../eurocodes/catalogue';
import type { DonneesPoteauAcier, ResultatPoteauAcier } from '../acier/poteauAcier';
import type { Geometry, Loads } from '../eurocode';
import type { ProjectInfo } from '../store';
import NoteStructuree, { type SectionNote } from './NoteStructuree';

const fr = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d).replace('.', ',') : '—');
const FAMILLES = ['IPE', 'IPN', 'HEA', 'HEB', 'HEM', 'CHS', 'SHS', 'RHS', 'PRS'] as const;

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

/** Calcul de l'effort normal et des moments du poteau métallique à partir des charges saisies. */
export function chargesPoteauAcier(L: Loads, G: Geometry, masse: number) {
  const pp = L.selfWeight ? masse * 9.81e-3 * G.L : 0; // kN
  const gq = (L.loadMode ?? 'direct') === 'GQ';
  const NG = (L.NG ?? 0) + pp, NQ = L.NQ ?? 0;
  const NEd = gq ? 1.35 * NG + 1.5 * NQ : L.NEd + 1.35 * pp;
  const etaFi = gq && 1.35 * NG + 1.5 * NQ > 0 ? (NG + (L.psi1 ?? 0.5) * NQ) / (1.35 * NG + 1.5 * NQ) : 0.65; // §2.4.2(3) : 0,65 par défaut
  const sg = (c?: string) => (c === 'double' ? -1 : 1);
  return { NEd, pp, etaFi, My: [L.Mh_top ?? 0, sg(L.curvH) * (L.Mh_bot ?? 0)] as [number, number], Mz: [L.Mb_top ?? 0, sg(L.curvB) * (L.Mb_bot ?? 0)] as [number, number] };
}

export function DonneesPoteauAcierCarte({ a, setA, G, setG, L, setL }: { a: DonneesPoteauAcier; setA: (v: DonneesPoteauAcier) => void; G: Geometry; setG: (v: Geometry) => void; L: Loads; setL: (v: Loads) => void }) {
  const lam = a.profil !== 'PRS' ? profil(a.profil) : undefined;
  const tb = tube(a.profil);
  const ipn = TABULES.find(x => x.nom === a.profil && x.famille === 'IPN');
  const fam = lam ? lam.famille : tb ? tb.famille : ipn ? 'IPN' : 'PRS';
  const q = lam ? proprietesLamine(lam) : null;
  const qt = tb ? proprietesTube(tb) : null;
  const liste = [...CATALOGUE, ...TUBES, ...TABULES.filter(x => x.famille === 'IPN')];
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Carte titre="Profilé métallique">
        <Ligne label="Famille"><select aria-label="Famille" value={fam} onChange={e => { const f = e.target.value; setA({ ...a, profil: f === 'PRS' ? 'PRS' : (liste.find(x => x.famille === f && x.nom.includes(' 200')) ?? liste.find(x => x.famille === f)!).nom }); }}
          className="h-8 border border-gray-200 rounded-md px-2 text-[13px] w-40">{FAMILLES.map(f => <option key={f} value={f}>{f === 'PRS' ? 'PRS (soudé)' : f}</option>)}</select></Ligne>
        {(lam || tb || ipn) && <Ligne label="Profilé"><select aria-label="Profilé" value={a.profil} onChange={e => setA({ ...a, profil: e.target.value })} className="h-8 border border-gray-200 rounded-md px-2 text-[13px] w-40">
          {liste.filter(x => x.famille === fam).map(x => <option key={x.nom} value={x.nom}>{x.nom}</option>)}</select></Ligne>}
        {tb && qt && <p className="text-[12px] text-gray-600 tabular-nums">Tube fini à chaud (EN 10210-2) : t = {String(tb.t).replace('.', ',')} mm ; G = {fr(qt.masse, 1)} kg/m ; A = {fr(qt.A / 100)} cm² ; Iy = {fr(qt.Iy / 1e4, 0)} cm⁴ ; Iz = {fr(qt.Iz / 1e4, 0)} cm⁴ ; iy = {fr(qt.iy / 10)} cm ; iz = {fr(qt.iz / 10)} cm ; It = {fr(qt.It / 1e4, 0)} cm⁴</p>}
        {lam && q && <p className="text-[12px] text-gray-600 tabular-nums">h × b = {lam.h} × {lam.b} mm ; tw / tf / r = {lam.tw} / {lam.tf} / {lam.r} mm ; G = {fr(lam.G, 1)} kg/m ; A = {fr(q.A / 100)} cm² ; Iy = {fr(q.Iy / 1e4, 0)} cm⁴ ; Iz = {fr(q.Iz / 1e4, 0)} cm⁴ ; iy = {fr(q.iy / 10)} cm ; iz = {fr(q.iz / 10)} cm ; It = {fr(q.It / 1e4)} cm⁴</p>}
        {ipn && <p className="text-[12px] text-gray-600 tabular-nums">IPN (valeurs tabulées) : h × b = {ipn.h} × {ipn.b} mm ; G = {fr(ipn.G, 1)} kg/m ; A = {fr(ipn.A / 100)} cm² ; Iy = {fr(ipn.Iy / 1e4, 0)} cm⁴ ; Iz = {fr(ipn.Iz / 1e4, 1)} cm⁴ (Wpl, It, Iw estimés, sécuritaires)</p>}
        {!lam && !tb && !ipn && <>
          <Ligne label="Semelles : largeur bf (mm)"><Nombre label="Semelles : largeur bf (mm)" value={a.bf} onChange={v => setA({ ...a, bf: v })} /></Ligne>
          <Ligne label="Semelles : épaisseur tf (mm)"><Nombre label="Semelles : épaisseur tf (mm)" value={a.tf} onChange={v => setA({ ...a, tf: v })} /></Ligne>
          <Ligne label="Âme : hauteur hw (mm)"><Nombre label="Âme : hauteur hw (mm)" value={a.hw} onChange={v => setA({ ...a, hw: v })} /></Ligne>
          <Ligne label="Âme : épaisseur tw (mm)"><Nombre label="Âme : épaisseur tw (mm)" value={a.tw} onChange={v => setA({ ...a, tw: v })} /></Ligne>
        </>}
        <Ligne label="Nuance"><select aria-label="Nuance" value={a.nuance} onChange={e => setA({ ...a, nuance: e.target.value as DonneesPoteauAcier['nuance'] })} className="h-8 border border-gray-200 rounded-md px-2 text-[13px] w-40">
          {['S235', 'S275', 'S355', 'S460'].map(n => <option key={n}>{n}</option>)}</select></Ligne>
        <Ligne label="Hauteur L (m)"><Nombre label="Hauteur L (m)" value={G.L} onChange={v => setG({ ...G, L: v })} /></Ligne>
      </Carte>
      <CarteChargesPoteau L={L} setL={setL} />
    </div>
  );
}

/** Charges du poteau (acier ou bois) : G et Q ou NEd, poids propre, moments selon y et z. */
export function CarteChargesPoteau({ L, setL }: { L: Loads; setL: (v: Loads) => void }) {
  return (
    <Carte titre="Charges (ELU)">
      <Ligne label="Saisie"><select aria-label="Saisie des charges" value={L.loadMode ?? 'direct'} onChange={e => setL({ ...L, loadMode: e.target.value as 'direct' | 'GQ' })} className="h-8 border border-gray-200 rounded-md px-2 text-[13px] w-40">
        <option value="GQ">G et Q (1,35G + 1,5Q)</option><option value="direct">NEd direct</option></select></Ligne>
      {(L.loadMode ?? 'direct') === 'GQ'
        ? <><Ligne label="NG (kN)"><Nombre label="NG (kN)" value={L.NG ?? 0} onChange={v => setL({ ...L, NG: v })} /></Ligne><Ligne label="NQ (kN)"><Nombre label="NQ (kN)" value={L.NQ ?? 0} onChange={v => setL({ ...L, NQ: v })} /></Ligne></>
        : <Ligne label="NEd (kN)"><Nombre label="NEd (kN)" value={L.NEd} onChange={v => setL({ ...L, NEd: v })} /></Ligne>}
      <Ligne label="Poids propre de l'élément"><input type="checkbox" checked={!!L.selfWeight} onChange={e => setL({ ...L, selfWeight: e.target.checked })} className="w-4 h-4 accent-[#3a9bd5]" /></Ligne>
      <Ligne label="My en tête (kNm, axe fort)"><Nombre label="My en tête" value={L.Mh_top ?? 0} onChange={v => setL({ ...L, Mh_top: v })} /></Ligne>
      <Ligne label="My en pied (kNm)"><Nombre label="My en pied" value={L.Mh_bot ?? 0} onChange={v => setL({ ...L, Mh_bot: v })} /></Ligne>
      <Ligne label="Courbure selon y"><select aria-label="Courbure selon y" value={L.curvH ?? 'simple'} onChange={e => setL({ ...L, curvH: e.target.value as Loads['curvH'] })} className="h-8 border border-gray-200 rounded-md px-2 text-[13px] w-40"><option value="simple">simple</option><option value="double">double</option></select></Ligne>
      <Ligne label="Mz en tête (kNm, axe faible)"><Nombre label="Mz en tête" value={L.Mb_top ?? 0} onChange={v => setL({ ...L, Mb_top: v })} /></Ligne>
      <Ligne label="Mz en pied (kNm)"><Nombre label="Mz en pied" value={L.Mb_bot ?? 0} onChange={v => setL({ ...L, Mb_bot: v })} /></Ligne>
    </Carte>
  );
}

export function ParametresPoteauAcier({ a, setA }: { a: DonneesPoteauAcier; setA: (v: DonneesPoteauAcier) => void }) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Carte titre="Coefficients (EN 1993-1-1 §6.1)">
        <Ligne label="γM0"><Nombre label="γM0" value={a.gM0} onChange={v => setA({ ...a, gM0: v })} /></Ligne>
        <Ligne label="γM1"><Nombre label="γM1" value={a.gM1} onChange={v => setA({ ...a, gM1: v })} /></Ligne>
      </Carte>
      <Carte titre="Longueurs de flambement et déversement">
        <Ligne label="βy = Lcr,y / L (axe fort)"><Nombre label="βy" value={a.betaY} onChange={v => setA({ ...a, betaY: v })} /></Ligne>
        <Ligne label="βz = Lcr,z / L (axe faible)"><Nombre label="βz" value={a.betaZ} onChange={v => setA({ ...a, betaZ: v })} /></Ligne>
        <Ligne label="βT = LT / L (torsion)"><Nombre label="βT" value={a.betaT} onChange={v => setA({ ...a, betaT: v })} /></Ligne>
        <Ligne label="Déversement empêché (maintiens rapprochés)"><input type="checkbox" checked={a.maintienDeversement} onChange={e => setA({ ...a, maintienDeversement: e.target.checked })} className="w-4 h-4 accent-[#3a9bd5]" /></Ligne>
      </Carte>
    </div>
  );
}

export function VerifsPoteauAcier({ r }: { r: ResultatPoteauAcier }) {
  return (
    <div className="space-y-4">
      <div className={`rounded-xl px-4 py-3 font-semibold text-[14px] ${r.verdict === 'conforme' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
        {r.geo.nom} {r.verdict === 'conforme' ? '— conforme pour les vérifications effectuées' : '— non conforme'}
      </div>
      <div className="overflow-x-auto bg-white border border-gray-200 rounded-xl">
        <table className="w-full text-[13px]"><thead className="bg-gray-50"><tr>{['', 'Vérification', 'Valeur', 'Critère', 'Référence'].map(h => <th key={h} className="text-left px-3 py-2">{h}</th>)}</tr></thead>
          <tbody>{r.verifs.map(v => <tr key={v.id} className="border-t border-gray-100"><td className={`px-3 font-bold ${v.ok ? 'text-green-700' : 'text-red-600'}`}>{v.ok ? '✓' : '✗'}</td><td className="px-3 py-1.5">{v.titre}</td><td className="px-3 tabular-nums">{v.valeur}</td><td className="px-3">{v.limite}</td><td className="px-3 text-gray-500">{v.ref}</td></tr>)}</tbody></table>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-4 text-[12.5px] text-gray-700 tabular-nums space-y-1">
        <p>{r.geo.nom}, fy = {r.fy} MPa, ε = {fr(r.eps, 3)}, classe {r.classe} ; courbes de flambement y : {r.courbes.y}, z : {r.courbes.z} (tableau 6.2).</p>
        <p>Ncr,y = {fr(r.NcrY / 1e3, 0)} kN, λ̄y = {fr(r.lY, 3)}, χy = {fr(r.chiY, 3)} ; Ncr,z = {fr(r.NcrZ / 1e3, 0)} kN, λ̄z = {fr(r.lZ, 3)}, χz = {fr(r.chiZ, 3)} ; Ncr,T = {fr(r.NcrT / 1e3, 0)} kN, λ̄T = {fr(r.lT, 3)}, χT = {fr(r.chiT, 3)}.</p>
        <p>Déversement : Mcr = {Number.isFinite(r.Mcr) ? fr(r.Mcr / 1e6, 0) + ' kNm' : 'sans objet'}, λ̄LT = {fr(r.lLT, 3)}, χLT = {fr(r.chiLt, 3)} ; Cmy = {fr(r.Cmy, 3)}, Cmz = {fr(r.Cmz, 3)} ; kyy = {fr(r.kyy, 3)}, kyz = {fr(r.kyz, 3)}, kzy = {fr(r.kzy, 3)}, kzz = {fr(r.kzz, 3)} (annexe B).</p>
      </div>
    </div>
  );
}

export function DocumentsPoteauAcier({ r, info, nom, charges, onNote, plan }: { r: ResultatPoteauAcier; info: ProjectInfo; nom: string; charges: { NEd: number }; onNote: () => void; plan?: ReactNode }) {
  return (
    <div className="grid md:grid-cols-2 gap-4 [&>*]:min-w-0">
      {plan}
      <Carte titre="Note de calcul">
        <button onClick={onNote} className="w-full h-9 rounded-md bg-primary text-white font-semibold text-[13px]">Ouvrir la note acier (imprimer / PDF)</button>
        <p className="text-[12px] text-gray-500">Projet {info.projet} — {nom} — NEd = {fr(charges.NEd, 0)} kN.</p>
      </Carte>
      <Carte titre="Métré"><p className="text-[13px] tabular-nums">Masse : {fr(r.geo.G, 1)} kg/m × L = {fr(r.masse, 0)} kg</p></Carte>
    </div>
  );
}

export function NotePoteauAcier({ r, info, nom, charges, L, onFermer }: { r: ResultatPoteauAcier; info: ProjectInfo; nom: string; charges: { NEd: number; My: number[]; Mz: number[] }; L: number; onFermer: () => void }) {
  const g = r.geo;
  const ok = r.verifs.every(v => v.ok);
  const sections: SectionNote[] = [
    { titre: 'Références et hypothèses', contenu: () => <p>NF EN 1993-1-1 (§6.2, §6.3.1, §6.3.3 méthode 2, annexe B), NF EN 1993-1-2 (température critique, information){g.tube ? ', NF EN 10210-2 (tubes finis à chaud)' : ''}. Moments d'extrémité du premier ordre ; imperfections couvertes par les courbes de flambement.</p> },
    { titre: 'Données', contenu: o => o.tab('Profilé et sollicitations', <table className="note-t"><tbody>
      <tr><td>Profilé</td><td>{g.nom}{g.tube ? ' (tube fini à chaud)' : g.lamine ? ' (laminé)' : ' (PRS)'} ; fy = {r.fy} MPa ; ε = {fr(r.eps, 3)} ; classe {r.classe}</td></tr>
      <tr><td>Propriétés</td><td>A = {fr(g.A / 100)} cm² ; Iy = {fr(g.Iy / 1e4, 0)} cm⁴ ; Iz = {fr(g.Iz / 1e4, 0)} cm⁴ ; Wpl,y = {fr(g.Wply / 1e3, 0)} cm³ ; Wpl,z = {fr(g.Wplz / 1e3, 0)} cm³ ; It = {fr(g.It / 1e4, 1)} cm⁴</td></tr>
      <tr><td>Hauteur</td><td>L = {fr(L)} m</td></tr>
      <tr><td>Sollicitations ELU</td><td>NEd = {fr(charges.NEd, 1)} kN ; My = {charges.My.map(v => fr(v, 1)).join(' / ')} kNm ; Mz = {charges.Mz.map(v => fr(v, 1)).join(' / ')} kNm (tête / pied)</td></tr></tbody></table>) },
    { titre: 'Flambement', contenu: o => <>
      {o.eq('§6.3.1.2', <>Ncr = π²EI/Lcr² ; λ̄ = √(A·fy/Ncr) ; χ = 1/(Φ + √(Φ² − λ̄²)), Φ = 0,5[1 + α(λ̄ − 0,2) + λ̄²]</>)}
      {o.eq('§6.3.1.2', <>Axe y (courbe {r.courbes.y}) : Ncr,y = {fr(r.NcrY / 1e3, 0)} kN, λ̄y = {fr(r.lY, 3)}, χy = {fr(r.chiY, 3)}</>)}
      {o.eq('§6.3.1.2', <>Axe z (courbe {r.courbes.z}) : Ncr,z = {fr(r.NcrZ / 1e3, 0)} kN, λ̄z = {fr(r.lZ, 3)}, χz = {fr(r.chiZ, 3)}</>)}
      {o.eq('§6.3.1.4', g.tube ? <>Section fermée : flambement par torsion sans objet (χT = 1)</> : <>Ncr,T = (G·It + π²E·Iw/LT²)/i0² = {fr(r.NcrT / 1e3, 0)} kN, χT = {fr(r.chiT, 3)}</>)}
      {o.eq('§6.3.1.1', <>Nb,Rd = χmin·A·fy/γM1 = {fr(r.NbRd / 1e3, 0)} kN ≥ NEd = {fr(charges.NEd, 0)} kN</>)}</> },
    { titre: 'Flexion composée', contenu: o => <>
      {o.eq('§6.3.2', g.tube ? <>Section fermée : déversement négligeable (χLT = 1)</> : <>Mcr (Rayleigh-Ritz, diagramme linéaire des moments) = {Number.isFinite(r.Mcr) ? fr(r.Mcr / 1e6, 0) : '∞'} kNm ; λ̄LT = {fr(r.lLT, 3)} ; χLT = {fr(r.chiLt, 3)}</>)}
      {o.eq('annexe B', <>Cmy = {fr(r.Cmy, 3)}, Cmz = {fr(r.Cmz, 3)} ; kyy = {fr(r.kyy, 3)}, kyz = {fr(r.kyz, 3)}, kzy = {fr(r.kzy, 3)}, kzz = {fr(r.kzz, 3)}</>)}
      {o.eq('éq. 6.61', <>NEd/(χy·NRk/γM1) + kyy·My,Ed/(χLT·My,Rk/γM1) + kyz·Mz,Ed/(Mz,Rk/γM1) = {fr(r.eq661, 3)} ≤ 1</>)}
      {o.eq('éq. 6.62', <>NEd/(χz·NRk/γM1) + kzy·My,Ed/(χLT·My,Rk/γM1) + kzz·Mz,Ed/(Mz,Rk/γM1) = {fr(r.eq662, 3)} ≤ 1</>)}
      {o.eq('EN 1993-1-2 éq. 4.22', <>Température critique θcr = {fr(r.thetaCr, 0)} °C (information)</>)}</> },
    { titre: 'Récapitulatif des vérifications', contenu: o => o.tab('Vérifications', <table className="note-t"><thead><tr><th></th><th>Vérification</th><th>Valeur</th><th>Critère</th><th>Référence</th></tr></thead><tbody>{r.verifs.map(v => <tr key={v.id}><td>{v.ok ? '✓' : '✗'}</td><td>{v.titre}</td><td>{v.valeur}</td><td>{v.limite}</td><td>{v.ref}</td></tr>)}</tbody></table>) },
  ];
  return <NoteStructuree info={info} repere={nom} typeElement="acier" sousTitre={`Poteau métallique — ${g.nom}, L = ${fr(L)} m`} verdict={ok ? 'OK' : 'KO'}
    perimetre={{ verifie: ['Classification', 'Résistance de section (§6.2.9)', 'Flambement par flexion et par torsion (§6.3.1)', 'Flexion composée et déversement (§6.3.3, annexe B)'], nonVerifie: ['Pied et tête de poteau, assemblages', 'Classe 4', 'Stabilité au feu complète (seule θcr est donnée)'] }}
    sections={sections} annexe={{ profil: g.nom, L, NEd: charges.NEd, My: charges.My, Mz: charges.Mz }} onFermer={onFermer} />;
}
