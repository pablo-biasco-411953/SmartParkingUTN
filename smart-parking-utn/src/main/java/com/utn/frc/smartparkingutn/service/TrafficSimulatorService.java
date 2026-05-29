package com.utn.frc.smartparkingutn.service;

import com.utn.frc.smartparkingutn.model.RegistroOcupacion;
import com.utn.frc.smartparkingutn.model.SectorEstacionamiento;
import com.utn.frc.smartparkingutn.repository.HistorialRepository;
import com.utn.frc.smartparkingutn.repository.SectorRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Random;

@Service
public class TrafficSimulatorService {

    private final SectorRepository sectorRepository;
    private final HistorialRepository historialRepository;
    private final Random random = new Random();

    public TrafficSimulatorService(SectorRepository sectorRepository, HistorialRepository historialRepository) {
        this.sectorRepository = sectorRepository;
        this.historialRepository = historialRepository;
    }

    // Ejecutar cada 2 minutos (120000 ms) para no saturar el mapa de los compañeros
    @Scheduled(fixedRate = 120000)
    public void simularMovimiento() {
        List<SectorEstacionamiento> sectores = sectorRepository.findAll();
        if (sectores.isEmpty()) return;

        // Seleccionar 1 o 2 sectores al azar para modificar levemente
        int eventosAcrear = random.nextInt(3); // 0, 1 o 2 eventos por ciclo
        if (eventosAcrear == 0) return;

        for (int i = 0; i < eventosAcrear; i++) {
            SectorEstacionamiento sector = sectores.get(random.nextInt(sectores.size()));
            boolean esEntrada = random.nextBoolean();

            if (esEntrada) {
                if (sector.getLugaresLibres() > 0) {
                    sector.setLugaresLibres(sector.getLugaresLibres() - 1);
                    sectorRepository.save(sector);
                    registrarEvento("SIM_" + random.nextInt(9999), sector, "ENTRADA");
                }
            } else {
                if (sector.getLugaresLibres() < sector.getCapacidadTotal()) {
                    sector.setLugaresLibres(sector.getLugaresLibres() + 1);
                    sectorRepository.save(sector);
                    registrarEvento("SIM_" + random.nextInt(9999), sector, "SALIDA");
                }
            }
        }
    }

    private void registrarEvento(String legajoSimulado, SectorEstacionamiento sector, String tipo) {
        RegistroOcupacion reg = RegistroOcupacion.nuevoEvento(legajoSimulado, sector.getId(), sector.getNombre(), tipo);
        reg.setUbicacionValidada(false);
        reg.setOrigenValidacion("SIMULADOR");
        historialRepository.save(reg);
    }
}
