import axios from 'axios';

// La IP del backend Spring Boot. Asegurate de que sea la IP de tu PC en la red WiFi.
const api = axios.create({
  baseURL: 'http://192.168.100.9:8080/api'
});

export const login = (legajo, password) => {
  return api.post('/auth/login', { legajo, password });
};

export const register = (payload) => {
  return api.post('/auth/register', payload);
};

export const getSectores = () => {
  return api.get('/sectores');
};

export const getRecomendacion = (edificio) => {
  return api.get(`/sectores/recomendacion?edificio=${encodeURIComponent(edificio)}`);
};

export const getMarcasVehiculos = () => {
  return api.get('/vehiculos/marcas');
};

export const getModelosVehiculos = (marcaId) => {
  return api.get(`/vehiculos/marcas/${marcaId}/modelos`);
};

export default api;
