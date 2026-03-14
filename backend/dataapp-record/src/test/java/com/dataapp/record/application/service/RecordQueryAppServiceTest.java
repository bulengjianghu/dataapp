package com.dataapp.record.application.service;

import com.dataapp.record.domain.model.aggregate.Record;
import com.dataapp.record.domain.repository.RecordRepository;
import com.dataapp.record.interfaces.dto.RecordDetailResponse;
import com.dataapp.shared.exception.BizException;
import com.dataapp.shared.exception.ErrorCode;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RecordQueryAppServiceTest {

    @Mock
    private RecordRepository recordRepository;

    @InjectMocks
    private RecordQueryAppService recordQueryAppService;

    @Test
    void shouldReturnRecordDetailWhenRecordExists() {
        when(recordRepository.findById(21L)).thenReturn(new Record(21L, 100L, 1L, "DRAFT"));

        RecordDetailResponse response = recordQueryAppService.getById(21L);

        assertThat(response.id()).isEqualTo(21L);
        assertThat(response.formId()).isEqualTo(100L);
        assertThat(response.formVersionId()).isEqualTo(1L);
        assertThat(response.status()).isEqualTo("DRAFT");
    }

    @Test
    void shouldThrowBizExceptionWhenRecordDoesNotExist() {
        when(recordRepository.findById(22L)).thenReturn(null);

        assertThatThrownBy(() -> recordQueryAppService.getById(22L))
            .isInstanceOf(BizException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.RECORD_NOT_FOUND);
    }
}
