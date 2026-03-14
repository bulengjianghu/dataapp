package com.dataapp.file.interfaces.rest;

import com.dataapp.shared.kernel.response.Result;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/files")
public class FileController {

    @GetMapping("/ping")
    public Result<String> ping() {
        return Result.success("file-ok");
    }
}
