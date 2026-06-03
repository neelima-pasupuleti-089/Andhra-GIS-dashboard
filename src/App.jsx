import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  GeoJSON,
  CircleMarker,
  Tooltip,
  MapContainer,
  Polygon,
  Polyline,
  Popup,
  TileLayer,
  ZoomControl,
  useMap,
} from 'react-leaflet';

import 'leaflet/dist/leaflet.css';
import './App.css';

import apBoundary from './data/ap_boundary.json';

const THEME = {
  green: '#36e37f',
  mint: '#64f4b5',
  cyan: '#22d3ee',
  blue: '#60a5fa',
  violet: '#a78bfa',
  amber: '#fbbf24',
  rose: '#fb7185',
  orange: '#fb923c',
  dark: '#02070b',
};

const CATEGORIES = {
  airports:     { label: 'Airports',           group: 'Transport',    color: '#a78bfa', file: 'airports.json',                  osm: '"aeroway"~"aerodrome"',                          icon: 'plane' },
  railway:      { label: 'Railway Stations',   group: 'Transport',    color: '#f87171', file: 'railway stations.json',           osm: '"railway"="station"',                            icon: 'train' },
  busTerminals: { label: 'Bus Terminals',       group: 'Transport',    color: '#fb923c', file: 'Bus Terminals & Stops.json',      osm: '"amenity"="bus_station"',                        icon: 'bus' },
  waterway:     { label: 'Waterway Terminals', group: 'Transport',    color: '#38bdf8', file: 'Waterway Terminals.json',          osm: '"amenity"="ferry_terminal"',                     icon: 'ship' },
  hospitals:    { label: 'Hospitals',          group: 'Health',       color: '#fb7185', file: 'hospitals.json',                   osm: '"amenity"="hospital"',                           icon: 'hospital' },
  pharmacies:   { label: 'Pharmacies',         group: 'Health',       color: '#34d399', file: 'Pharmacies.json',                  osm: '"amenity"="pharmacy"',                           icon: 'pill' },
  schools:      { label: 'Schools',            group: 'Education',    color: '#a3e635', file: 'Schools.json',                     osm: '"amenity"="school"',                             icon: 'school' },
  universities: { label: 'Universities',       group: 'Education',    color: '#60a5fa', file: 'Universities.json',                osm: '"amenity"="university"',                         icon: 'graduation' },
  banks:        { label: 'Banks and ATMs',     group: 'Civic',        color: '#2dd4bf', file: 'Banks.json',                       osm: '"amenity"~"bank|atm"',                           icon: 'bank' },
  police:       { label: 'Police Stations',    group: 'Civic',        color: '#3b82f6', file: 'Police Stations.json',             osm: '"amenity"="police"',                             icon: 'shield' },
  industrial:   { label: 'Industrial Zones',   group: 'Economy',      color: '#d946ef', file: 'Industrial Zones.json',            osm: '"landuse"="industrial"',                         icon: 'factory' },
  temples:      { label: 'Temples',            group: 'Culture',      color: '#facc15', file: 'Temples.json',                     osm: '"amenity"="place_of_worship"]["religion"="hindu"', icon: 'temple' },
  beaches:      { label: 'Beaches',            group: 'Environment',  color: '#0ea5e9', file: 'Beaches.json',                     osm: '"natural"="beach"',                              icon: 'beach' },
  heritages:    { label: 'Heritage Sites',     group: 'Culture',      color: '#f59e0b', file: 'Heritages.json',                   osm: '"historic"',                                     icon: 'heritage' },
};

const CATEGORY_KEYS = Object.keys(CATEGORIES);

// â”€â”€â”€ AP DISTRICTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const AP_DISTRICTS = [
  { key: 'srikakulam',    label: 'Srikakulam',    center: [18.30, 83.90], bounds: [[17.85,83.45],[18.75,84.65]] },
  { key: 'vizianagaram',  label: 'Vizianagaram',  center: [18.12, 83.40], bounds: [[17.70,82.85],[18.65,84.05]] },
  { key: 'visakhapatnam', label: 'Visakhapatnam', center: [17.72, 83.22], bounds: [[17.25,82.60],[18.20,83.95]] },
  { key: 'eastGodavari',  label: 'East Godavari', center: [17.00, 81.80], bounds: [[16.45,81.10],[17.60,82.60]] },
  { key: 'westGodavari',  label: 'West Godavari', center: [16.90, 81.10], bounds: [[16.30,80.55],[17.50,81.70]] },
  { key: 'krishna',       label: 'Krishna',        center: [16.52, 80.65], bounds: [[15.95,80.00],[17.05,81.45]] },
  { key: 'guntur',        label: 'Guntur',         center: [16.30, 80.44], bounds: [[15.55,79.65],[16.90,81.10]] },
  { key: 'prakasam',      label: 'Prakasam',       center: [15.35, 79.60], bounds: [[14.50,78.90],[16.10,80.45]] },
  { key: 'nellore',       label: 'Nellore',        center: [14.44, 79.99], bounds: [[13.50,79.25],[15.20,80.75]] },
  { key: 'kurnool',       label: 'Kurnool',        center: [15.83, 78.04], bounds: [[14.75,76.85],[16.65,79.25]] },
  { key: 'kadapa',        label: 'Kadapa (YSR)',   center: [14.47, 78.82], bounds: [[13.55,78.05],[15.45,79.65]] },
  { key: 'anantapur',     label: 'Anantapur',      center: [14.68, 77.60], bounds: [[13.25,76.85],[15.85,78.45]] },
  { key: 'chittoor',      label: 'Chittoor',       center: [13.62, 79.10], bounds: [[12.55,78.00],[14.40,80.20]] },
];

function featureInDistrict(feature, district) {
  const center = getFeatureCenter(feature);
  if (!center) return true;
  const [lng, lat] = center;
  const [[s, w], [n, e]] = district.bounds;
  return lat >= s && lat <= n && lng >= w && lng <= e;
}

const MAX_RENDERED_POINTS_PER_LAYER = 600;

const PER_LAYER_MAX = {
  busTerminals: 240,
  hospitals:    280,
  banks:        280,
  schools:      320,
  temples:      260,
  pharmacies:   320,
  police:       380,
};

const INITIAL_ACTIVE_LAYERS = {
  airports: true,
  railway: true,
  busTerminals: true,
  beaches: true,
};

const OVERLAY_LAYERS = [
  { key: 'stateMask',   label: 'AP Focus Mask',     color: THEME.blue },
  { key: 'boundary',    label: 'State Boundary',    color: THEME.green },
  { key: 'corridors',   label: 'Transit Corridors', color: THEME.mint },
  { key: 'coastline',   label: 'Coastal Spine',     color: THEME.cyan },
  { key: 'cityLabels',  label: 'Strategic Cities',  color: THEME.amber },
];

const CITY_NODES = [
  { name: 'Visakhapatnam', role: 'Port and industrial gateway',            position: [17.6868, 83.2185], neonColor: '#22d3ee' },
  { name: 'Vijayawada',    role: 'Rail, road, and commerce hub',           position: [16.5062, 80.648],  neonColor: '#36e37f' },
  { name: 'Tirupati',      role: 'Pilgrimage and services anchor',         position: [13.6288, 79.4192], neonColor: '#fb7185' },
  { name: 'Guntur',        role: 'Delta agriculture and education center', position: [16.3067, 80.4365], neonColor: '#fbbf24' },
  { name: 'Kurnool',       role: 'Rayalaseema logistics gateway',          position: [15.8281, 78.0373], neonColor: '#a78bfa' },
  { name: 'Nellore',       role: 'South coastal industry belt',            position: [14.4426, 79.9865], neonColor: '#60a5fa' },
  { name: 'Kakinada',      role: 'Energy and port economy',                position: [16.9891, 82.2475], neonColor: '#64f4b5' },
  { name: 'Rajahmundry',   role: 'Godavari cultural and transport center', position: [17.0005, 81.804],  neonColor: '#fb923c' },
  { name: 'Kadapa',        role: 'Rayalaseema service and mineral belt',   position: [14.4673, 78.8242], neonColor: '#f0abfc' },
];

