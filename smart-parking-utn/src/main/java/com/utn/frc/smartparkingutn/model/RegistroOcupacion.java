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
@Table("eventos_ocupacion_por_usuario")
public class RegistroOcupacion {

    @PrimaryKey
    private RegistroOcupacionKey key = new RegistroOcupacionKey();

    private Long sectorId;
    private String nombreSector;
    private String evento;
    private Double latitud;
    private Double longitud;
    private Boolean ubicacionValidada;
    private String origenValidacion;

    public String getLegajo() {
        return key.getLegajo();
    }

    public void setLegajo(String legajo) {
        key.setLegajo(legajo);
    }

    public LocalDateTime getFechaHora() {
        return key.getFechaHora();
    }

    public void setFechaHora(LocalDateTime fechaHora) {
        key.setFechaHora(fechaHora);
    }

    public UUID getId() {
        return key.getId();
    }

    public void setId(UUID id) {
        key.setId(id);
    }

    public static RegistroOcupacion nuevoEvento(String legajo, Long sectorId, String nombreSector, String evento) {
        RegistroOcupacion registro = new RegistroOcupacion();
        registro.setLegajo(legajo);
        registro.setFechaHora(LocalDateTime.now());
        registro.setId(UUID.randomUUID());
        registro.setSectorId(sectorId);
        registro.setNombreSector(nombreSector);
        registro.setEvento(evento);
        registro.setUbicacionValidada(false);
        registro.setOrigenValidacion("NO_INFORMADA");
        return registro;
    }
}
