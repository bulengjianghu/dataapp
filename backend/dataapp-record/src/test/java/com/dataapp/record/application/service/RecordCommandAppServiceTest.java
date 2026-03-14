package com.dataapp.record.application.service;

import com.dataapp.record.domain.model.aggregate.Record;
import com.dataapp.record.domain.repository.RecordRepository;
import com.dataapp.shared.exception.BizException;
import com.dataapp.shared.exception.ErrorCode;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RecordCommandAppServiceTest {

    @Mock
    private RecordRepository recordRepository;

    @InjectMocks
    private RecordCommandAppService recordCommandAppService;

    @Test
    void shouldCreateDraftRecord() {
        String recordId = recordCommandAppService.create(100L, 1L, "{\"device\":\"A-01\"}");

        ArgumentCaptor<Record> recordCaptor = ArgumentCaptor.forClass(Record.class);
        verify(recordRepository).save(recordCaptor.capture(), org.mockito.Mockito.eq("{\"device\":\"A-01\"}"));
        Record record = recordCaptor.getValue();

        assertThat(recordId).isEqualTo(String.valueOf(record.getId()));
        assertThat(record.getFormId()).isEqualTo(100L);
        assertThat(record.getFormVersionId()).isEqualTo(1L);
        assertThat(record.getStatus()).isEqualTo("DRAFT");
    }

    @Test
    void shouldSubmitRecordWhenStatusIsDraft() {
        when(recordRepository.findById(11L)).thenReturn(new Record(11L, 100L, 1L, "DRAFT"));

        String result = recordCommandAppService.submit(11L);

        verify(recordRepository).updateStatus(11L, "SUBMITTED");
        assertThat(result).isEqualTo("submitted:11");
    }

    @Test
    void shouldThrowBizExceptionWhenRecordNotFound() {
        when(recordRepository.findById(12L)).thenReturn(null);

        assertThatThrownBy(() -> recordCommandAppService.submit(12L))
            .isInstanceOf(BizException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.RECORD_NOT_FOUND);
    }

    @Test
    void shouldThrowBizExceptionWhenRecordStatusIsInvalid() {
        when(recordRepository.findById(13L)).thenReturn(new Record(13L, 100L, 1L, "SUBMITTED"));

        assertThatThrownBy(() -> recordCommandAppService.submit(13L))
            .isInstanceOf(BizException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.RECORD_STATUS_INVALID);
    }
}
