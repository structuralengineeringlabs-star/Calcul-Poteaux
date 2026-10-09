/** Plan A3 des poteaux métalliques et en bois : aperçu, DXF, SVG, impression. */
import type { Feuille } from '../plans/base';
import { PlanSVG, svgTexte } from '../plans/PlanSVG';
import { exporterDXF } from '../plans/dxf';

const telecharger = (nom: string, contenu: string, type: string) => {
  const url = URL.createObjectURL(new Blob([contenu], { type }));
  const a = document.createElement('a'); a.href = url; a.download = nom; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export function PlanPoteauCarte({ feuilles, nom, imprimer }: { feuilles: Feuille[]; nom: string; imprimer: () => void }) {
  const f = nom.replace(/[^\w.-]+/g, '_');
  return (
    <section className="bg-white border border-gray-200 rounded-xl p-4 md:col-span-2 min-w-0">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-primary mr-auto">Plan A3</h3>
        <button onClick={() => telecharger(`${f}.dxf`, exporterDXF(feuilles), 'application/dxf')} className="h-8 px-3 rounded-md border border-primary text-primary font-semibold text-[12.5px]">DXF (CAO)</button>
        <button onClick={() => telecharger(`${f}.svg`, svgTexte(feuilles[0]), 'image/svg+xml')} className="h-8 px-3 rounded-md border border-primary text-primary font-semibold text-[12.5px]">SVG</button>
        <button onClick={imprimer} className="h-8 px-3 rounded-md border border-primary text-primary font-semibold text-[12.5px]">Imprimer le plan</button>
      </div>
      <div className="overflow-x-auto">{feuilles.map(x => <PlanSVG key={x.numero} f={x} className="w-full min-w-[640px] h-auto border border-gray-100" />)}</div>
    </section>
  );
}

/** Plan seul, pour l'impression A3 paysage. */
export function ImpressionPlanPoteau({ feuilles, onFermer }: { feuilles: Feuille[]; onFermer: () => void }) {
  return (
    <div className="min-h-screen bg-gray-200 print:bg-white">
      <style>{'@page { size: A3 landscape; margin: 0; } @media print { .no-print { display: none !important; } .plan-feuille { width: 420mm; height: 297mm; margin: 0 !important; } }'}</style>
      <div className="no-print sticky top-0 bg-[#0b111e] text-white px-4 py-2 flex justify-between"><span className="font-semibold">Plan A3 — aperçu</span>
        <span className="flex gap-2"><button onClick={() => window.print()} className="bg-white text-gray-900 rounded px-3 h-8 text-[13px] font-semibold">Imprimer / PDF</button><button onClick={onFermer} className="border border-white/40 rounded px-3 h-8 text-[13px]">Fermer</button></span></div>
      {feuilles.map(f => <div key={f.numero} className="plan-feuille bg-white mx-auto my-4 max-w-[1400px]"><PlanSVG f={f} className="w-full h-full" /></div>)}
    </div>
  );
}
