import React, { useEffect, useMemo, useState } from 'react';
import { geoGraticule10, geoNaturalEarth1, geoPath } from 'd3-geo';
import { feature, mesh } from 'topojson-client';

import countries50mUrl from 'world-atlas/countries-50m.json?url';

type TopologyLike = {
  type: 'Topology';
  objects: {
    countries: {
      type: string;
      geometries: unknown[];
    };
  };
  arcs: unknown[];
  transform?: unknown;
};

const MAP_WIDTH = 640;
const MAP_HEIGHT = 300;
const SEOUL_COORD: [number, number] = [126.978, 37.5665];
const SATELLITE_ORBIT_MS = 19_800;
const SATELLITE_TX_TRAVEL_MS = 1050;

type Point = [number, number];

const toUnitRandom = (seed: number) => {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const getSatellitePointForTime = (timeMs: number, seoulY: number): Point => {
  const startX = 14;
  const endX = MAP_WIDTH - 14;
  const orbitProgress = ((timeMs % SATELLITE_ORBIT_MS) + SATELLITE_ORBIT_MS) % SATELLITE_ORBIT_MS / SATELLITE_ORBIT_MS;
  const orbitIndex = Math.floor(timeMs / SATELLITE_ORBIT_MS);

  const x = startX + (endX - startX) * orbitProgress;

  const waveAmpA = 7.4 + toUnitRandom((orbitIndex + 1) * 311) * 10.6;
  const waveAmpB = 3.4 + toUnitRandom((orbitIndex + 1) * 313) * 7.6;
  const freqA = 2.0 + toUnitRandom((orbitIndex + 1) * 317) * 2.8;
  const freqB = 4.1 + toUnitRandom((orbitIndex + 1) * 331) * 4.1;
  const phaseA = toUnitRandom((orbitIndex + 1) * 337) * Math.PI * 2;
  const phaseB = toUnitRandom((orbitIndex + 1) * 347) * Math.PI * 2;
  const drift = (toUnitRandom((orbitIndex + 1) * 349) - 0.5) * 16;

  const waveA = Math.sin(orbitProgress * Math.PI * 2 * freqA + phaseA) * waveAmpA;
  const waveB = Math.sin(orbitProgress * Math.PI * 2 * freqB + phaseB) * waveAmpB;
  const envelope = 0.64 + Math.sin(orbitProgress * Math.PI) * 0.36;
  const y = seoulY + (waveA + waveB) * envelope + drift;

  return [x, y];
};

const FLOW_TARGETS: Array<{ className: string; coord: [number, number] }> = [
  { className: 'flow-na', coord: [-100, 45] },
  { className: 'flow-sa', coord: [-60, -15] },
  { className: 'flow-eu', coord: [15, 54] },
  { className: 'flow-af', coord: [20, 5] },
  { className: 'flow-as', coord: [95, 35] },
  { className: 'flow-oc', coord: [134, -25] },
];

const WorldMapVisual: React.FC = () => {
  const [topology, setTopology] = useState<TopologyLike | null>(null);
  const [frameTimeMs, setFrameTimeMs] = useState<number>(() => Date.now());

  const buildWavePath = (y: number, startPolarity: 1 | -1) => {
    const startX = 14;
    const endX = MAP_WIDTH - 14;
    const segments = 12;
    const segmentWidth = (endX - startX) / segments;
    const amplitude = 7.2;

    let d = `M ${startX} ${y}`;
    let prevX = startX;

    for (let i = 0; i < segments; i += 1) {
      const nextX = startX + segmentWidth * (i + 1);
      const cpX = prevX + segmentWidth / 2;
      const cpY = y + amplitude * (i % 2 === 0 ? startPolarity : -startPolarity);
      d += ` Q ${cpX} ${cpY} ${nextX} ${y}`;
      prevX = nextX;
    }

    return d;
  };

  useEffect(() => {
    let cancelled = false;

    const loadWorldTopology = async () => {
      try {
        const response = await fetch(countries50mUrl);
        if (!response.ok) {
          return;
        }

        const json = (await response.json()) as TopologyLike;
        if (!cancelled) {
          setTopology(json);
        }
      } catch {
        // Decorative map should fail silently when data loading fails.
      }
    };

    void loadWorldTopology();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let rafId = 0;

    const tick = () => {
      setFrameTimeMs(Date.now());
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, []);

  const mapData = useMemo(() => {
    const projection = geoNaturalEarth1().fitExtent(
      [
        [14, 14],
        [MAP_WIDTH - 14, MAP_HEIGHT - 14],
      ],
      { type: 'Sphere' },
    );

    const pathGenerator = geoPath(projection);
    const graticulePath = pathGenerator(geoGraticule10());
    const seoulLatitudeCoordinates = Array.from({ length: 361 }, (_, index) => [index - 180, SEOUL_COORD[1]] as [number, number]);
    const seoulLatitudePath = pathGenerator({
      type: 'LineString',
      coordinates: seoulLatitudeCoordinates,
    } as GeoJSON.LineString);

    const seoulPoint = projection(SEOUL_COORD);
    const seoulWavePathA = buildWavePath(seoulPoint?.[1] ?? MAP_HEIGHT / 2, 1);
    const seoulWavePathB = buildWavePath(seoulPoint?.[1] ?? MAP_HEIGHT / 2, -1);

    if (!topology || !seoulPoint) {
      return {
        graticulePath,
        countryPaths: [] as string[],
        borderPath: null as string | null,
        linkPaths: [] as Array<{ className: string; d: string }>,
        seoulLatitudePath,
        seoulWavePathA,
        seoulWavePathB,
        seoulPoint: null as [number, number] | null,
      };
    }

    const countries = feature(topology as never, topology.objects.countries as never) as
      | GeoJSON.Feature
      | GeoJSON.FeatureCollection;

    if (!('features' in countries)) {
      return {
        graticulePath,
        countryPaths: [] as string[],
        borderPath: null as string | null,
        linkPaths: [] as Array<{ className: string; d: string }>,
        seoulLatitudePath,
        seoulWavePathA,
        seoulWavePathB,
        seoulPoint,
      };
    }

    const countriesFeatureCollection = countries;

    const countryPaths = countriesFeatureCollection.features
      .map((countryFeature) => pathGenerator(countryFeature))
      .filter((pathValue): pathValue is string => Boolean(pathValue));

    const borders = mesh(
      topology as never,
      topology.objects.countries as never,
      (a, b) => a !== b,
    );
    const borderPath = pathGenerator(borders as never);

    const linkPaths = FLOW_TARGETS.map((target) => {
      const line = {
        type: 'LineString',
        coordinates: [SEOUL_COORD, target.coord],
      } as GeoJSON.LineString;

      const d = pathGenerator(line);
      return {
        className: target.className,
        d: d ?? '',
      };
    }).filter((entry) => entry.d.length > 0);

    return {
      graticulePath,
      countryPaths,
      borderPath,
      linkPaths,
      seoulLatitudePath,
      seoulWavePathA,
      seoulWavePathB,
      seoulPoint,
    };
  }, [topology]);

  const satellitePoint = useMemo<Point | null>(() => {
    const seoulPoint = mapData.seoulPoint;
    if (!seoulPoint) {
      return null;
    }

    return getSatellitePointForTime(frameTimeMs, seoulPoint[1]);
  }, [frameTimeMs, mapData.seoulPoint]);

  const transmissionPackets = useMemo(() => {
    const seoul = mapData.seoulPoint;
    if (!satellitePoint || !seoul) {
      return [] as Array<{ packet: Point; alpha: number; color: string }>;
    }

    const cycleTime = ((frameTimeMs % SATELLITE_ORBIT_MS) + SATELLITE_ORBIT_MS) % SATELLITE_ORBIT_MS;
    const orbitIndex = Math.floor(frameTimeMs / SATELLITE_ORBIT_MS);
    const pulseCount = 1 + Math.floor(toUnitRandom(orbitIndex + 17) * 5);
    const minStart = 500;
    const maxStart = SATELLITE_ORBIT_MS - SATELLITE_TX_TRAVEL_MS - 250;
    const usableWindow = maxStart - minStart;

    const pulseSpecs = Array.from({ length: pulseCount }, (_, index) => {
      const base = minStart + (usableWindow * (index + 1)) / (pulseCount + 1);
      const jitter = (toUnitRandom((orbitIndex + 1) * 97 + index * 31) - 0.5) * 720;
      const startMs = clamp(base + jitter, minStart, maxStart);
      const curveScale = 0.85 + toUnitRandom((orbitIndex + 1) * 131 + index * 43) * 0.35;
      const curveSign = toUnitRandom((orbitIndex + 1) * 151 + index * 59) > 0.5 ? 1 : -1;
      const curvePower = 0.9 + toUnitRandom((orbitIndex + 1) * 173 + index * 71) * 0.25;
      const hue = 185 + Math.floor(toUnitRandom((orbitIndex + 1) * 191 + index * 83) * 115);
      const saturation = 78 + Math.floor(toUnitRandom((orbitIndex + 1) * 211 + index * 97) * 18);
      const lightness = 64 + Math.floor(toUnitRandom((orbitIndex + 1) * 227 + index * 101) * 14);
      return {
        startMs,
        curveScale,
        curveSign,
        curvePower,
        color: `hsl(${hue} ${saturation}% ${lightness}%)`,
      };
    }).sort((a, b) => a.startMs - b.startMs);

    return pulseSpecs
      .map((spec) => {
        if (cycleTime < spec.startMs || cycleTime > spec.startMs + SATELLITE_TX_TRAVEL_MS) {
          return null;
        }

        const elapsed = cycleTime - spec.startMs;
        const origin = getSatellitePointForTime(frameTimeMs - elapsed, seoul[1]);

        const t = elapsed / SATELLITE_TX_TRAVEL_MS;
        const eased = 1 - (1 - t) * (1 - t);
        const dx = seoul[0] - origin[0];
        const dy = seoul[1] - origin[1];
        const distance = Math.hypot(dx, dy) || 1;
        const nx = -dy / distance;
        const ny = dx / distance;
        const curveAmplitude = Math.min(36, Math.max(14, distance * 0.12)) * spec.curveScale;
        const curveOffset = Math.sin(Math.PI * Math.pow(eased, spec.curvePower)) * curveAmplitude * spec.curveSign;

        const packet: Point = [
          origin[0] + dx * eased + nx * curveOffset,
          origin[1] + dy * eased + ny * curveOffset,
        ];

        return {
          packet,
          alpha: 1 - t * 0.75,
          color: spec.color,
        };
      })
      .filter((packet): packet is { packet: Point; alpha: number; color: string } => Boolean(packet));
  }, [frameTimeMs, mapData.seoulPoint, satellitePoint]);

  return (
    <svg viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} role="presentation" focusable="false">
      <g className="world-graticule">
        {mapData.graticulePath ? <path d={mapData.graticulePath} /> : null}
      </g>

      <g className="world-map-base">
        {mapData.countryPaths.map((d, index) => (
          <path key={`country-${index}`} d={d} />
        ))}
      </g>

      <g className="world-map-detail">
        {mapData.borderPath ? <path d={mapData.borderPath} /> : null}
      </g>

      <g className="world-link-layer">
        {mapData.linkPaths.map((link) => (
          <path key={`link-${link.className}`} d={link.d} />
        ))}
      </g>

      <g className="world-flow-layer">
        {mapData.linkPaths.map((link) => (
          <path key={`flow-${link.className}`} className={`world-flow ${link.className}`} d={link.d} />
        ))}
      </g>

      <g className="world-seoul-line">
        {mapData.seoulWavePathA ? (
          <path d={mapData.seoulWavePathA}>
            <animate
              attributeName="d"
              dur="2.2s"
              repeatCount="indefinite"
              values={`${mapData.seoulWavePathA};${mapData.seoulWavePathB};${mapData.seoulWavePathA}`}
            />
          </path>
        ) : null}
      </g>

      <g className="world-satellite-transfer">
        {transmissionPackets.map((packet, index) => (
          <g key={`tx-${index}`}>
            <circle
              className="tx-packet"
              cx={packet.packet[0]}
              cy={packet.packet[1]}
              r="1.7"
              style={{ opacity: packet.alpha, fill: packet.color }}
            />
          </g>
        ))}
      </g>

      <g className="world-satellite-layer">
        <g
          className="world-orbit-satellite"
          transform={satellitePoint ? `translate(${satellitePoint[0]} ${satellitePoint[1]})` : undefined}
        >
          <circle cx="0" cy="0" r="2.4" />
          <ellipse cx="0" cy="0" rx="4.2" ry="1.35" />
        </g>
      </g>
    </svg>
  );
};

export default WorldMapVisual;