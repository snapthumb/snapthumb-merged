export type FontOption = {
  label: string;
  family: string; // CSS font-family string
  google?: string; // Google Fonts family query (e.g., 'Inter:wght@400;600;800')
};

// A small curated set that looks good for thumbnails
export const FONT_OPTIONS: FontOption[] = [
  { label: "Inter", family: "Inter, system-ui, Arial", google: "Inter:wght@400;600;800;900" },
  { label: "Impact", family: "Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif" },
  { label: "Montserrat", family: "Montserrat, Arial, sans-serif", google: "Montserrat:wght@700;800;900" },
  { label: "Oswald", family: "Oswald, Arial, sans-serif", google: "Oswald:wght@500;600;700" },
  { label: "Bebas Neue", family: "'Bebas Neue', cursive", google: "Bebas+Neue" },
  { label: "Anton", family: "Anton, Arial, sans-serif", google: "Anton" },
  { label: "Rubik", family: "Rubik, system-ui, Arial", google: "Rubik:wght@500;700;900" },
];

export function ensureGoogleFontLoaded(option?: FontOption) {
  if (!option?.google) return;
  const id = `gf-${option.google}`;
  if (document.getElementById(id)) return;
  const l = document.createElement("link");
  l.id = id;
  l.rel = "stylesheet";
  l.href = `https://fonts.googleapis.com/css2?family=${option.google}&display=swap`;
  document.head.appendChild(l);
}
