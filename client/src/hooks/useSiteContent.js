import { useEffect, useState } from 'react';

/** The MongoDB-backed API is the source of truth; fallback data is only used while the API is unreachable. */
export function useSiteContent(apiBase, fallbackServices, fallbackPackages) {
  const [services, setServices] = useState(fallbackServices);
  const [packages, setPackages] = useState(fallbackPackages);
  const [contentError, setContentError] = useState('');
  const [loadedFromDatabase, setLoadedFromDatabase] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [serviceResponse, packageResponse] = await Promise.all([
          fetch(`${apiBase}/services`, { cache: 'no-store' }),
          fetch(`${apiBase}/packages`, { cache: 'no-store' })
        ]);
        if (!serviceResponse.ok || !packageResponse.ok) throw new Error('Database content could not be loaded. Check the backend and MongoDB connection.');
        const [serviceData, packageData] = await Promise.all([serviceResponse.json(), packageResponse.json()]);
        if (!Array.isArray(serviceData.services) || !Array.isArray(packageData.packages)) throw new Error('Invalid catalogue data received from the server.');
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
          // Keep fallback data visible for visitors during an API outage.
        }
      }
    };
    load();
    return () => { active = false; };
  }, [apiBase, fallbackServices, fallbackPackages]);

  return { services, packages, setServices, setPackages, contentError, loadedFromDatabase };
}
