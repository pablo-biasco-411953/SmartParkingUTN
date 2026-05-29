package com.utn.frc.smartparkingutn.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.cassandra.core.mapping.PrimaryKey;
import org.springframework.data.cassandra.core.mapping.Table;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Table("usuarios")
public class Usuario {
    @PrimaryKey
    private String legajo; // Tu ID principal
    private String nombre;
    private String password; // En un TP, con texto plano o algo simple basta
    private String rol; // "ALUMNO" o "DOCENTE"
    private String emailInstitucional;
    private String username;
    private String autoMarca;
    private String autoModelo;
    private String autoColor;
    private String autoPatente;
    private Integer autoMarcaId;
    private Integer autoModeloId;

    public Usuario(String legajo, String nombre, String password, String rol) {
        this.legajo = legajo;
        this.nombre = nombre;
        this.password = password;
        this.rol = rol;
    }
}