const CITY_LOOKUP = CITY_NODES.reduce((acc, city) => {
  acc[city.name] = [city.position[1], city.position[0]];
  return acc;
}, {});

const cityLine = (name, from, to) => ({
  type: 'Feature',
  properties: { name },
  geometry: { type: 'LineString', coordinates: [CITY_LOOKUP[from], CITY_LOOKUP[to]] },
});

const CITY_CONNECTIONS = {
  type: 'FeatureCollection',
  features: [
    cityLine('Visakhapatnamâ€“Kakinada Port Belt',  'Visakhapatnam', 'Kakinada'),
    cityLine('Godavari Delta Connector',           'Kakinada', 'Rajahmundry'),
    cityLine('Rajahmundryâ€“Vijayawada Axis',        'Rajahmundry', 'Vijayawada'),
    cityLine('Vijayawadaâ€“Guntur Link',             'Vijayawada', 'Guntur'),
    cityLine('Coastal South Corridor',             'Guntur', 'Nellore'),
    cityLine('Pilgrim South Link',                 'Nellore', 'Tirupati'),
    cityLine('Rayalaseema Inner Web',              'Tirupati', 'Kadapa'),
    cityLine('Kadapaâ€“Kurnool Link',                'Kadapa', 'Kurnool'),
    cityLine('Interior Capital Link',              'Kurnool', 'Vijayawada'),
  ],
};

const AP_ROUTING_NETWORK = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', properties: { name: 'NH-16 Coastal Economic Spine' },   geometry: { type: 'LineString', coordinates: [[84.7,19.1],[83.9,18.3],[83.3,17.7],[82.5,17.2],[81.8,17.0],[81.1,16.7],[80.6,16.5],[80.15,15.9],[80.0,15.5],[79.9,14.45],[79.92,13.5],[80.02,13.25]] } },
    { type: 'Feature', properties: { name: 'Rayalaseema Western Lifeline' },   geometry: { type: 'LineString', coordinates: [[78.3,15.8],[77.95,15.5],[77.6,14.68],[77.72,14.15],[77.7,13.8],[78.1,13.5],[78.5,13.3]] } },
    { type: 'Feature', properties: { name: 'Rayalaseema Interior Web' },       geometry: { type: 'LineString', coordinates: [[78.0,15.8],[78.4,15.4],[78.7,15.1],[78.85,14.45],[79.1,13.6],[79.2,13.2],[79.6,13.5]] } },
    { type: 'Feature', properties: { name: 'Central Cross Link' },             geometry: { type: 'LineString', coordinates: [[78.0,15.8],[79.2,15.95],[80.15,15.9],[80.6,16.5],[81.1,16.7]] } },
    { type: 'Feature', properties: { name: 'Godavari Delta Grid' },            geometry: { type: 'LineString', coordinates: [[81.1,16.7],[81.5,16.2],[81.9,16.4],[82.2,16.9],[82.5,17.2]] } },
    { type: 'Feature', properties: { name: 'Northern Tribal and Port Link' },  geometry: { type: 'LineString', coordinates: [[83.3,17.7],[83.5,18.2],[83.9,18.3],[84.2,18.8]] } },
    { type: 'Feature', properties: { name: 'Amaravati Capital Ring' },         geometry: { type: 'LineString', coordinates: [[80.3,16.3],[80.6,16.5],[80.8,16.3],[80.5,16.1],[80.3,16.3]] } },
    { type: 'Feature', properties: { name: 'Nallamala Forest Route' },         geometry: { type: 'LineString', coordinates: [[78.8,15.9],[79.1,15.7],[79.5,15.9],[79.9,16.1]] } },
    { type: 'Feature', properties: { name: 'Tirupati Chittoor Link' },         geometry: { type: 'LineString', coordinates: [[79.4,13.6],[79.0,13.2],[78.5,13.3]] } },
    { type: 'Feature', properties: { name: 'Vizag Araku Highland Link' },      geometry: { type: 'LineString', coordinates: [[83.3,17.7],[83.1,18.0],[82.8,18.3]] } },
  ],
};

const AP_DISTRICT_LINES = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', properties: { name: 'Krishna River System' },    geometry: { type: 'LineString', coordinates: [[77.7,16.25],[78.4,16.05],[79.2,16.12],[80.05,16.2],[80.65,16.5],[81.05,16.28]] } },
    { type: 'Feature', properties: { name: 'Godavari Delta System' },   geometry: { type: 'LineString', coordinates: [[80.95,17.65],[81.45,17.25],[81.8,17.0],[82.15,16.8],[82.35,16.55]] } },
    { type: 'Feature', properties: { name: 'Pennar Basin Thread' },     geometry: { type: 'LineString', coordinates: [[77.65,14.75],[78.25,14.68],[78.9,14.55],[79.55,14.45],[80.05,14.45]] } },
    { type: 'Feature', properties: { name: 'Eastern Ghats Ridge' },     geometry: { type: 'LineString', coordinates: [[79.0,13.6],[79.2,14.25],[79.55,15.05],[79.9,15.95],[80.6,16.65],[81.45,17.15],[82.2,17.75],[82.85,18.28]] } },
    { type: 'Feature', properties: { name: 'Rayalaseema Ridge' },       geometry: { type: 'LineString', coordinates: [[77.55,13.75],[78.0,14.25],[78.35,14.85],[78.55,15.45],[78.3,15.85]] } },
    { type: 'Feature', properties: { name: 'Coastal Irrigation Chain' },geometry: { type: 'LineString', coordinates: [[80.05,13.25],[79.9,14.05],[80.1,14.78],[80.2,15.45],[80.6,16.15],[81.1,16.72],[81.9,17.0],[82.6,17.28]] } },
    { type: 'Feature', properties: { name: 'North Agency Forest Mesh' },geometry: { type: 'LineString', coordinates: [[82.1,17.7],[82.45,18.05],[82.85,18.35],[83.35,18.45],[83.95,18.72]] } },
    { type: 'Feature', properties: { name: 'Central Services Web' },    geometry: { type: 'LineString', coordinates: [[78.8,15.2],[79.45,15.55],[80.15,15.9],[80.75,16.35],[81.35,16.85]] } },
    { type: 'Feature', properties: { name: 'Srikakulam Inner Net' },    geometry: { type: 'LineString', coordinates: [[83.5,18.15],[83.8,18.45],[84.15,18.6],[84.5,18.75]] } },
    { type: 'Feature', properties: { name: 'Prakasam East Link' },      geometry: { type: 'LineString', coordinates: [[79.8,15.35],[80.1,15.25],[80.5,15.15],[80.8,15.3],[81.1,15.55]] } },
    { type: 'Feature', properties: { name: 'Nellore Corridor' },        geometry: { type: 'LineString', coordinates: [[79.9,14.45],[80.05,13.95],[80.12,13.5],[80.05,13.28]] } },
    { type: 'Feature', properties: { name: 'Vizag Inner Belt' },        geometry: { type: 'LineString', coordinates: [[83.25,17.7],[83.05,17.35],[82.85,17.18],[82.55,17.15]] } },
  ],
};

