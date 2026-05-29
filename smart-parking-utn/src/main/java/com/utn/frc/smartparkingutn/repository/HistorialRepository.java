package com.utn.frc.smartparkingutn.repository;

import com.utn.frc.smartparkingutn.model.RegistroOcupacion;
import com.utn.frc.smartparkingutn.model.RegistroOcupacionKey;
import org.springframework.data.cassandra.repository.CassandraRepository;
import org.springframework.data.cassandra.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface HistorialRepository extends CassandraRepository<RegistroOcupacion, RegistroOcupacionKey> {

    @Query("SELECT * FROM eventos_ocupacion_por_usuario WHERE legajo = ?0")
    List<RegistroOcupacion> findByLegajo(String legajo);
}
