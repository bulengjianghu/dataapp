package com.dataapp.record.application.service;

import com.dataapp.record.domain.model.aggregate.Record;
import com.dataapp.record.interfaces.dto.RecordDetailResponse;
import com.dataapp.record.interfaces.dto.RecordListItemResponse;
import com.dataapp.record.interfaces.dto.RelationRecordOptionResponse;
import com.dataapp.record.domain.repository.RecordRepository;
import com.dataapp.shared.exception.BizException;
import com.dataapp.shared.exception.ErrorCode;
import com.dataapp.shared.security.CurrentUser;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RecordQueryAppServiceTest {

    private static final CurrentUser NORMAL_USER = new CurrentUser(101L, "alice", List.of("FORM_USER"));
    private static final CurrentUser ADMIN_USER = new CurrentUser(1L, "admin", List.of("SUPER_ADMIN"));

    @Mock
    private RecordRepository recordRepository;

    @InjectMocks
    private RecordQueryAppService recordQueryAppService;

    @Test
    void shouldReturnRecordDetailWhenOwnerQueriesRecord() {
        when(recordRepository.findById(21L)).thenReturn(
            Record.create(21L, 100L, 1L, 101L, Map.of(
                "mainData", Map.of("fld_name", "张三"),
                "detailTables", Map.of("dt_order_items", List.of(Map.of("fld_item_name", "商品A")))
            ))
        );

        RecordDetailResponse response = recordQueryAppService.getById(NORMAL_USER, 21L);

        assertThat(response.id()).isEqualTo(21L);
        assertThat(response.formId()).isEqualTo(100L);
        assertThat(response.formVersionId()).isEqualTo(1L);
        assertThat(response.status()).isEqualTo("DRAFT");
        assertThat(response.mainData()).containsEntry("fld_name", "张三");
        assertThat(response.detailTables()).containsKey("dt_order_items");
    }

    @Test
    void shouldAllowAdminToViewAnyRecord() {
        when(recordRepository.findById(22L)).thenReturn(
            Record.create(22L, 100L, 1L, 202L, Map.of("mainData", Map.of("fld_name", "李四")))
        );

        RecordDetailResponse response = recordQueryAppService.getById(ADMIN_USER, 22L);

        assertThat(response.mainData()).containsEntry("fld_name", "李四");
    }

    @Test
    void shouldReturnSubmittedSnapshotWhenRecordAlreadySubmitted() {
        when(recordRepository.findById(25L)).thenReturn(
            Record.create(25L, 100L, 1L, 101L, Map.of("mainData", Map.of("fld_name", "草稿值")))
                .submit(Map.of("mainData", Map.of("fld_name", "提交值")), 101L)
        );

        RecordDetailResponse response = recordQueryAppService.getById(NORMAL_USER, 25L);

        assertThat(response.mainData()).containsEntry("fld_name", "提交值");
    }

    @Test
    void shouldThrowBizExceptionWhenUserCannotViewRecord() {
        when(recordRepository.findById(23L)).thenReturn(
            Record.create(23L, 100L, 1L, 202L, Map.of("mainData", Map.of("fld_name", "李四")))
        );

        assertThatThrownBy(() -> recordQueryAppService.getById(NORMAL_USER, 23L))
            .isInstanceOf(BizException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.UNAUTHORIZED);
    }

    @Test
    void shouldThrowBizExceptionWhenRecordDoesNotExist() {
        when(recordRepository.findById(24L)).thenReturn(null);

        assertThatThrownBy(() -> recordQueryAppService.getById(NORMAL_USER, 24L))
            .isInstanceOf(BizException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.RECORD_NOT_FOUND);
    }

    @Test
    void shouldListOnlyCurrentUsersRecordsForNormalUser() {
        when(recordRepository.findByFormId(100L)).thenReturn(List.of(
            Record.create(31L, 100L, 1L, 101L, Map.of("mainData", Map.of("fld_name", "张三"))),
            Record.create(32L, 100L, 1L, 202L, Map.of("mainData", Map.of("fld_name", "李四")))
        ));

        List<RecordListItemResponse> responses = recordQueryAppService.listByFormId(NORMAL_USER, 100L);

        assertThat(responses).hasSize(1);
        assertThat(responses.getFirst().id()).isEqualTo(31L);
    }

    @Test
    void shouldListAllRecordsForAdmin() {
        when(recordRepository.findByFormId(100L)).thenReturn(List.of(
            Record.create(31L, 100L, 1L, 101L, Map.of("mainData", Map.of("fld_name", "张三"))),
            Record.create(32L, 100L, 1L, 202L, Map.of("mainData", Map.of("fld_name", "李四")))
                .submit(Map.of("mainData", Map.of("fld_name", "李四")), 202L)
        ));

        List<RecordListItemResponse> responses = recordQueryAppService.listByFormId(ADMIN_USER, 100L);

        assertThat(responses).hasSize(2);
        assertThat(responses.get(1).status()).isEqualTo("SUBMITTED");
    }

    @Test
    void shouldListRelationOptionsAcrossCreatorsForNormalUser() {
        when(recordRepository.findByFormId(100L)).thenReturn(List.of(
            Record.create(41L, 100L, 1L, 101L, Map.of("mainData", Map.of("fld_name", "张三"))),
            Record.create(42L, 100L, 1L, 202L, Map.of(
                "mainData", Map.of("fld_name", "李四"),
                "detailTables", Map.of("dt_items", List.of(Map.of("fld_item_name", "商品A")))
            )).submit(Map.of(
                "mainData", Map.of("fld_name", "李四(提交)"),
                "detailTables", Map.of("dt_items", List.of(Map.of("fld_item_name", "商品A")))
            ), 202L)
        ));

        List<RelationRecordOptionResponse> responses = recordQueryAppService.listRelationOptionsByFormId(NORMAL_USER, 100L);

        assertThat(responses).hasSize(2);
        assertThat(responses.get(1).id()).isEqualTo(42L);
        assertThat(responses.get(1).mainData()).containsEntry("fld_name", "李四(提交)");
        assertThat(responses.get(1).detailTables()).containsKey("dt_items");
    }
}
