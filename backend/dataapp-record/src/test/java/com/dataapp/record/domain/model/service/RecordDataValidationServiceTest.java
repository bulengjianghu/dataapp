package com.dataapp.record.domain.model.service;

import com.dataapp.record.domain.model.valueobject.PublishedFormSchema;
import com.dataapp.record.domain.model.valueobject.RecordFieldSchema;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class RecordDataValidationServiceTest {

    private final RecordDataValidationService validationService = new RecordDataValidationService();

    @Test
    void shouldPassWhenSubmitDataMatchesSchema() {
        var result = validationService.validateForSubmit(
            schema(),
            Map.of("fld_name", "张三", "fld_level", "HIGH", "fld_tags", List.of("SAFE"))
        );

        assertThat(result.isValid()).isTrue();
        assertThat(result.issues()).isEmpty();
    }

    @Test
    void shouldRejectUnknownFieldKey() {
        var result = validationService.validateForDraft(
            schema(),
            Map.of("fld_unknown", "张三")
        );

        assertThat(result.isValid()).isFalse();
        assertThat(result.issues()).hasSize(1);
        assertThat(result.issues().getFirst().fieldKey()).isEqualTo("fld_unknown");
    }

    @Test
    void shouldRejectMissingRequiredFieldOnSubmit() {
        var result = validationService.validateForSubmit(
            schema(),
            Map.of("fld_level", "HIGH")
        );

        assertThat(result.isValid()).isFalse();
        assertThat(result.issues()).anySatisfy(issue -> assertThat(issue.fieldKey()).isEqualTo("fld_name"));
    }

    @Test
    void shouldRejectInvalidOptionValue() {
        var result = validationService.validateForSubmit(
            schema(),
            Map.of("fld_name", "张三", "fld_level", "INVALID")
        );

        assertThat(result.isValid()).isFalse();
        assertThat(result.issues()).anySatisfy(issue -> assertThat(issue.fieldKey()).isEqualTo("fld_level"));
    }

    private PublishedFormSchema schema() {
        return PublishedFormSchema.of(
            200L,
            300L,
            List.of(
                RecordFieldSchema.text("fld_name", "姓名", true),
                RecordFieldSchema.singleSelect("fld_level", "等级", true, List.of("HIGH", "LOW")),
                RecordFieldSchema.multiSelect("fld_tags", "标签", false, List.of("SAFE", "DEVICE"))
            )
        );
    }
}
