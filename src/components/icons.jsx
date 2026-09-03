// Small inline icon set — plain generic pictograms (not any organization's
// trademarked artwork), styled to sit comfortably alongside Esri's own
// widget chrome.

export function SailboatIcon(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M3.5 17.5h17l-2.2 3.2a1 1 0 0 1-.82.43H6.52a1 1 0 0 1-.82-.43z" />
      <path d="M12 17V3.5" />
      <path d="M12 4.5l6.5 10.5H12z" fill="currentColor" fillOpacity="0.18" />
      <path d="M12 9.5L7 15h5z" fill="currentColor" fillOpacity="0.32" />
    </svg>
  );
}

// A plain bookmark ribbon glyph for the Bookmarks toggle.
export function BookmarkIcon(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M6.5 3.5h11a1 1 0 0 1 1 1V21l-6.5-4-6.5 4V4.5a1 1 0 0 1 1-1z"
        fill="currentColor"
        fillOpacity="0.22"
      />
    </svg>
  );
}

// Matches the small "×" close affordance Esri widgets (Legend, Expand,
// popups, etc.) show in their corner when open.
export function CloseWidgetsIcon(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

// The standard stacked-layers glyph used for layer list controls.
export function LayerListIcon(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M12 3.5l8.5 4.5-8.5 4.5L3.5 8z" fill="currentColor" fillOpacity="0.22" />
      <path d="M3.5 12.5L12 17l8.5-4.5" />
      <path d="M3.5 16.5L12 21l8.5-4.5" />
    </svg>
  );
}

// A plain circled "i" for the About/Info toggle.
export function InfoIcon(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <circle cx="12" cy="12" r="8.5" />
      <line x1="12" y1="11" x2="12" y2="16" />
      <circle cx="12" cy="7.75" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

// A simple "app grid" glyph for the collapsed/hidden state — the same
// shorthand ArcGIS Online uses to represent a set of widgets/panels.
export function ShowWidgetsIcon(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="currentColor"
      aria-hidden="true"
      {...props}
    >
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.4" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.4" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.4" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.4" />
    </svg>
  );
}
