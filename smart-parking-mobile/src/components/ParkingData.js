// ============================================================
// DATOS DEL CAMPUS UTN FRC - Trazado preciso sobre mapa.png
// Coordenadas en % (top, left) donde 0,0 = esquina sup-izq
// ============================================================

export const MAP_WIDTH = 25;
export const MAP_HEIGHT = 25;

export const SECTOR_POSITIONS = {
    "sur - auditorio": { top: 75, left: 42.5 },
    "sur - ing. civil": { top: 72, left: 62 },
    "sur - a.v.e.t.": { top: 88, left: 38 },
    "inchaurrondo": { top: 43, left: 26 },
    "benito posetto": { top: 31, left: 31.5 },
    "biblioteca gallardo": { top: 22, left: 60 },
    "planta piloto": { top: 15, left: 56 },
    "edif. soro": { top: 78, left: 85 },
    "ing. sueldo": { top: 40, left: 76 },
};

export const CAMPUS_BOUNDS = {
    north: -31.4388,
    south: -31.4433,
    west: -64.1958,
    east: -64.1908,
};

export const CAMPUS_CENTER = {
    lat: (CAMPUS_BOUNDS.north + CAMPUS_BOUNDS.south) / 2,
    lng: (CAMPUS_BOUNDS.west + CAMPUS_BOUNDS.east) / 2,
};

export const toWorld = (top, left) => {
    const x = (left / 100) * MAP_WIDTH - (MAP_WIDTH / 2);
    const z = (top / 100) * MAP_HEIGHT - (MAP_HEIGHT / 2);
    return [x, z];
};

export const toMapPercent = (x, z) => ({
    left: Math.max(0, Math.min(100, ((x + MAP_WIDTH / 2) / MAP_WIDTH) * 100)),
    top: Math.max(0, Math.min(100, ((z + MAP_HEIGHT / 2) / MAP_HEIGHT) * 100)),
});

export const isWithinCampus = ({ lat, lng }) => (
    lat <= CAMPUS_BOUNDS.north &&
    lat >= CAMPUS_BOUNDS.south &&
    lng >= CAMPUS_BOUNDS.west &&
    lng <= CAMPUS_BOUNDS.east
);

export const getSectorLatLng = (nombre) => {
    const n = nombre.toLowerCase();
    for (const [key, val] of Object.entries(SECTOR_POSITIONS)) {
        if (n.includes(key)) {
            const lat = CAMPUS_BOUNDS.north + ((CAMPUS_BOUNDS.south - CAMPUS_BOUNDS.north) * val.top / 100);
            const lng = CAMPUS_BOUNDS.west + ((CAMPUS_BOUNDS.east - CAMPUS_BOUNDS.west) * val.left / 100);
            return { lat, lng };
        }
    }
    return CAMPUS_CENTER;
};

