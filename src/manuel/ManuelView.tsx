import { useMemo } from 'react';
import { MANUEL } from './contenu';
import { blocHTML } from './rendu';

/** Manuel d'utilisation intégré : sommaire latéral et sections illustrées. */
export default function ManuelView() {
  const base = `${import.meta.env.BASE_URL}manuel/`;
  const html = useMemo(() => {
    const fig = { n: 0 };
    return MANUEL.map((s, i) => ({ id: s.id, titre: `${i + 1}. ${s.titre}`, html: s.blocs.map(b => blocHTML(b, f => base + f, fig)).join('') }));
  }, [base]);
  return (
    <div className="flex gap-6">
      <nav aria-label="Sommaire du manuel" className="hidden lg:block w-56 shrink-0 sticky top-20 self-start max-h-[calc(100vh-6rem)] overflow-y-auto">
        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2">Sommaire</p>
        <ol className="space-y-1 text-[13px]">
          {html.map(s => <li key={s.id}><a href={`#manuel-${s.id}`} className="text-gray-600 hover:text-primary">{s.titre}</a></li>)}
        </ol>
      </nav>
      <article className="manuel flex-1 min-w-0 bg-white rounded-xl border border-gray-200 px-5 md:px-8 py-6 text-[14px] leading-relaxed text-gray-700">
        <h1 className="text-xl font-black text-gray-800 mb-1">Manuel d'utilisation</h1>
        <p className="text-[12px] text-gray-500 mb-4">Dimensionnement des poteaux aux Eurocodes. Version PDF : <code>docs/manuel/Manuel_utilisateur.pdf</code>.</p>
        {html.map(s => (
          <section key={s.id} id={`manuel-${s.id}`} className="scroll-mt-20 mb-8">
            <h2 className="text-[17px] font-bold text-primary border-b border-gray-200 pb-1 mb-3">{s.titre}</h2>
            <div dangerouslySetInnerHTML={{ __html: s.html }} />
          </section>
        ))}
      </article>
    </div>
  );
}
