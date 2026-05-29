import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || `http://${window.location.hostname}:8080/api`
});

export const login = (legajo, password) => {
  return api.post('/auth/login', { legajo, password });
};

export const register = (payload) => {
  return api.post('/auth/register', payload);
};

export const forgotPassword = (legajoOrEmail) => {
  if (legajoOrEmail && legajoOrEmail.includes('@')) {
    return api.post('/auth/forgot-password', { email: legajoOrEmail });
  }
  return api.post('/auth/forgot-password', { legajo: legajoOrEmail });
};

export const resetPassword = (token, newPassword) => {
  return api.post('/auth/reset-password', { token, newPassword });
};

export const getRecomendacion = (edificio, mapaId) => {
  return api.get(`/sectores/recomendacion?edificio=${encodeURIComponent(edificio)}&mapaId=${encodeURIComponent(mapaId || 'DEFAULT')}`);
};

export const getMarcasVehiculos = () => {
  return api.get('/vehiculos/marcas');
};

export const getModelosVehiculos = (marcaId) => {
  return api.get(`/vehiculos/marcas/${marcaId}/modelos`);
};

export const getMapas = (legajo) => {
  return api.get(`/mapas?legajo=${encodeURIComponent(legajo)}`);
};

export const getMapa = (id) => {
  return api.get(`/mapas/${encodeURIComponent(id)}`);
};

export const saveMapa = (payload) => {
  return api.post('/mapas', payload);
};

export const crearMapaVacio = (payload) => {
  return api.post('/mapas/nuevo', payload);
};

export const activarMapa = (id) => {
  return api.post(`/mapas/${encodeURIComponent(id)}/activar`);
};

export default api;