const CONTEXT_NETWORK_LINES = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', properties: { name: 'Telangana Context Grid' }, geometry: { type: 'LineString', coordinates: [[78.1,17.4],[79.2,17.7],[80.4,17.55],[81.3,17.25]] } },
    { type: 'Feature', properties: { name: 'Karnataka Context Grid' }, geometry: { type: 'LineString', coordinates: [[76.9,14.9],[77.55,14.55],[78.15,14.2],[78.55,13.72]] } },
    { type: 'Feature', properties: { name: 'Tamil Nadu Context Grid' },geometry: { type: 'LineString', coordinates: [[78.4,13.05],[79.05,12.92],[79.75,13.0],[80.15,13.18]] } },
    { type: 'Feature', properties: { name: 'Odisha Context Grid' },    geometry: { type: 'LineString', coordinates: [[83.75,18.95],[84.25,19.22],[84.85,19.32],[85.12,19.05]] } },
    { type: 'Feature', properties: { name: 'Bay Shipping Context' },   geometry: { type: 'LineString', coordinates: [[82.0,13.5],[82.55,14.6],[83.0,15.8],[83.45,17.0],[84.0,18.25]] } },
  ],
};

const CONTEXT_LABELS = [
  { name: 'TELANGANA',  position: [17.55, 79.35], tone: THEME.violet },
  { name: 'KARNATAKA',  position: [14.45, 77.1],  tone: THEME.blue },
  { name: 'TAMIL NADU', position: [13.05, 79.05], tone: THEME.amber },
  { name: 'ODISHA',     position: [19.05, 84.35], tone: THEME.green },
];

const INDIA_STATE_FILLS = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature', properties: { name: 'Telangana', color: '#a78bfa' },
      geometry: { type: 'Polygon', coordinates: [[[78.1,17.4],[79.2,17.85],[80.2,17.65],[80.75,18.15],[81.05,18.38],[82.05,18.45],[82.65,18.55],[83.35,18.55],[84.65,18.88],[84.5,20.0],[82.5,20.2],[80.5,20.0],[79.0,19.5],[78.0,19.2],[77.5,18.8],[77.1,18.0],[76.85,17.2],[76.95,16.65],[77.2,16.0],[77.65,16.45],[77.85,16.85],[78.05,17.25],[78.1,17.4]]] }
    },
    {
      type: 'Feature', properties: { name: 'Karnataka', color: '#60a5fa' },
      geometry: { type: 'Polygon', coordinates: [[[76.75,15.45],[76.9,14.88],[77.35,14.15],[77.75,13.62],[78.3,13.45],[77.6,12.8],[77.1,12.25],[76.6,11.5],[75.8,10.8],[74.9,10.5],[74.4,11.2],[74.1,12.0],[74.05,13.0],[74.2,14.0],[74.6,15.0],[75.2,16.0],[75.8,17.0],[76.5,17.4],[76.95,16.65],[76.75,15.45]]] }
    },
    {
      type: 'Feature', properties: { name: 'Tamil Nadu', color: '#fbbf24' },
      geometry: { type: 'Polygon', coordinates: [[[78.3,13.45],[78.7,13.22],[79.2,12.88],[79.7,12.95],[80.02,13.28],[79.92,13.5],[79.4,12.85],[79.1,11.5],[78.8,10.2],[78.2,8.8],[77.6,8.1],[77.0,8.5],[76.6,9.2],[76.6,10.5],[77.1,12.25],[77.6,12.8],[78.3,13.45]]] }
    },
    {
      type: 'Feature', properties: { name: 'Odisha', color: '#36e37f' },
      geometry: { type: 'Polygon', coordinates: [[[84.6,18.85],[84.1,18.62],[83.55,18.18],[83.3,17.72],[84.65,18.88],[85.5,19.5],[85.8,20.5],[86.2,21.5],[86.5,22.5],[85.5,22.5],[84.5,22.0],[83.5,21.5],[82.5,21.0],[81.5,20.5],[80.5,20.0],[79.0,19.5],[80.75,18.15],[81.05,18.38],[82.05,18.45],[82.65,18.55],[83.35,18.55],[84.6,18.85]]] }
    },
  ],
};

const COASTAL_SPINE = [
  [19.1,84.7],[18.3,83.9],[17.68,83.24],[17.2,82.5],[16.98,82.25],
  [16.3,81.35],[15.9,80.15],[14.44,79.99],[13.25,80.02],
];

const PIPELINE_STEPS = [
  { label: 'OpenStreetMap', sub: 'Source',             icon: 'map' },
  { label: 'Overpass API',  sub: 'Live extraction',    icon: 'code' },
  { label: 'Data Cleanup',  sub: 'Validate and shape', icon: 'database' },
  { label: 'GeoJSON',       sub: 'Cluster-ready',      icon: 'nodes' },
  { label: 'Dashboard',     sub: 'Explore and export', icon: 'dashboard' },
];

const FEATURE_CARDS = [
  { title: 'Dynamic Layers', text: 'Toggle 14 AP POI categories â€” transport, health, education, civic, culture, environment.', icon: 'layers' },
  { title: 'Live OSM Sync',  text: 'Refresh any layer via Overpass API and keep data production-accurate.',                     icon: 'refresh' },
  { title: 'Map Intelligence',text: 'Boundary mask, coastal spine, city labels, and corridor overlays.',                        icon: 'route' },
  { title: 'Instant Export', text: 'Download per-layer or full-stack GeoJSON and CSV without leaving the view.',               icon: 'download' },
];

