package com.dataapp.identity.application.service;

import com.dataapp.identity.domain.model.UserAccount;
import com.dataapp.shared.security.CurrentUser;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.Test;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class JwtTokenServiceTest {

    @Test
    void shouldGenerateAndParseToken() {
        JwtTokenService jwtTokenService = new JwtTokenService(
            "change-me-in-prod-change-me-in-prod",
            7200L
        );
        UserAccount userAccount = new UserAccount(
            1L,
            "admin",
            "系统管理员",
            "ACTIVE",
            "{noop}admin123",
            List.of("SUPER_ADMIN")
        );

        String token = jwtTokenService.generateToken(userAccount);
        CurrentUser currentUser = jwtTokenService.parseToken(token);

        assertThat(token).isNotBlank();
        assertThat(jwtTokenService.expiresInSeconds()).isEqualTo(7200L);
        assertThat(currentUser.userId()).isEqualTo(1L);
        assertThat(currentUser.username()).isEqualTo("admin");
        assertThat(currentUser.roles()).containsExactly("SUPER_ADMIN");
    }

    @Test
    void shouldReturnEmptyRolesWhenTokenDoesNotContainRolesClaim() {
        String secret = "change-me-in-prod-change-me-in-prod";
        JwtTokenService jwtTokenService = new JwtTokenService(secret, 7200L);
        SecretKey secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        String token = Jwts.builder()
            .subject("admin")
            .claim("uid", 1L)
            .issuedAt(Date.from(Instant.now()))
            .expiration(Date.from(Instant.now().plusSeconds(7200L)))
            .signWith(secretKey)
            .compact();

        CurrentUser currentUser = jwtTokenService.parseToken(token);

        assertThat(currentUser.userId()).isEqualTo(1L);
        assertThat(currentUser.username()).isEqualTo("admin");
        assertThat(currentUser.roles()).isEmpty();
    }
}
