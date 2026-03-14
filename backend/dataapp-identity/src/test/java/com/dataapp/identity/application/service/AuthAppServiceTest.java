package com.dataapp.identity.application.service;

import com.dataapp.identity.domain.model.UserAccount;
import com.dataapp.identity.domain.repository.UserAccountRepository;
import com.dataapp.identity.interfaces.dto.LoginResponse;
import com.dataapp.shared.exception.BizException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthAppServiceTest {

    @Mock
    private UserAccountRepository userAccountRepository;

    @Mock
    private JwtTokenService jwtTokenService;

    @InjectMocks
    private AuthAppService authAppService;

    @Test
    void shouldReturnTokenWhenCredentialsAreValid() {
        UserAccount userAccount = new UserAccount(
            1L,
            "admin",
            "系统管理员",
            "ACTIVE",
            "{noop}admin123",
            List.of("SUPER_ADMIN")
        );
        when(userAccountRepository.findByUsername("admin")).thenReturn(userAccount);
        when(jwtTokenService.generateToken(userAccount)).thenReturn("token-value");
        when(jwtTokenService.expiresInSeconds()).thenReturn(7200L);

        LoginResponse response = authAppService.login("admin", "admin123");

        assertThat(response.accessToken()).isEqualTo("token-value");
        assertThat(response.userId()).isEqualTo(1L);
        assertThat(response.username()).isEqualTo("admin");
        verify(jwtTokenService).generateToken(userAccount);
    }

    @Test
    void shouldThrowWhenUserDoesNotExist() {
        when(userAccountRepository.findByUsername("missing")).thenReturn(null);

        assertThatThrownBy(() -> authAppService.login("missing", "admin123"))
            .isInstanceOf(BizException.class)
            .hasMessage("用户名或密码错误");
    }

    @Test
    void shouldThrowWhenUserIsDisabled() {
        when(userAccountRepository.findByUsername("locked"))
            .thenReturn(new UserAccount(2L, "locked", "禁用用户", "DISABLED", "{noop}admin123", List.of("USER")));

        assertThatThrownBy(() -> authAppService.login("locked", "admin123"))
            .isInstanceOf(BizException.class)
            .hasMessage("用户已禁用");
    }

    @Test
    void shouldThrowWhenPasswordIsInvalid() {
        when(userAccountRepository.findByUsername("admin"))
            .thenReturn(new UserAccount(1L, "admin", "系统管理员", "ACTIVE", "{noop}admin123", List.of("SUPER_ADMIN")));

        assertThatThrownBy(() -> authAppService.login("admin", "wrong-password"))
            .isInstanceOf(BizException.class)
            .hasMessage("用户名或密码错误");
    }
}
