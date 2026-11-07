import { useEffect, useState } from 'react';

/** MongoDB-backed CMS catalogue is the single source of truth for public pages. */
export function useSiteContent(apiBase, fallbackServices, fallbackPackages) {
  const [services, setServices] = useState(fallbackServices);
  const [packages, setPackages] = useState(fallbackPackages);
  const [contentError, setContentError] = useState('');
  const [loadedFromDatabase, setLoadedFromDatabase] = useState(false);

  useEffect(() => {
    let active = true;
    let loading = false;
    const load = async () => {
      if (loading) return;
      loading = true;
      try {
        // Both catalogues are fetched from the same persisted CMS source; bypass browser caches.
        const [serviceResponse, packageResponse] = await Promise.all([
          fetch(`${apiBase}/services`, { cache: 'no-store' }),
          fetch(`${apiBase}/packages`, { cache: 'no-store' }),
        ]);
        if (!serviceResponse.ok || !packageResponse.ok)
          throw new Error('Database content could not be loaded. Check the backend and MongoDB connection.');
        const [serviceData, packageData] = await Promise.all([
          serviceResponse.json(), packageResponse.json(),
        ]);
        if (!Array.isArray(serviceData.services) || !Array.isArray(packageData.packages))
          throw new Error('Invalid catalogue data received from the server.');
        if (active) {
          setServices(serviceData.services);
          setPackages(packageData.packages);
          setLoadedFromDatabase(true);
          setContentError('');
        }
      } catch (error) {
        if (active) {
          setLoadedFromDatabase(false);
          setContentError(error.message || 'Could not load website content.');
          // Keep the last known catalogue visible if the API is temporarily unavailable.
        }
      } finally {
        loading = false;
      }
    };

    load();
    // CMS edits in this tab, edits in another tab, and returning to an already-open booking page
    // all refresh the public catalogue without requiring a manual browser reload.
    const onContentUpdated = () => load();
    const onStorage = (event) => {
      if (event.key === 'muSiteContentUpdatedAt') load();
    };
    const onFocus = () => load();
    const onVisibility = () => { if (document.visibilityState === 'visible') load(); };
    window.addEventListener('mu:site-content-updated', onContentUpdated);
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      active = false;
      window.removeEventListener('mu:site-content-updated', onContentUpdated);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [apiBase, fallbackServices, fallbackPackages]);

  return { services, packages, setServices, setPackages, contentError, loadedFromDatabase };
}
