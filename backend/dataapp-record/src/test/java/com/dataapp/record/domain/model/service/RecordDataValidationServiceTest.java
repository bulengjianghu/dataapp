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
            Map.of(
                "mainData", Map.of("fld_name", "张三", "fld_level", "HIGH", "fld_tags", List.of("SAFE")),
                "detailTables", Map.of("dt_order_items", List.of(Map.of("fld_item_name", "商品A", "fld_qty", 1)))
            )
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
            Map.of(
                "mainData", Map.of("fld_name", "张三", "fld_level", "INVALID"),
                "detailTables", Map.of()
            )
        );

        assertThat(result.isValid()).isFalse();
        assertThat(result.issues()).anySatisfy(issue -> assertThat(issue.fieldKey()).isEqualTo("fld_level"));
    }

    @Test
    void shouldRejectUnknownDetailTableOnDraft() {
        var result = validationService.validateForDraft(
            schema(),
            Map.of(
                "mainData", Map.of("fld_name", "张三"),
                "detailTables", Map.of("dt_unknown", List.of(Map.of("fld_item_name", "商品A")))
            )
        );

        assertThat(result.isValid()).isFalse();
        assertThat(result.issues()).anySatisfy(issue -> assertThat(issue.fieldKey()).isEqualTo("dt_unknown"));
    }

    @Test
    void shouldRejectSubmitWhenDetailRowsLessThanMinRows() {
        var result = validationService.validateForSubmit(
            schema(),
            Map.of(
                "mainData", Map.of("fld_name", "张三", "fld_level", "HIGH"),
                "detailTables", Map.of("dt_order_items", List.of())
            )
        );

        assertThat(result.isValid()).isFalse();
        assertThat(result.issues()).anySatisfy(issue -> assertThat(issue.fieldKey()).isEqualTo("dt_order_items"));
    }

    @Test
    void shouldRejectSubmitWhenDetailRowContainsMainField() {
        var result = validationService.validateForSubmit(
            schema(),
            Map.of(
                "mainData", Map.of("fld_name", "张三", "fld_level", "HIGH"),
                "detailTables", Map.of(
                    "dt_order_items",
                    List.of(Map.of("fld_name", "错误字段", "fld_item_name", "商品A"))
                )
            )
        );

        assertThat(result.isValid()).isFalse();
        assertThat(result.issues()).anySatisfy(issue -> assertThat(issue.fieldKey()).isEqualTo("dt_order_items[0].fld_name"));
    }

    @Test
    void shouldRejectSubmitWhenDetailRequiredFieldMissing() {
        var result = validationService.validateForSubmit(
            schema(),
            Map.of(
                "mainData", Map.of("fld_name", "张三", "fld_level", "HIGH"),
                "detailTables", Map.of(
                    "dt_order_items",
                    List.of(Map.of("fld_qty", 3))
                )
            )
        );

        assertThat(result.isValid()).isFalse();
        assertThat(result.issues()).anySatisfy(issue -> assertThat(issue.fieldKey()).isEqualTo("dt_order_items[0].fld_item_name"));
    }

    @Test
    void shouldPassWhenRelationSelectAndDetailRowsAreValid() {
        var result = validationService.validateForSubmit(
            schema(),
            Map.of(
                "mainData", Map.of(
                    "fld_name", "张三",
                    "fld_level", "HIGH",
                    "fld_customer_ref", "9001"
                ),
                "detailTables", Map.of(
                    "dt_order_items",
                    List.of(Map.of("fld_item_name", "商品A", "fld_qty", 3))
                )
            )
        );

        assertThat(result.isValid()).isTrue();
        assertThat(result.issues()).isEmpty();
    }

    private PublishedFormSchema schema() {
        return PublishedFormSchema.of(
            200L,
            300L,
            List.of(
                RecordFieldSchema.text("fld_name", "姓名", true),
                RecordFieldSchema.singleSelect("fld_level", "等级", true, List.of("HIGH", "LOW")),
                RecordFieldSchema.multiSelect("fld_tags", "标签", false, List.of("SAFE", "DEVICE")),
                RecordFieldSchema.relationSelect("fld_customer_ref", "关联客户", false, 900L),
                RecordFieldSchema.detailTable("dt_order_items", "订单明细", 1, 5),
                RecordFieldSchema.detailText("fld_item_name", "商品名称", "dt_order_items", true),
                RecordFieldSchema.detailNumber("fld_qty", "数量", "dt_order_items", true)
            )
        );
    }
}
