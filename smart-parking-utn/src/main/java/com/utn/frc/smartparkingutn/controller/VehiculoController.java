package com.utn.frc.smartparkingutn.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/vehiculos")
@CrossOrigin(origins = "*")
public class VehiculoController {

    private static final String ARG_AUTOS_URL = "https://argautos.com/api/v1";
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();
    private final ObjectMapper mapper = new ObjectMapper();

    @GetMapping("/marcas")
    public ResponseEntity<?> marcas() {
        return proxy("/brands", fallbackMarcas());
    }

    @GetMapping("/marcas/{marcaId}/modelos")
    public ResponseEntity<?> modelos(@PathVariable Integer marcaId) {
        return proxy("/brands/" + marcaId + "/models", fallbackModelos(marcaId));
    }

    private ResponseEntity<?> proxy(String path, Object fallback) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(ARG_AUTOS_URL + path))
                    .timeout(Duration.ofSeconds(8))
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                JsonNode root = mapper.readTree(response.body());
                return ResponseEntity.ok(root.get("data"));
            }
        } catch (Exception ignored) {
            // Fallback local para que el registro no dependa de internet durante la demo.
        }
        return ResponseEntity.ok(fallback);
    }

    private List<Map<String, Object>> fallbackMarcas() {
        return List.of(
                Map.of("id", 9, "name", "CHEVROLET"),
                Map.of("id", 18, "name", "FIAT"),
                Map.of("id", 19, "name", "FORD"),
                Map.of("id", 45, "name", "RENAULT"),
                Map.of("id", 54, "name", "TOYOTA"),
                Map.of("id", 58, "name", "VOLKSWAGEN")
        );
    }

    private List<Map<String, Object>> fallbackModelos(Integer marcaId) {
        return switch (marcaId) {
            case 9 -> List.of(Map.of("id", 136, "name", "ONIX"), Map.of("id", 131, "name", "CRUZE"));
            case 18 -> List.of(Map.of("id", 257, "name", "CRONOS"), Map.of("id", 260, "name", "PALIO"));
            case 19 -> List.of(Map.of("id", 280, "name", "FIESTA"), Map.of("id", 286, "name", "RANGER"));
            case 45 -> List.of(Map.of("id", 470, "name", "CLIO"), Map.of("id", 478, "name", "SANDERO"));
            case 54 -> List.of(Map.of("id", 560, "name", "COROLLA"), Map.of("id", 566, "name", "HILUX"));
            case 58 -> List.of(Map.of("id", 610, "name", "GOL"), Map.of("id", 618, "name", "AMAROK"));
            default -> List.of(Map.of("id", 0, "name", "OTRO"));
        };
    }
}
