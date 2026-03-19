package com.dataapp.rule.application.service;

import com.dataapp.rule.domain.model.aggregate.InteractionRuleDefinition;
import com.dataapp.rule.domain.model.entity.InteractionRuleDraft;
import com.dataapp.rule.domain.repository.InteractionRuleRepository;
import com.dataapp.rule.interfaces.dto.InteractionRuleDraftResponse;
import com.dataapp.rule.interfaces.dto.SaveInteractionRuleDraftRequest;
import com.dataapp.shared.exception.BizException;
import com.dataapp.shared.exception.ErrorCode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class InteractionRuleCommandAppServiceTest {

    @Mock
    private InteractionRuleRepository interactionRuleRepository;

    @Test
    void shouldCreateInteractionRuleDraft() {
        InteractionRuleCommandAppService service = new InteractionRuleCommandAppService(
            interactionRuleRepository,
            new ObjectMapper()
        );

        InteractionRuleDraftResponse response = service.create(1001L, null, null, null);

        ArgumentCaptor<InteractionRuleDefinition> definitionCaptor = ArgumentCaptor.forClass(InteractionRuleDefinition.class);
        ArgumentCaptor<InteractionRuleDraft> draftCaptor = ArgumentCaptor.forClass(InteractionRuleDraft.class);
        verify(interactionRuleRepository).saveDefinition(definitionCaptor.capture());
        verify(interactionRuleRepository).saveDraft(draftCaptor.capture());

        InteractionRuleDefinition definition = definitionCaptor.getValue();
        InteractionRuleDraft draft = draftCaptor.getValue();
        assertThat(definition.getFormId()).isEqualTo(1001L);
        assertThat(definition.getRuleCode()).startsWith("IR-");
        assertThat(definition.getRuleName()).isEqualTo("未命名规则");
        assertThat(definition.getEventType()).isEqualTo("FIELD_CHANGE_MAIN");
        assertThat(draft.getVersion()).isEqualTo(1);
        assertThat(response.formId()).isEqualTo(1001L);
        assertThat(response.ruleId()).isEqualTo(definition.getId());
        assertThat(response.priority()).isEqualTo(100);
        assertThat(response.graphJson()).isEmpty();
    }

    @Test
    void shouldSaveInteractionRuleDraft() {
        InteractionRuleCommandAppService service = new InteractionRuleCommandAppService(
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
            ""
        );
        InteractionRuleDraft currentDraft = new InteractionRuleDraft(
            3001L,
            2001L,
            "{}",
            "{}",
            "{}",
            "{\"normalized\":true}",
            2,
            "checksum",
            "",
            1L,
            OffsetDateTime.parse("2026-03-19T10:00:00+08:00")
        );

        when(interactionRuleRepository.findDefinitionById(1001L, 2001L)).thenReturn(definition);
        when(interactionRuleRepository.findDraftByRuleId(2001L)).thenReturn(currentDraft);

        InteractionRuleDraftResponse response = service.saveDraft(
            1001L,
            2001L,
            new SaveInteractionRuleDraftRequest(
                "IR-2001",
                "金额联动V2",
                "FORM_INIT",
                "FORM",
                500,
                "初始化金额和必填状态",
                true,
                "v0.1.0",
                Map.of("nodes", java.util.List.of()),
                Map.of("steps", java.util.List.of())
            )
        );

        ArgumentCaptor<InteractionRuleDefinition> definitionCaptor = ArgumentCaptor.forClass(InteractionRuleDefinition.class);
        ArgumentCaptor<InteractionRuleDraft> draftCaptor = ArgumentCaptor.forClass(InteractionRuleDraft.class);
        verify(interactionRuleRepository).updateDefinition(definitionCaptor.capture());
        verify(interactionRuleRepository).saveDraft(draftCaptor.capture());

        assertThat(definitionCaptor.getValue().getRuleName()).isEqualTo("金额联动V2");
        assertThat(definitionCaptor.getValue().getEventType()).isEqualTo("FORM_INIT");
        assertThat(draftCaptor.getValue().getId()).isEqualTo(3001L);
        assertThat(draftCaptor.getValue().getVersion()).isEqualTo(3);
        assertThat(draftCaptor.getValue().getNormalizedJson()).isEqualTo("{\"normalized\":true}");
        assertThat(response.ruleName()).isEqualTo("金额联动V2");
        assertThat(response.priority()).isEqualTo(500);
        assertThat(response.draftVersion()).isEqualTo(3);
        assertThat(response.compiledJson()).containsKey("steps");
    }

    @Test
    void shouldThrowWhenSavingMissingRuleDraft() {
        InteractionRuleCommandAppService service = new InteractionRuleCommandAppService(
            interactionRuleRepository,
            new ObjectMapper()
        );
        when(interactionRuleRepository.findDefinitionById(1001L, 2001L)).thenReturn(null);

        assertThatThrownBy(() -> service.saveDraft(
            1001L,
            2001L,
            new SaveInteractionRuleDraftRequest(
                "IR-2001",
                "金额联动",
                "FORM_INIT",
                "FORM",
                100,
                "",
                true,
                "",
                Map.of(),
                Map.of()
            )
        ))
            .isInstanceOf(BizException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.RULE_NOT_FOUND);
    }

    @Test
    void shouldSaveInteractionRuleDraftWithoutExistingSnapshot() {
        InteractionRuleCommandAppService service = new InteractionRuleCommandAppService(
            interactionRuleRepository,
            new ObjectMapper()
        );
        InteractionRuleDefinition definition = new InteractionRuleDefinition(
            2002L,
            1001L,
            "IR-2002",
            "空白规则",
            "FIELD_CHANGE_MAIN",
            "FORM",
            "DRAFT",
            ""
        );
        when(interactionRuleRepository.findDefinitionById(1001L, 2002L)).thenReturn(definition);
        when(interactionRuleRepository.findDraftByRuleId(2002L)).thenReturn(null);

        InteractionRuleDraftResponse response = service.saveDraft(
            1001L,
            2002L,
            new SaveInteractionRuleDraftRequest(
                "IR-2002",
                "空白规则",
                "FIELD_CHANGE_MAIN",
                "FORM",
                100,
                null,
                false,
                null,
                Map.of(),
                Map.of()
            )
        );

        ArgumentCaptor<InteractionRuleDraft> draftCaptor = ArgumentCaptor.forClass(InteractionRuleDraft.class);
        verify(interactionRuleRepository).saveDraft(draftCaptor.capture());
        assertThat(draftCaptor.getValue().getVersion()).isEqualTo(1);
        assertThat(draftCaptor.getValue().getCompilerVersion()).isEmpty();
        assertThat(response.enabled()).isFalse();
        assertThat(response.description()).isEmpty();
        assertThat(response.ruleCode()).isEqualTo("IR-2002");
    }
}
