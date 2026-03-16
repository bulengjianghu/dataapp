package com.dataapp.record.application.service;

import com.dataapp.record.domain.model.aggregate.Record;
import com.dataapp.record.domain.model.service.RecordDataValidationService;
import com.dataapp.record.domain.model.valueobject.PublishedFormSchema;
import com.dataapp.record.domain.model.valueobject.RecordFieldSchema;
import com.dataapp.record.domain.repository.PublishedFormSchemaGateway;
import com.dataapp.record.domain.repository.RecordRepository;
import com.dataapp.shared.exception.BizException;
import com.dataapp.shared.exception.ErrorCode;
import com.dataapp.shared.security.CurrentUser;
import org.springframework.context.ApplicationEventPublisher;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RecordCommandAppServiceTest {

    private static final CurrentUser NORMAL_USER = new CurrentUser(101L, "alice", List.of("FORM_USER"));
    private static final CurrentUser ADMIN_USER = new CurrentUser(1L, "admin", List.of("SUPER_ADMIN"));

    @Mock
    private RecordRepository recordRepository;

    @Mock
    private PublishedFormSchemaGateway publishedFormSchemaGateway;

    @Spy
    private RecordDataValidationService recordDataValidationService = new RecordDataValidationService();

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private RecordCommandAppService recordCommandAppService;

    @Test
    void shouldCreateDraftRecordForPublishedFormSchema() {
        when(publishedFormSchemaGateway.load(200L, 300L)).thenReturn(sampleSchema());

        Long recordId = recordCommandAppService.create(
            NORMAL_USER,
            200L,
            300L,
            Map.of(
                "mainData", Map.of("fld_name", "张三"),
                "detailTables", Map.of("dt_order_items", List.of(Map.of("fld_item_name", "商品A", "fld_qty", 1)))
            )
        );

        ArgumentCaptor<Record> recordCaptor = ArgumentCaptor.forClass(Record.class);
        verify(recordRepository).save(recordCaptor.capture());
        Record record = recordCaptor.getValue();

        assertThat(recordId).isEqualTo(record.getId());
        assertThat(record.getFormId()).isEqualTo(200L);
        assertThat(record.getFormVersionId()).isEqualTo(300L);
        assertThat(record.getCreatorId()).isEqualTo(101L);
        assertThat(record.getStatus()).isEqualTo("DRAFT");
        assertThat(record.getDraftData().mainData()).containsEntry("fld_name", "张三");
        assertThat(record.getDraftData().detailTables()).containsKey("dt_order_items");
    }

    @Test
    void shouldRejectCreateWhenFormVersionIsNotPublished() {
        when(publishedFormSchemaGateway.load(200L, 301L)).thenReturn(null);

        assertThatThrownBy(() -> recordCommandAppService.create(
            NORMAL_USER,
            200L,
            301L,
            Map.of("mainData", Map.of("fld_name", "张三"))
        ))
            .isInstanceOf(BizException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.FORM_NOT_FOUND);
    }

    @Test
    void shouldSaveDraftWhenCurrentUserOwnsRecord() {
        when(recordRepository.findById(11L)).thenReturn(
            Record.create(11L, 200L, 300L, 101L, Map.of("mainData", Map.of("fld_name", "旧值")))
        );
        when(publishedFormSchemaGateway.load(200L, 300L)).thenReturn(sampleSchema());

        recordCommandAppService.saveDraft(NORMAL_USER, 11L, Map.of(
            "mainData", Map.of("fld_name", "新值"),
            "detailTables", Map.of("dt_order_items", List.of(Map.of("fld_item_name", "商品A", "fld_qty", 1)))
        ));

        ArgumentCaptor<Record> recordCaptor = ArgumentCaptor.forClass(Record.class);
        verify(recordRepository).save(recordCaptor.capture());
        assertThat(recordCaptor.getValue().getDraftData().mainData()).containsEntry("fld_name", "新值");
    }

    @Test
    void shouldRejectSaveDraftWhenUserHasNoPermission() {
        when(recordRepository.findById(12L)).thenReturn(
            Record.create(12L, 200L, 300L, 202L, Map.of("mainData", Map.of("fld_name", "旧值")))
        );

        assertThatThrownBy(() -> recordCommandAppService.saveDraft(
            NORMAL_USER,
            12L,
            Map.of("mainData", Map.of("fld_name", "新值"))
        ))
            .isInstanceOf(BizException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.UNAUTHORIZED);

        verify(recordRepository, never()).save(any());
    }

    @Test
    void shouldAllowAdminToSaveOtherUsersDraft() {
        when(recordRepository.findById(13L)).thenReturn(
            Record.create(13L, 200L, 300L, 202L, Map.of("mainData", Map.of("fld_name", "旧值")))
        );
        when(publishedFormSchemaGateway.load(200L, 300L)).thenReturn(sampleSchema());

        recordCommandAppService.saveDraft(ADMIN_USER, 13L, Map.of(
            "mainData", Map.of("fld_name", "管理员修改"),
            "detailTables", Map.of("dt_order_items", List.of(Map.of("fld_item_name", "商品A", "fld_qty", 2)))
        ));

        ArgumentCaptor<Record> recordCaptor = ArgumentCaptor.forClass(Record.class);
        verify(recordRepository).save(recordCaptor.capture());
        assertThat(recordCaptor.getValue().getDraftData().mainData()).containsEntry("fld_name", "管理员修改");
    }

    @Test
    void shouldRejectSubmitWhenRecordDataIsInvalid() {
        when(recordRepository.findById(21L)).thenReturn(
            Record.create(21L, 200L, 300L, 101L, Map.of("mainData", Map.of("fld_name", "张三")))
        );
        when(publishedFormSchemaGateway.load(200L, 300L)).thenReturn(sampleSchema());

        assertThatThrownBy(() -> recordCommandAppService.submit(
            NORMAL_USER,
            21L,
            Map.of(
                "mainData", Map.of("fld_name", "", "fld_level", "INVALID"),
                "detailTables", Map.of("dt_order_items", List.of())
            )
        ))
            .isInstanceOf(BizException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.RECORD_DATA_INVALID);

        verify(recordRepository, never()).save(any());
    }

    @Test
    void shouldSubmitRecordWhenDataIsValid() {
        when(recordRepository.findById(22L)).thenReturn(
            Record.create(22L, 200L, 300L, 101L, Map.of("mainData", Map.of("fld_name", "张三")))
        );
        when(publishedFormSchemaGateway.load(200L, 300L)).thenReturn(sampleSchema());

        recordCommandAppService.submit(
            NORMAL_USER,
            22L,
            Map.of(
                "mainData", Map.of("fld_name", "李四", "fld_level", "HIGH", "fld_customer_ref", "9001"),
                "detailTables", Map.of("dt_order_items", List.of(Map.of("fld_item_name", "商品A", "fld_qty", 3)))
            )
        );

        ArgumentCaptor<Record> recordCaptor = ArgumentCaptor.forClass(Record.class);
        verify(recordRepository).save(recordCaptor.capture());
        Record saved = recordCaptor.getValue();
        assertThat(saved.getStatus()).isEqualTo("SUBMITTED");
        assertThat(saved.getSubmittedData().mainData())
            .containsEntry("fld_name", "李四")
            .containsEntry("fld_level", "HIGH")
            .containsEntry("fld_customer_ref", "9001");
        assertThat(saved.getSubmittedData().detailTables())
            .containsKey("dt_order_items");
    }

    private PublishedFormSchema sampleSchema() {
        return PublishedFormSchema.of(
            200L,
            300L,
            List.of(
                RecordFieldSchema.text("fld_name", "姓名", true),
                RecordFieldSchema.singleSelect("fld_level", "等级", true, List.of("HIGH", "LOW")),
                RecordFieldSchema.relationSelect("fld_customer_ref", "关联客户", false, 900L),
                RecordFieldSchema.detailTable("dt_order_items", "订单明细", 1, 5),
                RecordFieldSchema.detailText("fld_item_name", "商品名称", "dt_order_items", true),
                RecordFieldSchema.detailNumber("fld_qty", "数量", "dt_order_items", true)
            )
        );
    }
}
