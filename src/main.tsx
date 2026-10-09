import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import Root from './Root';
import {ProjectProvider} from './store';
import ErrorBoundary from './ErrorBoundary';
import {installGlobalHandlers} from './diagnostics';
// Polices embarquées (fonctionnement hors ligne) — sous-ensembles latins uniquement
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-700.css';
import '@fontsource/inter/latin-800.css';
import '@fontsource/inter/latin-900.css';
import '@fontsource/jetbrains-mono/latin-400.css';
import './index.css';

installGlobalHandlers();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary scope="application">
      <ProjectProvider>
        <Root />
      </ProjectProvider>
    </ErrorBoundary>
  </StrictMode>,
);
