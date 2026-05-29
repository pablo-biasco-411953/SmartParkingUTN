import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { login, register, getMarcasVehiculos, getModelosVehiculos } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';

const COLORES = ['Blanco', 'Negro', 'Gris', 'Rojo', 'Azul', 'Verde', 'Bordo', 'Plata', 'Otro'];

export default function LoginScreen({ navigation }) {
    const [mode, setMode] = useState('login');
    const [legajo, setLegajo] = useState('411953');
    const [password, setPassword] = useState('admin1234');
    
    // Formulario de registro
    const [nombre, setNombre] = useState('');
    const [username, setUsername] = useState('');
    const [autoMarcaId, setAutoMarcaId] = useState('');
    const [autoModeloId, setAutoModeloId] = useState('');
    const [autoColor, setAutoColor] = useState('Blanco');
    const [autoPatente, setAutoPatente] = useState('');
    
    const [marcas, setMarcas] = useState([]);
    const [modelos, setModelos] = useState([]);
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        getMarcasVehiculos().then(res => setMarcas(res.data || [])).catch(() => {});
    }, []);

    useEffect(() => {
        if (!autoMarcaId) {
            setModelos([]);
            return;
        }
        getModelosVehiculos(autoMarcaId).then(res => setModelos(res.data || [])).catch(() => {});
    }, [autoMarcaId]);

    const handleLogin = async () => {
        setLoading(true);
        setError('');
        try {
            await login(legajo, password);
            await AsyncStorage.setItem('legajo', legajo);
            navigation.replace('Map');
        } catch (err) {
            setError(err.response?.data || 'Legajo o contraseña incorrectos');
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async () => {
        setLoading(true);
        setError('');
        try {
            const payload = {
                legajo, nombre, username, password,
                emailInstitucional: `${legajo}@tecnicatura.frc.utn.edu.ar`,
                autoMarca: marcas.find(m => m.id == autoMarcaId)?.name || '',
                autoModelo: modelos.find(m => m.id == autoModeloId)?.name || '',
                autoColor, autoPatente,
                autoMarcaId: autoMarcaId ? Number(autoMarcaId) : null,
                autoModeloId: autoModeloId ? Number(autoModeloId) : null,
            };
            await register(payload);
            await AsyncStorage.setItem('legajo', legajo);
            navigation.replace('Map');
        } catch (err) {
            setError(err.response?.data || 'No se pudo registrar la cuenta');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll}>
                <View style={styles.card}>
                    <Text style={styles.title}>SMART PARKING</Text>
                    <Text style={styles.subtitle}>Campus UTN FRC</Text>

                    <View style={styles.tabs}>
                        <TouchableOpacity style={[styles.tab, mode === 'login' && styles.tabActive]} onPress={() => setMode('login')}>
                            <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>Ingresar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.tab, mode === 'register' && styles.tabActive]} onPress={() => setMode('register')}>
                            <Text style={[styles.tabText, mode === 'register' && styles.tabTextActive]}>Crear cuenta</Text>
                        </TouchableOpacity>
                    </View>
                    
                    {error ? <Text style={styles.error}>{error}</Text> : null}
                    
                    <Text style={styles.label}>Legajo UTN</Text>
                    <TextInput style={styles.input} value={legajo} onChangeText={setLegajo} keyboardType="numeric" />

                    {mode === 'register' && (
                        <>
                            <Text style={styles.label}>Nombre Completo</Text>
                            <TextInput style={styles.input} value={nombre} onChangeText={setNombre} />
                            
                            <Text style={styles.label}>Usuario (alias)</Text>
                            <TextInput style={styles.input} value={username} onChangeText={setUsername} />
                        </>
                    )}
                    
                    <Text style={styles.label}>Contraseña</Text>
                    <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry />

                    {mode === 'register' && (
                        <View style={styles.vehicleBox}>
                            <Text style={styles.sectionTitle}>Vehículo</Text>
                            
                            <Text style={styles.label}>Marca</Text>
                            <View style={styles.pickerContainer}>
                                <Picker
                                    selectedValue={autoMarcaId}
                                    onValueChange={(val) => setAutoMarcaId(val)}
                                    style={styles.picker}
                                >
                                    <Picker.Item label="Elegir marca" value="" />
                                    {marcas.map(m => <Picker.Item key={m.id} label={m.name} value={m.id} />)}
                                </Picker>
                            </View>

                            <Text style={styles.label}>Modelo</Text>
                            <View style={styles.pickerContainer}>
                                <Picker
                                    selectedValue={autoModeloId}
                                    onValueChange={(val) => setAutoModeloId(val)}
                                    style={styles.picker}
                                >
                                    <Picker.Item label="Elegir modelo" value="" />
                                    {modelos.map(m => <Picker.Item key={m.id} label={m.name} value={m.id} />)}
                                </Picker>
                            </View>

                            <Text style={styles.label}>Color</Text>
                            <View style={styles.pickerContainer}>
                                <Picker
                                    selectedValue={autoColor}
                                    onValueChange={(val) => setAutoColor(val)}
                                    style={styles.picker}
                                >
                                    {COLORES.map(c => <Picker.Item key={c} label={c} value={c} />)}
                                </Picker>
                            </View>

                            <Text style={styles.label}>Patente</Text>
                            <TextInput style={styles.input} value={autoPatente} onChangeText={t => setAutoPatente(t.toUpperCase())} />
                        </View>
                    )}
                    
                    <TouchableOpacity style={styles.button} onPress={mode === 'login' ? handleLogin : handleRegister} disabled={loading}>
                        {loading ? <ActivityIndicator color="#041016" /> : <Text style={styles.buttonText}>{mode === 'login' ? 'Entrar' : 'Registrarse'}</Text>}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000814' },
    scroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    card: { width: '100%', maxWidth: 400, backgroundColor: 'rgba(5, 17, 27, 0.84)', borderColor: 'rgba(117, 217, 255, 0.18)', borderWidth: 1, borderRadius: 12, padding: 24 },
    title: { color: '#fff', fontSize: 28, fontWeight: 'bold', textAlign: 'center' },
    subtitle: { color: '#8fb6c8', fontSize: 14, textAlign: 'center', marginBottom: 24 },
    tabs: { flexDirection: 'row', marginBottom: 20, gap: 10 },
    tab: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#081927', borderColor: 'rgba(117, 217, 255, 0.18)', borderWidth: 1, alignItems: 'center' },
    tabActive: { backgroundColor: '#dffced', borderColor: 'rgba(39,233,138,0.6)' },
    tabText: { color: '#a8bfcb', fontWeight: 'bold' },
    tabTextActive: { color: '#031119', fontWeight: 'bold' },
    error: { color: '#ff4d5e', marginBottom: 16, textAlign: 'center', backgroundColor: 'rgba(255,77,94,0.14)', padding: 10, borderRadius: 8 },
    label: { color: '#c9dbe4', fontSize: 14, fontWeight: 'bold', marginBottom: 6 },
    input: { backgroundColor: '#081927', borderColor: 'rgba(117,217,255,0.18)', borderWidth: 1, borderRadius: 8, color: '#fff', padding: 14, fontSize: 16, marginBottom: 16 },
    pickerContainer: { backgroundColor: '#081927', borderColor: 'rgba(117,217,255,0.18)', borderWidth: 1, borderRadius: 8, marginBottom: 16 },
    picker: { color: '#fff', height: 50 },
    vehicleBox: { backgroundColor: 'rgba(117,217,255,0.06)', borderColor: 'rgba(117,217,255,0.14)', borderWidth: 1, padding: 14, borderRadius: 8, marginBottom: 16, marginTop: 10 },
    sectionTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
    button: { backgroundColor: '#27e98a', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 10 },
    buttonText: { color: '#041016', fontSize: 16, fontWeight: 'bold' }
});
