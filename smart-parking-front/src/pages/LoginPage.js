import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMarcasVehiculos, getModelosVehiculos, login, register, forgotPassword, resetPassword } from '../services/api';

const DOMINIOS = [
    'tecnicatura', 'frc', 'cbasicas', 'civil', 'computos', 'decanato', 'egresado',
    'electrica', 'electronica', 'extension', 'industrial', 'licenciatura',
    'mecanica', 'metalurgica', 'org', 'posgrado', 'punilla', 'quimica',
    'radio', 'sa', 'sae', 'scdt'
];

const COLORES = ['Blanco', 'Negro', 'Gris', 'Rojo', 'Azul', 'Verde', 'Bordo', 'Plata', 'Otro'];

const initialForm = {
    legajo: '',
    nombre: '',
    username: '',
    password: '',
    dominio: 'tecnicatura',
    autoMarca: '',
    autoModelo: '',
    autoColor: 'Blanco',
    autoPatente: '',
    autoMarcaId: '',
    autoModeloId: '',
};

const LoginPage = () => {
    const [mode, setMode] = useState('login');
    const [legajo, setLegajo] = useState('411953');
    const [password, setPassword] = useState('admin1234');
    const [form, setForm] = useState(initialForm);
    const [marcas, setMarcas] = useState([]);
    const [modelos, setModelos] = useState([]);
    const [mensaje, setMensaje] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const [forgotInput, setForgotInput] = useState('');
    const [demoBypass, setDemoBypass] = useState(null);
    const [resetToken, setResetToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const emailInstitucional = useMemo(
        () => form.legajo ? `${form.legajo}@${form.dominio}.frc.utn.edu.ar` : '',
        [form.legajo, form.dominio]
    );

    const passwordScore = useMemo(() => {
        const pass = form.password;
        return [
            pass.length >= 8,
            /[A-Z]/.test(pass),
            /[a-z]/.test(pass),
            /\d/.test(pass),
        ].filter(Boolean).length;
    }, [form.password]);

    useEffect(() => {
        getMarcasVehiculos()
            .then((res) => setMarcas(res.data || []))
            .catch(() => setMarcas([]));
    }, []);

    useEffect(() => {
        if (!form.autoMarcaId) {
            setModelos([]);
            return;
        }
        getModelosVehiculos(form.autoMarcaId)
            .then((res) => setModelos(res.data || []))
            .catch(() => setModelos([]));
    }, [form.autoMarcaId]);

    const updateForm = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMensaje('');
        try {
            await login(legajo, password);
            localStorage.setItem('legajo', legajo);
            navigate('/mapa');
        } catch (error) {
            setMensaje(error.response?.data || 'Legajo o contrasena incorrectos');
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMensaje('');
        try {
            const payload = {
                legajo: form.legajo,
                nombre: form.nombre,
                username: form.username,
                password: form.password,
                emailInstitucional,
                autoMarca: form.autoMarca,
                autoModelo: form.autoModelo,
                autoColor: form.autoColor,
                autoPatente: form.autoPatente,
                autoMarcaId: form.autoMarcaId ? Number(form.autoMarcaId) : null,
                autoModeloId: form.autoModeloId ? Number(form.autoModeloId) : null,
            };
            await register(payload);
            localStorage.setItem('legajo', form.legajo);
            navigate('/mapa');
        } catch (error) {
            setMensaje(error.response?.data || 'No se pudo registrar la cuenta');
        } finally {
            setLoading(false);
        }
    };

    const onMarcaChange = (id) => {
        const marca = marcas.find((item) => String(item.id) === String(id));
        setForm((prev) => ({
            ...prev,
            autoMarcaId: id,
            autoMarca: marca?.name || '',
            autoModeloId: '',
            autoModelo: '',
        }));
    };

    const onModeloChange = (id) => {
        const modelo = modelos.find((item) => String(item.id) === String(id));
        setForm((prev) => ({
            ...prev,
            autoModeloId: id,
            autoModelo: modelo?.name || '',
        }));
    };

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        if (!forgotInput || !forgotInput.trim()) {
            setMensaje('Por favor, ingresa tu legajo o correo');
            return;
        }
        setLoading(true);
        setMensaje('');
        setDemoBypass(null);
        try {
            const res = await forgotPassword(forgotInput.trim());
            setMensaje(res.data.message || 'Se envió el correo de demostración (ver consola).');
            if (res.data.demoBypass) {
                setDemoBypass(res.data.demoBypass);
            }
        } catch (error) {
            setMensaje(error.response?.data || 'No se pudo procesar la solicitud de recuperación');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (!resetToken || !resetToken.trim()) {
            setMensaje('El token es requerido');
            return;
        }
        if (!newPassword) {
            setMensaje('La nueva contraseña es requerida');
            return;
        }
        if (newPassword !== confirmPassword) {
            setMensaje('Las contraseñas no coinciden');
            return;
        }
        setLoading(true);
        setMensaje('');
        try {
            await resetPassword(resetToken.trim(), newPassword);
            let extractedLegajo = forgotInput.trim();
            if (extractedLegajo.includes('@')) {
                const atIndex = extractedLegajo.indexOf('@');
                if (atIndex > 0) {
                    extractedLegajo = extractedLegajo.substring(0, atIndex);
                }
            }
            if (extractedLegajo) {
                setLegajo(extractedLegajo);
            }
            setMensaje('¡Contraseña restablecida con éxito! Ingresa con tu nueva contraseña.');
            setMode('login');
            setForgotInput('');
            setDemoBypass(null);
            setResetToken('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            setMensaje(error.response?.data || 'No se pudo restablecer la contraseña');
        } finally {
            setLoading(false);
        }
    };

    const newPasswordScore = useMemo(() => {
        const pass = newPassword;
        return [
            pass.length >= 8,
            /[A-Z]/.test(pass),
            /[a-z]/.test(pass),
            /\d/.test(pass),
        ].filter(Boolean).length;
    }, [newPassword]);

    return (
        <div style={styles.container}>
            <style>{`
                input::placeholder { color: rgba(220,240,255,0.45); }
                select { color: #ffffff; background-color: #081927; }
                select option { color: #ffffff; background-color: #081927; }
                @keyframes rise { from { opacity:0; transform: translateY(18px); } to { opacity:1; transform: translateY(0); } }
                .field:focus { border-color: rgba(39,233,138,0.65) !important; box-shadow: 0 0 0 3px rgba(39,233,138,0.12); }
                .soft-btn:hover, .primary:hover { transform: translateY(-1px); filter: brightness(1.06); }
                .neon-link {
                    color: #67d6ff;
                    cursor: pointer;
                    font-size: 0.85rem;
                    font-weight: 700;
                    text-decoration: none;
                    transition: all 0.2s ease;
                    display: inline-block;
                    margin-top: 4px;
                }
                .neon-link:hover {
                    color: #27e98a;
                    text-shadow: 0 0 8px rgba(39, 233, 138, 0.6);
                }
                @keyframes pulseGlow {
                    0% { box-shadow: 0 0 10px rgba(103, 214, 255, 0.2), inset 0 0 10px rgba(103, 214, 255, 0.1); }
                    50% { box-shadow: 0 0 20px rgba(103, 214, 255, 0.4), inset 0 0 15px rgba(103, 214, 255, 0.2); }
                    100% { box-shadow: 0 0 10px rgba(103, 214, 255, 0.2), inset 0 0 10px rgba(103, 214, 255, 0.1); }
                }
                .demo-banner {
                    background: rgba(10, 38, 64, 0.65);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    border: 1px solid rgba(103, 214, 255, 0.35);
                    border-radius: 8px;
                    padding: 14px;
                    margin-top: 18px;
                    color: #ffffff;
                    cursor: pointer;
                    font-size: 0.9rem;
                    font-weight: 700;
                    transition: all 0.3s ease;
                    animation: pulseGlow 2.5s infinite ease-in-out;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    text-align: center;
                }
                .demo-banner:hover {
                    transform: translateY(-2px);
                    border-color: #27e98a;
                    background: rgba(39, 233, 138, 0.1);
                    box-shadow: 0 0 25px rgba(39, 233, 138, 0.4);
                    color: #27e98a;
                }
                @media (max-width: 850px) {
                    .login-container { grid-template-columns: 1fr !important; padding: 20px !important; gap: 40px !important; }
                    .visual-section { text-align: center; justify-items: center; }
                    .hero-title { font-size: 2.4rem !important; }
                    .hero-copy { font-size: 1rem !important; margin: 0 auto; }
                    .feature-list { justify-content: center; }
                    .two-cols { grid-template-columns: 1fr !important; gap: 14px !important; }
                }
            `}</style>

            <section style={styles.visual} className="visual">
                <img src="/UTN_LOGO.png" alt="UTN Logo" style={styles.logo} />
                <div>
                    <h1 style={styles.heroTitle} className="hero-title">SMART PARKING</h1>
                    <p style={styles.heroCopy} className="hero-copy">El primer campus inteligente de Argentina. Encontra lugar rapido, administra eventos con Cassandra y explora la red de estacionamientos con Neo4j.</p>
                </div>
                <div style={styles.featureList} className="feature-list">
                    <Feature text="Motor 3D" />
                    <Feature text="Recomendador IA" />
                    <Feature text="Analisis OCR" />
                </div>
            </section>

            <section style={styles.card}>
                {(mode === 'login' || mode === 'register') ? (
                    <div style={styles.tabs}>
                        <button style={mode === 'login' ? styles.tabActive : styles.tab} onClick={() => { setMode('login'); setMensaje(''); }}>Ingresar</button>
                        <button style={mode === 'register' ? styles.tabActive : styles.tab} onClick={() => { setMode('register'); setMensaje(''); }}>Crear cuenta</button>
                    </div>
                ) : (
                    <div style={{ marginBottom: 20, textAlign: 'center' }}>
                        <h2 style={{ color: '#ffffff', margin: '0 0 6px 0', fontSize: '1.4rem' }}>
                            {mode === 'forgot' ? 'Recuperar Contraseña' : 'Establecer Nueva Contraseña'}
                        </h2>
                        <p style={{ color: '#acc3cf', margin: 0, fontSize: '0.85rem' }}>
                            {mode === 'forgot' ? 'Te enviaremos una simulación de correo para restablecer tu clave.' : 'Ingresa la nueva contraseña para tu cuenta.'}
                        </p>
                    </div>
                )}

                {mensaje && <div style={styles.message}>{mensaje}</div>}

                {mode === 'login' && (
                    <form onSubmit={handleLogin} style={styles.form}>
                        <Field label="Legajo">
                            <input className="field" style={styles.input} value={legajo} onChange={(e) => setLegajo(e.target.value)} />
                        </Field>
                        <Field label="Contrasena">
                            <input className="field" type="password" style={styles.input} value={password} onChange={(e) => setPassword(e.target.value)} />
                            <div style={{ textAlign: 'right' }}>
                                <span className="neon-link" onClick={() => { setMode('forgot'); setMensaje(''); }}>
                                    ¿Olvidaste tu contraseña?
                                </span>
                            </div>
                        </Field>
                        <button className="primary" disabled={loading} type="submit" style={styles.primaryButton}>
                            {loading ? 'Validando...' : 'Entrar al mapa'}
                        </button>
                    </form>
                )}

                {mode === 'forgot' && (
                    <form onSubmit={handleForgotPassword} style={styles.form}>
                        <Field label="Legajo o Correo Institucional">
                            <input 
                                className="field" 
                                style={styles.input} 
                                value={forgotInput} 
                                onChange={(e) => setForgotInput(e.target.value)} 
                                placeholder="Ej: 411953 o legajo@tecnicatura.frc.utn.edu.ar" 
                            />
                        </Field>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 6 }}>
                            <button 
                                className="soft-btn" 
                                type="button" 
                                style={{ ...styles.tab, border: '1px solid rgba(117,217,255,0.18)', background: 'transparent' }} 
                                onClick={() => { setMode('login'); setMensaje(''); setDemoBypass(null); }}
                            >
                                Volver
                            </button>
                            <button className="primary" disabled={loading} type="submit" style={styles.primaryButton}>
                                {loading ? 'Recuperar...' : 'Recuperar'}
                            </button>
                        </div>

                        {demoBypass && (
                            <div 
                                className="demo-banner" 
                                onClick={() => {
                                    setResetToken(demoBypass.token);
                                    setNewPassword('');
                                    setConfirmPassword('');
                                    setMode('reset');
                                    setMensaje('Asistente Demo: Token cargado automáticamente. Escribe tu nueva contraseña.');
                                }}
                            >
                                👉 [ASISTENTE DEMO] Hacer clic aquí para restaurar la clave directamente usando el token generado en esta sesión.
                            </div>
                        )}
                    </form>
                )}

                {mode === 'reset' && (
                    <form onSubmit={handleResetPassword} style={styles.form}>
                        <Field label="Token de Recuperación">
                            <input 
                                className="field" 
                                style={styles.input} 
                                value={resetToken} 
                                onChange={(e) => setResetToken(e.target.value)} 
                                placeholder="Ingresa el token UUID recibido" 
                            />
                        </Field>

                        <Field label="Nueva Contraseña">
                            <input 
                                className="field" 
                                type="password" 
                                style={styles.input} 
                                value={newPassword} 
                                onChange={(e) => setNewPassword(e.target.value)} 
                                placeholder="Mínimo 8, mayúscula y número" 
                            />
                            <div style={styles.strengthTrack}>
                                {[0, 1, 2, 3].map((step) => (
                                    <span 
                                        key={step} 
                                        style={{ 
                                            ...styles.strengthDot, 
                                            background: newPasswordScore > step ? '#27e98a' : '#173344' 
                                        }} 
                                    />
                                ))}
                            </div>
                        </Field>

                        <Field label="Confirmar Contraseña">
                            <input 
                                className="field" 
                                type="password" 
                                style={styles.input} 
                                value={confirmPassword} 
                                onChange={(e) => setConfirmPassword(e.target.value)} 
                                placeholder="Confirma tu nueva contraseña" 
                            />
                        </Field>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 6 }}>
                            <button 
                                className="soft-btn" 
                                type="button" 
                                style={{ ...styles.tab, border: '1px solid rgba(117,217,255,0.18)', background: 'transparent' }} 
                                onClick={() => { setMode('login'); setMensaje(''); }}
                            >
                                Volver
                            </button>
                            <button className="primary" disabled={loading} type="submit" style={styles.primaryButton}>
                                {loading ? 'Restableciendo...' : 'Restablecer Clave'}
                            </button>
                        </div>
                    </form>
                )}

                {mode === 'register' && (
                    <form onSubmit={handleRegister} style={styles.form}>
                        <div style={styles.twoCols}>
                            <Field label="Legajo">
                                <input className="field" style={styles.input} value={form.legajo} onChange={(e) => updateForm('legajo', e.target.value)} placeholder="411953" />
                            </Field>
                            <Field label="Username">
                                <input className="field" style={styles.input} value={form.username} onChange={(e) => updateForm('username', e.target.value)} placeholder="pabli.utn" />
                            </Field>
                        </div>

                        <Field label="Nombre completo">
                            <input className="field" style={styles.input} value={form.nombre} onChange={(e) => updateForm('nombre', e.target.value)} placeholder="Nombre y apellido" />
                        </Field>

                        <Field label="Correo institucional">
                            <div style={styles.emailRow}>
                                <input className="field" style={{ ...styles.input, flex: 1 }} value={form.legajo} onChange={(e) => updateForm('legajo', e.target.value)} placeholder="411953" />
                                <span style={styles.at}>@</span>
                                <select className="field" style={{ ...styles.input, flex: 1 }} value={form.dominio} onChange={(e) => updateForm('dominio', e.target.value)}>
                                    {DOMINIOS.map((dominio) => <option key={dominio} value={dominio} style={styles.option}>{dominio}</option>)}
                                </select>
                            </div>
                            <span style={styles.emailPreview}>{emailInstitucional || 'legajo@tecnicatura.frc.utn.edu.ar'}</span>
                        </Field>

                        <Field label="Contrasena segura">
                            <input className="field" type="password" style={styles.input} value={form.password} onChange={(e) => updateForm('password', e.target.value)} placeholder="Minimo 8, mayuscula y numero" />
                            <div style={styles.strengthTrack}>
                                {[0, 1, 2, 3].map((step) => <span key={step} style={{ ...styles.strengthDot, background: passwordScore > step ? '#27e98a' : '#173344' }} />)}
                            </div>
                        </Field>

                        <div style={styles.vehicleBox}>
                            <h3 style={styles.sectionTitle}>Tu auto</h3>
                            <div style={styles.twoCols} className="two-cols">
                                <Field label="Marca">
                                    <select className="field" style={styles.input} value={form.autoMarcaId} onChange={(e) => onMarcaChange(e.target.value)}>
                                        <option value="" style={styles.option}>Elegir marca</option>
                                        {marcas.map((marca) => <option key={marca.id} value={marca.id} style={styles.option}>{marca.name}</option>)}
                                    </select>
                                </Field>
                                <Field label="Modelo">
                                    <select className="field" style={styles.input} value={form.autoModeloId} onChange={(e) => onModeloChange(e.target.value)}>
                                        <option value="" style={styles.option}>Elegir modelo</option>
                                        {modelos.map((modelo) => <option key={modelo.id} value={modelo.id} style={styles.option}>{modelo.name}</option>)}
                                    </select>
                                </Field>
                            </div>
                            <div style={styles.twoCols} className="two-cols">
                                <Field label="Color">
                                    <select className="field" style={styles.input} value={form.autoColor} onChange={(e) => updateForm('autoColor', e.target.value)}>
                                        {COLORES.map((color) => <option key={color} value={color} style={styles.option}>{color}</option>)}
                                    </select>
                                </Field>
                                <Field label="Patente opcional">
                                    <input className="field" style={styles.input} value={form.autoPatente} onChange={(e) => updateForm('autoPatente', e.target.value.toUpperCase())} placeholder="AB123CD" />
                                </Field>
                            </div>
                        </div>

                        <button className="primary" disabled={loading} type="submit" style={styles.primaryButton}>
                            {loading ? 'Creando...' : 'Crear cuenta y entrar'}
                        </button>
                    </form>
                )}
            </section>
        </div>
    );
};

