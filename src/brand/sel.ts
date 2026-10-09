/**
 * Identité graphique Structural & Engineering Labs (S.E.L.).
 * Reprise fidèle du logo fourni (Logo_SEL : hexagone, diagonales, cartouche central « S.E.L. »,
 * « STRUCTURAL & » / « ENGINEERING LABS ») et des couleurs du cartouche (Cartouche_SEL.html).
 */
export const SEL = {
  entreprise: 'Structural & Engineering Labs',
  email: 'structuralengineeringlabs@gmail.com',
  telephone: '+237 651 135 605',
  accent: '#3a9bd5',   // --accent
  fond: '#0b111e',     // --bg (écran)
  bordure: '#1e2d45',  // --border
  attenue: '#6b8aaa',  // --muted
} as const;

export const SEL_COPYRIGHT = `© ${new Date().getFullYear()} Structural & Engineering Labs — structuralengineeringlabs@gmail.com — +237 651 135 605`;

/** Logo complet en SVG (impression : texte foncé sur fond clair). viewBox 0 0 230 48. */
export function selLogoSVG(opts: { texte?: string; fondIcone?: string } = {}): string {
  const t = opts.texte ?? '#0b111e';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 230 48" font-family="Segoe UI, Arial, Helvetica, sans-serif">
  <path d="M24 4 L44 14 L44 34 L24 44 L4 34 L4 14 Z" fill="${opts.fondIcone ?? 'rgba(58,155,213,0.08)'}"/>
  <path d="M24 4 L44 14 L44 34 L24 44 L4 34 L4 14 Z" fill="none" stroke="${SEL.accent}" stroke-width="2.5"/>
  <path d="M4 14 L44 34 M4 34 L44 14 M24 4 L24 44" stroke="${SEL.accent}" stroke-opacity="0.4" stroke-width="0.5"/>
  <rect x="16" y="18" width="16" height="12" rx="2" fill="${SEL.accent}"/>
  <text x="24" y="27.6" font-size="7" font-weight="900" fill="#ffffff" text-anchor="middle">S.E.L.</text>
  <text x="56" y="24" font-size="20" font-weight="900" letter-spacing="-1" fill="${t}">STRUCTURAL <tspan fill="${SEL.accent}" font-weight="700">&amp;</tspan></text>
  <text x="57" y="38" font-size="10" font-weight="700" letter-spacing="3.6" fill="${SEL.attenue}">ENGINEERING LABS</text>
</svg>`;
}

/** URL data: du logo (sert de logo par défaut dans les réglages, la note et les plans). */
export const SEL_LOGO_URL = `data:image/svg+xml;base64,${typeof btoa === 'function' ? btoa(selLogoSVG()) : Buffer.from(selLogoSVG()).toString('base64')}`;

/** Le logo configuré est-il le logo S.E.L. intégré ? (le DXF le dessine alors en vectoriel) */
export const estLogoSEL = (url: string | null | undefined) => url === SEL_LOGO_URL;
