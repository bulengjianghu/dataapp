package com.dataapp.form.interfaces.rest;

import com.dataapp.form.application.service.FormQueryAppService;
import com.dataapp.form.interfaces.dto.FormRuntimeResponse;
import com.dataapp.shared.kernel.response.Result;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/runtime/forms")
public class FormRuntimeController {

    private final FormQueryAppService formQueryAppService;

    public FormRuntimeController(FormQueryAppService formQueryAppService) {
        this.formQueryAppService = formQueryAppService;
    }

    @GetMapping("/{formCode}")
    public Result<FormRuntimeResponse> current(@PathVariable("formCode") String formCode) {
        return Result.success(formQueryAppService.getPublishedByFormCode(formCode));
    }
}
