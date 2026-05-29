package com.utn.frc.smartparkingutn.service;

import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class PasswordResetService {

    private final Map<String, String> tokenToLegajoMap = new ConcurrentHashMap<>();
    private final Map<String, Long> tokenExpiryMap = new ConcurrentHashMap<>();

    public String generateToken(String legajo) {
        String token = UUID.randomUUID().toString();
        tokenToLegajoMap.put(token, legajo);
        tokenExpiryMap.put(token, System.currentTimeMillis() + 15 * 60 * 1000);
        return token;
    }

    public boolean validateToken(String token) {
        if (token == null) {
            return false;
        }
        Long expiry = tokenExpiryMap.get(token);
        if (expiry == null) {
            return false;
        }
        if (System.currentTimeMillis() > expiry) {
            invalidateToken(token);
            return false;
        }
        return true;
    }

    public String getLegajoForToken(String token) {
        return tokenToLegajoMap.get(token);
    }

    public void invalidateToken(String token) {
        if (token != null) {
            tokenToLegajoMap.remove(token);
            tokenExpiryMap.remove(token);
        }
    }
}
