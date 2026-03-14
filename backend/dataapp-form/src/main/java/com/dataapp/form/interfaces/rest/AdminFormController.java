package com.dataapp.form.interfaces.rest;

import com.dataapp.form.application.service.FormCommandAppService;
import com.dataapp.form.application.service.FormQueryAppService;
import com.dataapp.form.interfaces.dto.FormCreateRequest;
import com.dataapp.form.interfaces.dto.FormDetailResponse;
import com.dataapp.shared.kernel.response.Result;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/forms")
public class AdminFormController {

    private final FormCommandAppService formCommandAppService;
    private final FormQueryAppService formQueryAppService;

    public AdminFormController(
        FormCommandAppService formCommandAppService,
        FormQueryAppService formQueryAppService
    ) {
        this.formCommandAppService = formCommandAppService;
        this.formQueryAppService = formQueryAppService;
    }

    @PostMapping
    public Result<String> create(@Valid @RequestBody FormCreateRequest request) {
        return Result.success(formCommandAppService.create(request.name(), request.formCode()));
    }

    @GetMapping("/{formId}")
    public Result<FormDetailResponse> detail(@PathVariable("formId") Long formId) {
        return Result.success(formQueryAppService.getById(formId));
    }
}
