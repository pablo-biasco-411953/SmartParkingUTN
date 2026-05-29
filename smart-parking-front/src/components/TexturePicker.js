import React, { useState, useCallback } from 'react';
import { MapContainer, TileLayer, useMapEvents, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix leaflet icon using CDN URLs to avoid Webpack 5 / React 19 packaging issues
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const DEFAULT_CENTER = [-31.44265, -64.19335]; // UTN FRC

const LocationMarker = ({ position, setPosition }) => {
    useMapEvents({
        click(e) {
            setPosition(e.latlng);
        },
    });
    return position ? <Marker position={position} /> : null;
};

export const TexturePicker = ({ onSelectTexture, onClose }) => {
    const [position, setPosition] = useState(L.latLng(DEFAULT_CENTER[0], DEFAULT_CENTER[1]));
    const [zoom, setZoom] = useState(17);
    const [mapType, setMapType] = useState('satellite'); // 'satellite' | 'streets'

    const handleConfirm = useCallback(() => {
        // Calculate BBOX around the point for ArcGIS Export
        // 1 degree lat is approx 111km. 1 degree lon is approx 111km * cos(lat)
        // A 200m x 200m square is roughly 0.0018 degrees
        const diffLat = 0.0018; 
        const diffLon = 0.0018 / Math.cos(position.lat * Math.PI / 180);
        
        const minLon = position.lng - diffLon;
        const minLat = position.lat - diffLat;
        const maxLon = position.lng + diffLon;
        const maxLat = position.lat + diffLat;

        const url = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${minLon},${minLat},${maxLon},${maxLat}&bboxSR=4326&imageSR=4326&size=1024,1024&format=jpg&f=image`;
        // Send back URL and selected lat/lng
        onSelectTexture(url, position.lat, position.lng);
    }, [position, onSelectTexture]);

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                onSelectTexture(event.target.result, DEFAULT_CENTER[0], DEFAULT_CENTER[1]); // Default UTN coordinates for local files
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div style={styles.overlay}>
            <div style={styles.modal}>
                <div style={styles.header}>
                    <h3 style={styles.title}>Seleccionar Ubicación y Textura Satelital</h3>
                    <button onClick={onClose} style={styles.closeBtn}>X</button>
                </div>
                
                <p style={styles.desc}>1. Hacé clic en el mapa para ubicar el centro real de tu campus o predio.</p>
                
                <div style={styles.mapWrapper}>
                    <button 
                        onClick={() => setMapType(prev => prev === 'satellite' ? 'streets' : 'satellite')}
                        style={styles.mapTypeToggle}
                    >
                        {mapType === 'satellite' ? '🛰️ Vista Satelital (Google)' : '🗺️ Vista Terrestre (OSM)'}
                    </button>
                    <MapContainer 
                        center={DEFAULT_CENTER} 
                        zoom={zoom} 
                        style={{ height: '100%', width: '100%' }}
                        onZoomEnd={(e) => setZoom(e.target.getZoom())}
                    >
                        {mapType === 'satellite' ? (
                            <TileLayer
                                url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                                attribution='&copy; Google Maps'
                            />
                        ) : (
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution='&copy; OpenStreetMap contributors'
                            />
                        )}
                        <LocationMarker position={position} setPosition={setPosition} />
                    </MapContainer>
                </div>

                <div style={styles.actions}>
                    <button style={styles.primaryBtn} onClick={handleConfirm}>
                        Confirmar Ubicación y Generar Textura
                    </button>
                    
                    <span style={{ color: '#8fb6c8', fontSize: '14px' }}>O bien:</span>
                    
                    <label style={styles.uploadBtn}>
                        Subir Imagen Local (JPG/PNG)
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileUpload} />
                    </label>
                </div>
            </div>
        </div>
    );
};

const styles = {
    overlay: {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,4,15,0.85)', backdropFilter: 'blur(4px)',
        display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999,
        pointerEvents: 'auto'
    },
    modal: {
        backgroundColor: '#05111b', border: '1px solid #27e98a', borderRadius: '12px',
        padding: '32px', width: '90%', maxWidth: '650px',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
        display: 'flex', flexDirection: 'column'
    },
    header: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px'
    },
    title: { color: '#fff', margin: 0, fontSize: '22px' },
    closeBtn: {
        background: 'none', border: 'none', color: '#ff4d5e', fontSize: '24px', cursor: 'pointer', fontWeight: 'bold'
    },
    desc: { color: '#8fb6c8', fontSize: '15px', marginBottom: '24px', lineHeight: '1.5' },
    mapWrapper: {
        height: '400px', width: '100%', borderRadius: '12px', overflow: 'hidden', marginBottom: '32px',
        border: '1px solid rgba(117,217,255,0.3)', position: 'relative'
    },
    mapTypeToggle: {
        position: 'absolute',
        top: '12px',
        right: '12px',
        zIndex: 1000,
        backgroundColor: 'rgba(5, 17, 27, 0.85)',
        backdropFilter: 'blur(8px)',
        border: '1px solid #27e98a',
        borderRadius: '20px',
        color: '#27e98a',
        padding: '8px 16px',
        fontWeight: 'bold',
        fontSize: '13px',
        cursor: 'pointer',
        boxShadow: '0 4px 15px rgba(39, 233, 138, 0.25)',
        transition: 'all 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
    },
    actions: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px'
    },
    primaryBtn: {
        backgroundColor: '#27e98a', color: '#000', border: 'none', padding: '14px 28px',
        borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', flex: 1, fontSize: '15px'
    },
    uploadBtn: {
        backgroundColor: 'rgba(117,217,255,0.1)', color: '#67d6ff', border: '1px solid rgba(117,217,255,0.3)',
        padding: '14px 28px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', textAlign: 'center', flex: 1, fontSize: '15px'
    }
};
