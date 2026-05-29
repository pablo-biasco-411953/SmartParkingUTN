import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { useNavigate } from 'react-router-dom';
import api, { activarMapa, crearMapaVacio, getMapas, getRecomendacion, saveMapa } from '../services/api';
import { ParkingMap3D } from '../components/ParkingMap3D';
import {
    createBlankEditorState,
    createDefaultEditorState,
    getNearestSectorFromLocation,
    isWithinCampus,
} from '../components/ParkingData';
import { TexturePicker } from '../components/TexturePicker';
import { Neo4jConsole } from '../components/Neo4jConsole';

const EDITOR_STORAGE_KEY = 'smartParkingEditorState';
const MAP_LAYOUT_STORAGE_KEY = 'smartParkingActiveMapId';
const DEFAULT_MAP_NAME = 'UTN FRC - Campus 3D';
const DEFAULT_TEXTURE_URL = '/mapa-texture.jpg';

const EDITOR_TOOLS = [
    { key: 'move', label: 'Mover' },
    { key: 'building', label: 'Edificio' },
    { key: 'tree', label: 'Arbol' },
    { key: 'parkedCar', label: 'Auto' },
    { key: 'routePoint', label: 'Ruta' },
    { key: 'driveZone', label: 'Manejar' },
    { key: 'blockedZone', label: 'Bloquear' },
];

const EDITABLE_GROUPS = [
    { key: 'buildings', label: 'Edificios' },
    { key: 'greenAreas', label: 'Verdes' },
    { key: 'trees', label: 'Arboles' },
    { key: 'parkedCars', label: 'Autos' },
    { key: 'driveZones', label: 'Zonas manejo' },
    { key: 'blockedZones', label: 'Zonas bloqueadas' },
    { key: 'sectorNodes', label: 'Nodos' },
];

const loadEditorState = () => {
    const defaults = createDefaultEditorState();
    try {
        const saved = localStorage.getItem(EDITOR_STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            return {
                ...defaults,
                ...parsed,
                buildings: parsed.buildings || [],
                parkedCars: parsed.parkedCars || [],
                blockedZones: parsed.blockedZones || [],
                roadRoutes: parsed.roadRoutes || [],
                sectorNodes: parsed.sectorNodes || [],
            };
        }
    } catch (error) {
        console.warn('Editor state invalido, usando defaults', error);
    }
    return defaults;
};

const EDIFICIOS = [
    'Edificio Sistemas',
    'Edificio Civil',
    'Edificio Sur',
    'Biblioteca Gallardo',
    'Edificio Soro',
    'Edificio Ing. Sueldo',
    'Edificio Benito Posetto',
];

const getTrafficInfo = () => {
    const hour = new Date().getHours();
    if ((hour >= 7 && hour <= 9) || (hour >= 12 && hour <= 14) || (hour >= 17 && hour <= 19)) {
        return { color: '#ff4d5e', label: 'Hora pico', desc: 'Alto volumen de vehiculos' };
    }
    if ((hour >= 10 && hour <= 11) || (hour >= 15 && hour <= 16) || (hour >= 20 && hour <= 21)) {
        return { color: '#f7b733', label: 'Moderado', desc: 'Transito medio' };
    }
    return { color: '#27e98a', label: 'Fluido', desc: 'Buena disponibilidad' };
};

const parseRemoteLayout = (layoutJson) => {
    const parsed = layoutJson ? JSON.parse(layoutJson) : {};
    const isBlank = ['buildings', 'greenAreas', 'trees', 'parkedCars', 'driveZones', 'blockedZones', 'sectorNodes']
        .every((key) => Array.isArray(parsed[key]) && parsed[key].length === 0);
    const base = isBlank ? createBlankEditorState() : createDefaultEditorState();
    return {
        ...base,
        ...parsed,
        roadRoutes: parsed.roadRoutes?.length ? parsed.roadRoutes : base.roadRoutes,
    };
};

