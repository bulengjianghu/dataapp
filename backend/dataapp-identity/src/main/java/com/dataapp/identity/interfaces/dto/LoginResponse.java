package com.dataapp.identity.interfaces.dto;

public record LoginResponse(
    String accessToken,
    String tokenType,
    long expiresInSeconds,
    Long userId,
    String username,
    String displayName
) {
}
