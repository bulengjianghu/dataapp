package com.dataapp.record.application.service;

import com.dataapp.record.domain.model.aggregate.Record;
import com.dataapp.record.domain.repository.RecordRepository;
import com.dataapp.record.interfaces.dto.RecordDetailResponse;
import com.dataapp.shared.exception.BizException;
import com.dataapp.shared.exception.ErrorCode;
import org.springframework.stereotype.Service;

@Service
public class RecordQueryAppService {

    private final RecordRepository recordRepository;

    public RecordQueryAppService(RecordRepository recordRepository) {
        this.recordRepository = recordRepository;
    }

    public RecordDetailResponse getById(Long recordId) {
        Record record = recordRepository.findById(recordId);
        if (record == null) {
            throw new BizException(ErrorCode.RECORD_NOT_FOUND, "记录不存在");
        }
        return new RecordDetailResponse(
            record.getId(),
            record.getFormId(),
            record.getFormVersionId(),
            record.getStatus()
        );
    }
}
