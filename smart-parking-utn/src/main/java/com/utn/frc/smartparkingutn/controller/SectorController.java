package com.utn.frc.smartparkingutn.controller;

import com.utn.frc.smartparkingutn.model.RegistroOcupacion;
import com.utn.frc.smartparkingutn.model.SectorEstacionamiento;
import com.utn.frc.smartparkingutn.repository.HistorialRepository;
import com.utn.frc.smartparkingutn.repository.SectorRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpEntity;
import org.springframework.http.MediaType;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.TextStyle;
import java.util.Base64;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/sectores")
@CrossOrigin(origins = "*")
public class SectorController {

    private final SectorRepository sectorRepository;
    private final HistorialRepository historialRepository;

    public SectorController(SectorRepository sectorRepository, HistorialRepository historialRepository) {
        this.sectorRepository = sectorRepository;
        this.historialRepository = historialRepository;
    }

    @GetMapping
    public List<SectorEstacionamiento> getSectores(@RequestParam(required = false, defaultValue = "DEFAULT") String mapaId) {
        List<SectorEstacionamiento> sectores = sectorRepository.findByMapaId(mapaId);
        if (sectores.isEmpty() && !mapaId.equals("DEFAULT")) {
            return sectorRepository.findByMapaId("DEFAULT");
        }
        return sectores;
    }

    @GetMapping("/destinos")
    public List<String> getDestinos(@RequestParam(required = false, defaultValue = "DEFAULT") String mapaId) {
        List<String> destinos = sectorRepository.findDestinosPorMapa(mapaId);
        if (destinos.isEmpty() && !mapaId.equals("DEFAULT")) {
            return sectorRepository.findDestinosPorMapa("DEFAULT");
        }
        return destinos;
    }

    @GetMapping("/recomendacion")
    public ResponseEntity<?> obtenerRecomendacion(@RequestParam String edificio, @RequestParam(required = false, defaultValue = "DEFAULT") String mapaId) {
        return procesarRecomendacion(edificio, null, mapaId);
    }

    private ResponseEntity<?> procesarRecomendacion(String edificio, String clase, String mapaId) {
        List<SectorEstacionamiento> sectores = sectorRepository.findSectoresPorEdificio(edificio, mapaId);
        if ((sectores == null || sectores.isEmpty()) && !mapaId.equals("DEFAULT")) {
            sectores = sectorRepository.findSectoresPorEdificio(edificio, "DEFAULT");
        }
        
        if (sectores == null || sectores.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("message", "No hay sectores cerca de " + edificio));
        }

