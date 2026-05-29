import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import ParkingMap3D from '../components/ParkingMap3D';
import { getSectores } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function MapScreen({ navigation }) {
    const [sectores, setSectores] = useState([]);
    const [legajo, setLegajo] = useState('');

    useEffect(() => {
        AsyncStorage.getItem('legajo').then(val => setLegajo(val || ''));
        cargarSectores();
    }, []);

    const cargarSectores = async () => {
        try {
            const res = await getSectores();
            setSectores(res.data);
        } catch (e) {
            console.error(e);
        }
    };

    const handleLogout = async () => {
        await AsyncStorage.removeItem('legajo');
        navigation.replace('Login');
    };

    const libres = sectores.filter(s => s.espacioDisponible > 0).length;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.mapContainer}>
                <ParkingMap3D sectoresLibres={sectores.filter(s => s.espacioDisponible > 0)} />
            </View>
            
            <View style={styles.overlay} pointerEvents="box-none">
                <View style={styles.topBar}>
                    <View>
                        <Text style={styles.title}>SMART PARKING</Text>
                        <Text style={styles.subtitle}>UTN FRC · Campus inteligente</Text>
                    </View>
                    <View style={styles.stats}>
                        <View style={styles.statBox}>
                            <Text style={styles.statValue}>{libres}</Text>
                            <Text style={styles.statLabel}>Libres</Text>
                        </View>
                    </View>
                    <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                        <Text style={styles.logoutText}>Salir ({legajo})</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.bottomRow} pointerEvents="box-none">
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
                        
                        <View style={styles.card}>
                            <Text style={styles.kicker}>NEO4J</Text>
                            <Text style={styles.cardTitle}>Recomendación</Text>
                            <Text style={styles.cardDesc}>El grafo conecta edificios con playas cercanas y prioriza sectores con disponibilidad.</Text>
                            <TouchableOpacity style={styles.actionBtn}>
                                <Text style={styles.actionText}>Buscar mejor sector</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.card}>
                            <Text style={styles.kicker}>GPS</Text>
                            <Text style={styles.cardTitle}>Validación de campus</Text>
                            <Text style={styles.cardDesc}>Usa la ubicación del dispositivo para confirmar si estás dentro de UTN.</Text>
                            <TouchableOpacity style={styles.actionBtn}>
                                <Text style={styles.actionText}>Detectar mi ubicación</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.card}>
                            <Text style={styles.kicker}>CASSANDRA</Text>
                            <Text style={styles.cardTitle}>Eventos e historial</Text>
                            <Text style={styles.cardDesc}>Auditoría de eventos temporales en tiempo real.</Text>
                            <View style={styles.metricsGrid}>
                                <Text style={styles.metric}>Entradas: 12</Text>
                                <Text style={styles.metric}>Salidas: 8</Text>
                            </View>
                        </View>

                    </ScrollView>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000814',
    },
    mapContainer: {
        ...StyleSheet.absoluteFillObject,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'space-between',
        padding: 16,
    },
    topBar: {
        backgroundColor: 'rgba(0, 6, 22, 0.76)',
        borderColor: 'rgba(103,214,255,0.18)',
        borderWidth: 1,
        borderRadius: 8,
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 40, // Space for status bar on some devices
    },
    title: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    subtitle: {
        color: '#8fb6c8',
        fontSize: 12,
    },
    stats: {
        flexDirection: 'row',
    },
    statBox: {
        backgroundColor: 'rgba(37, 96, 122, 0.18)',
        borderColor: 'rgba(103,214,255,0.14)',
        borderWidth: 1,
        borderRadius: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        alignItems: 'center',
    },
    statValue: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    statLabel: {
        color: '#8fa8b5',
        fontSize: 10,
    },
    logoutBtn: {
        backgroundColor: 'rgba(255,77,94,0.14)',
        borderColor: 'rgba(255,77,94,0.36)',
        borderWidth: 1,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6,
    },
    logoutText: {
        color: '#ffd8dc',
        fontSize: 12,
        fontWeight: 'bold',
    },
    bottomRow: {
        marginBottom: 10,
    },
    scroll: {
        paddingRight: 32, // Allow scrolling past the last card
        gap: 14,
    },
    card: {
        width: 300,
        backgroundColor: 'rgba(0, 6, 22, 0.82)',
        borderColor: 'rgba(103,214,255,0.16)',
        borderWidth: 1,
        borderRadius: 8,
        padding: 16,
        marginRight: 14,
    },
    kicker: {
        color: '#67d6ff',
        fontSize: 11,
        fontWeight: 'bold',
    },
    cardTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    cardDesc: {
        color: '#8fa8b5',
        fontSize: 13,
        marginBottom: 12,
        lineHeight: 18,
    },
    actionBtn: {
        backgroundColor: 'rgba(103,214,255,0.08)',
        borderColor: 'rgba(103,214,255,0.28)',
        borderWidth: 1,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    actionText: {
        color: '#dff7ff',
        fontWeight: 'bold',
    },
    metricsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    metric: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    }
});
