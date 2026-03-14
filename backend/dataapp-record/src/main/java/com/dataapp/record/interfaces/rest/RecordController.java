package com.dataapp.record.interfaces.rest;

import com.dataapp.record.application.service.RecordCommandAppService;
import com.dataapp.record.application.service.RecordQueryAppService;
import com.dataapp.record.interfaces.dto.RecordCreateRequest;
import com.dataapp.record.interfaces.dto.RecordDetailResponse;
import com.dataapp.shared.kernel.response.Result;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/records")
public class RecordController {

    private final RecordCommandAppService recordCommandAppService;
    private final RecordQueryAppService recordQueryAppService;

    public RecordController(
        RecordCommandAppService recordCommandAppService,
        RecordQueryAppService recordQueryAppService
    ) {
        this.recordCommandAppService = recordCommandAppService;
        this.recordQueryAppService = recordQueryAppService;
    }

    @PostMapping
    public Result<String> create(@Valid @RequestBody RecordCreateRequest request) {
        return Result.success(recordCommandAppService.create(request.formId(), request.formVersionId(), request.dataJson()));
    }

    @PostMapping("/{recordId}/submit")
    public Result<String> submit(@PathVariable("recordId") Long recordId) {
        return Result.success(recordCommandAppService.submit(recordId));
    }

    @GetMapping("/{recordId}")
    public Result<RecordDetailResponse> detail(@PathVariable("recordId") Long recordId) {
        return Result.success(recordQueryAppService.getById(recordId));
    }
}
