package com.utn.frc.smartparkingutn.repository;

import com.utn.frc.smartparkingutn.model.Usuario;
import org.springframework.data.cassandra.repository.CassandraRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UsuarioRepository extends CassandraRepository<Usuario, String> {
    // Spring ya entiende que buscamos por la PK (legajo)
}