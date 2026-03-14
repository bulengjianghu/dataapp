package com.dataapp.identity.application.service;

import com.dataapp.identity.domain.model.UserAccount;
import com.dataapp.identity.domain.repository.UserAccountRepository;
import com.dataapp.identity.interfaces.dto.LoginResponse;
import com.dataapp.shared.exception.BizException;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthAppService {

    private final UserAccountRepository userAccountRepository;
    private final JwtTokenService jwtTokenService;
    private final PasswordEncoder passwordEncoder = PasswordEncoderFactories.createDelegatingPasswordEncoder();

    public AuthAppService(UserAccountRepository userAccountRepository, JwtTokenService jwtTokenService) {
        this.userAccountRepository = userAccountRepository;
        this.jwtTokenService = jwtTokenService;
    }

    public LoginResponse login(String username, String password) {
        UserAccount userAccount = userAccountRepository.findByUsername(username);
        if (userAccount == null) {
            throw new BizException("AUTH_INVALID_CREDENTIALS", "用户名或密码错误");
        }
        if (!"ACTIVE".equalsIgnoreCase(userAccount.status())) {
            throw new BizException("AUTH_USER_DISABLED", "用户已禁用");
        }
        if (!passwordEncoder.matches(password, userAccount.passwordHash())) {
            throw new BizException("AUTH_INVALID_CREDENTIALS", "用户名或密码错误");
        }

        String token = jwtTokenService.generateToken(userAccount);
        return new LoginResponse(
            token,
            "Bearer",
            jwtTokenService.expiresInSeconds(),
            userAccount.id(),
            userAccount.username(),
            userAccount.displayName()
        );
    }
}
