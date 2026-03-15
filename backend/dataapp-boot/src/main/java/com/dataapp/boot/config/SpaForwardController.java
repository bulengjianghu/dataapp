package com.dataapp.boot.config;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class SpaForwardController {

    @GetMapping({"/", "/forms", "/editor", "/preview"})
    public String forwardRootRoutes() {
        return "forward:/index.html";
    }
}
