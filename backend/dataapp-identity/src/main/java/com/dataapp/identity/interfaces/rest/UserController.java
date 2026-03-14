package com.dataapp.identity.interfaces.rest;

import com.dataapp.shared.kernel.response.Result;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @GetMapping("/ping")
    public Result<String> ping() {
        return Result.success("identity-ok");
    }
}
