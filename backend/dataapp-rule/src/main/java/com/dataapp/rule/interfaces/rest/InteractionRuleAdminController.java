package com.dataapp.rule.interfaces.rest;

import com.dataapp.rule.application.service.InteractionRuleCommandAppService;
import com.dataapp.rule.application.service.InteractionRuleQueryAppService;
import com.dataapp.rule.interfaces.dto.CreateInteractionRuleRequest;
import com.dataapp.rule.interfaces.dto.InteractionRuleDraftListItemResponse;
import com.dataapp.rule.interfaces.dto.InteractionRuleDraftResponse;
import com.dataapp.rule.interfaces.dto.InteractionRulePublishResponse;
import com.dataapp.rule.interfaces.dto.InteractionRulePublishedResponse;
import com.dataapp.rule.interfaces.dto.InteractionRuleValidationResponse;
import com.dataapp.rule.interfaces.dto.SaveInteractionRuleDraftRequest;
import com.dataapp.shared.kernel.response.Result;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/forms/{formId}/interaction-rules")
public class InteractionRuleAdminController {

    private final InteractionRuleCommandAppService interactionRuleCommandAppService;
    private final InteractionRuleQueryAppService interactionRuleQueryAppService;

    public InteractionRuleAdminController(
        InteractionRuleCommandAppService interactionRuleCommandAppService,
        InteractionRuleQueryAppService interactionRuleQueryAppService
    ) {
        this.interactionRuleCommandAppService = interactionRuleCommandAppService;
        this.interactionRuleQueryAppService = interactionRuleQueryAppService;
    }

    @GetMapping
    public Result<List<InteractionRuleDraftListItemResponse>> list(@PathVariable("formId") Long formId) {
        return Result.success(interactionRuleQueryAppService.listDrafts(formId));
    }

    @PostMapping
    public Result<InteractionRuleDraftResponse> create(
        @PathVariable("formId") Long formId,
        @RequestBody(required = false) CreateInteractionRuleRequest request
    ) {
        return Result.success(interactionRuleCommandAppService.create(
            formId,
            request == null ? null : request.ruleName(),
            request == null ? null : request.eventType(),
            request == null ? null : request.priority()
        ));
    }

    @GetMapping("/{ruleId}/draft")
    public Result<InteractionRuleDraftResponse> draft(
        @PathVariable("formId") Long formId,
        @PathVariable("ruleId") Long ruleId
    ) {
        return Result.success(interactionRuleQueryAppService.getDraft(formId, ruleId));
    }

    @PutMapping("/{ruleId}/draft")
    public Result<InteractionRuleDraftResponse> saveDraft(
        @PathVariable("formId") Long formId,
        @PathVariable("ruleId") Long ruleId,
        @Valid @RequestBody SaveInteractionRuleDraftRequest request
    ) {
        return Result.success(interactionRuleCommandAppService.saveDraft(formId, ruleId, request));
    }

    @PostMapping("/{ruleId}/validate")
    public Result<InteractionRuleValidationResponse> validate(
        @PathVariable("formId") Long formId,
        @PathVariable("ruleId") Long ruleId
    ) {
        return Result.success(interactionRuleCommandAppService.validate(formId, ruleId));
    }

    @PostMapping("/{ruleId}/publish")
    public Result<InteractionRulePublishResponse> publish(
        @PathVariable("formId") Long formId,
        @PathVariable("ruleId") Long ruleId
    ) {
        return Result.success(interactionRuleCommandAppService.publish(formId, ruleId));
    }

    @GetMapping("/{ruleId}/published")
    public Result<InteractionRulePublishedResponse> published(
        @PathVariable("formId") Long formId,
        @PathVariable("ruleId") Long ruleId
    ) {
        return Result.success(interactionRuleQueryAppService.getPublished(formId, ruleId));
    }
}
