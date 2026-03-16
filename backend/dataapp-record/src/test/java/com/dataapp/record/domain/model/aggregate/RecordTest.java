package com.dataapp.record.domain.model.aggregate;

import com.dataapp.shared.exception.BizException;
import com.dataapp.shared.exception.ErrorCode;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class RecordTest {

    @Test
    void shouldCreateDraftRecordWithCreatorAndDraftData() {
        Record record = Record.create(
            1L,
            200L,
            300L,
            101L,
            Map.of(
                "mainData", Map.of("fld_name", "张三"),
                "detailTables", Map.of("dt_order_items", java.util.List.of(Map.of("fld_item_name", "商品A")))
            )
        );

        assertThat(record.getId()).isEqualTo(1L);
        assertThat(record.getCreatorId()).isEqualTo(101L);
        assertThat(record.getStatus()).isEqualTo("DRAFT");
        assertThat(record.getDraftData().mainData()).containsEntry("fld_name", "张三");
        assertThat(record.getDraftData().detailTables()).containsKey("dt_order_items");
        assertThat(record.getSubmittedData().mainData()).isEmpty();
    }

    @Test
    void shouldSaveDraftWhenRecordIsEditable() {
        Record record = Record.create(1L, 200L, 300L, 101L, Map.of("mainData", Map.of("fld_name", "张三")));

        Record saved = record.saveDraft(
            Map.of(
                "mainData", Map.of("fld_name", "李四"),
                "detailTables", Map.of("dt_order_items", java.util.List.of(Map.of("fld_item_name", "商品A")))
            ),
            101L
        );

        assertThat(saved.getDraftData().mainData()).containsEntry("fld_name", "李四");
        assertThat(saved.getDraftData().detailTables()).containsKey("dt_order_items");
        assertThat(saved.getStatus()).isEqualTo("DRAFT");
        assertThat(saved.getUpdatedBy()).isEqualTo(101L);
    }

    @Test
    void shouldRejectSaveDraftWhenRecordAlreadySubmitted() {
        Record submitted = Record.create(1L, 200L, 300L, 101L, Map.of("mainData", Map.of("fld_name", "张三")))
            .submit(Map.of("mainData", Map.of("fld_name", "张三")), 101L);

        assertThatThrownBy(() -> submitted.saveDraft(Map.of("mainData", Map.of("fld_name", "李四")), 101L))
            .isInstanceOf(BizException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.RECORD_STATUS_INVALID);
    }

    @Test
    void shouldSubmitRecordAndFreezeSubmittedData() {
        Record draft = Record.create(1L, 200L, 300L, 101L, Map.of("mainData", Map.of("fld_name", "张三")));

        Record submitted = draft.submit(
            Map.of(
                "mainData", Map.of("fld_name", "李四"),
                "detailTables", Map.of("dt_order_items", java.util.List.of(Map.of("fld_item_name", "商品A")))
            ),
            101L
        );

        assertThat(submitted.getStatus()).isEqualTo("SUBMITTED");
        assertThat(submitted.getDraftData().mainData()).containsEntry("fld_name", "李四");
        assertThat(submitted.getSubmittedData().mainData()).containsEntry("fld_name", "李四");
        assertThat(submitted.getSubmittedData().detailTables()).containsKey("dt_order_items");
        assertThat(submitted.getSubmittedBy()).isEqualTo(101L);
    }
}
