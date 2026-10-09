import { useEffect, useState } from 'react';
import CompactApp from './compact/CompactApp';
import { isBrowserSupported, log } from './diagnostics';

/** Point d'entrée : interface unique (l'ancienne interface détaillée a été supprimée en v3.12). */
export default function Root() {
  const [supported] = useState(isBrowserSupported);
  const [bannerHidden, setBannerHidden] = useState(false);
  useEffect(() => {
    if (!supported) log('warn', 'Navigateur non compatible détecté', navigator.userAgent);
    try { localStorage.removeItem('poteaux-ec2-ui'); } catch { /* ancien réglage de bascule, sans objet */ }
  }, [supported]);
  const banner = !supported && !bannerHidden ? (
    <div role="alert" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 100, background: '#7f1d1d', color: '#fff', padding: '10px 16px', font: '13px Arial, sans-serif', display: 'flex', gap: 12, alignItems: 'center' }}>
      <span style={{ flex: 1 }}>Votre navigateur est trop ancien pour afficher correctement l'application. Utilisez Chrome ou Edge 111 ou plus récent, Firefox 128 ou plus récent, ou Safari 16.4 ou plus récent. Les calculs restent justes, mais la présentation peut être dégradée.</span>
      <button onClick={() => setBannerHidden(true)} style={{ background: '#fff', color: '#7f1d1d', border: 0, borderRadius: 6, padding: '6px 12px', fontWeight: 'bold', cursor: 'pointer' }}>Continuer quand même</button>
    </div>
  ) : null;
  return <><CompactApp />{banner}</>;
}
