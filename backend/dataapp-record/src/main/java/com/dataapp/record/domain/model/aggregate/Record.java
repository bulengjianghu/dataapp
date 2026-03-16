package com.dataapp.record.domain.model.aggregate;

import com.dataapp.record.domain.model.valueobject.RecordData;
import com.dataapp.shared.exception.BizException;
import com.dataapp.shared.exception.ErrorCode;
import com.dataapp.shared.kernel.model.AggregateRoot;

import java.util.Map;

public class Record extends AggregateRoot<Long> {

    private final Long id;
    private final Long formId;
    private final Long formVersionId;
    private final Long creatorId;
    private final Long updatedBy;
    private final Long submittedBy;
    private final String status;
    private final RecordData draftData;
    private final RecordData submittedData;

    public Record(
        Long id,
        Long formId,
        Long formVersionId,
        Long creatorId,
        Long updatedBy,
        Long submittedBy,
        String status,
        RecordData draftData,
        RecordData submittedData
    ) {
        this.id = id;
        this.formId = formId;
        this.formVersionId = formVersionId;
        this.creatorId = creatorId;
        this.updatedBy = updatedBy;
        this.submittedBy = submittedBy;
        this.status = status;
        this.draftData = draftData == null ? RecordData.empty() : draftData;
        this.submittedData = submittedData == null ? RecordData.empty() : submittedData;
    }

    public static Record create(Long id, Long formId, Long formVersionId, Long creatorId, Map<String, Object> draftValues) {
        RecordData recordData = RecordData.of(draftValues);
        return new Record(id, formId, formVersionId, creatorId, creatorId, null, "DRAFT", recordData, RecordData.empty());
    }

    public Record saveDraft(Map<String, Object> draftValues, Long operatorId) {
        assertEditable();
        return new Record(
            id,
            formId,
            formVersionId,
            creatorId,
            operatorId,
            submittedBy,
            "DRAFT",
            RecordData.of(draftValues),
            submittedData
        );
    }

    public Record submit(Map<String, Object> submittedValues, Long operatorId) {
        if (!"DRAFT".equals(status)) {
            throw new BizException(ErrorCode.RECORD_STATUS_INVALID, "当前记录状态不允许提交");
        }
        RecordData data = RecordData.of(submittedValues);
        return new Record(
            id,
            formId,
            formVersionId,
            creatorId,
            operatorId,
            operatorId,
            "SUBMITTED",
            data,
            data
        );
    }

    private void assertEditable() {
        if (!"DRAFT".equals(status)) {
            throw new BizException(ErrorCode.RECORD_STATUS_INVALID, "当前记录状态不允许保存草稿");
        }
    }

    @Override
    public Long getId() {
        return id;
    }

    public Long getFormId() {
        return formId;
    }

    public Long getFormVersionId() {
        return formVersionId;
    }

    public Long getCreatorId() {
        return creatorId;
    }

    public Long getUpdatedBy() {
        return updatedBy;
    }

    public Long getSubmittedBy() {
        return submittedBy;
    }

    public String getStatus() {
        return status;
    }

    public RecordData getDraftData() {
        return draftData;
    }

    public RecordData getSubmittedData() {
        return submittedData;
    }
}
