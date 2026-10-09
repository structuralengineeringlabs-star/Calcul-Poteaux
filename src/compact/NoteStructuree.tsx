/**
 * Note de calcul structurée, commune aux matériaux : page de garde avec cartouche, verdict et révisions,
 * sommaire, listes des figures, tableaux et équations, numérotation locale, pagination « page n / N »,
 * annexe des données d'entrée et empreinte du calcul.
 */
import type { ReactNode } from 'react';
type Verdict = 'OK' | 'KO' | 'NV';
import { selLogoSVG, SEL, SEL_COPYRIGHT } from '../brand/sel';
import type { ProjectInfo } from '../store';
import { APP_VERSION } from '../version';
/** Empreinte FNV-1a 32 bits des données (identifie le calcul). */
function empreinte(o: unknown): string {
  let h = 0x811c9dc5;
  for (const ch of JSON.stringify(o)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).toUpperCase().padStart(8, '0');
}

export interface Outils {
  eq: (art: string, contenu: ReactNode) => ReactNode;
  fig: (titre: string, contenu: ReactNode) => ReactNode;
  tab: (titre: string, contenu: ReactNode) => ReactNode;
}
export interface SectionNote { titre: string; contenu: (o: Outils) => ReactNode }

export default function NoteStructuree({ info, repere, typeElement, sousTitre, verdict, perimetre, sections, annexe, onFermer }: {
  info: ProjectInfo; repere: string; typeElement: string; sousTitre: string; verdict: Verdict;
  perimetre: { verifie: string[]; nonVerifie: string[] }; sections: SectionNote[]; annexe: object; onFermer: () => void;
}) {
  const date = new Date().toLocaleDateString('fr-FR');
  const eqs: { n: number; art: string }[] = [], figs: { n: number; t: string }[] = [], tabs: { n: number; t: string }[] = [];
  const o: Outils = {
    eq: (art, c) => { const n = eqs.length + 1; eqs.push({ n, art }); return <div key={`eq${n}`} className="note-eq"><span>{c}</span><span className="note-art">({n}) {art}</span></div>; },
    fig: (t, c) => { const n = figs.length + 1; figs.push({ n, t }); return <figure key={`fig${n}`} className="note-fig" id={`fig${n}`}>{c}<figcaption>Figure {n} — {t}</figcaption></figure>; },
    tab: (t, c) => { const n = tabs.length + 1; tabs.push({ n, t }); return <div key={`tab${n}`} className="note-tab" id={`tab${n}`}><div className="note-legende">Tableau {n} — {t}</div>{c}</div>; },
  };
  const toutes: SectionNote[] = [...sections,
    { titre: 'Conclusion', contenu: () => <><p className={`note-verdict ${verdict}`}>{txt(verdict)}</p><p><strong>Vérifié :</strong> {perimetre.verifie.join(' ; ')}.</p><p><strong>Non couvert :</strong> {perimetre.nonVerifie.join(' ; ')}.</p></> },
    { titre: 'Annexe A — Données d\'entrée', contenu: () => <table className="note-t note-annexe"><tbody>{Object.entries(annexe).map(([k, v]) => <tr key={k}><td>{k}</td><td>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</td></tr>)}</tbody></table> },
  ];
  // Construction du corps avant le rendu des listes (numérotation complète)
  const corps = toutes.map((s, k) => <section key={s.titre}><h2 className="note-h2" id={`s${k + 1}`}>{k + 1}. {s.titre}</h2>{s.contenu(o)}</section>);
  const hash = empreinte(annexe);
  return (
    <div className="note-fond fixed inset-0 z-50 overflow-y-auto print:static">
      <style>{`@page { size: A4; margin: 16mm 13mm;
        @top-left { content: "${(info.reference ?? '').replace(/"/g, '')} — ${repere.replace(/"/g, '')}"; font: 8pt Inter, Arial; color: #6b7280; }
        @bottom-left { content: "${SEL.entreprise.replace(/"/g, '')} — empreinte ${hash}"; font: 8pt Inter, Arial; color: #6b7280; }
        @bottom-right { content: "Page " counter(page) " / " counter(pages); font: 8pt Inter, Arial; } }
        @page :first { @top-left { content: none; } }`}</style>
      <div className="note-barre no-print"><span className="font-semibold">Note de calcul {typeElement} — aperçu</span>
        <div className="flex gap-2"><button onClick={() => window.print()} className="bg-white text-gray-900 rounded px-3 h-8 text-[13px] font-semibold">Imprimer / PDF</button><button onClick={onFermer} className="border border-white/40 rounded px-3 h-8 text-[13px]">Fermer</button></div></div>
      <article className="note">
        <section className="note-garde">
          <header className="note-cartouche"><div className="note-logo" dangerouslySetInnerHTML={{ __html: selLogoSVG() }} /><div><strong>{info.projet}</strong>{info.client && <><br />{info.client}</>}<br />Réf. {info.reference}</div><div className="text-right">NOTE DE CALCUL<br />Indice {info.revision ?? 'A'}<br />{date}</div></header>
          <h1 className="note-titre">{repere}<br /><span>{sousTitre}</span></h1>
          <div className={`note-verdict ${verdict}`}>{verdict === 'OK' ? '✓ CONFORME' : verdict === 'KO' ? '✗ NON CONFORME' : '— NON VÉRIFIÉ'} — {txt(verdict)}</div>
          <table className="note-t"><thead><tr><th>Indice</th><th>Date</th><th>Objet</th><th>Rédigé</th><th>Vérifié</th></tr></thead>
            <tbody><tr><td>{info.revision ?? 'A'}</td><td>{date}</td><td>Première diffusion</td><td>{info.auteur || '—'}</td><td>{info.verificateur || '—'}</td></tr></tbody></table>
          <h2 className="note-h2">Sommaire</h2>
          <ol className="note-sommaire">{toutes.map((s, k) => <li key={s.titre}><a href={`#s${k + 1}`}>{s.titre}</a></li>)}</ol>
        </section>
        <section className="note-listes">
          <h2 className="note-h2">Listes</h2>
          <div className="grid grid-cols-3 gap-4 text-[10.5px]">
            <div><strong>Figures</strong><ul>{figs.map(f => <li key={f.n}><a href={`#fig${f.n}`}>Figure {f.n} — {f.t}</a></li>)}</ul></div>
            <div><strong>Tableaux</strong><ul>{tabs.map(t => <li key={t.n}><a href={`#tab${t.n}`}>Tableau {t.n} — {t.t}</a></li>)}</ul></div>
            <div><strong>Équations</strong><ul>{eqs.map(q => <li key={q.n}>({q.n}) {q.art}</li>)}</ul></div>
          </div>
        </section>
        {corps}
        <p className="note-petit">Empreinte du calcul : {hash} — Poteaux EC2 v{APP_VERSION}. Résultats de pré-dimensionnement à valider par un ingénieur structure.</p>
        <footer className="note-pied">{SEL_COPYRIGHT} — {SEL.entreprise}</footer>
      </article>
    </div>
  );
}
const txt = (v: Verdict) => (v === 'OK' ? 'Conforme pour les vérifications effectuées.' : v === 'KO' ? 'Non conforme : voir le récapitulatif des vérifications.' : 'Non vérifié : des données sont invalides.');