// â”€â”€â”€ ICONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function Icon({ name, size = 18 }) {
  const paths = {
    map:       (<><path d="m3 6 5-3 8 3 5-3v15l-5 3-8-3-5 3V6Z"/><path d="M8 3v15M16 6v15"/></>),
    code:      (<><path d="m8 8-4 4 4 4"/><path d="m16 8 4 4-4 4"/><path d="m14 5-4 14"/></>),
    database:  (<><ellipse cx="12" cy="5" rx="7" ry="3"/><path d="M5 5v14c0 1.7 3.1 3 7 3s7-1.3 7-3V5"/><path d="M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/></>),
    nodes:     (<><circle cx="6" cy="12" r="3"/><circle cx="18" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><path d="m8.7 10.7 6.6-3.4M8.7 13.3l6.6 3.4"/></>),
    dashboard: (<><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 10h16M10 20V10"/></>),
    layers:    (<><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 16 9 5 9-5"/></>),
    refresh:   (<><path d="M20 12a8 8 0 0 1-14.8 4.2"/><path d="M4 16v5h5"/><path d="M4 12A8 8 0 0 1 18.8 7.8"/><path d="M20 8V3h-5"/></>),
    route:     (<><circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M6 16V9a3 3 0 0 1 3-3h7"/><path d="M9 18h6a3 3 0 0 0 3-3V8"/></>),
    download:  (<><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></>),
    search:    (<><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></>),
    pin:       (<><path d="M12 21s7-5.2 7-12A7 7 0 0 0 5 9c0 6.8 7 12 7 12Z"/><circle cx="12" cy="9" r="2.5"/></>),
    export:    (<><path d="M14 3h7v7"/><path d="M10 14 21 3"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/></>),
    chevron:   <path d="m6 9 6 6 6-6"/>,
    close:     (<><path d="M18 6 6 18"/><path d="m6 6 12 12"/></>),
    sun:       (<><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></>),
  };
  return (
    <svg aria-hidden="true" className="icon" width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {paths[name] || paths.pin}
    </svg>
  );
}

// â”€â”€â”€ HELPERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function hexToRgb(hex) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? `${parseInt(r[1],16)}, ${parseInt(r[2],16)}, ${parseInt(r[3],16)}` : '54,227,127';
}

function limitRenderedFeatures(features, key) {
  const limit = PER_LAYER_MAX[key] || MAX_RENDERED_POINTS_PER_LAYER;
  if (!features || features.length <= limit) return features || [];
  const stride = Math.ceil(features.length / limit);
  return features.filter((_, index) => index % stride === 0).slice(0, limit);
}

function collectCoordinatePairs(coordinates, output = []) {
  if (!Array.isArray(coordinates)) return output;
  if (typeof coordinates[0] === 'number' && typeof coordinates[1] === 'number') { output.push(coordinates); return output; }
  coordinates.forEach((item) => collectCoordinatePairs(item, output));
  return output;
}

function getFeatureCenter(feature) {
  const geometry = feature?.geometry;
  if (!geometry?.coordinates) return null;
  if (geometry.type === 'Point') return geometry.coordinates;
  const pairs = collectCoordinatePairs(geometry.coordinates);
  if (!pairs.length) return null;
  const total = pairs.reduce((acc, p) => { acc.lng += Number(p[0])||0; acc.lat += Number(p[1])||0; return acc; }, { lng:0, lat:0 });
  return [total.lng / pairs.length, total.lat / pairs.length];
}

function getFeatureName(feature, fallback) {
  const p = feature?.properties || {};
  return p.name || p['name:en'] || p.operator || p.amenity || p.tourism || p.historic || p.landuse || fallback;
}

function normalizeFeatureForExport(feature, key) {
  return { ...feature, properties: { source_layer: key, category: CATEGORIES[key].label, ...(feature.properties||{}) } };
}

function safeFileName(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
}

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return `"${text.replace(/"/g,'""')}"`;
}

function geoJsonToCsv(features, fallbackCategory) {
  const rows = features.map((f) => {
    const center = getFeatureCenter(f) || ['',''];
    return { category: f.properties?.category||fallbackCategory, name: getFeatureName(f,fallbackCategory), geometry_type: f.geometry?.type||'', longitude: center[0], latitude: center[1], ...(f.properties||{}) };
  });
  const headers = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const body    = rows.map((r) => headers.map((h) => csvEscape(r[h])).join(','));
  return [headers.join(','), ...body].join('\n');
}

function downloadBlob(content, fileName, type) {
  const blob = new Blob([content], { type });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = fileName;
  document.body.appendChild(link); link.click();
  document.body.removeChild(link); URL.revokeObjectURL(url);
}

// â”€â”€â”€ FLY TO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function FlyToLocation({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target, 13, { duration: 1.4 });
  }, [target, map]);
  return null;
}

