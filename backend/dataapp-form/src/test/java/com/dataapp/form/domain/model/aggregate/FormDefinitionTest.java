package com.dataapp.form.domain.model.aggregate;

import com.dataapp.form.domain.model.entity.FormDraft;
import com.dataapp.form.domain.model.valueobject.FormMeta;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;

import static org.assertj.core.api.Assertions.assertThat;

class FormDefinitionTest {

    @Test
    void shouldCreateDraftAndAdvanceVersionWhenSavingDraft() {
        FormDefinition definition = FormDefinition.create(1L, "", new FormMeta("巡检表", ""));
        FormDraft currentDraft = FormDraft.initialize(11L, 1L, 100L, OffsetDateTime.parse("2026-03-15T10:00:00+08:00"));

        FormDefinition.DraftSaveResult result = definition.saveDraft(
            new FormMeta("巡检表V2", "说明"),
            currentDraft,
            "{\"field_1\":{}}",
            22L,
            100L,
            OffsetDateTime.parse("2026-03-15T11:00:00+08:00")
        );

        assertThat(result.formDefinition().getStatus()).isEqualTo("DRAFT");
        assertThat(result.formDefinition().getName()).isEqualTo("巡检表V2");
        assertThat(result.draft().getVersion()).isEqualTo(1);
        assertThat(result.draft().getFieldsJson()).isEqualTo("{\"field_1\":{}}");
    }

    @Test
    void shouldActivateDefinitionWhenPublishing() {
        FormDefinition definition = new FormDefinition(1L, "inspection_form", "巡检表", "", "DRAFT", null);
        FormDraft currentDraft = new FormDraft(11L, 1L, "{\"field_1\":{}}", 2, 100L, OffsetDateTime.parse("2026-03-15T10:00:00+08:00"));

        FormDefinition.PublishResult result = definition.publish(
            currentDraft,
            "{\"field_1\":{}}",
            3,
            99L,
            100L,
            OffsetDateTime.parse("2026-03-15T12:00:00+08:00")
        );

        assertThat(result.formDefinition().getStatus()).isEqualTo("ACTIVE");
        assertThat(result.formDefinition().getCurrentVersionId()).isEqualTo(99L);
        assertThat(result.version().getVersionNo()).isEqualTo(3);
        assertThat(result.draft().getVersion()).isEqualTo(2);
    }
}
