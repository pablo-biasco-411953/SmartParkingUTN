package com.utn.frc.smartparkingutn.controller;

import com.utn.frc.smartparkingutn.model.Usuario;
import com.utn.frc.smartparkingutn.repository.UsuarioRepository;
import com.utn.frc.smartparkingutn.service.PasswordResetService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class LoginController {

    private static final Set<String> DOMINIOS_INSTITUCIONALES = Set.of(
            "frc", "cbasicas", "civil", "computos", "decanato", "egresado",
            "electrica", "electronica", "extension", "industrial", "licenciatura",
            "mecanica", "metalurgica", "org", "posgrado", "punilla", "quimica",
            "radio", "sa", "sae", "scdt", "tecnicatura"
    );

    private final UsuarioRepository usuarioRepository;
    private final PasswordResetService passwordResetService;

    public LoginController(UsuarioRepository usuarioRepository, PasswordResetService passwordResetService) {
        this.usuarioRepository = usuarioRepository;
        this.passwordResetService = passwordResetService;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> credentials) {
        String legajo = credentials.get("legajo");
        String password = credentials.get("password");

        if (legajo == null || password == null) {
            return ResponseEntity.badRequest().body("Faltan datos");
        }

        return usuarioRepository.findById(legajo)
                .map(user -> {
                    if (user.getPassword().equals(password)) {
                        return ResponseEntity.ok(user);
                    }
                    return ResponseEntity.status(401).body("Contrasena incorrecta");
                })
                .orElse(ResponseEntity.status(404).body("Legajo no encontrado"));
    }

    @PostMapping("/register")
    public ResponseEntity<?> registrar(@RequestBody Usuario usuario) {
        String error = validarRegistro(usuario);
        if (error != null) {
            return ResponseEntity.badRequest().body(error);
        }

        if (usuarioRepository.existsById(usuario.getLegajo())) {
            return ResponseEntity.badRequest().body("Ya existe una cuenta con ese legajo");
        }

        usuario.setRol("ALUMNO");
        usuarioRepository.save(usuario);
        return ResponseEntity.ok(usuario);
    }

    private String validarRegistro(Usuario usuario) {
        if (estaVacio(usuario.getLegajo()) || estaVacio(usuario.getNombre()) || estaVacio(usuario.getUsername())) {
            return "Completa legajo, nombre y username";
        }
        if (estaVacio(usuario.getEmailInstitucional()) || !emailInstitucionalValido(usuario.getLegajo(), usuario.getEmailInstitucional())) {
            return "Usa tu correo institucional: legajo@area.frc.utn.edu.ar";
        }
        if (!passwordSegura(usuario.getPassword())) {
            return "La contrasena debe tener minimo 8 caracteres, mayuscula, minuscula y numero";
        }
        if (estaVacio(usuario.getAutoMarca()) || estaVacio(usuario.getAutoModelo()) || estaVacio(usuario.getAutoColor())) {
            return "Completa marca, modelo y color del auto";
        }
        return null;
    }

    private boolean emailInstitucionalValido(String legajo, String email) {
        String normalized = email.toLowerCase().trim();
        String[] partes = normalized.split("@");
        if (partes.length != 2 || !partes[0].equals(legajo)) {
            return false;
        }
        String suffix = ".frc.utn.edu.ar";
        if (!partes[1].endsWith(suffix)) {
            return false;
        }
        String area = partes[1].substring(0, partes[1].length() - suffix.length());
        return DOMINIOS_INSTITUCIONALES.contains(area);
    }

    private boolean passwordSegura(String password) {
        if (password == null || password.length() < 8) {
            return false;
        }
        return password.chars().anyMatch(Character::isUpperCase)
                && password.chars().anyMatch(Character::isLowerCase)
                && password.chars().anyMatch(Character::isDigit);
    }

    private boolean estaVacio(String value) {
        return value == null || value.isBlank();
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> request) {
        String legajo = request.get("legajo");
        String email = request.get("email");

        if ((legajo == null || legajo.isBlank()) && (email == null || email.isBlank())) {
            return ResponseEntity.badRequest().body("Debe proporcionar legajo o email");
        }

        if (legajo == null || legajo.isBlank()) {
            String normalized = email.toLowerCase().trim();
            int atIndex = normalized.indexOf('@');
            if (atIndex > 0) {
                legajo = normalized.substring(0, atIndex);
            } else {
                legajo = normalized;
            }
        }

        java.util.Optional<Usuario> userOpt = usuarioRepository.findById(legajo);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(404).body("Usuario no encontrado");
        }

        Usuario user = userOpt.get();
        String token = passwordResetService.generateToken(legajo);
        
        System.out.println("===================================================================");
        System.out.println("[SIMULACIÓN DE CORREO - SMART PARKING UTN]");
        System.out.println("Para: " + user.getEmailInstitucional());
        System.out.println("Asunto: Recuperación de Contraseña");
        System.out.println("Cuerpo: Hola " + user.getNombre() + ", has solicitado restaurar tu contraseña. ");
        System.out.println("Haz clic en el siguiente enlace de demostración local para restablecerla:");
        System.out.println("http://localhost:3000/reset-password?token=" + token);
        System.out.println("===================================================================");

        Map<String, Object> responseBody = new HashMap<>();
        responseBody.put("message", "Se envió el correo de demostración (ver consola).");
        
        Map<String, String> demoBypass = new HashMap<>();
        demoBypass.put("token", token);
        demoBypass.put("resetLink", "http://localhost:3000/reset-password?token=" + token);
        
        responseBody.put("demoBypass", demoBypass);
        
        return ResponseEntity.ok(responseBody);
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> request) {
        String token = request.get("token");
        String newPassword = request.get("newPassword");

        if (token == null || token.isBlank()) {
            return ResponseEntity.badRequest().body("Token es requerido");
        }

        if (!passwordResetService.validateToken(token)) {
            return ResponseEntity.badRequest().body("El token no es válido o ha expirado");
        }

        if (!passwordSegura(newPassword)) {
            return ResponseEntity.badRequest().body("La contraseña debe tener mínimo 8 caracteres, mayúscula, minúscula y número");
        }

        String legajo = passwordResetService.getLegajoForToken(token);
        if (legajo == null) {
            return ResponseEntity.badRequest().body("No se encontró legajo para este token");
        }

        java.util.Optional<Usuario> userOpt = usuarioRepository.findById(legajo);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(404).body("Usuario no encontrado");
        }

        Usuario user = userOpt.get();
        user.setPassword(newPassword);
        usuarioRepository.save(user);
        passwordResetService.invalidateToken(token);
        
        return ResponseEntity.ok(Map.of("message", "Contraseña restablecida con éxito"));
    }
}
