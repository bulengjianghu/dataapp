package com.dataapp.rule.interfaces.rest;

import com.dataapp.rule.application.service.InteractionRuleQueryAppService;
import com.dataapp.rule.interfaces.dto.InteractionRuntimeRuleResponse;
import com.dataapp.shared.kernel.response.Result;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/runtime/forms/{formId}/interaction-rules")
public class InteractionRuleRuntimeController {

    private final InteractionRuleQueryAppService interactionRuleQueryAppService;

    public InteractionRuleRuntimeController(InteractionRuleQueryAppService interactionRuleQueryAppService) {
        this.interactionRuleQueryAppService = interactionRuleQueryAppService;
    }

    @GetMapping
    public Result<List<InteractionRuntimeRuleResponse>> listRuntimeRules(
        @PathVariable("formId") Long formId,
        @RequestParam(value = "formVersionId", required = false) Long formVersionId
    ) {
        return Result.success(interactionRuleQueryAppService.listRuntimeRules(formId, formVersionId));
    }
}
