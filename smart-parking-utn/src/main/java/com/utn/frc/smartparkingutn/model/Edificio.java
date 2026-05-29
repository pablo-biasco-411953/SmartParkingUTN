package com.utn.frc.smartparkingutn.model;

import lombok.Data;
import org.springframework.data.neo4j.core.schema.GeneratedValue;
import org.springframework.data.neo4j.core.schema.Id;
import org.springframework.data.neo4j.core.schema.Node;
import org.springframework.data.neo4j.core.schema.Relationship;
import java.util.List;

@Data
@Node
public class Edificio {
    @Id @GeneratedValue
    private Long id;
    private String nombre; // Ej: "Edificio Soro"
    private Integer numeroMapa; // El numerito del mapa (1 al 5)

    // Relación: Un edificio tiene estacionamientos cerca
    @Relationship(type = "CERCA_DE", direction = Relationship.Direction.INCOMING)
    private List<SectorEstacionamiento> estacionamientos;
}