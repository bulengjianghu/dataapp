package com.dataapp.rule.domain.model.aggregate;

import com.dataapp.rule.domain.model.entity.InteractionRuleDraft;
import com.dataapp.rule.domain.model.valueobject.InteractionRuleMeta;
import com.dataapp.shared.exception.BizException;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class InteractionRuleDefinitionTest {

    @Test
    void shouldCreateDefinitionWithGeneratedCodeAndDefaultMeta() {
        InteractionRuleMeta meta = InteractionRuleMeta.initialize("", "", null);

        InteractionRuleDefinition definition = InteractionRuleDefinition.create(2001L, 1001L, meta);

        assertThat(definition.getRuleCode()).isEqualTo("IR-2001");
        assertThat(definition.getRuleName()).isEqualTo("未命名规则");
        assertThat(definition.getEventType()).isEqualTo("FIELD_CHANGE_MAIN");
        assertThat(definition.getScopeType()).isEqualTo("FORM");
        assertThat(definition.getStatus()).isEqualTo("DRAFT");
        assertThat(definition.getCurrentVersionId()).isNull();
    }

    @Test
    void shouldInitializeDraftWhenCurrentDraftMissing() {
        InteractionRuleMeta meta = InteractionRuleMeta.reconstruct(
            "金额联动",
            "FORM_INIT",
            "FORM",
            300,
            "初始化金额",
            true,
            "v0.1.0"
        );
        InteractionRuleDefinition definition = InteractionRuleDefinition.create(2001L, 1001L, meta);

        InteractionRuleDefinition.DraftSaveResult result = definition.saveDraft(
            meta,
            null,
            3001L,
            "{\"ruleCode\":\"IR-2001\"}",
            "{\"nodes\":[]}",
            "{\"steps\":[]}",
            1L,
            OffsetDateTime.parse("2026-03-19T12:00:00+08:00")
        );

        assertThat(result.definition().getRuleName()).isEqualTo("金额联动");
        assertThat(result.draft().getVersion()).isEqualTo(1);
        assertThat(result.draft().getNormalizedJson()).isEqualTo("{}");
        assertThat(result.draft().getChecksum()).isNotBlank();
    }

    @Test
    void shouldIncrementDraftVersionAndPreserveNormalizedJsonWhenSaving() {
        InteractionRuleMeta currentMeta = InteractionRuleMeta.initialize("旧规则", "FIELD_CHANGE_MAIN", 100);
        InteractionRuleDefinition definition = InteractionRuleDefinition.create(2001L, 1001L, currentMeta);
        InteractionRuleDraft currentDraft = new InteractionRuleDraft(
            3001L,
            2001L,
            "{\"ruleCode\":\"IR-2001\",\"ruleName\":\"旧规则\"}",
            "{\"nodes\":[]}",
            "{\"steps\":[]}",
            "{\"normalized\":true}",
            2,
            "checksum",
            "v0.0.1",
            1L,
            OffsetDateTime.parse("2026-03-19T10:00:00+08:00")
        );
        InteractionRuleMeta nextMeta = InteractionRuleMeta.reconstruct(
            "新规则",
            "FORM_INIT",
            "FORM",
            500,
            "更新说明",
            false,
            "v0.1.0"
        );

        InteractionRuleDefinition.DraftSaveResult result = definition.saveDraft(
            nextMeta,
            currentDraft,
            9999L,
            "{\"ruleCode\":\"IR-2001\",\"ruleName\":\"新规则\"}",
            "{\"nodes\":[1]}",
            "{\"steps\":[1]}",
            2L,
            OffsetDateTime.parse("2026-03-19T12:00:00+08:00")
        );

        assertThat(result.definition().getRuleCode()).isEqualTo("IR-2001");
        assertThat(result.definition().getRuleName()).isEqualTo("新规则");
        assertThat(result.definition().getDescription()).isEqualTo("更新说明");
        assertThat(result.draft().getId()).isEqualTo(3001L);
        assertThat(result.draft().getVersion()).isEqualTo(3);
        assertThat(result.draft().getNormalizedJson()).isEqualTo("{\"normalized\":true}");
        assertThat(result.draft().getChecksum()).isNotEqualTo("checksum");
    }

    @Test
    void shouldBuildValidationAndPublishArtifactsFromDraft() {
        InteractionRuleMeta meta = InteractionRuleMeta.reconstruct(
            "金额联动",
            "FIELD_CHANGE_MAIN",
            "FORM",
            300,
            "自动回填金额",
            true,
            "v0.2.0"
        );
        InteractionRuleDefinition definition = InteractionRuleDefinition.create(2001L, 1001L, meta);
        InteractionRuleDraft draft = InteractionRuleDraft.initialize(
            3001L,
            2001L,
            "{\"ruleCode\":\"IR-2001\"}",
            "{\"nodes\":[{\"id\":\"n1\"}]}",
            "{\"eventType\":\"FIELD_CHANGE_MAIN\",\"triggerScope\":\"MAIN_FIELD\",\"triggerTarget\":\"main.amount\",\"steps\":[{\"id\":\"s1\"}],\"references\":{\"fields\":[\"main.amount\"],\"events\":[\"FIELD_CHANGE_MAIN\"]}}",
            "{}",
            "v0.2.0",
            1L,
            OffsetDateTime.parse("2026-03-19T10:00:00+08:00")
        );

        InteractionRuleDefinition.PublishResult result = definition.publish(
            meta,
            draft,
            Map.of("nodes", List.of(Map.of("id", "n1"))),
            Map.of(
                "eventType", "FIELD_CHANGE_MAIN",
                "triggerScope", "MAIN_FIELD",
                "triggerTarget", "main.amount",
                "steps", List.of(Map.of("id", "s1")),
                "references", Map.of(
                    "fields", List.of("main.amount"),
                    "events", List.of("FIELD_CHANGE_MAIN")
                )
            ),
            1,
            4001L,
            1L,
            OffsetDateTime.parse("2026-03-19T11:00:00+08:00")
        );

        assertThat(result.definition().getStatus()).isEqualTo("ACTIVE");
        assertThat(result.definition().getCurrentVersionId()).isEqualTo(4001L);
        assertThat(result.version().getVersionNo()).isEqualTo(1);
        assertThat(result.validationResult().valid()).isTrue();
        assertThat(result.validationResult().references().fields()).containsExactly("main.amount");
        assertThat(result.triggerBindings()).hasSize(1);
        assertThat(result.triggerBindings().getFirst().getTriggerTarget()).isEqualTo("main.amount");
        assertThat(result.referenceIndexes()).extracting("refKey").contains("1001", "main.amount", "FIELD_CHANGE_MAIN");
    }

    @Test
    void shouldBlockPublishWhenFieldTriggerLacksTarget() {
        InteractionRuleMeta meta = InteractionRuleMeta.reconstruct(
            "金额联动",
            "FIELD_CHANGE_MAIN",
            "FORM",
            300,
            "",
            true,
            "v0.2.0"
        );
        InteractionRuleDefinition definition = InteractionRuleDefinition.create(2001L, 1001L, meta);
        InteractionRuleDraft draft = InteractionRuleDraft.initialize(
            3001L,
            2001L,
            "{\"ruleCode\":\"IR-2001\"}",
            "{\"nodes\":[{\"id\":\"n1\"}]}",
            "{\"eventType\":\"FIELD_CHANGE_MAIN\",\"steps\":[{\"id\":\"s1\"}]}",
            "{}",
            "v0.2.0",
            1L,
            OffsetDateTime.parse("2026-03-19T10:00:00+08:00")
        );

        assertThatThrownBy(() -> definition.publish(
            meta,
            draft,
            Map.of("nodes", List.of(Map.of("id", "n1"))),
            Map.of(
                "eventType", "FIELD_CHANGE_MAIN",
                "triggerScope", "MAIN_FIELD",
                "steps", List.of(Map.of("id", "s1"))
            ),
            1,
            4001L,
            1L,
            OffsetDateTime.parse("2026-03-19T11:00:00+08:00")
        )).isInstanceOf(BizException.class);
    }
}
