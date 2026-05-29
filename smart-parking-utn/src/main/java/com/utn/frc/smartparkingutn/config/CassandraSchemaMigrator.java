package com.utn.frc.smartparkingutn.config;

import com.datastax.oss.driver.api.core.CqlSession;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class CassandraSchemaMigrator implements CommandLineRunner {

    private final CqlSession cqlSession;

    public CassandraSchemaMigrator(CqlSession cqlSession) {
        this.cqlSession = cqlSession;
    }

    @Override
    public void run(String... args) {
        cqlSession.execute("""
                CREATE TABLE IF NOT EXISTS mapas_layout (
                    id text PRIMARY KEY,
                    ownerlegajo text,
                    nombre text,
                    descripcion text,
                    textureurl text,
                    satellitemetajson text,
                    layoutjson text,
                    activo boolean,
                    creadoen timestamp,
                    actualizadoen timestamp
                )
                """);

        List<String> columns = List.of(
                "emailinstitucional text",
                "username text",
                "automarca text",
                "automodelo text",
                "autocolor text",
                "autopatente text",
                "automarcaid int",
                "automodeloid int"
        );

        for (String column : columns) {
            try {
                cqlSession.execute("ALTER TABLE usuarios ADD " + column);
            } catch (Exception ignored) {
                // Cassandra does not support portable ADD IF NOT EXISTS across every version.
                // If the column already exists, the migration can safely continue.
            }
        }
    }
}
