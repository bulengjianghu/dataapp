package com.dataapp.shared.security;

import java.util.List;

public record CurrentUser(Long userId, String username, List<String> roles) {
}
