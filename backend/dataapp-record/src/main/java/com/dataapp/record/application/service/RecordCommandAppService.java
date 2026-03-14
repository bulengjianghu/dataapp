package com.dataapp.record.application.service;

import com.dataapp.record.domain.model.aggregate.Record;
import com.dataapp.record.domain.repository.RecordRepository;
import com.dataapp.shared.exception.BizException;
import com.dataapp.shared.exception.ErrorCode;
import com.dataapp.shared.util.IdGenerator;
import org.springframework.stereotype.Service;

@Service
public class RecordCommandAppService {

    private final RecordRepository recordRepository;

    public RecordCommandAppService(RecordRepository recordRepository) {
        this.recordRepository = recordRepository;
    }

    public String create(Long formId, Long formVersionId, String dataJson) {
        long recordId = IdGenerator.nextId();
        recordRepository.save(new Record(recordId, formId, formVersionId, "DRAFT"), dataJson);
        return String.valueOf(recordId);
    }

    public String submit(Long recordId) {
        Record record = recordRepository.findById(recordId);
        if (record == null) {
            throw new BizException(ErrorCode.RECORD_NOT_FOUND, "记录不存在");
        }
        if (!"DRAFT".equals(record.getStatus())) {
            throw new BizException(ErrorCode.RECORD_STATUS_INVALID, "当前记录状态不允许提交");
        }
        recordRepository.updateStatus(recordId, "SUBMITTED");
        return "submitted:" + recordId;
    }
}
