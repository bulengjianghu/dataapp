package com.dataapp.record.application.service;

import com.dataapp.record.domain.model.aggregate.Record;
import com.dataapp.record.domain.model.service.RecordAccessPolicy;
import com.dataapp.record.domain.repository.RecordRepository;
import com.dataapp.record.interfaces.dto.RecordDetailResponse;
import com.dataapp.record.interfaces.dto.RecordListItemResponse;
import com.dataapp.shared.exception.BizException;
import com.dataapp.shared.exception.ErrorCode;
import com.dataapp.shared.security.CurrentUser;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class RecordQueryAppService {

    private final RecordRepository recordRepository;

    public RecordQueryAppService(RecordRepository recordRepository) {
        this.recordRepository = recordRepository;
    }

    public RecordDetailResponse getById(CurrentUser currentUser, Long recordId) {
        Record record = recordRepository.findById(recordId);
        if (record == null) {
            throw new BizException(ErrorCode.RECORD_NOT_FOUND, "记录不存在");
        }
        if (!RecordAccessPolicy.canAccess(currentUser, record)) {
            throw new BizException(ErrorCode.UNAUTHORIZED, "无权查看该记录");
        }
        return new RecordDetailResponse(
            record.getId(),
            record.getFormId(),
            record.getFormVersionId(),
            record.getStatus(),
            "SUBMITTED".equals(record.getStatus()) ? record.getSubmittedData().values() : record.getDraftData().values()
        );
    }

    public List<RecordListItemResponse> listByFormId(CurrentUser currentUser, Long formId) {
        return recordRepository.findByFormId(formId).stream()
            .filter(record -> RecordAccessPolicy.canAccess(currentUser, record))
            .map(record -> new RecordListItemResponse(
                record.getId(),
                record.getFormId(),
                record.getFormVersionId(),
                record.getStatus(),
                record.getCreatorId()
            ))
            .toList();
    }
}
