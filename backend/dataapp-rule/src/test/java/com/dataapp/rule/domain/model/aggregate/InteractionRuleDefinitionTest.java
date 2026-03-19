package com.dataapp.rule.domain.model.aggregate;

import com.dataapp.rule.domain.model.entity.InteractionRuleDraft;
import com.dataapp.rule.domain.model.valueobject.InteractionRuleMeta;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;

import static org.assertj.core.api.Assertions.assertThat;

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
}
