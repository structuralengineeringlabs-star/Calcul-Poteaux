// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import ErrorBoundary from './ErrorBoundary';
import { getLog, clearLog } from './diagnostics';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function Boom(): never { throw new Error('panne simulée'); }

describe('Interception des erreurs d\'affichage (phase D)', () => {
  it('affiche un message, conserve le reste de la page et journalise l\'erreur', () => {
    clearLog();
    const el = document.createElement('div'); document.body.appendChild(el);
    const orig = console.error; console.error = () => {};
    act(() => { createRoot(el).render(<div><p>Menu toujours visible</p><ErrorBoundary scope="étape Données" compact><Boom /></ErrorBoundary></div>); });
    console.error = orig;
    expect(el.textContent).toContain('Menu toujours visible');
    expect(el.textContent).toContain("Une erreur d'affichage est survenue — étape Données");
    expect(el.textContent).toContain('panne simulée');
    expect(el.textContent).toContain('Rapport de diagnostic');
    expect(getLog().some(e => e.level === 'error' && e.msg.includes('panne simulée'))).toBe(true);
  });
});
