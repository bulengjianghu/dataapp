package com.dataapp.identity.interfaces.dto;

import java.util.List;

public record CurrentUserResponse(
    Long userId,
    String username,
    List<String> roles
) {
}
