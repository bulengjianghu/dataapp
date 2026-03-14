package com.dataapp.identity.interfaces.rest;

import com.dataapp.identity.application.service.AuthAppService;
import com.dataapp.identity.interfaces.dto.CurrentUserResponse;
import com.dataapp.identity.interfaces.dto.LoginRequest;
import com.dataapp.identity.interfaces.dto.LoginResponse;
import com.dataapp.shared.exception.BizException;
import com.dataapp.shared.exception.ErrorCode;
import com.dataapp.shared.kernel.response.Result;
import com.dataapp.shared.security.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthAppService authAppService;

    public AuthController(AuthAppService authAppService) {
        this.authAppService = authAppService;
    }

    @PostMapping("/login")
    public Result<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        return Result.success(authAppService.login(request.username(), request.password()));
    }

    @GetMapping("/me")
    public Result<CurrentUserResponse> me(@AuthenticationPrincipal CurrentUser currentUser) {
        if (currentUser == null) {
            throw new BizException(ErrorCode.UNAUTHORIZED, "未登录或登录已失效");
        }
        return Result.success(new CurrentUserResponse(currentUser.userId(), currentUser.username(), currentUser.roles()));
    }
}
