import esriIrelandLogo from "../assets/esri-ireland-logo.svg";
import portOfCorkLogo from "../assets/port-of-cork-logo.png";
import fortyGeoLogo from "../assets/40geo-logo.svg";
import googleLogo from "../assets/google-logo.png";
import openMeteoLogo from "../assets/open-meteo-logo.svg";
import "./LoadingScreen.css";

export default function LoadingScreen({ status, error, hasAcknowledgedDisclaimer, onProceed }) {
  const isError = status === "error";

  return (
    <div className="loading-screen" role="status" aria-live="polite">
      {hasAcknowledgedDisclaimer && (
        <div className="loading-screen__mark" aria-hidden="true">
          <span className="loading-screen__ring" />
          <span className="loading-screen__dot" />
        </div>
      )}

      {!hasAcknowledgedDisclaimer ? (
        <>
          <p className="loading-screen__disclaimer">
            This application is for demonstration purposes only.
          </p>
          <button type="button" className="loading-screen__proceed" onClick={onProceed}>
            Click to proceed
          </button>
        </>
      ) : isError ? (
        <p className="loading-screen__message loading-screen__message--error">
          {error ?? "The scene failed to load."}
        </p>
      ) : (
        <p className="loading-screen__message">Streaming the ArcGIS SDK and scene data&hellip;</p>
      )}

      <div className="loading-screen__footer">
        <div className="loading-screen__partners">
          <span className="loading-screen__partners-label">In partnership with</span>
          <div className="loading-screen__logos">
            <div className="loading-screen__logo-chip">
              <img src={esriIrelandLogo} alt="Esri Ireland" />
            </div>
            <div className="loading-screen__logo-chip">
              <img src={portOfCorkLogo} alt="Port of Cork" />
            </div>
          </div>
        </div>

        <div className="loading-screen__partners">
          <span className="loading-screen__partners-label">Datasets provided by</span>
          <div className="loading-screen__logos">
            <div className="loading-screen__logo-chip">
              <img src={fortyGeoLogo} alt="40Geo" />
            </div>
            <div className="loading-screen__logo-chip">
              <img src={googleLogo} alt="Google" />
            </div>
            <div className="loading-screen__logo-chip">
              <img src={openMeteoLogo} alt="Open-Meteo" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
