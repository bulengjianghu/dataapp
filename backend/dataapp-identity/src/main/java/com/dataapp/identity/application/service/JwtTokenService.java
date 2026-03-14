package com.dataapp.identity.application.service;

import com.dataapp.identity.domain.model.UserAccount;
import com.dataapp.shared.security.CurrentUser;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.List;

@Service
public class JwtTokenService {

    private final SecretKey secretKey;
    private final long expiresInSeconds;

    public JwtTokenService(
        @Value("${app.security.jwt-secret}") String jwtSecret,
        @Value("${app.security.expires-in-seconds}") long expiresInSeconds
    ) {
        this.secretKey = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
        this.expiresInSeconds = expiresInSeconds;
    }

    public String generateToken(UserAccount userAccount) {
        Instant now = Instant.now();
        return Jwts.builder()
            .subject(userAccount.username())
            .claim("uid", userAccount.id())
            .claim("roles", userAccount.roles())
            .issuedAt(Date.from(now))
            .expiration(Date.from(now.plusSeconds(expiresInSeconds)))
            .signWith(secretKey)
            .compact();
    }

    public CurrentUser parseToken(String token) {
        Claims claims = Jwts.parser()
            .verifyWith(secretKey)
            .build()
            .parseSignedClaims(token)
            .getPayload();
        Long userId = claims.get("uid", Number.class).longValue();
        @SuppressWarnings("unchecked")
        List<String> roles = claims.get("roles", List.class);
        return new CurrentUser(userId, claims.getSubject(), roles == null ? List.of() : roles);
    }

    public long expiresInSeconds() {
        return expiresInSeconds;
    }
}
