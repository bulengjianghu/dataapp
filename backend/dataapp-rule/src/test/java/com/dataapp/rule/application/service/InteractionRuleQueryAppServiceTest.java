package com.dataapp.rule.application.service;

import com.dataapp.rule.domain.model.aggregate.InteractionRuleDefinition;
import com.dataapp.rule.domain.model.entity.InteractionRuleDraft;
import com.dataapp.rule.domain.model.entity.InteractionRuleVersion;
import com.dataapp.rule.domain.model.valueobject.InteractionRuleDraftSummary;
import com.dataapp.rule.domain.repository.InteractionRuleRepository;
import com.dataapp.rule.interfaces.dto.InteractionRuleDraftListItemResponse;
import com.dataapp.rule.interfaces.dto.InteractionRuleDraftResponse;
import com.dataapp.rule.interfaces.dto.InteractionRulePublishedResponse;
import com.dataapp.shared.exception.BizException;
import com.dataapp.shared.exception.ErrorCode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class InteractionRuleQueryAppServiceTest {

    @Mock
    private InteractionRuleRepository interactionRuleRepository;

    @Test
    void shouldListInteractionRuleDraftSummaries() {
        InteractionRuleQueryAppService service = new InteractionRuleQueryAppService(
            interactionRuleRepository,
            new ObjectMapper()
        );
        when(interactionRuleRepository.listDraftSummariesByFormId(1001L)).thenReturn(List.of(
            new InteractionRuleDraftSummary(
                2001L,
                "IR-2001",
                "金额联动",
                "FIELD_CHANGE_MAIN",
                "{\"priority\":300,\"enabled\":true}",
                "DRAFT",
                OffsetDateTime.parse("2026-03-19T12:30:00+08:00")
            )
        ));

        List<InteractionRuleDraftListItemResponse> response = service.listDrafts(1001L);

        assertThat(response).hasSize(1);
        assertThat(response.getFirst().ruleId()).isEqualTo(2001L);
        assertThat(response.getFirst().priority()).isEqualTo(300);
        assertThat(response.getFirst().enabled()).isTrue();
    }

    @Test
    void shouldLoadInteractionRuleDraft() {
        InteractionRuleQueryAppService service = new InteractionRuleQueryAppService(
            interactionRuleRepository,
            new ObjectMapper()
        );
        InteractionRuleDefinition definition = new InteractionRuleDefinition(
            2001L,
            1001L,
            "IR-2001",
            "金额联动",
            "FIELD_CHANGE_MAIN",
            "FORM",
            "DRAFT",
            null,
            ""
        );
        InteractionRuleDraft draft = new InteractionRuleDraft(
            3001L,
            2001L,
            "{\"ruleCode\":\"IR-2001\",\"ruleName\":\"金额联动\",\"eventType\":\"FORM_INIT\",\"scopeType\":\"FORM\",\"priority\":300,\"description\":\"初始化金额\",\"enabled\":true,\"compilerVersion\":\"v0.1.0\"}",
            "{\"nodes\":[]}",
            "{\"steps\":[]}",
            "{}",
            4,
            "checksum",
            "v0.1.0",
            1L,
            OffsetDateTime.parse("2026-03-19T10:00:00+08:00")
        );
        when(interactionRuleRepository.findDefinitionById(1001L, 2001L)).thenReturn(definition);
        when(interactionRuleRepository.findDraftByRuleId(2001L)).thenReturn(draft);

        InteractionRuleDraftResponse response = service.getDraft(1001L, 2001L);

        assertThat(response.ruleCode()).isEqualTo("IR-2001");
        assertThat(response.eventType()).isEqualTo("FORM_INIT");
        assertThat(response.priority()).isEqualTo(300);
        assertThat(response.draftVersion()).isEqualTo(4);
        assertThat(response.graphJson()).containsKey("nodes");
    }

    @Test
    void shouldThrowWhenDraftNotFound() {
        InteractionRuleQueryAppService service = new InteractionRuleQueryAppService(
            interactionRuleRepository,
            new ObjectMapper()
        );
        when(interactionRuleRepository.findDefinitionById(1001L, 2001L)).thenReturn(null);
        when(interactionRuleRepository.findDraftByRuleId(2001L)).thenReturn(null);

        assertThatThrownBy(() -> service.getDraft(1001L, 2001L))
            .isInstanceOf(BizException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.RULE_NOT_FOUND);
    }

    @Test
    void shouldFallbackToDefaultValuesWhenDraftMetaIncomplete() {
        InteractionRuleQueryAppService service = new InteractionRuleQueryAppService(
            interactionRuleRepository,
            new ObjectMapper()
        );
        InteractionRuleDefinition definition = new InteractionRuleDefinition(
            2002L,
            1001L,
            "IR-2002",
            "默认值规则",
            "FIELD_CHANGE_MAIN",
            "FORM",
            "DRAFT",
            null,
            "desc"
        );
        InteractionRuleDraft draft = new InteractionRuleDraft(
            3002L,
            2002L,
            "{\"enabled\":\"x\"}",
            "{}",
            "{}",
            "{}",
            1,
            "checksum",
            "",
            1L,
            OffsetDateTime.parse("2026-03-19T10:00:00+08:00")
        );
        when(interactionRuleRepository.findDefinitionById(1001L, 2002L)).thenReturn(definition);
        when(interactionRuleRepository.findDraftByRuleId(2002L)).thenReturn(draft);

        InteractionRuleDraftResponse response = service.getDraft(1001L, 2002L);

        assertThat(response.ruleCode()).isEqualTo("IR-2002");
        assertThat(response.ruleName()).isEqualTo("默认值规则");
        assertThat(response.eventType()).isEqualTo("FIELD_CHANGE_MAIN");
        assertThat(response.priority()).isEqualTo(100);
        assertThat(response.enabled()).isTrue();
        assertThat(response.description()).isEqualTo("desc");
    }

    @Test
    void shouldLoadPublishedInteractionRuleVersion() {
        InteractionRuleQueryAppService service = new InteractionRuleQueryAppService(
            interactionRuleRepository,
            new ObjectMapper()
        );
        when(interactionRuleRepository.findCurrentPublishedVersion(1001L, 2001L)).thenReturn(
            new InteractionRuleVersion(
                4001L,
                2001L,
                1,
                "INTERACTION",
                1001L,
                null,
                "FIELD_CHANGE_MAIN",
                300,
                java.util.Map.of("ruleCode", "IR-2001"),
                java.util.Map.of("steps", java.util.List.of()),
                java.util.Map.of("triggerScope", "MAIN_FIELD"),
                java.util.Map.of("fieldRefs", java.util.List.of("main.amount")),
                "{\"type\":\"continue\"}",
                "v0.2.0",
                1L,
                OffsetDateTime.parse("2026-03-19T15:00:00+08:00"),
                "ACTIVE"
            )
        );

        InteractionRulePublishedResponse response = service.getPublished(1001L, 2001L);

        assertThat(response.versionId()).isEqualTo(4001L);
        assertThat(response.status()).isEqualTo("ACTIVE");
        assertThat(response.publishedSnapshotJson()).containsEntry("ruleCode", "IR-2001");
    }
}