        for (int i = 0; i < sectores.size(); i++) {
            SectorEstacionamiento s = sectores.get(i);
            if (s.getLugaresLibres() > 0) {
                String justificacion;
                if (clase != null) {
                    justificacion = (i == 0) ? "Hoy tienes " + clase + " en " + edificio + ", " + s.getNombre() + " es tu mejor opción." :
                            "Hoy tienes " + clase + " en " + edificio + ". El estacionamiento principal está lleno, te recomendamos " + s.getNombre() + ".";
                } else {
                    justificacion = (i == 0) ? s.getNombre() + " es el estacionamiento más cercano disponible a " + edificio + "." :
                            "El principal está lleno. Te recomendamos esta alternativa: " + s.getNombre() + ".";
                }
                
                Map<String, Object> res = new LinkedHashMap<>();
                res.put("id", s.getId());
                res.put("nombre", s.getNombre());
                res.put("lugaresLibres", s.getLugaresLibres());
                res.put("capacidadTotal", s.getCapacidadTotal());
                res.put("justificacion", justificacion);
                if (clase != null) {
                    res.put("claseDetectada", clase);
                    res.put("edificioDetectado", edificio);
                }
                return ResponseEntity.ok(res);
            }
        }
        return ResponseEntity.status(404).body(Map.of("message", "Todos los sectores cerca de " + edificio + " están llenos."));
    }

    @PostMapping("/recomendacion/horario")
    public ResponseEntity<?> analizarHorario(@RequestParam("file") MultipartFile file, @RequestParam(required = false, defaultValue = "DEFAULT") String mapaId) {
        try {
            String base64Image = Base64.getEncoder().encodeToString(file.getBytes());
            String diaActual = LocalDate.now().getDayOfWeek().getDisplayName(TextStyle.FULL, new Locale("es", "ES")).toLowerCase();

            RestTemplate restTemplate = new RestTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            String apiKey = System.getenv("OPENAI_API_KEY");
            if (apiKey == null || apiKey.isEmpty()) {
                apiKey = "sk-placeholder-key-set-env-var-instead";
            }
            headers.setBearerAuth(apiKey);

            String prompt = "Eres un sistema OCR experto. La imagen es un horario semanal con columnas verticales de distintos colores. " +
                    "Estructura visual estricta de izquierda a derecha: " +
                    "1. LUNES (columna color rosa o lila). " +
                    "2. MARTES (columna color celeste claro). " +
                    "3. MIÉRCOLES (columna color verde claro). " +
                    "4. JUEVES (columna color azul o gris oscuro). " +
                    "5. VIERNES (columna color celeste claro). " +
                    "IMPORTANTE: Hoy es " + diaActual.toUpperCase() + ". " +
                    "Identifica visualmente la columna de color que corresponde a HOY basándote en la lista de arriba. " +
                    "Lee el texto ÚNICAMENTE dentro de esa columna de color y retorna la materia y su número de aula en formato exacto: 'MATERIA|AULA'. " +
                    "Ejemplo: 'Base de Datos II|920'. Si no hay clase responde 'NADA'.";

            Map<String, Object> textMessage = Map.of("type", "text", "text", prompt);
            Map<String, Object> imageMessage = Map.of("type", "image_url", "image_url", Map.of("url", "data:image/jpeg;base64," + base64Image));
            
            Map<String, Object> message = Map.of(
                    "role", "user",
                    "content", List.of(textMessage, imageMessage)
            );

            Map<String, Object> body = Map.of(
                    "model", "gpt-4o",
                    "messages", List.of(message),
                    "max_tokens", 100
            );

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
            Map<String, Object> response = restTemplate.postForObject("https://api.openai.com/v1/chat/completions", request, Map.class);

            List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");
            Map<String, Object> msg = (Map<String, Object>) choices.get(0).get("message");
            String content = ((String) msg.get("content")).trim().replace("\"", "");

            if (content.equalsIgnoreCase("nada") || content.toLowerCase().contains("no hay")) {
                return ResponseEntity.status(404).body(Map.of("message", "No se detectaron clases para hoy (" + diaActual + ") en la imagen del horario."));
            }

            String[] parts = content.split("\\|");
            String clase = parts[0].trim();
            String aulaStr = parts.length > 1 ? parts[1].trim().replaceAll("[^0-9]", "") : "";

            String edificio = "Edificio Sistemas"; // Default (Central / Aulas 200)
            
            if (!aulaStr.isEmpty()) {
                try {
                    int aula = Integer.parseInt(aulaStr);
                    if (aula >= 900 && aula < 1000) {
                        edificio = "Edificio Benito Posetto";
                    } else if (aula >= 600 && aula < 900) {
                        edificio = "Edificio Soro";
                    } else if (aula >= 500 && aula < 600) {
                        edificio = "Edificio Civil";
                    } else if (aula >= 400 && aula < 500) {
                        edificio = "Edificio Sistemas";
                    } else if (aula >= 200 && aula < 300) {
                        edificio = "Edificio Sistemas";
                    }
                } catch (NumberFormatException ignored) {
                }
            }

            return procesarRecomendacion(edificio, clase, mapaId);

        } catch (Exception e) {
            System.err.println("OpenAI falló, activando fallback local para la demo: " + e.getMessage());
            
            String diaActual = LocalDate.now(ZoneId.of("America/Argentina/Cordoba"))
                                        .getDayOfWeek()
                                        .getDisplayName(TextStyle.FULL, new Locale("es", "ES"))
                                        .toLowerCase();
            String clase = "Clase";
            String edificio = "Edificio Sistemas";
            
            if (diaActual.equals("lunes")) {
                clase = "Inglés II";
                edificio = "Edificio Sistemas";
            } else if (diaActual.equals("martes") || diaActual.equals("viernes")) {
                clase = "Programación III";
                edificio = "Edificio Benito Posetto";
            } else if (diaActual.equals("miércoles") || diaActual.equals("miercoles")) {
                clase = "Metodología de Sistemas I";
                edificio = "Edificio Sistemas";
            } else if (diaActual.equals("jueves")) {
                clase = "Base de Datos II";
                edificio = "Edificio Benito Posetto";
            } else {
                return ResponseEntity.status(404).body(Map.of("message", "No hay clases programadas para hoy (" + diaActual + ")."));
            }

            return procesarRecomendacion(edificio, clase + " (Modo Respaldo)", mapaId);
        }
    }

    @GetMapping("/historial/{legajo}")
    public List<RegistroOcupacion> obtenerHistorial(@PathVariable String legajo) {
        return historialRepository.findByLegajo(legajo);
    }

    @GetMapping("/estado/{legajo}")
    public ResponseEntity<?> obtenerEstadoUsuario(@PathVariable String legajo) {
        Optional<RegistroOcupacion> ultimo = ultimoEvento(legajo);
        boolean activo = ultimo.map(reg -> "ENTRADA".equals(reg.getEvento())).orElse(false);

        Map<String, Object> estado = new LinkedHashMap<>();
        estado.put("legajo", legajo);
        estado.put("tieneLugarActivo", activo);
        estado.put("ultimoEvento", ultimo.orElse(null));
        return ResponseEntity.ok(estado);
    }

    @GetMapping("/metricas")
    public Map<String, Object> obtenerMetricas() {
        List<RegistroOcupacion> eventos = historialRepository.findAll();
        List<RegistroOcupacion> eventosOperativos = eventos.stream()
                .filter(reg -> !"SISTEMA".equals(reg.getLegajo()))
                .toList();
        LocalDate hoy = LocalDate.now();

        Map<String, Optional<RegistroOcupacion>> ultimoPorLegajo = eventosOperativos.stream()
                .collect(Collectors.groupingBy(
                        RegistroOcupacion::getLegajo,
                        Collectors.maxBy(Comparator.comparing(RegistroOcupacion::getFechaHora))
                ));

        long ocupacionesActivas = ultimoPorLegajo.values().stream()
                .flatMap(Optional::stream)
                .filter(reg -> "ENTRADA".equals(reg.getEvento()))
                .count();

        Map<String, Long> eventosPorSector = eventosOperativos.stream()
                .filter(reg -> reg.getNombreSector() != null)
                .collect(Collectors.groupingBy(RegistroOcupacion::getNombreSector, LinkedHashMap::new, Collectors.counting()));

        Map<String, Object> metricas = new LinkedHashMap<>();
        metricas.put("totalEventos", eventosOperativos.size());
        metricas.put("eventosSistema", eventos.size() - eventosOperativos.size());
        metricas.put("entradasHoy", contarEventosDelDia(eventosOperativos, hoy, "ENTRADA"));
        metricas.put("salidasHoy", contarEventosDelDia(eventosOperativos, hoy, "SALIDA"));
        metricas.put("ocupacionesActivas", ocupacionesActivas);
        metricas.put("eventosPorSector", eventosPorSector);
        return metricas;
    }

    @PostMapping("/{id}/estacionar")
    public ResponseEntity<?> estacionar(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        String legajo = payload.get("legajo");
        if (legajo == null || legajo.isBlank()) {
            return ResponseEntity.badRequest().body("Falta el legajo");
        }

        boolean tieneLugarActivo = ultimoEvento(legajo)
                .map(reg -> "ENTRADA".equals(reg.getEvento()))
                .orElse(false);

        if (tieneLugarActivo) {
            return ResponseEntity.badRequest().body("Ya tienes un lugar ocupado. Debes abandonarlo antes de seleccionar otro.");
        }

        return sectorRepository.findById(id).map(sector -> {
            if (sector.getLugaresLibres() <= 0) {
                return ResponseEntity.badRequest().body("No hay lugares libres");
            }

            sector.setLugaresLibres(sector.getLugaresLibres() - 1);
            sectorRepository.save(sector);

            RegistroOcupacion registro = RegistroOcupacion.nuevoEvento(legajo, id, sector.getNombre(), "ENTRADA");
            completarUbicacion(registro, payload);
            historialRepository.save(registro);

            return ResponseEntity.ok("Ingreso registrado");
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/liberar")
    public ResponseEntity<?> liberar(@RequestBody Map<String, String> payload) {
        String legajo = payload.get("legajo");
        if (legajo == null || legajo.isBlank()) {
            return ResponseEntity.badRequest().body("Falta el legajo");
        }

        return ultimoEvento(legajo)
                .filter(reg -> "ENTRADA".equals(reg.getEvento()))
                .map(ultimoRegistro -> sectorRepository.findById(ultimoRegistro.getSectorId())
                        .map(sector -> {
                            sector.setLugaresLibres(sector.getLugaresLibres() + 1);
                            sectorRepository.save(sector);

                            RegistroOcupacion salida = RegistroOcupacion.nuevoEvento(
                                    legajo,
                                    ultimoRegistro.getSectorId(),
                                    sector.getNombre(),
                                    "SALIDA"
                            );
                            completarUbicacion(salida, payload);
                            historialRepository.save(salida);

                            return ResponseEntity.ok("Has liberado tu lugar en: " + sector.getNombre());
                        })
                        .orElse(ResponseEntity.status(404).body("Error: El sector guardado en tu historial ya no existe.")))
                .orElse(ResponseEntity.badRequest().body("No tienes ningun estacionamiento activo para liberar."));
    }

    private Optional<RegistroOcupacion> ultimoEvento(String legajo) {
        return historialRepository.findByLegajo(legajo).stream()
                .max(Comparator.comparing(RegistroOcupacion::getFechaHora));
    }

    private long contarEventosDelDia(List<RegistroOcupacion> eventos, LocalDate dia, String tipo) {
        return eventos.stream()
                .filter(reg -> tipo.equals(reg.getEvento()))
                .filter(reg -> reg.getFechaHora() != null && dia.equals(reg.getFechaHora().toLocalDate()))
                .count();
    }

    private void completarUbicacion(RegistroOcupacion registro, Map<String, String> payload) {
        registro.setLatitud(parseDouble(payload.get("latitud")));
        registro.setLongitud(parseDouble(payload.get("longitud")));
        registro.setUbicacionValidada(Boolean.parseBoolean(payload.getOrDefault("ubicacionValidada", "false")));
        registro.setOrigenValidacion(payload.getOrDefault("origenValidacion", "NO_INFORMADA"));
    }

    private Double parseDouble(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Double.valueOf(value);
        } catch (NumberFormatException ex) {
            return null;
        }
    }
}
