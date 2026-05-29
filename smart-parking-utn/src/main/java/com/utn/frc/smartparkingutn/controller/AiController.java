package com.utn.frc.smartparkingutn.controller;

import com.utn.frc.smartparkingutn.model.MapaLayout;
import com.utn.frc.smartparkingutn.repository.MapaLayoutRepository;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ai")
@CrossOrigin(origins = "*")
public class AiController {

    private final MapaLayoutRepository mapaLayoutRepository;

    public AiController(MapaLayoutRepository mapaLayoutRepository) {
        this.mapaLayoutRepository = mapaLayoutRepository;
    }

    @PostMapping("/generate-graph/{mapaId}")
    public ResponseEntity<?> generateGraph(@PathVariable String mapaId) {
        try {
            MapaLayout mapa = mapaLayoutRepository.findById(mapaId).orElse(null);
            if (mapa == null) {
                return ResponseEntity.status(404).body(Map.of("message", "Mapa no encontrado."));
            }

            String placeName = mapa.getPlaceName() != null && !mapa.getPlaceName().isBlank() ? mapa.getPlaceName() : mapa.getNombre();
            Double lat = mapa.getLat();
            Double lng = mapa.getLng();
            
            String promptContext = "Lugar: " + placeName;
            if (lat != null && lng != null && lat != 0.0 && lng != 0.0) {
                promptContext += " (Latitud: " + lat + ", Longitud: " + lng + ")";
            }

            boolean isUtn = placeName.toLowerCase().contains("utn") || 
                            placeName.toLowerCase().contains("tecnologica") || 
                            placeName.toLowerCase().contains("frc") ||
                            placeName.toLowerCase().contains("córdoba") ||
                            placeName.toLowerCase().contains("cordoba");

            String systemPrompt;
            if (isUtn) {
                systemPrompt = "Eres un experto en logística urbana de la UTN FRC (Facultad Regional Córdoba) y Neo4j Cypher. " +
                        "Debes generar EXACTAMENTE la estructura de nodos y relaciones reales del campus de la UTN FRC para lograr una consistencia del 100% con el espacio real y el mapa interactivo 3D. " +
                        "Debes crear EXACTAMENTE los siguientes 9 nodos :SectorEstacionamiento y sus propiedades obligatorias: " +
                        "1. MERGE (s1:SectorEstacionamiento {id: 'sur-auditorio', nombre: 'Sur - Auditorio', capacidadTotal: 45, lugaresLibres: 15, mapaId: '" + mapaId + "'}) " +
                        "2. MERGE (s2:SectorEstacionamiento {id: 'sur-civil', nombre: 'Sur - Ing. Civil', capacidadTotal: 35, lugaresLibres: 10, mapaId: '" + mapaId + "'}) " +
                        "3. MERGE (s3:SectorEstacionamiento {id: 'sur-avet', nombre: 'Sur - A.V.E.T.', capacidadTotal: 20, lugaresLibres: 5, mapaId: '" + mapaId + "'}) " +
                        "4. MERGE (s4:SectorEstacionamiento {id: 'oeste-inchaurrondo', nombre: 'Oeste - Edif. Inchaurrondo', capacidadTotal: 25, lugaresLibres: 8, mapaId: '" + mapaId + "'}) " +
                        "5. MERGE (s5:SectorEstacionamiento {id: 'oeste-posetto', nombre: 'Oeste - Edif. Benito Posetto', capacidadTotal: 20, lugaresLibres: 4, mapaId: '" + mapaId + "'}) " +
                        "6. MERGE (s6:SectorEstacionamiento {id: 'norte-biblioteca', nombre: 'Norte - Biblioteca Gallardo', capacidadTotal: 45, lugaresLibres: 20, mapaId: '" + mapaId + "'}) " +
                        "7. MERGE (s7:SectorEstacionamiento {id: 'norte-plantapiloto', nombre: 'Norte - Planta Piloto', capacidadTotal: 15, lugaresLibres: 2, mapaId: '" + mapaId + "'}) " +
                        "8. MERGE (s8:SectorEstacionamiento {id: 'este-soro', nombre: 'Este - Edif. Soro', capacidadTotal: 55, lugaresLibres: 12, mapaId: '" + mapaId + "'}) " +
                        "9. MERGE (s9:SectorEstacionamiento {id: 'este-sueldo', nombre: 'Este - Edif. Ing. Sueldo', capacidadTotal: 25, lugaresLibres: 7, mapaId: '" + mapaId + "'}) " +
                        "\n" +
                        "También debes crear EXACTAMENTE los siguientes 7 nodos :Edificio: " +
                        "1. MERGE (e1:Edificio {id: 'edificio-sistemas', nombre: 'Edificio Sistemas', numeroMapa: 1, mapaId: '" + mapaId + "'}) " +
                        "2. MERGE (e2:Edificio {id: 'edificio-civil', nombre: 'Edificio Civil', numeroMapa: 2, mapaId: '" + mapaId + "'}) " +
                        "3. MERGE (e3:Edificio {id: 'edificio-sur', nombre: 'Edificio Sur', numeroMapa: 3, mapaId: '" + mapaId + "'}) " +
                        "4. MERGE (e4:Edificio {id: 'biblioteca-gallardo', nombre: 'Biblioteca Gallardo', numeroMapa: 4, mapaId: '" + mapaId + "'}) " +
                        "5. MERGE (e5:Edificio {id: 'edificio-soro', nombre: 'Edificio Soro', numeroMapa: 5, mapaId: '" + mapaId + "'}) " +
                        "6. MERGE (e6:Edificio {id: 'edificio-sueldo', nombre: 'Edificio Ing. Sueldo', numeroMapa: 6, mapaId: '" + mapaId + "'}) " +
                        "7. MERGE (e7:Edificio {id: 'edificio-posetto', nombre: 'Edificio Benito Posetto', numeroMapa: 7, mapaId: '" + mapaId + "'}) " +
                        "\n" +
                        "Y debes crear EXACTAMENTE las siguientes relaciones CERCA_DE con sus respectivas propiedades de 'distancia' reales en metros: " +
                        "MERGE (s4)-[:CERCA_DE {distancia: 50}]->(e1) " +
                        "MERGE (s5)-[:CERCA_DE {distancia: 120}]->(e1) " +
                        "MERGE (s6)-[:CERCA_DE {distancia: 250}]->(e1) " +
                        "MERGE (s2)-[:CERCA_DE {distancia: 40}]->(e2) " +
                        "MERGE (s1)-[:CERCA_DE {distancia: 110}]->(e2) " +
                        "MERGE (s3)-[:CERCA_DE {distancia: 200}]->(e2) " +
                        "MERGE (s1)-[:CERCA_DE {distancia: 30}]->(e3) " +
                        "MERGE (s2)-[:CERCA_DE {distancia: 120}]->(e3) " +
                        "MERGE (s3)-[:CERCA_DE {distancia: 180}]->(e3) " +
                        "MERGE (s6)-[:CERCA_DE {distancia: 30}]->(e4) " +
                        "MERGE (s7)-[:CERCA_DE {distancia: 90}]->(e4) " +
                        "MERGE (s8)-[:CERCA_DE {distancia: 40}]->(e5) " +
                        "MERGE (s9)-[:CERCA_DE {distancia: 150}]->(e5) " +
                        "MERGE (s2)-[:CERCA_DE {distancia: 300}]->(e5) " +
                        "MERGE (s9)-[:CERCA_DE {distancia: 50}]->(e6) " +
                        "MERGE (s8)-[:CERCA_DE {distancia: 130}]->(e6) " +
                        "MERGE (s6)-[:CERCA_DE {distancia: 280}]->(e6) " +
                        "MERGE (s5)-[:CERCA_DE {distancia: 30}]->(e7) " +
                        "\n" +
                        "IMPORTANTE: " +
                        "1. La respuesta debe tener isEducational: true. " +
                        "2. Las posiciones sugeridas de los 9 sectores deben ser exactamente las siguientes para que cuadren con el mapa 3D: " +
                        "\"posiciones\": { " +
                        "  \"sur-auditorio\": {\"top\": 75, \"left\": 42.5}, " +
                        "  \"sur-civil\": {\"top\": 72, \"left\": 62}, " +
                        "  \"sur-avet\": {\"top\": 88, \"left\": 38}, " +
                        "  \"oeste-inchaurrondo\": {\"top\": 43, \"left\": 26}, " +
                        "  \"oeste-posetto\": {\"top\": 31, \"left\": 31.5}, " +
                        "  \"norte-biblioteca\": {\"top\": 22, \"left\": 60}, " +
                        "  \"norte-plantapiloto\": {\"top\": 15, \"left\": 56}, " +
                        "  \"este-soro\": {\"top\": 78, \"left\": 85}, " +
                        "  \"este-sueldo\": {\"top\": 40, \"left\": 76} " +
                        "} " +
                        "Además, devuelve un arreglo 'queries' con 2 o 3 consultas MATCH útiles. " +
                        "El formato de tu respuesta DEBE ser un JSON válido con esta estructura estricta: " +
                        "{ \"cypher\": \"<AQUÍ TU QUERY CYPHER COMPLETA>\", \"isEducational\": true, \"queries\": [\"<QUERY 1>\", \"<QUERY 2>\"], \"posiciones\": { ... } }";
            } else {
                systemPrompt = "Eres un experto en logística urbana y Neo4j Cypher. " +
                        "Analiza el siguiente lugar proporcionado buscando información real de cómo es su logística (tribunas, accesos, etc.). " +
                        "Debes crear una estructura rica de nodos de estacionamiento y relacionarlos (con CERCA_DE) a los edificios, zonas, tribunas o puertas de acceso correspondientes. " +
                        "Genera al menos entre 8 y 12 nodos :SectorEstacionamiento y entre 6 y 10 nodos :Edificio para crear una red completa y consistente con el espacio real. " +
                        "IMPORTANTE: " +
                        "1. Cada nodo DEBE tener la propiedad mapaId: '" + mapaId + "'. " +
                        "2. Los nodos de estacionamiento DEBEN tener estrictamente el label :SectorEstacionamiento. " +
                        "3. Los nodos de edificios DEBEN tener estrictamente el label :Edificio y una propiedad 'numeroMapa' correlativa (1, 2, 3, etc.). " +
                        "4. Para la propiedad 'id' de cada nodo, usa identificadores determinísticos en kebab-case basados en el nombre (Ej: 'est-norte', 'puerta-principal') para evitar duplicados si se vuelve a correr. " +
                        "5. Los nodos :SectorEstacionamiento DEBEN tener OBLIGATORIAMENTE las propiedades: 'nombre' (texto descriptivo visible), 'capacidadTotal' (número entero, ej 100) y 'lugaresLibres' (número entero <= capacidadTotal). Ej: MERGE (s:SectorEstacionamiento {id: 'est-norte', nombre: 'Estacionamiento Norte', capacidadTotal: 250, lugaresLibres: 250, mapaId: '" + mapaId + "'}). " +
                        "6. Cada relación [r:CERCA_DE] DEBE tener la propiedad 'distancia' en metros (número entero entre 20 y 350) que represente la distancia real caminando entre el estacionamiento y el edificio. Ej: MERGE (s)-[r:CERCA_DE {distancia: 80}]->(e). " +
                        "Además, devuelve en la respuesta si el lugar es una institución educativa (isEducational: true o false). " +
                        "También devuelve un arreglo de 2 o 3 consultas útiles (MATCH) para ver el grafo gráfico. " +
                        "Por último, incluye un objeto 'posiciones' donde las keys sean los 'id' de los SectorEstacionamiento creados, y el valor un objeto { \"top\": Y, \"left\": X } con coordenadas visuales sugeridas (Y y X entre 20 y 80) para ubicarlos en un mapa 2D. Intenta darles cierta lógica espacial (ej: norte top=20, sur top=80). " +
                        "El formato de tu respuesta DEBE ser un JSON válido con esta estructura estricta: " +
                        "{ \"cypher\": \"<AQUÍ TU QUERY CYPHER COMPLETA>\", \"isEducational\": true, \"queries\": [\"<QUERY 1>\", \"<QUERY 2>\"], \"posiciones\": { \"estacionamiento-norte\": {\"top\": 20, \"left\": 50} } }";
            }

            RestTemplate restTemplate = new RestTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            String apiKey = System.getenv("OPENAI_API_KEY");
            if (apiKey == null || apiKey.isEmpty()) {
                apiKey = "sk-placeholder-key-set-env-var-instead";
            }
            headers.setBearerAuth(apiKey);

            Map<String, Object> message = Map.of("role", "user", "content", systemPrompt + "\n\nLugar del usuario: " + promptContext);
            Map<String, Object> body = Map.of(
                    "model", "gpt-4o",
                    "response_format", Map.of("type", "json_object"),
                    "messages", List.of(message),
                    "max_tokens", 3000
            );

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
            Map<String, Object> response = restTemplate.postForObject("https://api.openai.com/v1/chat/completions", request, Map.class);

            List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");
            Map<String, Object> msg = (Map<String, Object>) choices.get(0).get("message");
            String content = (String) msg.get("content");

            // Parsear el JSON devuelto por GPT
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            Map<String, Object> gptResult = mapper.readValue(content, Map.class);
            
            // Actualizar isEducational en la DB
            Boolean isEdu = (Boolean) gptResult.get("isEducational");
            if (isEdu != null) {
                mapa.setIsEducational(isEdu);
                mapaLayoutRepository.save(mapa);
            }

            return ResponseEntity.ok(gptResult);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("message", "Error contactando a GPT: " + e.getMessage()));
        }
    }
}
