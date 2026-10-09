import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig({
  base: './', // chemins relatifs : publiable à la racine d'un site ou dans un sous-dossier (ex. /poteaux/)
  plugins: [react(), tailwindcss()],
  worker: { format: 'es' }, // le générateur de PDF charge pdfmake à la demande depuis le Web Worker
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  server: {
    hmr: process.env.DISABLE_HMR !== 'true',
  },
});