// â”€â”€â”€ PLACE SEARCH â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function PlaceSearch({ onSelect }) {
  const [query, setQuery]   = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen]     = useState(false);
  const debounceRef = useRef(null);
  const wrapRef     = useRef(null);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!query.trim() || query.length < 2) return undefined;
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ' Andhra Pradesh India')}&limit=7&countrycodes=in&bounded=1&viewbox=76.2,19.5,85.2,12.1`;
        const res  = await fetch(url, { headers: { 'Accept-Language': 'en' } });
        const data = await res.json();
        setResults(data);
        setOpen(data.length > 0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  useEffect(() => {
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelect = (item) => {
    setQuery(item.display_name.split(',')[0]);
    setOpen(false);
    onSelect([parseFloat(item.lat), parseFloat(item.lon)]);
  };

  const handleQueryChange = (value) => {
    setQuery(value);
    if (value.trim().length < 2) { setResults([]); setOpen(false); }
  };

  return (
    <div className="place-search-wrap" ref={wrapRef}>
      <div className="place-search-box">
        <Icon name="search" size={14} />
        <input
          type="text"
          placeholder="Search places in Andhra Pradeshâ€¦"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
        />
        {loading && <span className="place-search-spinner" />}
        {query && !loading && (
          <button type="button" onClick={() => { setQuery(''); setResults([]); setOpen(false); }}>
            <Icon name="close" size={12} />
          </button>
        )}
      </div>
      {open && results.length > 0 && (
        <div className="place-search-results">
          {results.map((item) => (
            <button key={item.place_id} type="button" className="place-result-item" onClick={() => handleSelect(item)}>
              <span className="place-result-dot" />
              <span>
                <strong>{item.display_name.split(',')[0]}</strong>
                <span>{item.display_name.split(',').slice(1, 3).join(',').trim()}</span>
              </span>
            </button>
          ))}
        </div>
      )}
      {open && results.length === 0 && !loading && (
        <div className="place-search-results">
          <p className="place-no-results">No results found in Andhra Pradesh</p>
        </div>
      )}
    </div>
  );
}

// â”€â”€â”€ APP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function App() {
  const apCenter     = [15.9129, 79.74];
  const andhraBounds = [[12.1,76.2],[19.5,85.2]];

  const [activeLayers,    setActiveLayers]    = useState(INITIAL_ACTIVE_LAYERS);
  const [layersData,      setLayersData]      = useState({});
  const [loadingLayers,   setLoadingLayers]   = useState({});
  const [syncingLayers,   setSyncingLayers]   = useState({});
  const [layerErrors,     setLayerErrors]     = useState({});
  const [mapOverlays,     setMapOverlays]     = useState({ stateMask:true, boundary:true, corridors:true, coastline:true, cityLabels:true });
  const [showAllLayers,   setShowAllLayers]   = useState(false);
  const [searchQuery,     setSearchQuery]     = useState('');
  const [toast,           setToast]           = useState('');
  const [flyTarget,       setFlyTarget]       = useState(null);
  const [selectedDistrict,setSelectedDistrict] = useState(null);
  const [showAllDistricts,setShowAllDistricts] = useState(false);

  const requestedLayers = useRef(new Set());

  const activeCategoryKeys = useMemo(() => CATEGORY_KEYS.filter((k) => activeLayers[k]), [activeLayers]);

  const filteredCategoryKeys = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return CATEGORY_KEYS;
    return CATEGORY_KEYS.filter((k) => `${CATEGORIES[k].label} ${CATEGORIES[k].group}`.toLowerCase().includes(q));
  }, [searchQuery]);

  const INITIAL_VISIBLE_COUNT = 8;
  const visibleCategoryKeys = useMemo(() => {
    if (showAllLayers || searchQuery.trim()) return filteredCategoryKeys;
    return filteredCategoryKeys.slice(0, INITIAL_VISIBLE_COUNT);
  }, [filteredCategoryKeys, searchQuery, showAllLayers]);

  const hiddenLayerCount = Math.max(0, filteredCategoryKeys.length - visibleCategoryKeys.length);

  const loadLayer = useCallback(async (key) => {
    const category = CATEGORIES[key];
    if (!category) return null;
    setLoadingLayers((prev) => ({ ...prev, [key]:true }));
    setLayerErrors((prev) => ({ ...prev, [key]:'' }));
    try {
      const res = await fetch(`/data/${category.file}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const geoJson = await res.json();
      setLayersData((prev) => ({ ...prev, [key]:geoJson }));
      return geoJson;
    } catch (error) {
      setLayerErrors((prev) => ({ ...prev, [key]:`Could not load ${category.label}` }));
      requestedLayers.current.delete(key);
      throw error;
    } finally {
      setLoadingLayers((prev) => ({ ...prev, [key]:false }));
    }
  }, []);

  useEffect(() => {
    activeCategoryKeys.forEach((key) => {
      if (!layersData[key] && !requestedLayers.current.has(key)) {
        requestedLayers.current.add(key);
        loadLayer(key).catch((e) => console.error(`Failed to load ${key}`, e));
      }
    });
  }, [activeCategoryKeys, layersData, loadLayer]);

  useEffect(() => {
    if (!toast) return undefined;
    const id = window.setTimeout(() => setToast(''), 3200);
    return () => window.clearTimeout(id);
  }, [toast]);

  const layerCounts = useMemo(
    () => CATEGORY_KEYS.reduce((acc, k) => { acc[k] = layersData[k]?.features?.length || 0; return acc; }, {}),
    [layersData],
  );
  const totalRenderedPoints = useMemo(
    () => activeCategoryKeys.reduce((sum, k) => sum + (layerCounts[k]||0), 0),
    [activeCategoryKeys, layerCounts],
  );
  const loadedLayerCount  = activeCategoryKeys.filter((k) => layersData[k]).length;
  const activeOverlayCount = Object.values(mapOverlays).filter(Boolean).length;

  const maskPositions = useMemo(() => {
    if (!apBoundary?.features) return null;
    const outer = [[90,-180],[90,180],[-90,180],[-90,-180]];
    const holes  = [];
    apBoundary.features.forEach((f) => {
      const g = f.geometry;
      if (g.type === 'Polygon')      holes.push(g.coordinates[0].map((c) => [c[1],c[0]]));
      if (g.type === 'MultiPolygon') g.coordinates.forEach((p) => holes.push(p[0].map((c) => [c[1],c[0]])));
    });
    return [outer, ...holes];
  }, []);

  const activeFeatureCollections = useMemo(() => {
    return activeCategoryKeys.filter((k) => layersData[k]?.features).map((k) => {
      const allPoints = layersData[k].features.filter((f) => getFeatureCenter(f));
      const pointFeatures = selectedDistrict
        ? allPoints.filter((f) => featureInDistrict(f, selectedDistrict))
        : allPoints;
      return {
        key: k,
        color: CATEGORIES[k].color,
        label: CATEGORIES[k].label,
        pointFeatures:  limitRenderedFeatures(pointFeatures, k),
        fullPointCount: pointFeatures.length,
        shapeFeatures:  layersData[k].features.filter((f) => f.geometry?.type !== 'Point').slice(0, 120),
      };
    });
  }, [activeCategoryKeys, layersData, selectedDistrict]);

  const handleDistrictSelect = (district) => {
    if (selectedDistrict?.key === district.key) {
      setSelectedDistrict(null);
      setFlyTarget(apCenter);
    } else {
      setSelectedDistrict(district);
      setFlyTarget(district.center);
    }
  };

  const handleLayerToggle  = (key) => setActiveLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  const handleOverlayToggle = (key) => setMapOverlays((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleLiveOSMSync = async (e, key) => {
    e.stopPropagation();
    const cat = CATEGORIES[key];
    setSyncingLayers((prev) => ({ ...prev, [key]:true }));
    const query = `[out:json][timeout:35];area["name"="Andhra Pradesh"]["boundary"="administrative"]->.ap;nwr[${cat.osm}](area.ap);out center;`;
    try {
      const res  = await fetch('https://overpass-api.de/api/interpreter', { method:'POST', body:query });
      if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);
      const data = await res.json();
      const liveFeatures = (data.elements||[]).map((el) => ({
        type:'Feature',
        geometry:{ type:'Point', coordinates:[el.lon||el.center?.lon, el.lat||el.center?.lat] },
        properties:el.tags||{},
      })).filter((f) => f.geometry.coordinates[0] && f.geometry.coordinates[1]);
      setLayersData((prev) => ({ ...prev, [key]:{ type:'FeatureCollection', features:liveFeatures } }));
      setActiveLayers((prev) => ({ ...prev, [key]:true }));
      setToast(`${cat.label} synced from OpenStreetMap`);
    } catch (error) {
      console.error(`Live sync failed for ${cat.label}:`, error);
      setToast(`Live sync failed for ${cat.label}`);
    } finally {
      setSyncingLayers((prev) => ({ ...prev, [key]:false }));
    }
  };

  const handleDownloadLayer = async (e, key, format) => {
    e.stopPropagation();
    const cat = CATEGORIES[key];
    try {
      const data     = layersData[key] || (await loadLayer(key));
      const features = (data.features||[]).map((f) => normalizeFeatureForExport(f, key));
      const base     = safeFileName(cat.label);
      if (format === 'csv') downloadBlob(geoJsonToCsv(features, cat.label), `${base}.csv`, 'text/csv;charset=utf-8');
      else downloadBlob(JSON.stringify({ type:'FeatureCollection', features }, null, 2), `${base}.geojson`, 'application/geo+json');
      setToast(`${cat.label} ${format.toUpperCase()} exported`);
    } catch (error) {
      console.error(`Export failed for ${cat.label}`, error);
      setToast(`Unable to export ${cat.label}`);
    }
  };

  const handleExportActive = (format) => {
    const features = activeCategoryKeys.flatMap((k) => {
      const col = layersData[k];
      if (!col?.features) return [];
      return col.features.map((f) => normalizeFeatureForExport(f, k));
    });
    if (!features.length) { setToast('No loaded active layers to export yet'); return; }
    if (format === 'csv') downloadBlob(geoJsonToCsv(features, 'Active Layers'), 'andhra_pradesh_active_layers.csv', 'text/csv;charset=utf-8');
    else downloadBlob(JSON.stringify({ type:'FeatureCollection', features }, null, 2), 'andhra_pradesh_active_layers.geojson', 'application/geo+json');
    setToast(`Active layers exported as ${format.toUpperCase()}`);
  };

  return (
    <main className="ap-dashboard">

      <section className="dashboard-shell">

        {/* â”€â”€ LEFT SIDEBAR â”€â”€ */}
        <aside className="intro-panel" aria-label="Andhra Pradesh GIS overview">
          <div className="intro-inner">

            <div className="brand-lockup">
              <span className="brand-icon"><Icon name="map" size={20} /></span>
              <div>
                <p className="eyebrow">Andhra Pradesh GIS</p>
                <p className="brand-subtitle">Spatial intelligence dashboard</p>
              </div>
            </div>

            <div className="hero-copy">
              <h1>Explore<br/>Andhra Pradesh.<span>Visualize Everything.</span></h1>
              <p>An open-source, full-stack GIS dashboard that visualizes thousands of real-world Points of Interest across Andhra Pradesh using <em className="osm-link">OpenStreetMap</em> data.</p>
            </div>

            <div className="feature-grid">
              {FEATURE_CARDS.map((card) => (
                <article className="feature-card" key={card.title}>
                  <span className="feature-icon"><Icon name={card.icon} size={16} /></span>
                  <div>
                    <h2>{card.title}</h2>
                    <p>{card.text}</p>
                  </div>
                </article>
              ))}
            </div>

            <div className="live-card">
              <span className="pulse-mark" />
              <div>
                <strong>Live data ready</strong>
                <p>{loadedLayerCount} of {activeCategoryKeys.length} active layers loaded Â· {totalRenderedPoints.toLocaleString()} features rendered</p>
              </div>
            </div>

            <div className="sidebar-stats-row">
              <div className="stat-cell"><span>{activeCategoryKeys.length}</span><p>Active Layers</p></div>
              <div className="stat-cell"><span>{totalRenderedPoints.toLocaleString()}</span><p>Total Features</p></div>
              <div className="stat-cell"><span>{CATEGORY_KEYS.length}+</span><p>Data Categories</p></div>
              <div className="stat-cell"><span>Real-time</span><p>Live Updates</p></div>
            </div>

          </div>
        </aside>

        {/* â”€â”€ MAP â”€â”€ */}
        <section className="map-stage" aria-label="Interactive Andhra Pradesh map">
          <div className="map-frame">

            <PlaceSearch onSelect={setFlyTarget} />

            <MapContainer
              center={apCenter} zoom={7.1} zoomSnap={0.1}
              minZoom={6} maxZoom={16}
              maxBounds={andhraBounds} maxBoundsViscosity={1}
              zoomControl={false} preferCanvas className="leaflet-map"
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
              />
              <ZoomControl position="bottomright" />
              <FlyToLocation target={flyTarget} />

              {/* India neighboring state subtle fills â€” always visible */}
              <GeoJSON
                data={INDIA_STATE_FILLS}
                style={(feature) => ({
                  fillColor:    feature.properties.color,
                  fillOpacity:  0.05,
                  color:        feature.properties.color,
                  weight:       0.8,
                  opacity:      0.18,
                })}
                interactive={false}
              />

              {mapOverlays.stateMask && maskPositions && (
                <Polygon
                  positions={maskPositions}
                  pathOptions={{ fillColor:'#01060a', fillOpacity:0.44, color:'transparent', weight:0 }}
                  interactive={false}
                />
              )}

              {mapOverlays.corridors && (
                <>
                  <GeoJSON data={CONTEXT_NETWORK_LINES} className="context-network"
                    style={(feature) => ({
                      color:     feature.properties.name.includes('Bay') ? THEME.cyan : THEME.blue,
                      weight:    1,
                      opacity:   0.26,
                      dashArray: '2 10',
                    })}
                    interactive={false}
                  />
                  {CONTEXT_LABELS.map((label) => (
                    <CircleMarker
                      key={label.name}
                      center={label.position}
                      radius={0}
                      pathOptions={{ opacity: 0, fillOpacity: 0 }}
                      interactive={false}
                    >
                      <Tooltip permanent direction="center" opacity={1} className="context-label-tooltip">
                        <span className="context-label" style={{ '--context-color': label.tone, '--context-rgb': hexToRgb(label.tone) }}>
                          {label.name}
                        </span>
                      </Tooltip>
                    </CircleMarker>
                  ))}
                </>
              )}

              {mapOverlays.corridors && (
                <>
                  <GeoJSON data={AP_DISTRICT_LINES} className="detail-network"
                    style={(feature) => ({
                      color:     feature.properties.name.includes('River') || feature.properties.name.includes('Basin') || feature.properties.name.includes('Irrigation') ? THEME.cyan : THEME.mint,
                      weight:    1.25,
                      opacity:   0.46,
                      dashArray: feature.properties.name.includes('River') || feature.properties.name.includes('Basin') ? '1 6' : '4 7',
                    })}
                    interactive={false}
                  />
                  <GeoJSON data={CITY_CONNECTIONS} className="city-network"
                    style={() => ({ color:THEME.amber, weight:1.4, opacity:0.58, dashArray:'3 7' })}
                    interactive={false}
                  />
                  <GeoJSON data={AP_ROUTING_NETWORK} className="route-network"
                    style={() => ({ color:THEME.green, weight:1.4, opacity:0.44, dashArray:'6 8' })}
                    interactive={false}
                  />
                </>
              )}

              {mapOverlays.coastline && (
                <Polyline positions={COASTAL_SPINE} className="coastal-spine"
                  pathOptions={{ color:THEME.cyan, weight:2.4, opacity:0.7, dashArray:'2 7' }}
                  interactive={false}
                />
              )}

              {mapOverlays.boundary && (
                <GeoJSON data={apBoundary} className="ap-boundary"
                  style={() => ({ fillColor:'transparent', fillOpacity:0, color:THEME.green, weight:2.5, opacity:0.92 })}
                  interactive={false}
                />
              )}

              {mapOverlays.cityLabels && CITY_NODES.map((city) => (
                <CircleMarker
                  key={city.name}
                  center={city.position}
                  radius={0}
                  pane="markerPane"
                  pathOptions={{ opacity: 0, fillOpacity: 0, interactive: false }}
                  interactive={false}
                >
                  <Tooltip permanent direction="right" offset={[8, 0]} opacity={1} className="city-label-tooltip">
                    <span className="city-label" style={{ '--city-neon': city.neonColor, '--city-rgb': hexToRgb(city.neonColor) }}>
                      <i />
                      <span>{city.name.toUpperCase()}</span>
                    </span>
                  </Tooltip>
                </CircleMarker>
              ))}

              {activeFeatureCollections.map((col) => (
                <React.Fragment key={col.key}>
                  {col.shapeFeatures.length > 0 && (
                    <GeoJSON
                      key={`${col.key}-shapes-${col.shapeFeatures.length}`}
                      data={{ type:'FeatureCollection', features:col.shapeFeatures }}
                      style={() => ({ color:col.color, weight:1, opacity:0.3, fillColor:col.color, fillOpacity:0.07 })}
                    />
                  )}
                  {col.pointFeatures.map((feature, idx) => {
                    const center = getFeatureCenter(feature);
                    if (!center) return null;
                    const [lng, lat] = center;
                    if (!lat || !lng) return null;
                    return (
                      <CircleMarker
                        key={`${col.key}-${idx}`}
                        center={[lat,lng]}
                        radius={2.6}
                        pathOptions={{
                          color: col.color,
                          fillColor: col.color,
                          fillOpacity: 0.82,
                          opacity: 0.9,
                          weight: 1,
                        }}
                      >
                        <Popup>
                          <div className="popup-content" style={{ '--popup-color':col.color }}>
                            <span className="popup-kicker">{col.label}</span>
                            <strong>{getFeatureName(feature, `${col.label} node`)}</strong>
                            {feature.properties && (
                              <div className="popup-fields">
                                {Object.entries(feature.properties).filter(([k]) => k !== 'name').slice(0,9).map(([k,v]) => (
                                  <div key={k}><span>{k.replace(/_/g,' ')}</span><b>{String(v)}</b></div>
                                ))}
                              </div>
                            )}
                          </div>
                        </Popup>
                      </CircleMarker>
                    );
                  })}
                </React.Fragment>
              ))}
            </MapContainer>

            <div className="ocean-label-map" aria-hidden="true">Bay of Bengal</div>

            {/* Beach icon â€” sits on map frame outside MapContainer */}
            <div className="beach-corner-icon" aria-hidden="true">
              <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="16" cy="10" r="4.5" stroke="#fbbf24" strokeWidth="1.5" opacity="0.9"/>
                <line x1="16" y1="14.5" x2="16" y2="20" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="2 2" opacity="0.7"/>
                <path d="M4 22c3.5-3 6.5-3 9 0s5.5 3 9 0 5 3 6 0" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.85"/>
                <path d="M4 26c3.5-3 6.5-3 9 0s5.5 3 9 0 5 3 6 0" stroke="#22d3ee" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.5"/>
                <path d="M11 20 Q14 14 16 14.5" stroke="#36e37f" strokeWidth="1.2" fill="none" opacity="0.6" strokeDasharray="1.5 2"/>
              </svg>
            </div>

            <div className="map-metrics-bar" aria-label="Map metrics">
              <div><span>{activeCategoryKeys.length}</span><p>Active Layers</p></div>
              <div><span>{totalRenderedPoints.toLocaleString()}</span><p>Total Features</p></div>
              <div><span>{CATEGORY_KEYS.length}+</span><p>Data Categories</p></div>
              <div><span>{activeOverlayCount}</span><p>Map Overlays</p></div>
            </div>

          </div>
        </section>

        {/* â”€â”€ RIGHT SIDEBAR â”€â”€ */}
        <aside className="control-panel" aria-label="Layer controls">
          <div className="control-inner">

            <div className="control-heading">
              <div>
                <p className="eyebrow">Layer control</p>
                <h2>AP data stack</h2>
              </div>
              <span className="control-badge">{CATEGORY_KEYS.length + OVERLAY_LAYERS.length} layers</span>
            </div>

            <label className="search-box">
              <Icon name="search" size={16} />
              <input type="search" placeholder="Search layers, groups..."
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery('')} title="Clear">
                  <Icon name="close" size={14} />
                </button>
              )}
            </label>

            <div className="quick-stats">
              <div>
                <Icon name="layers" size={18} />
                <span>{activeCategoryKeys.length}</span>
                <p>Active Layers</p>
              </div>
              <div>
                <Icon name="pin" size={18} />
                <span>{totalRenderedPoints.toLocaleString()}</span>
                <p>Features</p>
              </div>
            </div>

            {/* â”€â”€ District Filter â”€â”€ */}
            <div className="district-section">
              <div className="district-header">
                <div>
                  <p className="eyebrow" style={{ marginBottom:2 }}>Filter by District</p>
                  <h3 className="district-title">13 Districts</h3>
                </div>
                {selectedDistrict && (
                  <button type="button" className="district-clear-btn"
                    onClick={() => { setSelectedDistrict(null); setFlyTarget(apCenter); }}>
                    Clear
                  </button>
                )}
              </div>

              {selectedDistrict && (
                <div className="district-active-card">
                  <span className="district-active-dot" />
                  <div>
                    <strong>{selectedDistrict.label}</strong>
                    <p>Map zoomed to district Â· POIs filtered</p>
                  </div>
                </div>
              )}

              <div className="district-grid">
                {(showAllDistricts ? AP_DISTRICTS : AP_DISTRICTS.slice(0, 4)).map((d) => {
                  const isOn = selectedDistrict?.key === d.key;
                  return (
                    <button key={d.key} type="button"
                      className={`district-btn${isOn ? ' is-active' : ''}`}
                      onClick={() => handleDistrictSelect(d)}>
                      {isOn && <span className="district-btn-dot" />}
                      {d.label}
                    </button>
                  );
                })}
              </div>

              {!showAllDistricts ? (
                <button type="button" className="expand-row"
                  onClick={() => setShowAllDistricts(true)}>
                  + {AP_DISTRICTS.length - 4} more districts
                </button>
              ) : (
                <button type="button" className="expand-row"
                  onClick={() => setShowAllDistricts(false)}>
                  Compact
                </button>
              )}
            </div>

            <div className="layer-section-header">
              <h3>Data categories</h3>
              <button type="button" className="show-all-btn" onClick={() => setShowAllLayers((v) => !v)}>
                {showAllLayers || searchQuery ? 'Compact' : 'Show all'}
                <Icon name="chevron" size={12} />
              </button>
            </div>

            <div className="layer-list">
              {visibleCategoryKeys.map((key) => {
                const cat       = CATEGORIES[key];
                const active    = !!activeLayers[key];
                const isLoading = !!loadingLayers[key];
                const isSyncing = !!syncingLayers[key];
                const isLoaded  = !!layersData[key];
                const hasError  = !!layerErrors[key];
                const count     = layerCounts[key];

                // status dot class: loading â†’ pulsing green, loaded â†’ solid green, error â†’ red, idle â†’ dim
                const statusClass = isLoading
                  ? 'layer-status-dot is-loading'
                  : isLoaded
                    ? 'layer-status-dot is-ready'
                    : hasError
                      ? 'layer-status-dot is-error'
                      : 'layer-status-dot';

                return (
                  <article key={key} className={`layer-row${active ? ' is-active' : ''}`}
                    style={{ '--layer-color':cat.color, '--layer-rgb':hexToRgb(cat.color) }}>
                    <button type="button" className="layer-main" onClick={() => handleLayerToggle(key)} aria-pressed={active}>
                      <span className="layer-swatch" />
                      <span>
                        <span className="layer-name-row">
                          <strong>{cat.label}</strong>
                          <span className={statusClass} title={isLoading ? 'Loadingâ€¦' : isLoaded ? 'Data ready' : hasError ? 'Load failed' : 'Not loaded'} />
                        </span>
                        <small>{cat.group} Â· {isLoading ? 'Loadingâ€¦' : `${count.toLocaleString()} features`}</small>
                      </span>
                    </button>
                    <div className="layer-actions">
                      <button type="button" className={`icon-action${isSyncing ? ' is-spinning' : ''}`}
                        title={`Sync ${cat.label} from OSM`}
                        onClick={(e) => handleLiveOSMSync(e, key)} disabled={isSyncing}>
                        <Icon name="refresh" size={13} />
                      </button>
                      <button type="button" className="text-action"
                        title={`Export ${cat.label} as CSV`}
                        onClick={(e) => handleDownloadLayer(e, key, 'csv')}>CSV</button>
                      <button type="button" className="icon-action"
                        title={`Export ${cat.label} as GeoJSON`}
                        onClick={(e) => handleDownloadLayer(e, key, 'geojson')}>
                        <Icon name="download" size={13} />
                      </button>
                      <button type="button" className={`toggle${active ? ' is-on' : ''}`}
                        aria-label={`Toggle ${cat.label}`} onClick={() => handleLayerToggle(key)} />
                    </div>
                    {hasError && <p className="layer-error">{layerErrors[key]}</p>}
                  </article>
                );
              })}
              {hiddenLayerCount > 0 && !searchQuery && (
                <button type="button" className="expand-row" onClick={() => setShowAllLayers(true)}>
                  + {hiddenLayerCount} more categories
                </button>
              )}
            </div>

            <div className="overlay-section">
              <div className="layer-section-header"><h3>Map overlays</h3></div>
              <div className="overlay-grid">
                {OVERLAY_LAYERS.map((ov) => {
                  const active = !!mapOverlays[ov.key];
                  return (
                    <button key={ov.key} type="button"
                      className={`overlay-pill${active ? ' is-active' : ''}`}
                      style={{ '--layer-color':ov.color, '--layer-rgb':hexToRgb(ov.color) }}
                      onClick={() => handleOverlayToggle(ov.key)} aria-pressed={active}>
                      <span />{ov.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="export-bar">
              <button type="button" onClick={() => handleExportActive('csv')}>
                <Icon name="export" size={14} />Export CSV
              </button>
              <button type="button" className="primary-export" onClick={() => handleExportActive('geojson')}>
                <Icon name="download" size={14} />Export GeoJSON
              </button>
            </div>

          </div>
        </aside>
      </section>

      {/* â”€â”€ FOOTER â”€â”€ */}
      <footer className="dashboard-footer">
        <div className="footer-main-row">

          <div className="pipeline">
            <p className="pipeline-label">Our data pipeline</p>
            <div className="pipeline-flow">
              {PIPELINE_STEPS.map((step, i) => (
                <React.Fragment key={step.label}>
                  <div className="pipeline-step">
                    <span><Icon name={step.icon} size={16} /></span>
                    <strong>{step.label}</strong>
                    <small>{step.sub}</small>
                  </div>
                  {i < PIPELINE_STEPS.length - 1 && <i className="pipeline-link" />}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* â”€â”€ Footer identity: beach scene + "Made with â™¥" â”€â”€ */}
          <div className="footer-identity">
            <div className="footer-map-thumb" aria-hidden="true">
              {/* Beach scene SVG â€” AP coastal card */}
              <svg viewBox="0 0 60 76" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#061828" stopOpacity="1"/>
                    <stop offset="100%" stopColor="#0a2236" stopOpacity="1"/>
                  </linearGradient>
                  <linearGradient id="seaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0e3a52" stopOpacity="1"/>
                    <stop offset="100%" stopColor="#061828" stopOpacity="1"/>
                  </linearGradient>
                  <radialGradient id="sunGlow" cx="75%" cy="18%" r="30%">
                    <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.55"/>
                    <stop offset="100%" stopColor="#fbbf24" stopOpacity="0"/>
                  </radialGradient>
                  <filter id="beachGlow">
                    <feGaussianBlur stdDeviation="1.2" result="blur"/>
                    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                  </filter>
                </defs>

                {/* Sky */}
                <rect width="60" height="76" fill="url(#skyGrad)" rx="6"/>
                {/* Sun glow halo */}
                <rect width="60" height="76" fill="url(#sunGlow)" rx="6"/>

                {/* Stars */}
                <circle cx="10" cy="8"  r="0.6" fill="#fff" opacity="0.5"/>
                <circle cx="22" cy="5"  r="0.5" fill="#fff" opacity="0.4"/>
                <circle cx="34" cy="10" r="0.5" fill="#fff" opacity="0.35"/>
                <circle cx="14" cy="16" r="0.4" fill="#fff" opacity="0.3"/>
                <circle cx="28" cy="14" r="0.4" fill="#fff" opacity="0.3"/>

                {/* Sun */}
                <circle cx="45" cy="14" r="5" fill="#fbbf24" opacity="0.88" filter="url(#beachGlow)"/>
                <line x1="45" y1="6"  x2="45" y2="4"  stroke="#fbbf24" strokeWidth="1.1" opacity="0.55"/>
                <line x1="45" y1="24" x2="45" y2="22" stroke="#fbbf24" strokeWidth="1.1" opacity="0.55"/>
                <line x1="37" y1="14" x2="35" y2="14" stroke="#fbbf24" strokeWidth="1.1" opacity="0.55"/>
                <line x1="55" y1="14" x2="53" y2="14" stroke="#fbbf24" strokeWidth="1.1" opacity="0.55"/>
                <line x1="39.3" y1="8.3"  x2="38" y2="7"   stroke="#fbbf24" strokeWidth="1" opacity="0.4"/>
                <line x1="50.7" y1="19.7" x2="52" y2="21"  stroke="#fbbf24" strokeWidth="1" opacity="0.4"/>
                <line x1="50.7" y1="8.3"  x2="52" y2="7"   stroke="#fbbf24" strokeWidth="1" opacity="0.4"/>
                <line x1="39.3" y1="19.7" x2="38" y2="21"  stroke="#fbbf24" strokeWidth="1" opacity="0.4"/>

                {/* Lighthouse tower */}
                <rect x="17" y="26" width="8" height="28" rx="1" fill="#0e2840" stroke="#22d3ee" strokeWidth="0.6" opacity="0.9"/>
                {/* Lighthouse stripes */}
                <rect x="17" y="32" width="8" height="3"  fill="#22d3ee" opacity="0.18"/>
                <rect x="17" y="40" width="8" height="3"  fill="#22d3ee" opacity="0.18"/>
                <rect x="17" y="48" width="8" height="3"  fill="#22d3ee" opacity="0.18"/>
                {/* Lighthouse top cap */}
                <rect x="15" y="22" width="12" height="5" rx="1" fill="#0d2236" stroke="#22d3ee" strokeWidth="0.7" opacity="0.95"/>
                {/* Lighthouse light */}
                <circle cx="21" cy="24.5" r="2.2" fill="#fbbf24" opacity="0.9" filter="url(#beachGlow)"/>
                <circle cx="21" cy="24.5" r="3.5" fill="#fbbf24" opacity="0.18"/>
                {/* Lighthouse base */}
                <rect x="14" y="54" width="14" height="4" rx="1" fill="#0d2236" stroke="#22d3ee" strokeWidth="0.5" opacity="0.8"/>

                {/* Palm tree */}
                <line x1="8" y1="58" x2="11" y2="34" stroke="#36e37f" strokeWidth="1.4" strokeLinecap="round" opacity="0.75"/>
                {/* Palm fronds */}
                <path d="M11 34 Q5 29 3 32" stroke="#36e37f" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.7"/>
                <path d="M11 34 Q8 27 12 25" stroke="#36e37f" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.65"/>
                <path d="M11 34 Q15 28 18 30" stroke="#36e37f" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.6"/>
                <path d="M11 34 Q14 32 17 36" stroke="#36e37f" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.5"/>

                {/* Sea */}
                <rect x="0" y="58" width="60" height="18" fill="url(#seaGrad)" rx="0"/>
                {/* Wave 1 */}
                <path d="M0 61 Q7 58 15 61 Q23 64 30 61 Q37 58 45 61 Q53 64 60 61" stroke="#22d3ee" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.75"/>
                {/* Wave 2 */}
                <path d="M0 66 Q7 63 15 66 Q23 69 30 66 Q37 63 45 66 Q53 69 60 66" stroke="#22d3ee" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.45"/>
                {/* Wave 3 */}
                <path d="M0 71 Q8 68 16 71 Q24 74 32 71 Q40 68 48 71 Q55 73 60 71" stroke="#64f4b5" strokeWidth="0.8" strokeLinecap="round" fill="none" opacity="0.3"/>

                {/* Coastal glow line */}
                <line x1="0" y1="58" x2="60" y2="58" stroke="#22d3ee" strokeWidth="0.8" opacity="0.38"/>
              </svg>
            </div>
            <div className="footer-content">
              <div className="footer-built-row">
                <span className="footer-heart">â™¥</span>
                <div>
                  <strong>Made with â™¥ for Andhra Pradesh</strong>
                  <p>Open source Â· Community driven Â· OSM powered</p>
                </div>
              </div>
            </div>
          </div>

        </div>

        <div className="footer-tech-bar">
          <span className="footer-tech-label">Built with modern technologies</span>
          {[
            { label: 'React',        icon: 'refresh' },
            { label: 'Leaflet',      icon: 'map' },
            { label: 'Overpass API', icon: 'code' },
            { label: 'OpenStreetMap',icon: 'nodes' },
            { label: 'GeoJSON',      icon: 'database' },
            { label: 'Node.js',      icon: 'dashboard' },
          ].map(({ label, icon }) => (
            <span key={label} className="tech-tag">
              <Icon name={icon} size={10} />{label}
            </span>
          ))}
        </div>
      </footer>

      {toast && <div className="toast-message" role="status">{toast}</div>}
    </main>
  );
}

export default App;



