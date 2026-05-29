import React, { useState, useCallback, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import api from '../services/api';

export const Neo4jConsole = ({ onClose, activeMapId, mapaIdForCypher, savedQueries = [], onSaveQuery, onDbUpdated }) => {
    const defaultQuery = `MATCH (n {mapaId: '${mapaIdForCypher || activeMapId || 'DEFAULT'}'})-[r]->(m) RETURN n, r, m LIMIT 50`;
    const [query, setQuery] = useState(defaultQuery);
    const [graphData, setGraphData] = useState({ nodes: [], links: [] });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [jsonResult, setJsonResult] = useState(null);
    const [aiQueries, setAiQueries] = useState([]);
    const fgRef = useRef();

    const parseNeo4jResponse = (data) => {
        const nodes = new Map();
        const links = [];

        const addNode = (node) => {
            if (!node || typeof node !== 'object') return;
            const id = node._elementId || node.id || node._id || node.nombre || JSON.stringify(node);
            if (!nodes.has(id)) {
                nodes.set(id, {
                    ...node,
                    id, // esto debe ir DESPUES de ...node para no ser pisado
                    name: node.nombre || node.name || id,
                    val: 1,
                    color: node.capacidadTotal ? '#27e98a' : '#8fb6c8',
                });
            }
        };

        data.forEach(row => {
            Object.values(row).forEach(value => {
                if (!value) return;
                if (value.type && (value.startNodeId !== undefined || value.source !== undefined)) {
                    links.push({
                        source: value.startNodeId || value.source,
                        target: value.endNodeId || value.target,
                        name: value.type
                    });
                } else if (Array.isArray(value)) {
                    value.forEach(addNode);
                } else if (typeof value === 'object') {
                    addNode(value);
                }
            });
        });

        return { nodes: Array.from(nodes.values()), links };
    };

    const executeQuery = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.post('/neo4j/query', { query });
            setJsonResult(res.data);
            const parsedGraph = parseNeo4jResponse(res.data);
            setGraphData(parsedGraph);
            if (onDbUpdated) onDbUpdated();
        } catch (err) {
            setError(err.response?.data?.error || err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleNodeClick = useCallback(node => {
        if (fgRef.current) {
            fgRef.current.centerAt(node.x, node.y, 1000);
            fgRef.current.zoom(8, 2000);
        }
    }, [fgRef]);

    return (
        <div style={styles.overlay}>
            <div style={styles.modal}>
                <div style={styles.header}>
                    <h2 style={styles.title}>DB Console (Neo4j Cypher) - Mapa: {activeMapId || 'DEFAULT'}</h2>
                    <button onClick={onClose} style={styles.closeBtn}>Cerrar</button>
                </div>
                
                <div style={styles.split}>
                    <div style={styles.leftPanel}>
                        <textarea 
                            style={styles.editor} 
                            value={query} 
                            onChange={(e) => setQuery(e.target.value)}
                            spellCheck={false}
                        />
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <button style={styles.runBtn} onClick={executeQuery} disabled={loading}>
                                {loading ? 'Ejecutando...' : '▶ Ejecutar Query'}
                            </button>
                            <button style={styles.aiBtn} onClick={async () => {
                                setLoading(true);
                                setQuery('// La Inteligencia Artificial está analizando la logística del lugar...\n// Generando Nodos y Relaciones...');
                                try {
                                    const res = await api.post(`/ai/generate-graph/${activeMapId}`);
                                    const data = res.data;
                                    setQuery(data.cypher || '// No se pudo generar la query.');
                                    setAiQueries(data.queries || []);
                                    if (data.posiciones) {
                                        localStorage.setItem('ai_posiciones', JSON.stringify(data.posiciones));
                                    }
                                    if (data.isEducational === false) {
                                        alert('La IA detectó que NO es un lugar educativo. Se deshabilitaron los horarios.');
                                    }
                                } catch (err) {
                                    setError('Error con la IA: ' + (err.response?.data?.message || err.message));
                                    setQuery(defaultQuery);
                                    setAiQueries([]);
                                } finally {
                                    setLoading(false);
                                }
                            }} disabled={loading}>
                                ✨ Autogenerar DB (IA)
                            </button>
                            {onSaveQuery && (
                                <button style={styles.saveBtn} onClick={() => onSaveQuery(query)}>
                                    💾 Guardar
                                </button>
                            )}
                        </div>
                        
                        <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <button 
                                style={{...styles.saveBtn, fontSize: '12px', padding: '6px 10px', borderColor: '#ff4d5e', color: '#ff4d5e'}} 
                                onClick={() => { 
                                    setQuery(`MATCH (n {mapaId: '${mapaIdForCypher || activeMapId || 'DEFAULT'}'})-[r]->(m) RETURN n, r, m LIMIT 100`); 
                                    executeQuery(); 
                                }}
                                title="Muestra todos los nodos y relaciones de este mapa"
                            >
                                🗺️ Ver Grafo Completo
                            </button>
                            
                            {aiQueries.map((q, i) => (
                                <button 
                                    key={i} 
                                    style={{...styles.saveBtn, fontSize: '12px', padding: '6px 10px', borderColor: '#b28dff', color: '#b28dff'}} 
                                    onClick={() => { setQuery(q); executeQuery(); }}
                                    title={q}
                                >
                                    💡 Sugerencia IA #{i+1}
                                </button>
                            ))}
                        </div>
                        
                        {savedQueries.length > 0 && (
                            <div style={styles.savedQueries}>
                                <div style={{ fontSize: '13px', color: '#8fb6c8', marginBottom: '8px', fontWeight: 'bold' }}>Queries Guardadas:</div>
                                {savedQueries.map((sq, idx) => (
                                    <div key={idx} style={styles.savedQueryItem} onClick={() => setQuery(sq)}>
                                        {sq.length > 50 ? sq.substring(0, 50) + '...' : sq}
                                    </div>
                                ))}
                            </div>
                        )}
                        
                        {error && <div style={styles.error}>{error}</div>}
                        
                        <div style={styles.jsonOutput}>
                            <pre style={{ margin: 0, color: '#e0e0e0', fontSize: '11px', whiteSpace: 'pre-wrap' }}>
                                {jsonResult ? JSON.stringify(jsonResult, null, 2) : '// Los resultados JSON apareceran aqui'}
                            </pre>
                        </div>
                    </div>

                    <div style={styles.rightPanel}>
                        <div style={{ flex: 1, backgroundColor: '#000814', borderRadius: '8px', overflow: 'hidden' }}>
                            <ForceGraph2D
                                ref={fgRef}
                                width={600}
                                height={600}
                                graphData={graphData}
                                nodeLabel="name"
                                nodeColor="color"
                                linkColor={() => 'rgba(103, 214, 255, 0.4)'}
                                linkWidth={1.5}
                                linkDirectionalArrowLength={4}
                                linkDirectionalArrowRelPos={1}
                                linkCurvature={0.2}
                                onNodeClick={handleNodeClick}
                                linkLabel="name"
                                nodeCanvasObject={(node, ctx, globalScale) => {
                                    const label = node.name;
                                    const fontSize = Math.max(12 / globalScale, 2);
                                    ctx.beginPath();
                                    ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI, false);
                                    ctx.fillStyle = node.color || '#27e98a';
                                    ctx.fill();
                                    
                                    ctx.font = `${fontSize}px Sans-Serif`;
                                    ctx.textAlign = 'center';
                                    ctx.textBaseline = 'middle';
                                    ctx.fillStyle = '#ffffff';
                                    ctx.fillText(label, node.x, node.y + 7 + fontSize);
                                }}
                                linkCanvasObjectMode={() => 'after'}
                                linkCanvasObject={(link, ctx, globalScale) => {
                                    const start = link.source;
                                    const end = link.target;
                                    if (typeof start !== 'object' || typeof end !== 'object') return;

                                    const textPos = {
                                        x: start.x + (end.x - start.x) / 2,
                                        y: start.y + (end.y - start.y) / 2
                                    };
                                    
                                    const relLink = { x: end.x - start.x, y: end.y - start.y };
                                    const maxTextLength = Math.sqrt(Math.pow(relLink.x, 2) + Math.pow(relLink.y, 2)) - 10;
                                    
                                    let textAngle = Math.atan2(relLink.y, relLink.x);
                                    if (textAngle > Math.PI / 2) textAngle = -(Math.PI - textAngle);
                                    if (textAngle < -Math.PI / 2) textAngle = -(-Math.PI - textAngle);

                                    const label = link.name;
                                    const fontSize = Math.max(Math.min(4, maxTextLength / 5), 2);
                                    
                                    ctx.save();
                                    ctx.translate(textPos.x, textPos.y);
                                    ctx.rotate(textAngle);
                                    
                                    ctx.font = `${fontSize}px Sans-Serif`;
                                    const textWidth = ctx.measureText(label).width;
                                    const padding = fontSize * 0.2;
                                    
                                    ctx.fillStyle = 'rgba(0, 8, 20, 0.85)';
                                    ctx.fillRect(-textWidth/2 - padding, -fontSize/2 - padding, textWidth + padding*2, fontSize + padding*2);
                                    
                                    ctx.textAlign = 'center';
                                    ctx.textBaseline = 'middle';
                                    ctx.fillStyle = '#67d6ff';
                                    ctx.fillText(label, 0, 0);
                                    ctx.restore();
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const styles = {
    overlay: {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,4,15,0.9)', backdropFilter: 'blur(8px)',
        display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99999,
        pointerEvents: 'auto'
    },
    modal: {
        backgroundColor: '#05111b', border: '1px solid #27e98a', borderRadius: '12px',
        padding: '20px', width: '95%', height: '90%', display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
    },
    header: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'
    },
    title: { color: '#27e98a', margin: 0, fontFamily: 'monospace' },
    closeBtn: {
        background: 'none', border: '1px solid #ff4d5e', color: '#ff4d5e', padding: '6px 12px',
        borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold'
    },
    split: {
        display: 'flex', gap: '20px', flex: 1, height: 'calc(100% - 60px)'
    },
    leftPanel: {
        flex: 1, display: 'flex', flexDirection: 'column', gap: '10px'
    },
    rightPanel: {
        flex: 1.5, display: 'flex', flexDirection: 'column'
    },
    editor: {
        height: '150px', backgroundColor: '#000814', color: '#67d6ff', border: '1px solid #1a365d',
        borderRadius: '8px', padding: '12px', fontFamily: 'monospace', fontSize: '14px', resize: 'vertical'
    },
    runBtn: {
        backgroundColor: '#27e98a', color: '#000', border: 'none', padding: '12px',
        borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'monospace', flex: 1
    },
    aiBtn: {
        backgroundColor: 'transparent', color: '#b28dff', border: '1px solid #b28dff', padding: '12px',
        borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'monospace', flex: 1
    },
    saveBtn: {
        backgroundColor: 'transparent', color: '#67d6ff', border: '1px solid #67d6ff', padding: '12px',
        borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'monospace'
    },
    savedQueries: {
        backgroundColor: '#00152b', border: '1px solid #1a365d', borderRadius: '8px', padding: '12px',
        maxHeight: '150px', overflowY: 'auto'
    },
    savedQueryItem: {
        backgroundColor: '#000814', padding: '8px', borderRadius: '4px', border: '1px solid #1a365d',
        color: '#27e98a', fontSize: '12px', fontFamily: 'monospace', cursor: 'pointer', marginBottom: '4px'
    },
    error: {
        backgroundColor: 'rgba(255, 77, 94, 0.1)', color: '#ff4d5e', padding: '12px',
        borderRadius: '8px', border: '1px solid #ff4d5e', fontSize: '13px'
    },
    jsonOutput: {
        flex: 1, backgroundColor: '#000814', border: '1px solid #1a365d', borderRadius: '8px',
        padding: '12px', overflowY: 'auto'
    }
};
