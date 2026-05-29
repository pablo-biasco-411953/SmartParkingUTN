package com.utn.frc.smartparkingutn.controller;

import com.utn.frc.smartparkingutn.model.MapaLayout;
import com.utn.frc.smartparkingutn.repository.MapaLayoutRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/mapas")
@CrossOrigin(origins = "*")
public class MapaLayoutController {

    private static final String EMPTY_LAYOUT_JSON = """
            {"buildings":[],"greenAreas":[],"trees":[],"roadRoutes":[[]],"parkedCars":[],"driveZones":[],"blockedZones":[],"sectorNodes":[]}
            """;

    private final MapaLayoutRepository mapaLayoutRepository;

    public MapaLayoutController(MapaLayoutRepository mapaLayoutRepository) {
        this.mapaLayoutRepository = mapaLayoutRepository;
    }

    @GetMapping
    public List<MapaLayout> listar(@RequestParam(defaultValue = "411953") String legajo) {
        return mapaLayoutRepository.findAll().stream()
                .filter(mapa -> legajo.equals(mapa.getOwnerLegajo()) || "SISTEMA".equals(mapa.getOwnerLegajo()))
                .sorted(Comparator.comparing(MapaLayout::getActualizadoEn, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> obtener(@PathVariable String id) {
        return mapaLayoutRepository.findById(id)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElse(ResponseEntity.status(404).body("Mapa no encontrado"));
    }

    @PostMapping
    public ResponseEntity<?> guardar(@RequestBody MapaLayout request) {
        if (estaVacio(request.getOwnerLegajo())) {
            return ResponseEntity.badRequest().body("Falta ownerLegajo");
        }
        if (estaVacio(request.getNombre())) {
            return ResponseEntity.badRequest().body("Falta nombre del mapa");
        }
        if (estaVacio(request.getLayoutJson())) {
            return ResponseEntity.badRequest().body("Falta layoutJson");
        }

        LocalDateTime now = LocalDateTime.now();
        MapaLayout mapa = estaVacio(request.getId())
                ? MapaLayout.nuevo(request.getOwnerLegajo(), request.getNombre(), request.getLayoutJson())
                : mapaLayoutRepository.findById(request.getId()).orElse(request);

        mapa.setOwnerLegajo(request.getOwnerLegajo());
        mapa.setNombre(request.getNombre());
        mapa.setDescripcion(defaultText(request.getDescripcion()));
        mapa.setTextureUrl(defaultText(request.getTextureUrl()));
        mapa.setSatelliteMetaJson(defaultText(request.getSatelliteMetaJson(), "{}"));
        mapa.setLayoutJson(request.getLayoutJson());
        mapa.setActivo(Boolean.TRUE.equals(request.getActivo()));
        mapa.setPlaceName(request.getPlaceName() != null ? request.getPlaceName() : mapa.getPlaceName());
        mapa.setLat(request.getLat() != null ? request.getLat() : mapa.getLat());
        mapa.setLng(request.getLng() != null ? request.getLng() : mapa.getLng());
        mapa.setIsEducational(request.getIsEducational() != null ? request.getIsEducational() : mapa.getIsEducational());
        if (mapa.getCreadoEn() == null) {
            mapa.setCreadoEn(now);
        }
        mapa.setActualizadoEn(now);

        if (Boolean.TRUE.equals(mapa.getActivo())) {
            desactivarOtrosMapas(mapa.getOwnerLegajo(), mapa.getId());
        }

        return ResponseEntity.ok(mapaLayoutRepository.save(mapa));
    }

    @PostMapping("/nuevo")
    public ResponseEntity<MapaLayout> crearMapaVacio(@RequestBody Map<String, Object> request) {
        String legajo = request.containsKey("ownerLegajo") ? String.valueOf(request.get("ownerLegajo")) : "411953";
        String nombre = request.containsKey("nombre") ? String.valueOf(request.get("nombre")) : "Mapa nuevo";
        MapaLayout mapa = MapaLayout.nuevo(legajo, nombre, EMPTY_LAYOUT_JSON);
        mapa.setDescripcion("Mapa creado desde cero, sin textura satelital todavia.");
        mapa.setActivo(true);
        if (request.containsKey("lat") && request.get("lat") != null) {
            mapa.setLat(Double.parseDouble(String.valueOf(request.get("lat"))));
        }
        if (request.containsKey("lng") && request.get("lng") != null) {
            mapa.setLng(Double.parseDouble(String.valueOf(request.get("lng"))));
        }
        if (request.containsKey("placeName") && request.get("placeName") != null) {
            mapa.setPlaceName(String.valueOf(request.get("placeName")));
        }
        desactivarOtrosMapas(legajo, mapa.getId());
        return ResponseEntity.ok(mapaLayoutRepository.save(mapa));
    }

    @PostMapping("/{id}/activar")
    public ResponseEntity<?> activar(@PathVariable String id) {
        return mapaLayoutRepository.findById(id)
                .<ResponseEntity<?>>map(mapa -> {
                    mapa.setActivo(true);
                    mapa.setActualizadoEn(LocalDateTime.now());
                    desactivarOtrosMapas(mapa.getOwnerLegajo(), mapa.getId());
                    return ResponseEntity.ok(mapaLayoutRepository.save(mapa));
                })
                .orElse(ResponseEntity.status(404).body("Mapa no encontrado"));
    }

    @org.springframework.web.bind.annotation.DeleteMapping("/{id}")
    public ResponseEntity<?> borrar(@PathVariable String id) {
        return mapaLayoutRepository.findById(id)
                .<ResponseEntity<?>>map(mapa -> {
                    mapaLayoutRepository.delete(mapa);
                    return ResponseEntity.ok().build();
                })
                .orElse(ResponseEntity.status(404).body("Mapa no encontrado"));
    }

    private void desactivarOtrosMapas(String legajo, String mapaActivoId) {
        mapaLayoutRepository.findAll().stream()
                .filter(mapa -> legajo.equals(mapa.getOwnerLegajo()))
                .filter(mapa -> !mapaActivoId.equals(mapa.getId()))
                .filter(mapa -> Boolean.TRUE.equals(mapa.getActivo()))
                .forEach(mapa -> {
                    mapa.setActivo(false);
                    mapaLayoutRepository.save(mapa);
                });
    }

    private boolean estaVacio(String value) {
        return value == null || value.isBlank();
    }

    private String defaultText(String value) {
        return defaultText(value, "");
    }

    private String defaultText(String value, String fallback) {
        return value == null ? fallback : value;
    }
}
