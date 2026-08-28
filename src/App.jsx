import { useRef, useState } from "react";
import { useArcGISView } from "./hooks/useArcGISView.js";
import LoadingScreen from "./components/LoadingScreen.jsx";
import SidePanel from "./components/SidePanel.jsx";
import LayerListPanel from "./components/LayerListPanel.jsx";
import WidgetCarousel from "./components/WidgetCarousel.jsx";
import VesselDetailPanel from "./components/VesselDetailPanel.jsx";
import { CloseWidgetsIcon, ShowWidgetsIcon } from "./components/icons.jsx";
import "./App.css";

export default function App() {
  const mapContainerRef = useRef(null);
  const legendContainerRef = useRef(null);
  const layerListContainerRef = useRef(null);
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [isCarouselOpen, setIsCarouselOpen] = useState(true);
  const [isLayerListOpen, setIsLayerListOpen] = useState(false);
  const [hasAcknowledgedDisclaimer, setHasAcknowledgedDisclaimer] = useState(false);

  const {
    status,
    error,
    title,
    description,
    vessels,
    slides,
    weather,
    selectedVessel,
    zoomToVessel,
    applySlide,
    selectVessel,
    clearSelectedVessel,
  } = useArcGISView(
    mapContainerRef,
    legendContainerRef,
    layerListContainerRef,
    hasAcknowledgedDisclaimer
  );

  const handleSelectVessel = (vessel) => {
    zoomToVessel(vessel);
    selectVessel(vessel);
  };

  return (
    <div className="app">
      <div
        ref={mapContainerRef}
        className="scene-container"
        aria-hidden={status !== "ready"}
      />

      {status !== "ready" && (
        <LoadingScreen
          status={status}
          error={error}
          hasAcknowledgedDisclaimer={hasAcknowledgedDisclaimer}
          onProceed={() => setHasAcknowledgedDisclaimer(true)}
        />
      )}

      {status === "ready" && (
        <button
          type="button"
          className="widget-toggle widget-toggle--carousel"
          onClick={() => setIsCarouselOpen((open) => !open)}
          aria-expanded={isCarouselOpen}
          aria-label={isCarouselOpen ? "Hide Widgets" : "Show Widgets"}
          title={isCarouselOpen ? "Hide Widgets" : "Show Widgets"}
        >
          {isCarouselOpen ? <CloseWidgetsIcon /> : <ShowWidgetsIcon />}
        </button>
      )}
      {isCarouselOpen && status === "ready" && <WidgetCarousel weather={weather} />}

      <div className="right-rail">
        {isPanelOpen && selectedVessel && (
          <VesselDetailPanel vessel={selectedVessel} onClose={clearSelectedVessel} />
        )}
      </div>

      <SidePanel
        isOpen={isPanelOpen}
        onToggle={() => setIsPanelOpen((open) => !open)}
        title={title}
        description={description}
        status={status}
        vessels={vessels}
        onSelectVessel={handleSelectVessel}
        slides={slides}
        onSelectSlide={applySlide}
      />

      <LayerListPanel
        isOpen={isLayerListOpen}
        onToggle={() => setIsLayerListOpen((open) => !open)}
        containerRef={layerListContainerRef}
        legendContainerRef={legendContainerRef}
        status={status}
      />
    </div>
  );
}
