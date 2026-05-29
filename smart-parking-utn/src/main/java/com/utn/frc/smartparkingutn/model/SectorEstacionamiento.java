package com.utn.frc.smartparkingutn.model;

import lombok.Data;
import org.springframework.data.neo4j.core.schema.GeneratedValue;
import org.springframework.data.neo4j.core.schema.Id;
import org.springframework.data.neo4j.core.schema.Node;

@Data
@Node("SectorEstacionamiento") // Asegurate de que coincida con el nombre en celeste de tu imagen
public class SectorEstacionamiento {
    @Id @GeneratedValue
    private Long id;

    private String mapaId; // Para multi-tenancy
    private String nombre;
    private int capacidadTotal; // Según tu imagen
    private int lugaresLibres;  // Según tu imagen
}