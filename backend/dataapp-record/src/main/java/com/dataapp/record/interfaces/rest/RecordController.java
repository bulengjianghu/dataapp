package com.dataapp.record.interfaces.rest;

import com.dataapp.record.application.service.RecordCommandAppService;
import com.dataapp.record.application.service.RecordQueryAppService;
import com.dataapp.record.interfaces.dto.RecordCreateRequest;
import com.dataapp.record.interfaces.dto.RecordDetailResponse;
import com.dataapp.record.interfaces.dto.RecordDraftSaveRequest;
import com.dataapp.record.interfaces.dto.RecordListItemResponse;
import com.dataapp.record.interfaces.dto.RecordSubmitRequest;
import com.dataapp.record.interfaces.dto.RelationRecordOptionResponse;
import com.dataapp.shared.kernel.response.Result;
import com.dataapp.shared.security.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

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
    public Result<Long> create(
        @AuthenticationPrincipal CurrentUser currentUser,
        @Valid @RequestBody RecordCreateRequest request
    ) {
        return Result.success(recordCommandAppService.create(
            currentUser,
            request.formId(),
            request.formVersionId(),
            payloadOf(request.mainData(), request.detailTables())
        ));
    }

    @PutMapping("/{recordId}/draft")
    public Result<Boolean> saveDraft(
        @AuthenticationPrincipal CurrentUser currentUser,
        @PathVariable("recordId") Long recordId,
        @Valid @RequestBody RecordDraftSaveRequest request
    ) {
        recordCommandAppService.saveDraft(currentUser, recordId, payloadOf(request.mainData(), request.detailTables()));
        return Result.success(Boolean.TRUE);
    }

    @PostMapping("/{recordId}/submit")
    public Result<Boolean> submit(
        @AuthenticationPrincipal CurrentUser currentUser,
        @PathVariable("recordId") Long recordId,
        @Valid @RequestBody RecordSubmitRequest request
    ) {
        recordCommandAppService.submit(currentUser, recordId, payloadOf(request.mainData(), request.detailTables()));
        return Result.success(Boolean.TRUE);
    }

    @GetMapping("/{recordId}")
    public Result<RecordDetailResponse> detail(
        @AuthenticationPrincipal CurrentUser currentUser,
        @PathVariable("recordId") Long recordId
    ) {
        return Result.success(recordQueryAppService.getById(currentUser, recordId));
    }

    @GetMapping("/by-form/{formId}")
    public Result<List<RecordListItemResponse>> listByForm(
        @AuthenticationPrincipal CurrentUser currentUser,
        @PathVariable("formId") Long formId
    ) {
        return Result.success(recordQueryAppService.listByFormId(currentUser, formId));
    }

    @GetMapping("/relation/by-form/{formId}")
    public Result<List<RelationRecordOptionResponse>> listRelationOptionsByForm(
        @AuthenticationPrincipal CurrentUser currentUser,
        @PathVariable("formId") Long formId
    ) {
        return Result.success(recordQueryAppService.listRelationOptionsByFormId(currentUser, formId));
    }

    private Map<String, Object> payloadOf(
        Map<String, Object> mainData,
        Map<String, List<Map<String, Object>>> detailTables
    ) {
        LinkedHashMap<String, Object> payload = new LinkedHashMap<>();
        payload.put("mainData", mainData);
        payload.put("detailTables", detailTables);
        return payload;
    }
}
