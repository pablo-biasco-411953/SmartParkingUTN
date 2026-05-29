package com.utn.frc.smartparkingutn.repository;

import com.utn.frc.smartparkingutn.model.SectorEstacionamiento;
import org.springframework.data.neo4j.repository.Neo4jRepository;
import org.springframework.data.neo4j.repository.query.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SectorRepository extends Neo4jRepository<SectorEstacionamiento, Long> {
    
    List<SectorEstacionamiento> findByMapaId(String mapaId);

    @Query("MATCH (s:SectorEstacionamiento {mapaId: $mapaId})-[r:CERCA_DE]->(e) " +
           "WHERE toLower(e.nombre) CONTAINS toLower($nombreEdificio) " +
           "RETURN s ORDER BY coalesce(r.distancia, 9999) ASC, s.nombre ASC")
    List<SectorEstacionamiento> findSectoresPorEdificio(@Param("nombreEdificio") String nombreEdificio, @Param("mapaId") String mapaId);

    @Query("MATCH (s:SectorEstacionamiento {mapaId: $mapaId})-[r:CERCA_DE]->(d) " +
           "RETURN DISTINCT d.nombre AS nombre")
    List<String> findDestinosPorMapa(@Param("mapaId") String mapaId);
}