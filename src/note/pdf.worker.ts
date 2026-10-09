/// <reference lib="webworker" />
/**
 * Génération des PDF hors du fil principal : l'interface reste fluide pendant la production
 * de notes volumineuses (projet de 20 poteaux : environ 160 pages).
 */
import { noteDefinition, plansDefinition, chargerPdfMake } from './pdf';
import type { NoteColumn } from './note';
import type { ProjectInfo } from '../store';

export interface DemandePdf { kind: 'note' | 'plans'; info: ProjectInfo; cols: NoteColumn[]; version: string }

self.onmessage = async (e: MessageEvent<DemandePdf>) => {
  try {
    const { kind, info, cols, version } = e.data;
    const def = kind === 'note' ? noteDefinition(info, cols, version, { includePlans: false }) : plansDefinition(info, cols, version);
    const pdfMake = await chargerPdfMake();
    pdfMake.createPdf(def).getBuffer((buf: Uint8Array) => (self as unknown as Worker).postMessage({ ok: true, buf }, [buf.buffer]));
  } catch (err) {
    (self as unknown as Worker).postMessage({ ok: false, message: err instanceof Error ? err.message : String(err) });
  }
};
