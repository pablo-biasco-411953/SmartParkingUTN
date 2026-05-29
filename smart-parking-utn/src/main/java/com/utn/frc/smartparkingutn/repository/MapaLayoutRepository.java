package com.utn.frc.smartparkingutn.repository;

import com.utn.frc.smartparkingutn.model.MapaLayout;
import org.springframework.data.cassandra.repository.CassandraRepository;

public interface MapaLayoutRepository extends CassandraRepository<MapaLayout, String> {
}
