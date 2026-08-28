import { Fragment, useEffect, useState } from "react";
import { describeWeatherCode } from "../lib/weatherCodes.js";
import "./WidgetCarousel.css";

const CLOCK_EMOJIS = [
  "🕛", "🕐", "🕑", "🕒", "🕓", "🕔", "🕕", "🕖", "🕗", "🕘", "🕙", "🕚",
];

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
});

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  day: "numeric",
  month: "short",
});

function CarouselCard({ icon, title, subtitle }) {
  return (
    <div className="widget-carousel__card">
      <span className="widget-carousel__icon" aria-hidden="true">
        {icon}
      </span>
      <div className="widget-carousel__text">
        <span className="widget-carousel__title">{title}</span>
        <span className="widget-carousel__subtitle">{subtitle}</span>
      </div>
    </div>
  );
}

function ClockCard({ now }) {
  return (
    <CarouselCard
      icon={CLOCK_EMOJIS[now.getHours() % 12]}
      title={timeFormatter.format(now)}
      subtitle={dateFormatter.format(now)}
    />
  );
}

function WeatherCard({ weather }) {
  if (weather.temperature == null) {
    return (
      <CarouselCard
        icon="🌡️"
        title="Weather"
        subtitle={weather.status === "error" ? "Unavailable" : "Loading…"}
      />
    );
  }
  const { label, icon } = describeWeatherCode(weather.weatherCode);
  return (
    <CarouselCard
      icon={icon}
      title={`${Math.round(weather.temperature)}°C`}
      subtitle={label}
    />
  );
}

function WindCard({ weather }) {
  if (weather.windSpeed == null) {
    return (
      <CarouselCard
        icon="💨"
        title="Wind"
        subtitle={weather.status === "error" ? "Unavailable" : "Loading…"}
      />
    );
  }
  return (
    <CarouselCard
      icon="💨"
      title={`${Math.round(weather.windSpeed)} km/h`}
      subtitle="Wind speed"
    />
  );
}

function HumidityCard({ weather }) {
  if (weather.humidity == null) {
    return (
      <CarouselCard
        icon="💧"
        title="Humidity"
        subtitle={weather.status === "error" ? "Unavailable" : "Loading…"}
      />
    );
  }
  return (
    <CarouselCard icon="💧" title={`${Math.round(weather.humidity)}%`} subtitle="Humidity" />
  );
}

function SeaTemperatureCard({ weather }) {
  if (weather.seaSurfaceTemperature == null) {
    return (
      <CarouselCard
        icon="🌊"
        title="Sea Temp"
        subtitle={weather.status === "error" ? "Unavailable" : "Loading…"}
      />
    );
  }
  return (
    <CarouselCard
      icon="🌊"
      title={`${weather.seaSurfaceTemperature.toFixed(1)}°C`}
      subtitle="Sea temperature"
    />
  );
}

function TideCard({ weather }) {
  if (weather.seaLevelHeight == null) {
    return (
      <CarouselCard
        icon="🌙"
        title="Tide"
        subtitle={weather.status === "error" ? "Unavailable" : "Loading…"}
      />
    );
  }
  const height = weather.seaLevelHeight;
  return (
    <CarouselCard
      icon="🌙"
      title={`${height >= 0 ? "+" : ""}${height.toFixed(2)} m`}
      subtitle="Sea level (tide)"
    />
  );
}

function formatCoordinate(value, positiveSuffix, negativeSuffix) {
  return `${Math.abs(value).toFixed(4)}° ${value >= 0 ? positiveSuffix : negativeSuffix}`;
}

function CoordinatesCard({ weather }) {
  if (weather.latitude == null || weather.longitude == null) {
    return (
      <CarouselCard
        icon="📍"
        title="Coordinates"
        subtitle={weather.status === "error" ? "Unavailable" : "Loading…"}
      />
    );
  }
  return (
    <CarouselCard
      icon="📍"
      title={`${formatCoordinate(weather.latitude, "N", "S")}  ${formatCoordinate(
        weather.longitude,
        "E",
        "W"
      )}`}
      subtitle="Scene centre"
    />
  );
}

// The track is rendered as two identical halves back to back, then
// animated from translateX(0) to translateX(-50%) and looped. Because
// the halves are identical, the reset from -50% back to 0% is
// invisible, giving an endless scroll. Each half repeats the card set
// a few times so the loop still has a comfortable amount of width to
// travel even with only a handful of distinct cards.
const REPEATS_PER_HALF = 2;

export default function WidgetCarousel({ weather }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const intervalId = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(intervalId);
  }, []);

  const half = Array.from({ length: REPEATS_PER_HALF }, (_, i) => i);

  const renderHalf = (halfKey) =>
    half.map((i) => (
      <Fragment key={`${halfKey}-${i}`}>
        <ClockCard now={now} />
        <WeatherCard weather={weather} />
        <WindCard weather={weather} />
        <HumidityCard weather={weather} />
        <SeaTemperatureCard weather={weather} />
        <TideCard weather={weather} />
        <CoordinatesCard weather={weather} />
      </Fragment>
    ));

  return (
    <div className="widget-carousel" aria-label="Live time and weather">
      <div className="widget-carousel__track">
        {renderHalf("a")}
        {renderHalf("b")}
      </div>
    </div>
  );
}