const Field = ({ label, children }) => (
    <label style={styles.field}>
        <span style={styles.label}>{label}</span>
        {children}
    </label>
);

const Feature = ({ text }) => (
    <span style={{
        background: 'rgba(39, 233, 138, 0.12)',
        color: '#27e98a',
        padding: '6px 12px',
        borderRadius: '999px',
        fontSize: '0.8rem',
        fontWeight: '800',
        border: '1px solid rgba(39, 233, 138, 0.25)'
    }}>
        {text}
    </span>
);

const styles = {
    container: {
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: 'minmax(320px, 0.85fr) minmax(420px, 1.15fr)',
        gap: 28,
        alignItems: 'center',
        padding: 34,
        boxSizing: 'border-box',
        background: 'linear-gradient(135deg, #031119 0%, #0a2640 52%, #06201a 100%)',
        fontFamily: "'Segoe UI', sans-serif",
    },
    visual: {
        color: '#fff',
        display: 'grid',
        gap: 24,
        animation: 'rise 0.45s ease-out',
    },
    logo: {
        width: 210,
        filter: 'drop-shadow(0 18px 40px rgba(39,233,138,0.2))',
    },
    heroTitle: {
        margin: 0,
        fontSize: 'clamp(2.5rem, 5vw, 4.8rem)',
        lineHeight: 0.96,
        letterSpacing: 0,
    },
    heroCopy: {
        maxWidth: 520,
        color: '#acc3cf',
        fontSize: '1.08rem',
        lineHeight: 1.45,
    },
    featureList: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 10,
    },
    card: {
        width: '100%',
        maxWidth: 720,
        justifySelf: 'center',
        background: 'rgba(5, 17, 27, 0.84)',
        border: '1px solid rgba(117, 217, 255, 0.18)',
        borderRadius: 8,
        boxShadow: '0 24px 70px rgba(0,0,0,0.42)',
        padding: 22,
        boxSizing: 'border-box',
        animation: 'rise 0.55s ease-out',
    },
    tabs: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 8,
        marginBottom: 18,
    },
    tab: {
        border: '1px solid rgba(117,217,255,0.18)',
        background: '#081927',
        color: '#a8bfcb',
        borderRadius: 8,
        padding: 12,
        cursor: 'pointer',
        fontWeight: 800,
    },
    tabActive: {
        border: '1px solid rgba(39,233,138,0.6)',
        background: '#dffced',
        color: '#031119',
        borderRadius: 8,
        padding: 12,
        cursor: 'pointer',
        fontWeight: 900,
    },
    form: {
        display: 'grid',
        gap: 14,
    },
    twoCols: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gap: 12,
    },
    field: {
        display: 'grid',
        gap: 7,
    },
    label: {
        color: '#c9dbe4',
        fontSize: '0.82rem',
        fontWeight: 800,
    },
    input: {
        width: '100%',
        boxSizing: 'border-box',
        padding: '12px 13px',
        borderRadius: 8,
        border: '1px solid rgba(117,217,255,0.18)',
        background: '#081927',
        color: '#fff',
        outline: 'none',
        fontSize: '0.95rem',
    },
    option: {
        color: '#ffffff',
        background: '#081927',
    },
    emailRow: {
        display: 'flex',
        gap: 8,
        alignItems: 'center',
    },
    at: {
        color: '#67d6ff',
        fontWeight: 900,
    },
    emailPreview: {
        color: '#8fb6c8',
        fontSize: '0.78rem',
    },
    strengthTrack: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 6,
    },
    strengthDot: {
        height: 5,
        borderRadius: 999,
    },
    vehicleBox: {
        display: 'grid',
        gap: 12,
        border: '1px solid rgba(117,217,255,0.14)',
        background: 'rgba(117,217,255,0.06)',
        borderRadius: 8,
        padding: 14,
    },
    sectionTitle: {
        color: '#fff',
        margin: 0,
        fontSize: '1rem',
    },
    primaryButton: {
        border: 'none',
        borderRadius: 8,
        padding: 14,
        background: '#27e98a',
        color: '#031119',
        fontWeight: 950,
        cursor: 'pointer',
        transition: '0.2s',
    },
    message: {
        color: '#ffd6d6',
        background: 'rgba(255, 80, 80, 0.12)',
        border: '1px solid rgba(255, 80, 80, 0.22)',
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
        fontWeight: 700,
    },
};

export default LoginPage;
