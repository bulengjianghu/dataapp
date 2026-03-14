package com.dataapp.identity.domain.model;

import java.util.List;

public record UserAccount(
    Long id,
    String username,
    String displayName,
    String status,
    String passwordHash,
    List<String> roles
) {
}
