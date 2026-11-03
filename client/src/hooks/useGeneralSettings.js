import { useEffect, useState } from "react";

const defaults = {
  identity: { siteName: "MU Home Service", tagline: "HOME • OFFICE • TECH CARE", accent: "#2563eb", copyright: "" },
  business: { businessName: "MU Home Service", phone: "01683-988686", email: "", address: "মাইজদী, নোয়াখালী, বাংলাদেশ", whatsapp: "8801683988686" },
  appearance: { announcementEnabled: false, announcementText: "", maintenanceMode: false },
  seo: { metaTitle: "MU Home Service", metaDescription: "" },
};

export function useGeneralSettings(apiBase) {
  const [settings, setSettings] = useState(defaults);
  useEffect(() => {
    let live = true;
    fetch(`${apiBase}/site-settings`, { cache: "no-store" })
      .then((r) => r.ok ? r.json() : Promise.reject(new Error("Settings unavailable")))
      .then((data) => {
        if (!live) return;
        const incoming = data?.settings || {};
        setSettings(Object.fromEntries(Object.keys(defaults).map((section) => [section, { ...defaults[section], ...(incoming[section] || {}) }])));
      })
      .catch(() => {});
    return () => { live = false; };
  }, [apiBase]);
  return settings;
}