const MapaPage = () => {
    const [sectores, setSectores] = useState([]);
    const [mensaje, setMensaje] = useState('');
    const [destinos, setDestinos] = useState(EDIFICIOS);
    const [edificioSeleccionado, setEdificioSeleccionado] = useState(EDIFICIOS[0]);
    const [recommendedSectorId, setRecommendedSectorId] = useState(null);
    const [isSubiendoHorario, setIsSubiendoHorario] = useState(false);
    const [horarioResult, setHorarioResult] = useState('');
    const [ubicacion, setUbicacion] = useState(null);
    const [nearestSector, setNearestSector] = useState(null);
    const [estado, setEstado] = useState(null);
    const [metricas, setMetricas] = useState(null);
    const [historial, setHistorial] = useState([]);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [editorMode, setEditorMode] = useState(false);
    const [editorTool, setEditorTool] = useState('building');
    const [editorState, setEditorState] = useState(loadEditorState);
    const editorStateRef = useRef(editorState);
    const [mapLayouts, setMapLayouts] = useState([]);
    const [activeMapId, setActiveMapId] = useState(localStorage.getItem(MAP_LAYOUT_STORAGE_KEY) || '');
    const [activeMapName, setActiveMapName] = useState(DEFAULT_MAP_NAME);
    const [activeTextureUrl, setActiveTextureUrl] = useState(DEFAULT_TEXTURE_URL);
    const [isSavingMap, setIsSavingMap] = useState(false);
    const [activeRouteIndex, setActiveRouteIndex] = useState(0);
    const [selectedEditorItem, setSelectedEditorItem] = useState({ group: 'buildings', index: 0 });
    const [showLabels, setShowLabels] = useState(true);
    const [mostrarAutos, setMostrarAutos] = useState('reducido');
    const [collapsedPanels, setCollapsedPanels] = useState({ neo4j: false, gps: false, cassandra: false });
    const [showTexturePicker, setShowTexturePicker] = useState(false);
    const [pendingNewMapData, setPendingNewMapData] = useState(null);
    const [showDbConsole, setShowDbConsole] = useState(false);
    const navigate = useNavigate();

    const legajo = localStorage.getItem('legajo');
    const traffic = getTrafficInfo();

    useEffect(() => {
        editorStateRef.current = editorState;
    }, [editorState]);

    const cargarSectores = useCallback(async () => {
        try {
            const res = await api.get(`/sectores?mapaId=${activeMapId || 'DEFAULT'}`);
            const data = res.data || [];
            setSectores(data);
            
            // Auto-sync new AI-generated sectors into the 3D map editor layout
            setEditorState((prev) => {
                const currentNodes = prev.sectorNodes || [];
                const newNodes = [...currentNodes];
                let changed = false;
                let aiPosiciones = {};
                try {
                    aiPosiciones = JSON.parse(localStorage.getItem('ai_posiciones') || '{}');
                } catch (e) {}
                
                data.forEach((s) => {
                    const sectorName = String(s.nombre || s.id || '').toLowerCase();
                    const exists = currentNodes.some((n) => {
                        const nid = String(n.id || '').toLowerCase();
                        return sectorName.includes(nid) || nid.includes(sectorName);
                    });
                    
                    if (!exists) {
                        const pos = aiPosiciones[s.id];
                        newNodes.push({
                            id: sectorName,
                            label: s.nombre,
                            top: pos?.top || (48 + Math.random() * 8), // suggested or slight random offset near center
                            left: pos?.left || (48 + Math.random() * 8),
                        });
                        changed = true;
                    }
                });
                
                return changed ? { ...prev, sectorNodes: newNodes } : prev;
            });
            // Fetch dynamic destinations from Neo4j
            const mapIdForCypher = data.length > 0 ? data[0].mapaId : (activeMapId || 'DEFAULT');
            const destinosRes = await api.get(`/sectores/destinos?mapaId=${mapIdForCypher}`);
            if (destinosRes.data && destinosRes.data.length > 0) {
                setDestinos(destinosRes.data);
                if (!destinosRes.data.includes(edificioSeleccionado)) {
                    setEdificioSeleccionado(destinosRes.data[0]);
                }
            } else {
                setDestinos(EDIFICIOS);
            }
            
            // Fetch edges for 3D Map
            try {
                const cypher = `MATCH (n {mapaId: '${mapIdForCypher}'})-[r]->(m) RETURN n, r, m`;
                const graphRes = await api.post('/cypher', { query: cypher });
                const parsedEdges = graphRes.data.map(row => {
                    const n = row.n?.properties?.id?.toLowerCase();
                    const m = row.m?.properties?.id?.toLowerCase();
                    return (n && m) ? [n, m] : null;
                }).filter(Boolean);
                if (parsedEdges.length > 0) {
                    setEditorState(prev => ({ ...prev, graphEdges: parsedEdges }));
                }
            } catch (e) {
                console.error("Error fetching graph edges", e);
            }
        } catch (err) {
            console.error('Error cargando sectores', err);
        }
    }, [activeMapId, edificioSeleccionado]);

    const cargarDashboard = useCallback(async () => {
        try {
            const [estadoRes, metricasRes, historialRes] = await Promise.all([
                api.get(`/sectores/estado/${legajo}`),
                api.get('/sectores/metricas'),
                api.get(`/sectores/historial/${legajo}`),
            ]);
            setEstado(estadoRes.data);
            setMetricas(metricasRes.data);
            setHistorial((historialRes.data || []).slice(0, 4));
        } catch (err) {
            console.error('Error cargando dashboard Cassandra', err);
        }
    }, [legajo]);

    const cargarTodo = useCallback(async () => {
        await cargarSectores();
        await cargarDashboard();
    }, [cargarDashboard, cargarSectores]);

    useEffect(() => {
        if (!legajo) {
            navigate('/login');
            return;
        }
        cargarTodo();
        const interval = setInterval(() => {
            setCurrentTime(new Date());
            cargarDashboard();
        }, 30000);
        return () => clearInterval(interval);
    }, [cargarDashboard, cargarTodo, legajo, navigate]);

    useEffect(() => {
        if (!legajo) return;

        const cargarMapas = async () => {
            try {
                const res = await getMapas(legajo);
                const mapas = res.data || [];
                setMapLayouts(mapas);

                if (mapas.length === 0 && legajo === '411953') {
                    const seed = await saveMapa({
                        ownerLegajo: legajo,
                        nombre: DEFAULT_MAP_NAME,
                        descripcion: 'Mapa UTN base con textura local, edificios, rutas, nodos y zonas editables.',
                        textureUrl: DEFAULT_TEXTURE_URL,
                        satelliteMetaJson: JSON.stringify({ source: 'local-campus-texture' }),
                        layoutJson: JSON.stringify(editorStateRef.current),
                        activo: true,
                    });
                    const seeded = seed.data;
                    setMapLayouts([seeded]);
                    setActiveMapId(seeded.id);
                    setActiveMapName(seeded.nombre);
                    setActiveTextureUrl(seeded.textureUrl || DEFAULT_TEXTURE_URL);
                    localStorage.setItem(MAP_LAYOUT_STORAGE_KEY, seeded.id);
                    setMensaje('Primer mapa UTN sembrado en Cassandra. Ya no depende solo del navegador.');
                    return;
                }

                const preferred = mapas.find((mapa) => mapa.id === activeMapId)
                    || mapas.find((mapa) => mapa.activo)
                    || mapas[0];

                if (preferred) {
                    const nextState = parseRemoteLayout(preferred.layoutJson);
                    setEditorState(nextState);
                    setActiveMapId(preferred.id);
                    setActiveMapName(preferred.nombre || DEFAULT_MAP_NAME);
                    setActiveTextureUrl(preferred.textureUrl || DEFAULT_TEXTURE_URL);
                    localStorage.setItem(MAP_LAYOUT_STORAGE_KEY, preferred.id);
                    localStorage.setItem(EDITOR_STORAGE_KEY, JSON.stringify(nextState));
                }
            } catch (err) {
                console.warn('No pude cargar mapas desde Cassandra, sigo con cache local.', err);
            }
        };

        cargarMapas();
    }, [activeMapId, legajo]);

    useEffect(() => {
        localStorage.setItem(EDITOR_STORAGE_KEY, JSON.stringify(editorState));
    }, [editorState]);

    const procesarError = (err) => {
        if (typeof err.response?.data === 'object') return err.response.data.message || 'Error del servidor';
        return err.response?.data || 'Error de conexion';
    };

    const payloadUbicacion = () => ({
        legajo,
        latitud: ubicacion?.lat ? String(ubicacion.lat) : '',
        longitud: ubicacion?.lng ? String(ubicacion.lng) : '',
        ubicacionValidada: String(Boolean(ubicacion?.insideCampus)),
        origenValidacion: ubicacion?.checked ? 'BROWSER_GEOLOCATION' : 'NO_VALIDADA',
    });

    const handleEstacionar = async (sectorId) => {
        try {
            if (ubicacion?.checked && !ubicacion.insideCampus) {
                setMensaje('Ubicacion fuera del campus UTN. Reserva geovalidada bloqueada.');
                return;
            }

            await api.post(`/sectores/${sectorId}/estacionar`, payloadUbicacion());
            setMensaje('Lugar reservado correctamente. Evento guardado en Cassandra.');
            setRecommendedSectorId(null);
            await cargarTodo();
        } catch (err) {
            setMensaje(procesarError(err));
        }
    };

    const handleLiberar = async () => {
        try {
            const res = await api.post('/sectores/liberar', payloadUbicacion());
            const texto = typeof res.data === 'object' ? res.data.message : res.data;
            setMensaje(texto);
            await cargarTodo();
        } catch (err) {
            setMensaje(procesarError(err));
        }
    };

    const pedirRecomendacion = async () => {
        try {
            const res = await getRecomendacion(edificioSeleccionado, activeMapId);
            if (res.data?.id) {
                setRecommendedSectorId(res.data.id);
                setMensaje(`Neo4j: ${res.data.justificacion || res.data.lugaresLibres + ' lugares libres.'}`);
            }
        } catch (err) {
            setMensaje(procesarError(err));
            setRecommendedSectorId(null);
        }
    };

    const subirHorario = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsSubiendoHorario(true);
        setHorarioResult(null);
        const formData = new FormData();
        formData.append('file', file);

        setMensaje('Analizando horario con OpenAI (GPT-4o)...');
        try {
            const res = await api.post(`/sectores/recomendacion/horario?mapaId=${encodeURIComponent(activeMapId || 'DEFAULT')}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (res.data?.id) {
                setRecommendedSectorId(res.data.id);
                const justif = `IA Detectó: ${res.data.claseDetectada}. Neo4j: ${res.data.justificacion}`;
                setMensaje(justif);
                setHorarioResult(justif);
            }
        } catch (err) {
            setMensaje(procesarError(err));
            setHorarioResult("Error: " + procesarError(err));
        } finally {
            setIsSubiendoHorario(false);
        }
    };

    const isAdmin = legajo === '411953';

    const detectarUbicacion = () => {
        if (!navigator.geolocation) {
            setMensaje('Tu navegador no soporta geolocalizacion.');
            return;
        }

        setMensaje('Solicitando ubicacion del navegador...');
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const location = {
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    accuracy: Math.round(pos.coords.accuracy || 0),
                };
                
                const activeMap = mapLayouts.find(m => m.id === activeMapId) || {};
                let insideCampus = false;
                
                if (activeMap.lat && activeMap.lng) {
                    // Si el mapa actual tiene coordenadas, validamos un radio de ~1.5km
                    const dLat = Math.abs(location.lat - activeMap.lat);
                    const dLng = Math.abs(location.lng - activeMap.lng);
                    insideCampus = dLat < 0.015 && dLng < 0.015; 
                } else {
                    // Fallback a coordenadas UTN hardcodeadas si es el mapa local
                    insideCampus = isWithinCampus(location);
                }
                
                const nearest = getNearestSectorFromLocation(location, sectores);
                setUbicacion({ ...location, insideCampus, checked: true });
                setNearestSector(nearest);

                if (insideCampus && nearest) {
                    setRecommendedSectorId(nearest.sector.id);
                    setMensaje(`Ubicacion validada. Sector mas cercano: ${nearest.sector.nombre} (${nearest.distance} m).`);
                } else {
                    setMensaje('La ubicacion detectada esta fuera del poligono de este mapa.');
                }
            },
            () => setMensaje('No pude obtener ubicacion. Revisa permisos del navegador.'),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 }
        );
    };

    const updateEditorList = (key, updater) => {
        setEditorState((prev) => ({
            ...prev,
            [key]: typeof updater === 'function' ? updater(prev[key] || []) : updater,
        }));
    };

    const selectCreatedItem = (group) => {
        setSelectedEditorItem({ group, index: editorState[group]?.length || 0 });
    };

    const selectedList = editorState[selectedEditorItem.group] || [];
    const selectedItem = selectedList[selectedEditorItem.index] || null;

    const getItemName = (item, index) => {
        if (!item) return 'Sin seleccionar';
        if (item.label) return `${index + 1}. ${item.label}`;
        return `${index + 1}. ${item.id || 'Elemento'}`;
    };

    const updateSelectedItem = (updates) => {
        if (!selectedItem) return;
        updateEditorList(selectedEditorItem.group, (items) => items.map((item, index) =>
            index === selectedEditorItem.index ? { ...item, ...updates } : item
        ));
    };

    const updateSelectedNumber = (field, value) => {
        const parsed = Number(value);
        if (Number.isNaN(parsed)) return;
        updateSelectedItem({ [field]: parsed });
    };

    const handleEditorMapClick = ({ top, left }) => {
        const roundedTop = Number(top.toFixed(2));
        const roundedLeft = Number(left.toFixed(2));
        const id = `${editorTool}-${Date.now()}`;

        if (editorTool === 'move') {
            updateSelectedItem({ top: roundedTop, left: roundedLeft });
            return;
        }

        if (editorTool === 'building') {
            updateEditorList('buildings', (items) => [...items, {
                id,
                label: 'Nuevo edificio',
                top: roundedTop,
                left: roundedLeft,
                width: 2.4,
                depth: 1.6,
                height: 0.75,
                rot: 0,
                color: '#c9a46a',
                roofColor: '#6b4630',
            }]);
            selectCreatedItem('buildings');
        }

        if (editorTool === 'tree') {
            updateEditorList('trees', (items) => [...items, { id, top: roundedTop, left: roundedLeft, scale: 0.9 }]);
            selectCreatedItem('trees');
        }

        if (editorTool === 'parkedCar') {
            updateEditorList('parkedCars', (items) => [...items, {
                id,
                top: roundedTop,
                left: roundedLeft,
                rot: 0,
                color: '#3d5a80',
            }]);
            selectCreatedItem('parkedCars');
        }

        if (editorTool === 'routePoint') {
            updateEditorList('roadRoutes', (routes) => {
                const next = routes.length ? routes.map((route) => [...route]) : [[]];
                const index = Math.min(activeRouteIndex, next.length - 1);
                next[index] = [...next[index], { top: roundedTop, left: roundedLeft }];
                return next;
            });
        }

        if (editorTool === 'driveZone') {
            updateEditorList('driveZones', (items) => [...items, {
                id,
                top: roundedTop,
                left: roundedLeft,
                width: 4.5,
                depth: 2.4,
                rot: 0,
                color: '#26d98f',
            }]);
            selectCreatedItem('driveZones');
        }

        if (editorTool === 'blockedZone') {
            updateEditorList('blockedZones', (items) => [...items, {
                id,
                top: roundedTop,
                left: roundedLeft,
                width: 4,
                depth: 2.2,
                rot: 0,
                color: '#ff4d5e',
            }]);
            selectCreatedItem('blockedZones');
        }
    };

    const nuevaRuta = () => {
        setEditorState((prev) => ({ ...prev, roadRoutes: [...(prev.roadRoutes || []), []] }));
        setActiveRouteIndex(editorState.roadRoutes?.length || 0);
    };

    const borrarRutaActiva = () => {
        updateEditorList('roadRoutes', (routes) => {
            const next = routes.filter((_, index) => index !== activeRouteIndex);
            return next.length ? next : [[]];
        });
        setActiveRouteIndex((index) => Math.max(0, index - 1));
    };

    const borrarUltimoEditor = () => {
        const keyByTool = {
            building: 'buildings',
            tree: 'trees',
            parkedCar: 'parkedCars',
            driveZone: 'driveZones',
            blockedZone: 'blockedZones',
        };

        if (editorTool === 'routePoint') {
            updateEditorList('roadRoutes', (routes) => routes.map((route, index) =>
                index === activeRouteIndex ? route.slice(0, -1) : route
            ));
            return;
        }

        const key = keyByTool[editorTool];
        if (key) updateEditorList(key, (items) => items.slice(0, -1));
    };

    const borrarSeleccionado = () => {
        if (!selectedItem) return;
        updateEditorList(selectedEditorItem.group, (items) => items.filter((_, index) => index !== selectedEditorItem.index));
        setSelectedEditorItem((prev) => ({ ...prev, index: Math.max(0, prev.index - 1) }));
    };

    const restaurarEditor = () => {
        const defaults = createDefaultEditorState();
        setEditorState(defaults);
        setActiveMapId('');
        setActiveMapName(DEFAULT_MAP_NAME);
        setActiveTextureUrl(DEFAULT_TEXTURE_URL);
        setActiveRouteIndex(0);
        localStorage.removeItem(MAP_LAYOUT_STORAGE_KEY);
        localStorage.setItem(EDITOR_STORAGE_KEY, JSON.stringify(defaults));
    };

    const guardarMapaCassandra = async () => {
        setIsSavingMap(true);
        try {
            const res = await saveMapa({
                id: activeMapId || undefined,
                ownerLegajo: legajo,
                nombre: activeMapName || DEFAULT_MAP_NAME,
                descripcion: 'Layout 3D, rutas, nodos, zonas y textura guardados desde el editor admin.',
                textureUrl: activeTextureUrl === DEFAULT_TEXTURE_URL ? DEFAULT_TEXTURE_URL : activeTextureUrl,
                satelliteMetaJson: JSON.stringify({ source: activeTextureUrl ? 'custom-texture-url' : 'blank' }),
                layoutJson: JSON.stringify(editorState),
                activo: true,
            });
            const saved = res.data;
            setActiveMapId(saved.id);
            setActiveMapName(saved.nombre);
            setActiveTextureUrl(saved.textureUrl || '');
            localStorage.setItem(MAP_LAYOUT_STORAGE_KEY, saved.id);
            setMapLayouts((prev) => [saved, ...prev.filter((mapa) => mapa.id !== saved.id)]);
            setMensaje('Mapa guardado en Cassandra. LocalStorage queda solo como cache rapida.');
        } catch (err) {
            setMensaje(procesarError(err));
        } finally {
            setIsSavingMap(false);
        }
    };

    const crearMapaDesdeCero = async () => {
        const nombre = prompt('Nombre del mapa nuevo:', `Mapa nuevo ${mapLayouts.length + 1}`);
        if (!nombre) return;
        
        const placeName = prompt('Nombre del lugar en la vida real (ej: Estadio Kempes, UTN FRC) para que la IA arme la red:', nombre);
        const latLngStr = prompt('Coordenadas (Latitud, Longitud) - Opcional (deja vacío para seleccionar en el mapa):', '-31.4422, -64.1936');
        
        let lat = null, lng = null;
        if (latLngStr) {
            const parts = latLngStr.split(',');
            if (parts.length >= 2) {
                lat = parseFloat(parts[0].trim());
                lng = parseFloat(parts[1].trim());
            }
        }
        
        if (!latLngStr) {
            // Cancelado o vacío: abrir selector interactivo satelital automáticamente
            setPendingNewMapData({ nombre, placeName });
            setShowTexturePicker(true);
            setMensaje('Por favor, hacé clic en el mapa interactivo para seleccionar la ubicación exacta del nuevo predio.');
            return;
        }
        
        try {
            const payload = { ownerLegajo: legajo, nombre };
            if (placeName) payload.placeName = placeName;
            if (lat !== null) payload.lat = lat;
            if (lng !== null) payload.lng = lng;
            
            const res = await crearMapaVacio(payload);
            const mapa = res.data;
            const blank = parseRemoteLayout(mapa.layoutJson);
            setEditorState(blank);
            setActiveRouteIndex(0);
            setSelectedEditorItem({ group: 'buildings', index: 0 });
            setActiveMapId(mapa.id);
            setActiveMapName(mapa.nombre);
            setActiveTextureUrl(DEFAULT_TEXTURE_URL);
            setMapLayouts((prev) => [mapa, ...prev.map((item) => ({ ...item, activo: false }))]);
            localStorage.setItem(MAP_LAYOUT_STORAGE_KEY, mapa.id);
            localStorage.setItem(EDITOR_STORAGE_KEY, JSON.stringify(blank));
            setMensaje('Mapa vacio creado en Cassandra con metadatos espaciales.');
        } catch (err) {
            setMensaje(procesarError(err));
        }
    };

    const borrarMapaCassandra = async () => {
        if (!activeMapId) {
            alert('No se puede borrar el mapa local por defecto.');
            return;
        }
        if (!window.confirm('¿Seguro que quieres borrar este mapa? Esta accion no se puede deshacer.')) {
            return;
        }
        try {
            await api.delete(`/mapas/${activeMapId}`);
            const remainingMaps = mapLayouts.filter(m => m.id !== activeMapId);
            setMapLayouts(remainingMaps);
            setMensaje('Mapa borrado con exito.');
            restaurarEditor();
        } catch (err) {
            setMensaje(procesarError(err));
        }
    };

    const seleccionarMapa = async (id) => {
        if (!id) {
            restaurarEditor();
            return;
        }
        try {
            const mapa = mapLayouts.find((item) => item.id === id) || (await api.get(`/mapas/${id}`)).data;
            const nextState = parseRemoteLayout(mapa.layoutJson);
            await activarMapa(mapa.id);
            setEditorState(nextState);
            setActiveMapId(mapa.id);
            setActiveMapName(mapa.nombre || DEFAULT_MAP_NAME);
            setActiveTextureUrl(mapa.textureUrl || DEFAULT_TEXTURE_URL);
            setMapLayouts((prev) => prev.map((item) => ({ ...item, activo: item.id === mapa.id })));
            localStorage.setItem(MAP_LAYOUT_STORAGE_KEY, mapa.id);
            localStorage.setItem(EDITOR_STORAGE_KEY, JSON.stringify(nextState));
            setMensaje(`Mapa "${mapa.nombre}" cargado desde Cassandra.`);
        } catch (err) {
            setMensaje(procesarError(err));
        }
    };

    const exportarEditor = () => {
        navigator.clipboard?.writeText(JSON.stringify(editorState, null, 2));
        setMensaje('Layout copiado al portapapeles como JSON.');
    };

    const importarEditor = () => {
        const input = prompt('Pega el JSON del layout aqui:');
        if (input) {
            try {
                const parsed = JSON.parse(input);
                setEditorState({ ...createDefaultEditorState(), ...parsed });
                setMensaje('Layout importado correctamente.');
            } catch (err) {
                setMensaje('JSON invalido.');
            }
        }
    };

    const totalLibres = sectores.reduce((acc, sector) => acc + (sector.lugaresLibres || 0), 0);
    const hora = currentTime.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    const estadoTexto = estado?.tieneLugarActivo ? `Activo en ${estado.ultimoEvento?.nombreSector}` : 'Sin reserva activa';

    const toggleAutosVisibility = () => {
        setMostrarAutos((prev) => {
            if (prev === 'reducido') return 'ninguno';
            if (prev === 'ninguno') return 'completo';
            return 'reducido';
        });
    };

    let btnStyle = { ...styles.editorToggle };
    let btnLabel = '';
    if (mostrarAutos === 'reducido') {
        btnStyle = {
            ...styles.editorToggle,
            borderColor: 'rgba(247, 183, 51, 0.72)',
            backgroundColor: 'rgba(247, 183, 51, 0.12)',
            color: '#ffe7aa',
        };
        btnLabel = '⚡ Autos: Reducido';
    } else if (mostrarAutos === 'ninguno') {
        btnStyle = {
            ...styles.editorToggle,
            borderColor: 'rgba(255, 77, 94, 0.72)',
            backgroundColor: 'rgba(255, 77, 94, 0.12)',
            color: '#ffdcdb',
        };
        btnLabel = '🚀 Autos: Ocultos';
    } else {
        btnStyle = {
            ...styles.editorToggle,
            borderColor: 'rgba(103, 214, 255, 0.72)',
            backgroundColor: 'rgba(103, 214, 255, 0.12)',
            color: '#ffffff',
        };
        btnLabel = '🚗 Autos: Todos';
    }

    return (
        <div style={styles.container}>
            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
                .action:hover { transform: translateY(-1px); filter: brightness(1.08); }
                .panel:hover { border-color: rgba(103,214,255,0.42); }
            `}</style>

            <div style={styles.canvasContainer}>
                <Suspense fallback={<div style={styles.loading}>Inicializando entorno 3D...</div>}>
                    <Canvas
                        camera={{ position: [0, 18, 18], fov: 45 }}
                        frameloop="always"
                        shadows
                        gl={{ antialias: true, alpha: true }}
                        style={{ background: 'transparent' }}
                        onCreated={({ gl }) => { gl.setClearColor('#000814', 0); }}
                    >
                        <ParkingMap3D
                            sectores={sectores}
                            onEstacionar={handleEstacionar}
                            recommendedSectorId={recommendedSectorId}
                            editorMode={editorMode}
                            editorState={editorState}
                            onEditorMapClick={handleEditorMapClick}
                            onEditorSelect={setSelectedEditorItem}
                            selectedEditorItem={selectedEditorItem}
                            showLabels={showLabels}
                            textureUrl={activeTextureUrl}
                            mostrarAutos={mostrarAutos}
                        />
                    </Canvas>
                </Suspense>
            </div>

            <div style={styles.uiOverlay}>
                <header style={styles.topBar} className="panel">
                    <div>
                        <h1 style={styles.title}>SMART PARKING</h1>
                        <p style={styles.subtitle}>UTN FRC · Campus inteligente</p>
                    </div>

                    <div style={styles.statsRow}>
                        <Stat label="Libres" value={totalLibres} />
                        <Stat label={traffic.desc} value={traffic.label} color={traffic.color} />
                        <Stat label="Hora actual" value={hora} />
                        <Stat label="Cassandra" value={metricas ? `${metricas.totalEventos} eventos` : 'Sin datos'} />
                        <button className="action" style={styles.dbConsoleBtn} onClick={() => setShowDbConsole(true)}>
                            Consola DB
                        </button>
                    </div>

                    <button
                        className="action"
                        style={showLabels ? styles.editorToggleActive : styles.editorToggle}
                        onClick={() => setShowLabels(v => !v)}
                    >
                        {showLabels ? 'Ocultar Etiquetas' : 'Ver Etiquetas'}
                    </button>

                    <button className="action" style={btnStyle} onClick={toggleAutosVisibility}>
                        {btnLabel}
                    </button>

                    <button
                        className="action"
                        style={editorMode ? styles.editorToggleActive : styles.editorToggle}
                        onClick={() => {
                            if (legajo === '411953') {
                                setEditorMode((value) => !value);
                            } else {
                                setMensaje('Modo edicion solo disponible para administradores.');
                            }
                        }}
                    >
                        {editorMode ? 'Edicion activa' : 'Editar mapa'}
                    </button>

                    <div style={styles.userChip}>
                        <strong>{legajo}</strong>
                        <span style={styles.userState}>{estadoTexto}</span>
                        <button className="action" style={styles.smallButton} onClick={() => {
                            localStorage.removeItem('legajo');
                            navigate('/login');
                        }}>Salir</button>
                    </div>
                </header>

                {mensaje && (
                    <div style={styles.alert}>
                        <span>{mensaje}</span>
                        <button onClick={() => setMensaje('')} style={styles.closeBtn}>x</button>
                    </div>
                )}

                {editorMode && (
                    <section style={styles.editorPanel} className="panel">
                        <div style={styles.editorHeader}>
                            <div>
                                <span style={styles.kicker}>EDITOR 3D</span>
                                <h3 style={styles.panelTitle}>Crear, seleccionar y ajustar</h3>
                            </div>
                            <div style={styles.editorCounters}>
                                <span>{editorState.buildings?.length || 0} edificios</span>
                                <span>{editorState.parkedCars?.length || 0} autos</span>
                                <span>{editorState.roadRoutes?.length || 0} rutas</span>
                            </div>
                        </div>
                        <p style={styles.editorHint}>Hace click sobre un edificio/auto/arbol 3D para seleccionarlo. Con Mover activo, el proximo click sobre el mapa lo reubica.</p>

                        <div style={styles.mapAdminBox}>
                            <label style={styles.compactField}>
                                Mapa activo
                                <select
                                    style={styles.compactSelect}
                                    value={activeMapId}
                                    onChange={(event) => seleccionarMapa(event.target.value)}
                                >
                                    <option value="">UTN local sin guardar</option>
                                    {mapLayouts.map((mapa) => (
                                        <option key={mapa.id} value={mapa.id}>{mapa.nombre}</option>
                                    ))}
                                </select>
                            </label>
                            <TextField label="Nombre" value={activeMapName} onChange={setActiveMapName} />
                            
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', marginBottom: '14px' }}>
                                <div style={{ flex: 1 }}>
                                    <TextField label="Textura / satelital URL" value={activeTextureUrl} onChange={setActiveTextureUrl} />
                                </div>
                                <button className="action" style={styles.secondaryButtonMini} onClick={() => setShowTexturePicker(true)}>
                                    Abrir Mapa / Archivo
                                </button>
                            </div>

                            <button className="action" style={styles.locationButton} onClick={guardarMapaCassandra} disabled={isSavingMap}>
                                {isSavingMap ? 'Guardando...' : 'Guardar en Cassandra'}
                            </button>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="action" style={{...styles.secondaryButtonMini, flex: 1}} onClick={crearMapaDesdeCero}>
                                    Nuevo mapa vacio
                                </button>
                                {activeMapId && (
                                    <button className="action" style={{...styles.dangerButtonMini, flex: 1}} onClick={borrarMapaCassandra}>
                                        Borrar mapa
                                    </button>
                                )}
                            </div>
                        </div>

                        <div style={styles.toolGrid}>
                            {EDITOR_TOOLS.map((tool) => (
                                <button
                                    key={tool.key}
                                    className="action"
                                    style={editorTool === tool.key ? styles.toolActive : styles.tool}
                                    onClick={() => setEditorTool(tool.key)}
                                >
                                    {tool.label}
                                </button>
                            ))}
                        </div>

                        <div style={styles.editorControls}>
                            <label style={styles.compactField}>
                                Tipo
                                <select
                                    style={styles.compactSelect}
                                    value={selectedEditorItem.group}
                                    onChange={(event) => setSelectedEditorItem({ group: event.target.value, index: 0 })}
                                >
                                    {EDITABLE_GROUPS.map((group) => (
                                        <option key={group.key} value={group.key}>{group.label}</option>
                                    ))}
                                </select>
                            </label>
                            <label style={styles.compactField}>
                                Elemento
                                <select
                                    style={styles.compactSelect}
                                    value={selectedEditorItem.index}
                                    onChange={(event) => setSelectedEditorItem((prev) => ({ ...prev, index: Number(event.target.value) }))}
                                >
                                    {selectedList.length === 0 && <option value={0}>No hay elementos</option>}
                                    {selectedList.map((item, index) => (
                                        <option key={item.id || index} value={index}>{getItemName(item, index)}</option>
                                    ))}
                                </select>
                            </label>
                            <label style={styles.compactField}>
                                Ruta
                                <select
                                    style={styles.compactSelect}
                                    value={activeRouteIndex}
                                    onChange={(event) => setActiveRouteIndex(Number(event.target.value))}
                                >
                                    {(editorState.roadRoutes || []).map((route, index) => (
                                        <option key={index} value={index}>Ruta {index + 1} · {route.length} pts</option>
                                    ))}
                                </select>
                            </label>
                            <button className="action" style={styles.secondaryButtonMini} onClick={nuevaRuta}>Nueva ruta</button>
                            <button className="action" style={styles.dangerButtonMini} onClick={borrarRutaActiva}>Borrar ruta</button>
                            <button className="action" style={styles.secondaryButtonMini} onClick={borrarUltimoEditor}>Borrar ultimo</button>
                            <button className="action" style={styles.secondaryButtonMini} onClick={exportarEditor}>Copiar JSON</button>
                            <button className="action" style={styles.secondaryButtonMini} onClick={importarEditor}>Importar JSON</button>
                            <button className="action" style={styles.dangerButtonMini} onClick={restaurarEditor}>Restaurar</button>
                        </div>

                        {selectedItem && (
                            <div style={styles.selectedEditor}>
                                <div style={styles.selectedTitle}>
                                    <strong>{getItemName(selectedItem, selectedEditorItem.index)}</strong>
                                    <span>Usa Mover y hace click en el mapa para reubicarlo.</span>
                                </div>
                                <div style={styles.propertyGrid}>
                                    <NumberField label="Top" value={selectedItem.top} onChange={(value) => updateSelectedNumber('top', value)} />
                                    <NumberField label="Left" value={selectedItem.left} onChange={(value) => updateSelectedNumber('left', value)} />
                                    {'rot' in selectedItem && (
                                        <NumberField label="Rot" value={Number(((selectedItem.rot || 0) * 180 / Math.PI).toFixed(0))}
                                            onChange={(value) => updateSelectedNumber('rot', Number(value) * Math.PI / 180)} />
                                    )}
                                    {'width' in selectedItem && <NumberField label="Ancho" value={selectedItem.width} step="0.1" onChange={(value) => updateSelectedNumber('width', value)} />}
                                    {'depth' in selectedItem && <NumberField label="Fondo" value={selectedItem.depth} step="0.1" onChange={(value) => updateSelectedNumber('depth', value)} />}
                                    {'height' in selectedItem && <NumberField label="Altura" value={selectedItem.height} step="0.05" onChange={(value) => updateSelectedNumber('height', value)} />}
                                    {'scale' in selectedItem && <NumberField label="Escala" value={selectedItem.scale} step="0.05" onChange={(value) => updateSelectedNumber('scale', value)} />}
                                    {'label' in selectedItem && <TextField label="Etiqueta" value={selectedItem.label} onChange={(value) => updateSelectedItem({ label: value })} />}
                                    {'color' in selectedItem && <ColorField label="Color Base" value={selectedItem.color} onChange={(value) => updateSelectedItem({ color: value })} />}
                                    {'roofColor' in selectedItem && <ColorField label="Color Techo" value={selectedItem.roofColor} onChange={(value) => updateSelectedItem({ roofColor: value })} />}
                                </div>
                                <div style={styles.quickActions}>
                                    {'rot' in selectedItem && (
                                        <>
                                            <button className="action" style={styles.secondaryButtonMini} onClick={() => updateSelectedItem({ rot: (selectedItem.rot || 0) - Math.PI / 12 })}>Rotar -15</button>
                                            <button className="action" style={styles.secondaryButtonMini} onClick={() => updateSelectedItem({ rot: (selectedItem.rot || 0) + Math.PI / 12 })}>Rotar +15</button>
                                        </>
                                    )}
                                    <button className="action" style={styles.dangerButtonMini} onClick={borrarSeleccionado}>Borrar seleccionado</button>
                                </div>
                            </div>
                        )}
                    </section>
                )}

                {showTexturePicker && (
                    <TexturePicker 
                        onClose={() => {
                            setShowTexturePicker(false);
                            setPendingNewMapData(null);
                        }} 
                        onSelectTexture={async (url, lat, lng) => {
                            if (pendingNewMapData) {
                                // Flujo de creación de nuevo mapa vacío con textura e IA
                                try {
                                    const payload = { 
                                        ownerLegajo: legajo, 
                                        nombre: pendingNewMapData.nombre,
                                        placeName: pendingNewMapData.placeName,
                                        lat,
                                        lng
                                    };
                                    const res = await crearMapaVacio(payload);
                                    let mapa = res.data;
                                    
                                    // Asignar y guardar la textura satelital obtenida en Cassandra
                                    mapa.textureUrl = url;
                                    const updateRes = await saveMapa(mapa);
                                    mapa = updateRes.data;

                                    const blank = parseRemoteLayout(mapa.layoutJson);
                                    setEditorState(blank);
                                    setActiveRouteIndex(0);
                                    setSelectedEditorItem({ group: 'buildings', index: 0 });
                                    setActiveMapId(mapa.id);
                                    setActiveMapName(mapa.nombre);
                                    setActiveTextureUrl(url);
                                    setMapLayouts((prev) => [mapa, ...prev.map((item) => ({ ...item, activo: false }))]);
                                    localStorage.setItem(MAP_LAYOUT_STORAGE_KEY, mapa.id);
                                    localStorage.setItem(EDITOR_STORAGE_KEY, JSON.stringify(blank));
                                    setMensaje(`Mapa "${mapa.nombre}" creado con textura satelital y metadatos.`);
                                } catch (err) {
                                    setMensaje(procesarError(err));
                                } finally {
                                    setPendingNewMapData(null);
                                }
                            } else {
                                // Flujo estándar de actualización de textura para el mapa activo
                                setActiveTextureUrl(url);
                                if (activeMapId) {
                                    try {
                                        const preferred = mapLayouts.find(m => m.id === activeMapId);
                                        if (preferred) {
                                            preferred.textureUrl = url;
                                            await saveMapa(preferred);
                                            setMensaje('Textura satelital actualizada y guardada en Cassandra.');
                                        }
                                    } catch (err) {
                                        console.error('Error al guardar la textura actualizada:', err);
                                    }
                                }
                            }
                            setShowTexturePicker(false);
                        }} 
                    />
                )}

                {showDbConsole && (
                    <Neo4jConsole 
                        onClose={() => setShowDbConsole(false)} 
                        activeMapId={activeMapId}
                        mapaIdForCypher={sectores.length > 0 ? sectores[0].mapaId : (activeMapId || 'DEFAULT')}
                        savedQueries={editorState.savedCypherQueries || []}
                        onSaveQuery={(query) => {
                            const newQueries = [...(editorState.savedCypherQueries || []), query];
                            setEditorState(prev => ({ ...prev, savedCypherQueries: newQueries }));
                        }}
                        onDbUpdated={cargarSectores}
                    />
                )}

                <main style={styles.bottomRow}>
                    <section style={{...styles.sidePanel, ...(collapsedPanels.neo4j ? styles.collapsedPanel : {})}} className="panel">
                        <div style={styles.panelHeader}>
                            <div>
                                <span style={styles.kicker}>NEO4J</span>
                                <h3 style={styles.panelTitle}>Recomendacion por destino</h3>
                            </div>
                            <button className="action" style={styles.collapseBtn} onClick={() => setCollapsedPanels(p => ({...p, neo4j: !p.neo4j}))}>
                                {collapsedPanels.neo4j ? 'Expandir' : 'Colapsar'}
                            </button>
                        </div>
                        {!collapsedPanels.neo4j && (
                            <>
                                <p style={styles.panelDesc}>El grafo conecta edificios con playas cercanas y prioriza sectores con disponibilidad. Si el más cercano se llena, busca alternativas automáticamente.</p>
                                <select 
                                    style={{...styles.select, width: '100%', marginBottom: 15}}
                                    value={edificioSeleccionado}
                                    onChange={(e) => setEdificioSeleccionado(e.target.value)}
                                >
                                    {destinos.map(ed => (
                                        <option key={ed} value={ed}>{ed}</option>
                                    ))}
                                </select>
                                <button className="action" style={styles.primaryButton} onClick={pedirRecomendacion} disabled={isSubiendoHorario}>
                                    Buscar mejor sector
                                </button>

                                <div style={{ margin: '14px 0' }}>
                                    <hr style={{ borderTop: '1px solid #1a365d', margin: '15px 0' }} />
                                    {mapLayouts.find(m => m.id === activeMapId)?.isEducational !== false ? (
                                        <>
                                            <p style={{...styles.panelDesc, marginBottom: 10}}>O subí tu horario y detectaremos tu clase con IA OCR:</p>
                                            <input 
                                                type="file" 
                                                accept="image/*" 
                                                onChange={subirHorario} 
                                                style={{ color: '#8fb6c8', fontSize: '13px', width: '100%', cursor: isSubiendoHorario ? 'not-allowed' : 'pointer' }}
                                                disabled={isSubiendoHorario}
                                            />
                                            {isSubiendoHorario && <p style={{color: '#ffc107', marginTop: 10, fontSize: '13px'}}>Analizando imagen con IA...</p>}
                                            {horarioResult && <p style={{color: '#4caf50', marginTop: 10, fontSize: '13px', lineHeight: 1.4}}>{horarioResult}</p>}
                                        </>
                                    ) : (
                                        <p style={{color: '#ff4d5e', marginTop: 10, fontSize: '13px', fontStyle: 'italic', textAlign: 'center'}}>
                                            ❌ La IA detectó que este recinto no es educativo. La lectura de horarios está deshabilitada.
                                        </p>
                                    )}
                                </div>
                            </>
                        )}
                    </section>

                    <section style={{...styles.sidePanel, ...(collapsedPanels.gps ? styles.collapsedPanel : {})}} className="panel">
                        <div style={styles.panelHeader}>
                            <div>
                                <span style={styles.kicker}>GPS</span>
                                <h3 style={styles.panelTitle}>Validacion de campus</h3>
                            </div>
                            <button className="action" style={styles.collapseBtn} onClick={() => setCollapsedPanels(p => ({...p, gps: !p.gps}))}>
                                {collapsedPanels.gps ? 'Expandir' : 'Colapsar'}
                            </button>
                        </div>
                        {!collapsedPanels.gps && (
                            <>
                                <p style={styles.panelDesc}>Usa la ubicacion del navegador para confirmar si estas dentro de UTN y sugerir el sector mas cercano.</p>
                                <button className="action" style={styles.locationButton} onClick={detectarUbicacion}>
                                    Detectar mi ubicacion
                                </button>
                                <div style={styles.locationBox}>
                                    <div style={styles.locationState}>
                                        {ubicacion?.checked
                                            ? (ubicacion.insideCampus ? 'Dentro del campus' : 'Fuera del campus')
                                            : 'Sin validar'}
                                    </div>
                                    <div style={styles.muted}>
                                        Precision: {ubicacion?.accuracy ? `${ubicacion.accuracy} m` : '-'}
                                    </div>
                                    <div style={styles.muted}>
                                        Cercano: {nearestSector ? `${nearestSector.sector.nombre} (${nearestSector.distance} m)` : '-'}
                                    </div>
                                </div>
                            </>
                        )}
                    </section>

                    {isAdmin && (
                        <section style={{...styles.sidePanel, ...(collapsedPanels.cassandra ? styles.collapsedPanel : {})}} className="panel">
                            <div style={styles.panelHeader}>
                                <div>
                                    <span style={styles.kicker}>CASSANDRA</span>
                                    <h3 style={styles.panelTitle}>Eventos e historial</h3>
                                </div>
                                <button className="action" style={styles.collapseBtn} onClick={() => setCollapsedPanels((p) => ({ ...p, cassandra: !p.cassandra }))}>
                                    {collapsedPanels.cassandra ? 'Expandir' : 'Colapsar'}
                                </button>
                            </div>
                            {!collapsedPanels.cassandra && (
                                <>
                                    <p style={styles.panelDesc}>Cada entrada/salida queda como evento temporal por legajo, listo para auditoria y metricas.</p>
                                    <div style={styles.metricsGrid}>
                                        <MiniMetric label="Entradas hoy" value={metricas?.entradasHoy ?? 0} />
                                        <MiniMetric label="Salidas hoy" value={metricas?.salidasHoy ?? 0} />
                                        <MiniMetric label="Activos" value={metricas?.ocupacionesActivas ?? 0} />
                                    </div>
                                    {estado?.tieneLugarActivo ? (
                                        <button className="action" style={styles.releaseButton} onClick={handleLiberar}>
                                            Liberar lugar
                                        </button>
                                    ) : (
                                        <button className="action" style={{ ...styles.releaseButton, backgroundColor: '#3a4a5a', opacity: 0.6 }} disabled>
                                            Sin reserva activa
                                        </button>
                                    )}
                                    <div style={styles.historyList}>
                                        {historial.length === 0 && <span style={styles.muted}>Sin eventos todavia</span>}
                                        {historial.map((ev, i) => (
                                            <div key={`${ev.legajo}-${ev.fechaHora}-${i}`} style={styles.historyItem}>
                                                <div style={{ color: ev.evento === 'ENTRADA' ? '#fff' : '#8fb6c8', fontSize: '0.75rem', fontWeight: '600' }}>{ev.evento}</div>
                                                <div style={{ color: '#8fb6c8', fontSize: '0.75rem' }}>{ev.nombreSector}</div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </section>
                    )}
                </main>
            </div>
        </div>
    );
};

const Stat = ({ label, value, color = '#ffffff' }) => (
    <div style={styles.statBox}>
        <div style={{ ...styles.statValue, color }}>{value}</div>
        <div style={styles.statLabel}>{label}</div>
    </div>
);

const MiniMetric = ({ label, value }) => (
    <div style={styles.miniMetric}>
        <strong>{value}</strong>
        <span>{label}</span>
    </div>
);

const NumberField = ({ label, value, onChange, step = '1' }) => (
    <label style={styles.compactField}>
        {label}
        <input type="number" style={styles.compactInput} value={value} step={step}
            onChange={(e) => onChange(e.target.value)} />
    </label>
);

const TextField = ({ label, value, onChange }) => (
    <label style={styles.compactField}>
        {label}
        <input type="text" style={styles.compactInput} value={value || ''}
            onChange={(e) => onChange(e.target.value)} />
    </label>
);

const ColorField = ({ label, value, onChange }) => (
    <label style={{...styles.compactField, alignItems: 'center'}}>
        {label}
        <input type="color" style={{...styles.compactInput, padding: 0, height: '24px', cursor: 'pointer', border: 'none'}} value={value || '#ffffff'}
            onChange={(e) => onChange(e.target.value)} />
    </label>
);

const styles = {
    container: {
        width: '100vw',
        height: '100vh',
        position: 'relative',
        background: '#000814',
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        overflow: 'hidden',
    },
    canvasContainer: {
        position: 'absolute',
        inset: 0,
        zIndex: 1,
        backgroundColor: '#000814',
    },
    loading: {
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#67d6ff',
        background: '#000814',
        fontWeight: 800,
    },
    dbConsoleBtn: {
        backgroundColor: '#27e98a', color: '#000', border: 'none', padding: '6px 12px',
        borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'monospace',
        marginLeft: '8px', boxShadow: '0 0 10px rgba(39, 233, 138, 0.4)'
    },
    uiOverlay: {
        position: 'absolute',
        inset: 0,
        zIndex: 2,
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        padding: 18,
        boxSizing: 'border-box',
    },
    topBar: {
        pointerEvents: 'auto',
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        flexWrap: 'wrap',
        background: 'rgba(0, 6, 22, 0.76)',
        backdropFilter: 'blur(18px)',
        border: '1px solid rgba(103,214,255,0.18)',
        boxShadow: '0 12px 34px rgba(0,0,0,0.42)',
        borderRadius: 8,
        padding: '14px 18px',
        animation: 'fadeIn 0.35s ease-out',
    },
    title: {
        margin: 0,
        color: '#fff',
        fontSize: '1.45rem',
        fontWeight: 900,
        letterSpacing: 0,
    },
    subtitle: {
        margin: '2px 0 0',
        color: '#8fb6c8',
        fontSize: '0.78rem',
    },
    statsRow: {
        display: 'flex',
        gap: 10,
        flex: 1,
        justifyContent: 'center',
        flexWrap: 'wrap',
    },
    statBox: {
        minWidth: 98,
        background: 'rgba(37, 96, 122, 0.18)',
        border: '1px solid rgba(103,214,255,0.14)',
        borderRadius: 8,
        padding: '7px 12px',
        textAlign: 'center',
    },
    statValue: {
        color: '#fff',
        fontSize: '1rem',
        fontWeight: 850,
    },
    statLabel: {
        color: '#8fa8b5',
        fontSize: '0.68rem',
        marginTop: 2,
    },
    userChip: {
        minWidth: 170,
        display: 'grid',
        gap: 3,
        color: '#fff',
        background: 'rgba(103,214,255,0.08)',
        border: '1px solid rgba(103,214,255,0.16)',
        borderRadius: 8,
        padding: '8px 10px',
    },
    editorToggle: {
        border: '1px solid rgba(103,214,255,0.28)',
        background: 'rgba(103,214,255,0.08)',
        color: '#dff7ff',
        borderRadius: 8,
        padding: '10px 13px',
        fontWeight: 850,
        cursor: 'pointer',
    },
    editorToggleActive: {
        border: '1px solid rgba(39,233,138,0.72)',
        background: '#27e98a',
        color: '#041016',
        borderRadius: 8,
        padding: '10px 13px',
        fontWeight: 900,
        cursor: 'pointer',
    },
    userState: {
        color: '#a9c3d0',
        fontSize: '0.76rem',
    },
    smallButton: {
        justifySelf: 'start',
        background: 'transparent',
        border: 'none',
        color: '#ff8d8d',
        cursor: 'pointer',
        padding: 0,
        fontWeight: 800,
    },
    alert: {
        pointerEvents: 'auto',
        alignSelf: 'center',
        maxWidth: 720,
        background: 'rgba(0, 6, 22, 0.88)',
        color: '#fff',
        border: '1px solid rgba(103,214,255,0.28)',
        borderRadius: 8,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        boxShadow: '0 10px 28px rgba(0,0,0,0.36)',
    },
    closeBtn: {
        background: 'transparent',
        border: 'none',
        color: '#a9c3d0',
        cursor: 'pointer',
        fontSize: '1rem',
    },
    editorPanel: {
        pointerEvents: 'auto',
        alignSelf: 'flex-end',
        width: 340,
        maxHeight: 'calc(100vh - 150px)',
        overflowY: 'auto',
        display: 'grid',
        gap: 10,
        background: 'rgba(0, 6, 22, 0.86)',
        backdropFilter: 'blur(18px)',
        border: '1px solid rgba(39,233,138,0.24)',
        borderRadius: 8,
        padding: 14,
        boxShadow: '0 14px 38px rgba(0,0,0,0.46)',
    },
    editorHeader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap',
    },
    editorCounters: {
        display: 'flex',
        gap: 8,
        flexWrap: 'wrap',
        color: '#b9d3dd',
        fontSize: '0.75rem',
        fontWeight: 800,
    },
    editorHint: {
        margin: 0,
        color: '#9fb9c5',
        fontSize: '0.75rem',
        lineHeight: 1.35,
    },
    mapAdminBox: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(138px, 1fr))',
        gap: 8,
        alignItems: 'end',
        padding: 10,
        borderRadius: 8,
        border: '1px solid rgba(39,233,138,0.18)',
        background: 'rgba(39,233,138,0.06)',
    },
    toolGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gap: 8,
    },
    tool: {
        border: '1px solid rgba(103,214,255,0.2)',
        background: '#081927',
        color: '#cfe7ef',
        borderRadius: 8,
        padding: '9px 8px',
        cursor: 'pointer',
        fontWeight: 800,
    },
    toolActive: {
        border: '1px solid rgba(39,233,138,0.65)',
        background: 'rgba(39,233,138,0.18)',
        color: '#ffffff',
        borderRadius: 8,
        padding: '9px 8px',
        cursor: 'pointer',
        fontWeight: 900,
    },
    editorControls: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(116px, 1fr))',
        gap: 8,
        alignItems: 'end',
    },
    compactField: {
        display: 'grid',
        gap: 5,
        color: '#cfe7ef',
        fontSize: '0.75rem',
        fontWeight: 800,
    },
    compactSelect: {
        width: '100%',
        padding: '9px 10px',
        borderRadius: 8,
        border: '1px solid rgba(103,214,255,0.24)',
        background: '#081927',
        color: '#fff',
        outline: 'none',
    },
    compactInput: {
        width: '100%',
        boxSizing: 'border-box',
        padding: '9px 10px',
        borderRadius: 8,
        border: '1px solid rgba(103,214,255,0.24)',
        background: '#081927',
        color: '#fff',
        outline: 'none',
    },
    selectedEditor: {
        display: 'grid',
        gap: 10,
        padding: 12,
        borderRadius: 8,
        background: 'rgba(103,214,255,0.07)',
        border: '1px solid rgba(103,214,255,0.16)',
    },
    selectedTitle: {
        display: 'grid',
        gap: 4,
        color: '#dff7ff',
        fontSize: '0.78rem',
    },
    propertyGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(94px, 1fr))',
        gap: 8,
    },
    quickActions: {
        display: 'flex',
        gap: 8,
        flexWrap: 'wrap',
    },
    secondaryButtonMini: {
        border: '1px solid rgba(103,214,255,0.26)',
        borderRadius: 8,
        color: '#dff7ff',
        background: 'rgba(103,214,255,0.09)',
        padding: '10px 10px',
        fontWeight: 800,
        cursor: 'pointer',
        transition: '0.2s',
    },
    dangerButtonMini: {
        border: '1px solid rgba(255,77,94,0.36)',
        borderRadius: 8,
        color: '#ffd8dc',
        background: 'rgba(255,77,94,0.14)',
        padding: '10px 10px',
        fontWeight: 850,
        cursor: 'pointer',
        transition: '0.2s',
    },
    bottomRow: {
        marginTop: 'auto',
        display: 'flex',
        alignItems: 'flex-end',
        gap: 14,
        flexWrap: 'nowrap',
        overflowX: 'auto',
        paddingBottom: 4,
        width: '100%',
        pointerEvents: 'auto',
        WebkitOverflowScrolling: 'touch',
        animation: 'fadeIn 0.45s ease-out',
    },
    sidePanel: {
        flex: '0 0 300px',
        maxWidth: 390,
        background: 'rgba(0, 6, 22, 0.82)',
        backdropFilter: 'blur(18px)',
        border: '1px solid rgba(103,214,255,0.16)',
        borderRadius: 8,
        padding: 18,
        boxShadow: '0 12px 36px rgba(0,0,0,0.42)',
        transition: 'border-color 0.2s ease',
    },
    panelHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    collapseBtn: {
        background: 'rgba(103,214,255,0.08)',
        border: '1px solid rgba(103,214,255,0.2)',
        color: '#67d6ff',
        borderRadius: 6,
        padding: '4px 8px',
        fontSize: '0.65rem',
        fontWeight: 800,
        cursor: 'pointer',
    },
    collapsedPanel: {
        height: 'fit-content',
        paddingBottom: 10,
    },
    kicker: {
        color: '#67d6ff',
        fontSize: '0.68rem',
        fontWeight: 900,
        letterSpacing: 0,
    },
    panelTitle: {
        color: '#fff',
        fontSize: '1rem',
        margin: 0,
    },
    panelDesc: {
        color: '#8fa8b5',
        fontSize: '0.82rem',
        lineHeight: 1.35,
        margin: '0 0 13px',
    },
    select: {
        width: '100%',
        padding: '10px 12px',
        marginBottom: 10,
        borderRadius: 8,
        border: '1px solid rgba(103,214,255,0.24)',
        background: '#081927',
        color: '#fff',
        outline: 'none',
    },
    primaryButton: {
        width: '100%',
        border: 'none',
        borderRadius: 8,
        color: '#fff',
        background: '#1677d2',
        padding: '11px 12px',
        fontWeight: 850,
        cursor: 'pointer',
        transition: '0.2s',
    },
    locationButton: {
        width: '100%',
        border: 'none',
        borderRadius: 8,
        color: '#041016',
        background: '#27e98a',
        padding: '11px 12px',
        fontWeight: 900,
        cursor: 'pointer',
        transition: '0.2s',
    },
    releaseButton: {
        width: '100%',
        border: 'none',
        borderRadius: 8,
        color: '#ffffff',
        backgroundColor: '#ff4d5e',
        padding: '11px 12px',
        fontWeight: 850,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        marginTop: 10,
        boxShadow: '0 4px 12px rgba(255, 77, 94, 0.3)',
    },
    locationBox: {
        display: 'grid',
        gap: 5,
        marginTop: 12,
        padding: 12,
        borderRadius: 8,
        background: 'rgba(103,214,255,0.08)',
        border: '1px solid rgba(103,214,255,0.12)',
    },
    locationState: {
        color: '#fff',
        fontWeight: 850,
    },
    muted: {
        color: '#95aeb9',
        fontSize: '0.78rem',
    },
    metricsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 8,
    },
    miniMetric: {
        display: 'grid',
        gap: 2,
        textAlign: 'center',
        borderRadius: 8,
        padding: '8px 6px',
        background: 'rgba(103,214,255,0.08)',
        color: '#fff',
        fontSize: '0.72rem',
    },
    historyList: {
        display: 'grid',
        gap: 6,
        marginTop: 11,
    },
    historyItem: {
        display: 'flex',
        justifyContent: 'space-between',
        gap: 8,
        color: '#dbeaf0',
        fontSize: '0.76rem',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        paddingTop: 6,
    },
};

export default MapaPage;