const distanceMeters = (a, b) => {
    const earthRadius = 6371000;
    const toRad = (v) => v * Math.PI / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * earthRadius * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

export const getNearestSectorFromLocation = (location, sectores) => {
    if (!location || !sectores.length) return null;

    return sectores
        .map((sector) => {
            const coords = getSectorLatLng(sector.nombre);
            return {
                sector,
                coords,
                distance: Math.round(distanceMeters(location, coords)),
            };
        })
        .sort((a, b) => a.distance - b.distance)[0];
};

export const getPosicion3D = (nombre) => {
    const n = nombre.toLowerCase();
    for (const [key, val] of Object.entries(SECTOR_POSITIONS)) {
        if (n.includes(key)) {
            const [x, z] = toWorld(val.top, val.left);
            return [x, 0.4, z];
        }
    }
    return [0, 0.4, 0];
};

export const getTrafficLevel = () => {
    const hour = new Date().getHours();
    if ((hour >= 7 && hour <= 9) || (hour >= 12 && hour <= 14) || (hour >= 17 && hour <= 19)) return 'ALTO';
    if ((hour >= 10 && hour <= 11) || (hour >= 15 && hour <= 16) || (hour >= 20 && hour <= 21)) return 'MEDIO';
    return 'BAJO';
};

export const getCarCount = () => {
    const level = getTrafficLevel();
    if (level === 'ALTO') return 45;
    if (level === 'MEDIO') return 30;
    return 15;
};

export const GRAPH_EDGES = [
    ["sur - auditorio", "sur - ing. civil"],
    ["sur - auditorio", "sur - a.v.e.t."],
    ["sur - ing. civil", "edif. soro"],
    ["inchaurrondo", "benito posetto"],
    ["benito posetto", "biblioteca gallardo"],
    ["biblioteca gallardo", "planta piloto"],
    ["biblioteca gallardo", "ing. sueldo"],
    ["ing. sueldo", "edif. soro"],
    ["inchaurrondo", "sur - a.v.e.t."],
    ["planta piloto", "ing. sueldo"],
];

// ============================================================
// CAPA 3D DEL CAMPUS
// Coordenadas en % del mapa. width/depth/height estan en unidades
// Three para que los volumenes calcen sobre la textura sin taparla.
// ============================================================

export const CAMPUS_BUILDINGS = [
    {
        id: 'auditorio',
        label: 'Auditorio',
        top: 63,
        left: 43,
        width: 4.2,
        depth: 2.4,
        height: 0.75,
        rot: -0.08,
        color: '#c79b74',
        roofColor: '#70432c',
    },
    {
        id: 'central',
        label: 'Edificio central',
        top: 48,
        left: 45,
        width: 5.4,
        depth: 2.3,
        height: 0.82,
        rot: 0.04,
        color: '#d7c0a5',
        roofColor: '#6d3f29',
    },
    {
        id: 'civil',
        label: 'Ing. Civil',
        top: 61,
        left: 61,
        width: 2.35,
        depth: 1.9,
        height: 0.65,
        rot: 0.02,
        color: '#bdcddd',
        roofColor: '#6f8ca0',
    },
    {
        id: 'sistemas',
        label: 'Inchaurrondo',
        top: 42,
        left: 25,
        width: 2.15,
        depth: 1.55,
        height: 0.72,
        rot: 0.12,
        color: '#e8f3f4',
        roofColor: '#9bb8c0',
    },
    {
        id: 'posetto',
        label: 'Benito Posetto',
        top: 32,
        left: 32,
        width: 2.35,
        depth: 1.35,
        height: 0.72,
        rot: -0.12,
        color: '#d0b25e',
        roofColor: '#7a5b23',
    },
    {
        id: 'biblioteca',
        label: 'Biblioteca Gallardo',
        top: 22,
        left: 59,
        width: 2.1,
        depth: 1.5,
        height: 0.78,
        rot: 0.05,
        color: '#9ed5b2',
        roofColor: '#43795a',
    },
    {
        id: 'planta-piloto',
        label: 'Planta piloto',
        top: 16,
        left: 56,
        width: 1.7,
        depth: 1.25,
        height: 0.7,
        rot: 0.08,
        color: '#d8c75c',
        roofColor: '#8e7c28',
    },
    {
        id: 'sueldo',
        label: 'Ing. Sueldo',
        top: 40,
        left: 76,
        width: 2.25,
        depth: 1.45,
        height: 0.72,
        rot: 0.05,
        color: '#d9b343',
        roofColor: '#8f7221',
    },
    {
        id: 'soro',
        label: 'Edificio Soro',
        top: 75,
        left: 85,
        width: 3.15,
        depth: 2.1,
        height: 0.9,
        rot: 0.05,
        color: '#f0d04f',
        roofColor: '#a07f22',
    },
    {
        id: 'avet',
        label: 'A.V.E.T.',
        top: 83,
        left: 37,
        width: 2.6,
        depth: 1.65,
        height: 0.62,
        rot: -0.08,
        color: '#e7c440',
        roofColor: '#8b6f21',
    },
];

export const CAMPUS_GREEN_AREAS = [
    { id: 'cancha-sur', top: 72, left: 44, width: 4.2, depth: 2.2, rot: -0.02, color: '#1a7658' },
    { id: 'patio-central', top: 54, left: 51, width: 3.4, depth: 2.4, rot: 0.02, color: '#397447' },
    { id: 'cancha-este', top: 57, left: 78, width: 4.1, depth: 2.1, rot: 0.03, color: '#287154' },
    { id: 'verde-norte', top: 28, left: 56, width: 5.4, depth: 1.5, rot: 0.04, color: '#3d7a4b' },
];

const treeRows = [
    { top: 89, left: 18, count: 10, stepTop: -0.45, stepLeft: 4.3, scale: 0.9 },
    { top: 80, left: 20, count: 9, stepTop: -2.3, stepLeft: 2.9, scale: 0.8 },
    { top: 68, left: 56, count: 7, stepTop: -1.1, stepLeft: 2.1, scale: 0.72 },
    { top: 46, left: 36, count: 8, stepTop: -1.2, stepLeft: 2.6, scale: 0.76 },
    { top: 52, left: 66, count: 8, stepTop: 1.2, stepLeft: 2.5, scale: 0.75 },
    { top: 78, left: 76, count: 9, stepTop: 1.2, stepLeft: 2.2, scale: 0.76 },
    { top: 23, left: 48, count: 8, stepTop: 1.0, stepLeft: 2.2, scale: 0.72 },
];

export const CAMPUS_TREES = treeRows.flatMap((row, rowIndex) =>
    Array.from({ length: row.count }, (_, index) => ({
        id: `tree-${rowIndex}-${index}`,
        top: row.top + row.stepTop * index,
        left: row.left + row.stepLeft * index,
        scale: row.scale + ((index + rowIndex) % 3) * 0.08,
    }))
);

// ============================================================
// RUTAS VEHICULARES - Trazadas sobre calles visibles
//
// Calles identificadas en el mapa:
// 1) Av. Cruz Roja Argentina = borde SUR (horizontal, ~top 95-98%)
// 2) Calle Maestro Marcelo Lopez = borde OESTE (diagonal, va
//    desde ~(top:95,left:2) hasta ~(top:8,left:12))
// 3) Calle interna ESTE = borde derecho del campus, la calle
//    que bordea el parking grande (~left:96-98%, top 12-95%)
// 4) Calle interna NORTE = borde superior del campus
//    (~top:8-10%, left:15-95%)
// 5) Acceso interno entre Lab.Civil/Soro y parking este
//    (~top:65%, left:68-95%) - calle que pasa entre edificios
// 6) Acceso rotonda sur-oeste (cerca A.V.E.T.)
// ============================================================

export const ROAD_ROUTES = [
    // RUTA 1: Av. Cruz Roja Argentina (ida, oeste→este, carril norte)
    // Recorre toda la Av. por abajo del campus
    [
        {top:94, left:2},  {top:94, left:10}, {top:94, left:20},
        {top:94, left:30}, {top:94, left:40}, {top:94, left:50},
        {top:94, left:60}, {top:94, left:70}, {top:94, left:80},
        {top:94, left:90}, {top:94, left:98},
        // Dobla y sube por calle este del campus
        {top:88, left:98}, {top:78, left:98}, {top:68, left:98},
        {top:55, left:98}, {top:42, left:98}, {top:30, left:98},
        {top:18, left:98}, {top:10, left:98},
        // Cruza por el borde norte del campus
        {top:8, left:90},  {top:8, left:78},  {top:8, left:65},
        {top:8, left:52},  {top:8, left:40},  {top:8, left:28},
        {top:8, left:18},
        // Baja por Calle Marcelo Lopez (diagonal)
        {top:15, left:15}, {top:25, left:13}, {top:35, left:11},
        {top:50, left:9},  {top:65, left:6},  {top:80, left:4},
        {top:90, left:3},
    ],

    // RUTA 2: Perimetral sentido contrario (este→oeste por Av. Cruz Roja)
    [
        {top:97, left:98}, {top:97, left:90}, {top:97, left:80},
        {top:97, left:70}, {top:97, left:60}, {top:97, left:50},
        {top:97, left:40}, {top:97, left:30}, {top:97, left:20},
        {top:97, left:10}, {top:97, left:2},
        // Sube por Marcelo Lopez (diagonal)
        {top:90, left:2},  {top:80, left:3},  {top:65, left:5},
        {top:50, left:8},  {top:35, left:10}, {top:25, left:12},
        {top:15, left:14},
        // Cruza por el norte
        {top:6, left:18},  {top:6, left:28},  {top:6, left:40},
        {top:6, left:52},  {top:6, left:65},  {top:6, left:78},
        {top:6, left:90},
        // Baja por el este
        {top:10, left:96}, {top:18, left:96}, {top:30, left:96},
        {top:42, left:96}, {top:55, left:96}, {top:68, left:96},
        {top:78, left:96}, {top:88, left:96},
    ],

    // RUTA 3: Acceso interno - entra por Av Cruz Roja, recorre
    // la calle interna entre Lab.Civil/Soro y el parking este,
    // sube por el parking y vuelve a salir
    [
        {top:94, left:58}, {top:90, left:58},
        // Sube por la calle entre Auditorio/Central y Lab.Civil
        {top:84, left:58}, {top:78, left:60}, {top:72, left:62},
        // Gira al este por la calle entre Lab.Civil y Soro
        {top:68, left:66}, {top:66, left:72}, {top:66, left:78},
        // Entra al sector de parking este
        {top:66, left:84}, {top:60, left:88}, {top:52, left:88},
        {top:44, left:88}, {top:36, left:88},
        // Sale del parking y baja por la calle este
        {top:36, left:94}, {top:44, left:96}, {top:55, left:96},
        {top:68, left:96}, {top:80, left:96}, {top:90, left:96},
        {top:94, left:92},
        // Vuelve al oeste por Av Cruz Roja
        {top:94, left:82}, {top:94, left:72}, {top:94, left:65},
    ],

    // RUTA 4: Acceso por Marcelo Lopez, entra por el acceso
    // lateral oeste, rodea por la rotonda del A.V.E.T. y sale
    [
        {top:80, left:4},  {top:82, left:8},
        // Entra al campus por el acceso lateral sur-oeste
        {top:85, left:14}, {top:88, left:20}, {top:90, left:28},
        // Rodea la rotonda del A.V.E.T.
        {top:92, left:32}, {top:90, left:36}, {top:88, left:32},
        {top:90, left:28},
        // Sale de vuelta a Marcelo Lopez
        {top:88, left:20}, {top:85, left:14}, {top:82, left:8},
        {top:80, left:4},  {top:75, left:5},  {top:70, left:6},
    ],
];

export const CAR_COLORS = [
    '#7a7a7a', '#4a4a4a', '#993322', '#334477', '#886633',
    '#555555', '#aa4422', '#2d5a8c',
];

const makeParkingRow = ({ id, top, left, count, stepTop = 0, stepLeft = 0, rot, startIndex = 0 }) =>
    Array.from({ length: count }, (_, index) => ({
        id: `${id}-${index}`,
        top: Number((top + stepTop * index).toFixed(2)),
        left: Number((left + stepLeft * index).toFixed(2)),
        rot,
        color: CAR_COLORS[(startIndex + index) % CAR_COLORS.length],
    }));

const makeParkingGrid = ({ id, rows, cols, top, left, rowStepTop, rowStepLeft = 0, colStepTop = 0, colStepLeft, rot, startIndex = 0 }) =>
    Array.from({ length: rows }).flatMap((_, row) =>
        makeParkingRow({
            id: `${id}-r${row}`,
            top: top + rowStepTop * row,
            left: left + rowStepLeft * row,
            count: cols,
            stepTop: colStepTop,
            stepLeft: colStepLeft,
            rot,
            startIndex: startIndex + row * cols,
        })
    );

// ============================================================
// AUTOS ESTACIONADOS — Posiciones en las playas reales
//
// Playas identificadas en el mapa:
// A) Playa SUR: franja de parking diagonal a lo largo de Av.
//    Cruz Roja, ~top:90-92%, left:22-58%
// B) Playa ESTE-NORTE: parking grande al noreste, con lineas
//    perpendiculares, ~top:14-35%, left:72-92%
// C) Playa ESTE-SUR: parking al sureste, debajo de Soro,
//    ~top:72-88%, left:80-95%
// D) Playa frente a Soro: pequeño parking, ~top:62-68%, left:90-95%
// ============================================================
export const PARKED_CARS = [
    // --- PLAYA SUR (diagonal, a lo largo de Av. Cruz Roja) ---
    {top:91, left:24, rot: 0.5, color:'#5a5a5a'},
    {top:91, left:27, rot: 0.5, color:'#8b4422'},
    {top:91, left:30, rot: 0.5, color:'#3a3a6a'},
    {top:91, left:34, rot: 0.5, color:'#6a6a6a'},
    {top:91, left:37, rot: 0.5, color:'#7a5533'},
    {top:91, left:41, rot: 0.5, color:'#4a4a4a'},
    {top:91, left:44, rot: 0.5, color:'#884433'},
    {top:91, left:48, rot: 0.5, color:'#3d5a80'},
    {top:91, left:51, rot: 0.5, color:'#5a5a5a'},
    {top:91, left:55, rot: 0.5, color:'#333333'},

    // --- PLAYA ESTE-NORTE (perpendicular, parking grande NE) ---
    // Fila 1
    {top:16, left:74, rot: Math.PI/2, color:'#555555'},
    {top:16, left:78, rot: Math.PI/2, color:'#8a3322'},
    {top:16, left:82, rot: Math.PI/2, color:'#3a5577'},
    {top:16, left:86, rot: Math.PI/2, color:'#6a6a6a'},
    {top:16, left:90, rot: Math.PI/2, color:'#7a5533'},
    // Fila 2
    {top:22, left:74, rot: Math.PI/2, color:'#4a4a4a'},
    {top:22, left:78, rot: Math.PI/2, color:'#774422'},
    {top:22, left:82, rot: Math.PI/2, color:'#444444'},
    {top:22, left:90, rot: Math.PI/2, color:'#335566'},
    // Fila 3
    {top:28, left:74, rot: Math.PI/2, color:'#5a5a5a'},
    {top:28, left:82, rot: Math.PI/2, color:'#664433'},
    {top:28, left:86, rot: Math.PI/2, color:'#3d5a80'},
    {top:28, left:90, rot: Math.PI/2, color:'#555555'},

    // --- PLAYA ESTE-SUR (debajo de Gimnasio Soro) ---
    {top:82, left:82, rot: Math.PI/2, color:'#4a4a4a'},
    {top:82, left:86, rot: Math.PI/2, color:'#7a4422'},
    {top:82, left:90, rot: Math.PI/2, color:'#555555'},
    {top:86, left:82, rot: Math.PI/2, color:'#3a5577'},
    {top:86, left:86, rot: Math.PI/2, color:'#666666'},
    {top:86, left:90, rot: Math.PI/2, color:'#884433'},

    // --- Parking frente a Soro (pequeño) ---
    {top:64, left:92, rot: 0, color:'#5a5a5a'},
    {top:64, left:95, rot: 0, color:'#444444'},
];

export const PARKED_CARS_ALIGNED = [
    ...makeParkingGrid({ id: 'sur-central', rows: 4, cols: 8, top: 83.7, left: 29, rowStepTop: 2.25, rowStepLeft: -1.2, colStepLeft: 3.25, rot: 0.5 }),
    ...makeParkingGrid({ id: 'este-norte', rows: 4, cols: 7, top: 14.8, left: 73.4, rowStepTop: 4.6, colStepLeft: 3.25, rot: Math.PI / 2, startIndex: 30 }),
    ...makeParkingGrid({ id: 'este-sur', rows: 3, cols: 6, top: 76.8, left: 78.5, rowStepTop: 4.1, colStepLeft: 3.15, rot: Math.PI / 2, startIndex: 62 }),
    ...makeParkingRow({ id: 'soro-frente', top: 63.5, left: 88.5, count: 4, stepLeft: 2.5, rot: 0, startIndex: 82 }),
    ...makeParkingRow({ id: 'avet', top: 86.8, left: 17.8, count: 5, stepLeft: 2.8, rot: 0.45, startIndex: 88 }),
];

export const getVisibleParkedCars = (parkedCars = PARKED_CARS_ALIGNED) => {
    return (parkedCars && parkedCars.length > 0) ? parkedCars : PARKED_CARS_ALIGNED;
};

export const createDefaultEditorState = () => ({
    buildings: [
        { id: 'central', label: 'Edificio Central', top: 50.7, left: 40.3, width: 4, depth: 5.1, height: 0.8, rot: -1.43, color: '#b78958', roofColor: '#4d2519' },
        { id: 'avet', label: 'A.V.E.T.', top: 78.6, left: 23.8, width: 2.4, depth: 1.6, height: 0.48, rot: -1.54, color: '#c3a16d', roofColor: '#55321f' },
        { id: 'civil', label: 'Ing. Civil', top: 53, left: 60.9, width: 3.3, depth: 1.5, height: 0.58, rot: 1.71, color: '#8fb2c4', roofColor: '#395c73' },
        { id: 'sueldo', label: 'Ing. Sueldo', top: 50, left: 77, width: 3.1, depth: 1.6, height: 0.75, rot: -1.47, color: '#b99d4a', roofColor: '#5d4a19' },
        { id: 'biblioteca', label: 'Biblioteca Gallardo', top: 12.6, left: 44.3, width: 2.4, depth: 1.6, height: 0.7, rot: -1.97, color: '#77b49b', roofColor: '#2d5e47' },
        { id: 'pasillo-norte', label: 'Edificio Norte', top: 26.4, left: 51.4, width: 3.9, depth: 1.3, height: 0.55, rot: -0.44, color: '#a7b06b', roofColor: '#4f5a2d' },
        { id: 'posetto', label: 'Benito Posetto', top: 28.7, left: 36.5, width: 2.4, depth: 1.6, height: 0.75, rot: -2.04, color: '#c1a14d', roofColor: '#5d431b' },
    ],
    greenAreas: CAMPUS_GREEN_AREAS.map((item) => ({ ...item })),
    trees: CAMPUS_TREES.map((item) => ({ ...item })),
    roadRoutes: ROAD_ROUTES.map((route) => route.map((point) => ({ ...point }))),
    parkedCars: [],
    driveZones: [
        { id: 'drive-east-parking', top: 23, left: 82, width: 8.2, depth: 8.6, rot: 0.02, color: '#26d98f' },
        { id: 'drive-south-access', top: 88, left: 61, width: 18, depth: 2.2, rot: 0.04, color: '#26d98f' },
    ],
    blockedZones: [
        { id: 'blocked-central', top: 50.7, left: 40.3, width: 4.7, depth: 5.7, rot: -1.43, color: '#ff4d5e' },
        { id: 'blocked-avet', top: 78.6, left: 23.8, width: 2.8, depth: 2, rot: -1.54, color: '#ff4d5e' },
        { id: 'blocked-civil', top: 53, left: 60.9, width: 3.8, depth: 1.9, rot: 1.71, color: '#ff4d5e' },
        { id: 'blocked-sueldo', top: 50, left: 77, width: 3.6, depth: 2, rot: -1.47, color: '#ff4d5e' },
        { id: 'blocked-biblio', top: 12.6, left: 44.3, width: 2.9, depth: 2, rot: -1.97, color: '#ff4d5e' },
        { id: 'blocked-norte', top: 26.4, left: 51.4, width: 4.5, depth: 1.7, rot: -0.44, color: '#ff4d5e' },
        { id: 'blocked-posetto', top: 28.7, left: 36.5, width: 2.8, depth: 2, rot: -2.04, color: '#ff4d5e' },
        { id: 'blocked-map-west', top: 52, left: 4, width: 5, depth: 72, rot: 0, color: '#ff4d5e' },
        { id: 'blocked-map-east', top: 52, left: 98, width: 4, depth: 72, rot: 0, color: '#ff4d5e' },
    ],
    sectorNodes: Object.entries(SECTOR_POSITIONS).map(([id, pos]) => ({ id, label: id, height: 0.4, ...pos })),
});
