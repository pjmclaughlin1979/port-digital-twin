import { InfoIcon, CloseWidgetsIcon } from "./icons.jsx";
import "./InfoPanel.css";

export default function InfoPanel({ isOpen, onToggle, status }) {
  return (
    <>
      {status === "ready" && (
        <button
          type="button"
          className="info-toggle"
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-controls="scene-info-panel"
          aria-label={isOpen ? "Hide Info" : "Show Info"}
          title={isOpen ? "Hide Info" : "Show Info"}
        >
          <InfoIcon />
        </button>
      )}

      {isOpen && status === "ready" && (
        <div className="info-panel__backdrop" onClick={onToggle}>
          <aside
            id="scene-info-panel"
            className="info-panel"
            aria-label="About this application"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="info-panel__header">
              <h1 className="info-panel__title">About this application</h1>
              <button
                type="button"
                className="info-panel__close"
                onClick={onToggle}
                aria-label="Close Info"
                title="Close"
              >
                <CloseWidgetsIcon />
              </button>
            </header>

            <div className="info-panel__body">
              <p>
                This is a 3D digital twin of Cork Harbour, built on the ArcGIS Maps
                SDK for JavaScript. It combines a live AIS vessel feed with a
                photorealistic 3D basemap, and keeps the scene's weather and
                lighting synced to real-world conditions.
              </p>

              <section className="info-panel__section">
                <h2 className="info-panel__section-title">What you're looking at</h2>
                <ul className="info-panel__list">
                  <li>
                    A live AIS feed of ships in Cork Harbour, supplied by{" "}
                    <strong>40Geo</strong>.
                  </li>
                  <li>
                    A photorealistic 3D Tiles basemap supplied by{" "}
                    <strong>Google</strong>.
                  </li>
                  <li>
                    The scene's weather effects and sun position are updated
                    continuously to match current real-world conditions at Cork
                    Harbour.
                  </li>
                </ul>
              </section>

              <section className="info-panel__section">
                <h2 className="info-panel__section-title">Data sources</h2>
                <dl className="info-panel__sources">
                  <div>
                    <dt>Vessel positions (AIS)</dt>
                    <dd>40Geo</dd>
                  </div>
                  <div>
                    <dt>3D basemap tiles</dt>
                    <dd>Google Photorealistic 3D Tiles</dd>
                  </div>
                  <div>
                    <dt>Weather, wind &amp; humidity</dt>
                    <dd>Open-Meteo Forecast API</dd>
                  </div>
                  <div>
                    <dt>Sea temperature &amp; tide</dt>
                    <dd>Open-Meteo Marine Weather API</dd>
                  </div>
                  <div>
                    <dt>Scene &amp; mapping platform</dt>
                    <dd>Esri ArcGIS</dd>
                  </div>
                </dl>
              </section>

              <p className="info-panel__disclaimer">
                This application is for demonstration purposes only.
              </p>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
