package com.dataapp.form.interfaces.rest;

import com.dataapp.form.application.service.FormCommandAppService;
import com.dataapp.form.application.service.FormQueryAppService;
import com.dataapp.form.interfaces.dto.FormCreateRequest;
import com.dataapp.form.interfaces.dto.FormCreateResponse;
import com.dataapp.form.interfaces.dto.FormDraftResponse;
import com.dataapp.form.interfaces.dto.FormDetailResponse;
import com.dataapp.form.interfaces.dto.FormPublishResponse;
import com.dataapp.form.interfaces.dto.SaveFormDraftRequest;
import com.dataapp.shared.kernel.response.Result;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
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
    public Result<FormCreateResponse> create(@Valid @RequestBody FormCreateRequest request) {
        return Result.success(formCommandAppService.create(request.name(), request.formCode()));
    }

    @GetMapping("/{formId}")
    public Result<FormDetailResponse> detail(@PathVariable("formId") Long formId) {
        return Result.success(formQueryAppService.getById(formId));
    }

    @GetMapping("/{formId}/draft")
    public Result<FormDraftResponse> draft(@PathVariable("formId") Long formId) {
        return Result.success(formQueryAppService.getDraft(formId));
    }

    @PutMapping("/{formId}/draft")
    public Result<FormDraftResponse> saveDraft(
        @PathVariable("formId") Long formId,
        @Valid @RequestBody SaveFormDraftRequest request
    ) {
        return Result.success(formCommandAppService.saveDraft(formId, request.name(), request.description(), request.fields()));
    }

    @PostMapping("/{formId}/publish")
    public Result<FormPublishResponse> publish(@PathVariable("formId") Long formId) {
        return Result.success(formCommandAppService.publish(formId));
    }
}
