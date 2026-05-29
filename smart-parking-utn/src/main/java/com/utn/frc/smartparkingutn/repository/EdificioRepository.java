package com.utn.frc.smartparkingutn.repository;

import com.utn.frc.smartparkingutn.model.Edificio;
import org.springframework.data.neo4j.repository.Neo4jRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface EdificioRepository extends Neo4jRepository<Edificio, Long> {
}
