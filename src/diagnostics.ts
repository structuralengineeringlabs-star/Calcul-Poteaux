/**
 * Journal de diagnostic : erreurs (y compris non interceptées), avertissements et événements
 * utiles au support (import, migration, génération de la note…). Conservé dans le navigateur
 * (200 entrées maximum) et téléchargeable sous forme de rapport JSON.
 */
import { APP_VERSION } from './version';

export type LogLevel = 'info' | 'warn' | 'error';
export interface LogEntry { t: string; level: LogLevel; msg: string; data?: unknown }

const KEY = 'poteaux-ec2-journal';
const MAX = 200;
let memory: LogEntry[] = [];

function load(): LogEntry[] {
  try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : []; } catch { return memory; }
}
function save(entries: LogEntry[]) {
  memory = entries;
  try { localStorage.setItem(KEY, JSON.stringify(entries)); } catch { /* stockage indisponible : journal en mémoire */ }
}

export function log(level: LogLevel, msg: string, data?: unknown) {
  const safe = data instanceof Error ? { name: data.name, message: data.message, stack: data.stack?.split('\n').slice(0, 8).join('\n') } : data;
  const entries = [...load(), { t: new Date().toISOString(), level, msg, data: safe }].slice(-MAX);
  save(entries);
  if (level === 'error') console.error(`[poteaux-ec2] ${msg}`, data ?? '');
}

export const getLog = () => load();
export const clearLog = () => save([]);

let installed = false;
/** Capture des erreurs non interceptées (scripts et promesses). */
export function installGlobalHandlers() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  window.addEventListener('error', e => log('error', `Erreur non interceptée : ${e.message}`, { source: e.filename, line: e.lineno, col: e.colno }));
  window.addEventListener('unhandledrejection', e => log('error', 'Promesse rejetée non interceptée', e.reason instanceof Error ? e.reason : String(e.reason)));
  log('info', `Démarrage de l'application v${APP_VERSION}`);
}

/** Contrôle des fonctionnalités du navigateur utilisées par l'application. */
export function browserSupport() {
  const css = (p: string, v: string) => { try { return typeof CSS !== 'undefined' && CSS.supports(p, v); } catch { return false; } };
  return {
    userAgent: navigator.userAgent,
    ecran: `${screen.width}×${screen.height}`,
    fenetre: `${window.innerWidth}×${window.innerHeight}`,
    ratioPixels: window.devicePixelRatio,
    langue: navigator.language,
    cssOklch: css('color', 'oklch(0.5 0.1 200)'),
    cssColorMix: css('color', 'color-mix(in srgb, red 50%, blue)'),
    cssHas: css('selector(:has(a))', ''),
    stockageLocal: (() => { try { localStorage.setItem('__t', '1'); localStorage.removeItem('__t'); return true; } catch { return false; } })(),
  };
}

/** Rapport complet à joindre à un signalement. */
export function buildReport(extra: Record<string, unknown> = {}): string {
  return JSON.stringify({ application: 'Dimensionnement des poteaux aux Eurocodes', version: APP_VERSION, date: new Date().toISOString(),
    navigateur: browserSupport(), journal: getLog(), ...extra }, null, 2);
}

/** Versions minimales : Chrome/Edge 111, Firefox 128, Safari 16.4 (feuille de style Tailwind 4). */
export function isBrowserSupported(): boolean {
  try {
    return typeof CSS !== 'undefined' && CSS.supports('color', 'color-mix(in srgb, red 50%, blue)')
      && CSS.supports('selector(:where(a))') && typeof structuredClone === 'function';
  } catch { return false; }
}
