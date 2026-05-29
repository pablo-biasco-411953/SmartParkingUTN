package com.utn.frc.smartparkingutn.config;

import com.utn.frc.smartparkingutn.model.Edificio;
import com.utn.frc.smartparkingutn.model.RegistroOcupacion;
import com.utn.frc.smartparkingutn.model.SectorEstacionamiento;
import com.utn.frc.smartparkingutn.model.Usuario;
import com.utn.frc.smartparkingutn.repository.EdificioRepository;
import com.utn.frc.smartparkingutn.repository.HistorialRepository;
import com.utn.frc.smartparkingutn.repository.SectorRepository;
import com.utn.frc.smartparkingutn.repository.UsuarioRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.data.neo4j.core.Neo4jClient;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class DataInitializer implements CommandLineRunner {

    private final SectorRepository sectorRepository;
    private final EdificioRepository edificioRepository;
    private final HistorialRepository historialRepository;
    private final UsuarioRepository usuarioRepository;
    private final Neo4jClient neo4jClient;

    public DataInitializer(SectorRepository sectorRepository,
                           EdificioRepository edificioRepository,
                           HistorialRepository historialRepository,
                           UsuarioRepository usuarioRepository,
                           Neo4jClient neo4jClient) {
        this.sectorRepository = sectorRepository;
        this.edificioRepository = edificioRepository;
        this.historialRepository = historialRepository;
        this.usuarioRepository = usuarioRepository;
        this.neo4jClient = neo4jClient;
    }

    @Override
    public void run(String... args) {
        edificioRepository.deleteAll();
        sectorRepository.deleteAll();

        SectorEstacionamiento surAuditorio = sector("Sur - Auditorio", 45, 15);
        SectorEstacionamiento surCivil = sector("Sur - Ing. Civil", 35, 10);
        SectorEstacionamiento surAvet = sector("Sur - A.V.E.T.", 20, 5);
        SectorEstacionamiento oesteInchaurrondo = sector("Oeste - Edif. Inchaurrondo", 25, 8);
        SectorEstacionamiento oestePosetto = sector("Oeste - Edif. Benito Posetto", 20, 4);
        SectorEstacionamiento norteBiblioteca = sector("Norte - Biblioteca Gallardo", 45, 20);
        SectorEstacionamiento nortePlantaPiloto = sector("Norte - Planta Piloto", 15, 2);
        SectorEstacionamiento esteSoro = sector("Este - Edif. Soro", 55, 12);
        SectorEstacionamiento esteSueldo = sector("Este - Edif. Ing. Sueldo", 25, 7);

        sectorRepository.saveAll(List.of(
                surAuditorio, surCivil, surAvet,
                oesteInchaurrondo, oestePosetto,
                norteBiblioteca, nortePlantaPiloto,
                esteSoro, esteSueldo
        ));

        edificioRepository.saveAll(List.of(
                edificio("Edificio Sistemas", 1, List.of(oesteInchaurrondo, oestePosetto, norteBiblioteca)),
                edificio("Edificio Civil", 2, List.of(surCivil, surAuditorio, surAvet)),
                edificio("Edificio Sur", 3, List.of(surAuditorio, surCivil, surAvet)),
                edificio("Biblioteca Gallardo", 4, List.of(norteBiblioteca, nortePlantaPiloto)),
                edificio("Edificio Soro", 5, List.of(esteSoro, esteSueldo, surCivil)),
                edificio("Edificio Ing. Sueldo", 6, List.of(esteSueldo, esteSoro, norteBiblioteca)),
                edificio("Edificio Benito Posetto", 7, List.of(oestePosetto))
        ));

        usuarioRepository.save(new Usuario("12345", "Mi Legajo (Mock)", "secreto", "ALUMNO"));
        usuarioRepository.save(new Usuario("421310", "Nahuel Gatica", "Michigan1611.", "ALUMNO"));
        usuarioRepository.save(usuarioDemo());

        if (historialRepository.findByLegajo("SISTEMA").isEmpty()) {
            historialRepository.save(RegistroOcupacion.nuevoEvento("SISTEMA", 0L, "SISTEMA", "SISTEMA_INICIADO"));
        }

        System.out.println(">> Estructura de 9 sectores, edificios y relaciones CERCA_DE cargada correctamente.");

        // Establecer las distancias reales en las relaciones sembradas para la demo de UTN FRC
        setRelationshipDistance("Edificio Sistemas", "Oeste - Edif. Inchaurrondo", 50);
        setRelationshipDistance("Edificio Sistemas", "Oeste - Edif. Benito Posetto", 120);
        setRelationshipDistance("Edificio Sistemas", "Norte - Biblioteca Gallardo", 250);

        setRelationshipDistance("Edificio Civil", "Sur - Ing. Civil", 40);
        setRelationshipDistance("Edificio Civil", "Sur - Auditorio", 110);
        setRelationshipDistance("Edificio Civil", "Sur - A.V.E.T.", 200);

        setRelationshipDistance("Edificio Sur", "Sur - Auditorio", 30);
        setRelationshipDistance("Edificio Sur", "Sur - Ing. Civil", 120);
        setRelationshipDistance("Edificio Sur", "Sur - A.V.E.T.", 180);

        setRelationshipDistance("Biblioteca Gallardo", "Norte - Biblioteca Gallardo", 30);
        setRelationshipDistance("Biblioteca Gallardo", "Norte - Planta Piloto", 90);

        setRelationshipDistance("Edificio Soro", "Este - Edif. Soro", 40);
        setRelationshipDistance("Edificio Soro", "Este - Edif. Ing. Sueldo", 150);
        setRelationshipDistance("Edificio Soro", "Sur - Ing. Civil", 300);

        setRelationshipDistance("Edificio Ing. Sueldo", "Este - Edif. Ing. Sueldo", 50);
        setRelationshipDistance("Edificio Ing. Sueldo", "Este - Edif. Soro", 130);
        setRelationshipDistance("Edificio Ing. Sueldo", "Norte - Biblioteca Gallardo", 280);

        setRelationshipDistance("Edificio Benito Posetto", "Oeste - Edif. Benito Posetto", 30);

        System.out.println(">> Distancias de relaciones CERCA_DE sembradas correctamente.");
    }

    private SectorEstacionamiento sector(String nombre, int capacidadTotal, int lugaresLibres) {
        SectorEstacionamiento sector = new SectorEstacionamiento();
        sector.setMapaId("DEFAULT"); // Asignar al mapa default
        sector.setNombre(nombre);
        sector.setCapacidadTotal(capacidadTotal);
        sector.setLugaresLibres(lugaresLibres);
        return sector;
    }

    private Edificio edificio(String nombre, int numeroMapa, List<SectorEstacionamiento> estacionamientos) {
        Edificio edificio = new Edificio();
        edificio.setNombre(nombre);
        edificio.setNumeroMapa(numeroMapa);
        edificio.setEstacionamientos(estacionamientos);
        return edificio;
    }

    private void setRelationshipDistance(String edificioNombre, String sectorNombre, int distancia) {
        neo4jClient.query(
            "MATCH (s:SectorEstacionamiento {nombre: $sectorNombre})-[r:CERCA_DE]->(e:Edificio {nombre: $edificioNombre}) " +
            "SET r.distancia = $distancia"
        )
        .bind(sectorNombre).to("sectorNombre")
        .bind(edificioNombre).to("edificioNombre")
        .bind(distancia).to("distancia")
        .run();
    }

    private Usuario usuarioDemo() {
        Usuario usuario = new Usuario("411953", "Usuario UTN", "admin1234", "ADMIN");
        usuario.setUsername("411953");
        usuario.setEmailInstitucional("411953@tecnicatura.frc.utn.edu.ar");
        usuario.setAutoMarca("CHEVROLET");
        usuario.setAutoModelo("ONIX");
        usuario.setAutoColor("Azul");
        usuario.setAutoPatente("UTN411");
        usuario.setAutoMarcaId(9);
        usuario.setAutoModeloId(136);
        return usuario;
    }
}
