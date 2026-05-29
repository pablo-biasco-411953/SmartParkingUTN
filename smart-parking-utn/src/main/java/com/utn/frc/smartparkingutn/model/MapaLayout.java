package com.utn.frc.smartparkingutn.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.cassandra.core.mapping.PrimaryKey;
import org.springframework.data.cassandra.core.mapping.Table;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Table("mapas_layout")
public class MapaLayout {
    @PrimaryKey
    private String id;
    private String ownerLegajo;
    private String nombre;
    private String descripcion;
    private String textureUrl;
    private String satelliteMetaJson;
    private String layoutJson;
    private Boolean activo;
    private String placeName;
    private Double lat;
    private Double lng;
    private Boolean isEducational;
    private LocalDateTime creadoEn;
    private LocalDateTime actualizadoEn;

    public static MapaLayout nuevo(String ownerLegajo, String nombre, String layoutJson) {
        LocalDateTime now = LocalDateTime.now();
        MapaLayout mapa = new MapaLayout();
        mapa.setId(UUID.randomUUID().toString());
        mapa.setOwnerLegajo(ownerLegajo);
        mapa.setNombre(nombre);
        mapa.setDescripcion("");
        mapa.setTextureUrl("");
        mapa.setSatelliteMetaJson("{}");
        mapa.setLayoutJson(layoutJson);
        mapa.setActivo(false);
        mapa.setPlaceName("");
        mapa.setLat(0.0);
        mapa.setLng(0.0);
        mapa.setIsEducational(false);
        mapa.setCreadoEn(now);
        mapa.setActualizadoEn(now);
        return mapa;
    }
}
