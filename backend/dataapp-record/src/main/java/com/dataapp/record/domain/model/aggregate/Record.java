package com.dataapp.record.domain.model.aggregate;

import com.dataapp.record.domain.model.event.RecordCreatedEvent;
import com.dataapp.record.domain.model.event.RecordDraftSavedEvent;
import com.dataapp.record.domain.model.event.RecordSubmittedEvent;
import com.dataapp.record.domain.model.service.RecordDataValidationService;
import com.dataapp.record.domain.model.valueobject.PublishedFormSchema;
import com.dataapp.record.domain.model.valueobject.RecordData;
import com.dataapp.record.domain.model.valueobject.RecordOperationType;
import com.dataapp.record.domain.model.valueobject.ValidationResult;
import com.dataapp.shared.exception.BizException;
import com.dataapp.shared.exception.ErrorCode;
import com.dataapp.shared.kernel.model.AggregateRoot;

import java.util.Map;
import java.util.stream.Collectors;

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
    private final RecordOperationType lastOperationType;

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
        this(id, formId, formVersionId, creatorId, updatedBy, submittedBy, status, draftData, submittedData, null);
    }

    private Record(
        Long id,
        Long formId,
        Long formVersionId,
        Long creatorId,
        Long updatedBy,
        Long submittedBy,
        String status,
        RecordData draftData,
        RecordData submittedData,
        RecordOperationType lastOperationType
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
        this.lastOperationType = lastOperationType;
    }

    public static Record create(
        Long id,
        PublishedFormSchema formSchema,
        Long creatorId,
        RecordData draftData,
        RecordDataValidationService validationService
    ) {
        assertSchemaExists(formSchema);
        assertValid(validationService.validateForDraft(formSchema, draftData.toMap()));
        Record record = new Record(
            id,
            formSchema.formId(),
            formSchema.formVersionId(),
            creatorId,
            creatorId,
            null,
            "DRAFT",
            draftData,
            RecordData.empty(),
            RecordOperationType.CREATE
        );
        record.registerEvent(new RecordCreatedEvent(id, formSchema.formId(), formSchema.formVersionId(), creatorId));
        return record;
    }

    public static Record create(Long id, Long formId, Long formVersionId, Long creatorId, Map<String, Object> draftValues) {
        RecordData recordData = RecordData.of(draftValues);
        return new Record(
            id,
            formId,
            formVersionId,
            creatorId,
            creatorId,
            null,
            "DRAFT",
            recordData,
            RecordData.empty(),
            RecordOperationType.CREATE
        );
    }

    public Record saveDraft(
        PublishedFormSchema formSchema,
        RecordData newDraftData,
        Long operatorId,
        RecordDataValidationService validationService
    ) {
        assertEditable();
        assertBoundTo(formSchema);
        assertValid(validationService.validateForDraft(formSchema, newDraftData.toMap()));
        Record saved = new Record(
            id,
            formId,
            formVersionId,
            creatorId,
            operatorId,
            submittedBy,
            "DRAFT",
            newDraftData,
            submittedData,
            RecordOperationType.SAVE_DRAFT
        );
        saved.registerEvent(new RecordDraftSavedEvent(id, formId, formVersionId, operatorId));
        return saved;
    }

    public Record saveDraft(Map<String, Object> draftValues, Long operatorId) {
        assertEditable();
        Record saved = new Record(
            id,
            formId,
            formVersionId,
            creatorId,
            operatorId,
            submittedBy,
            "DRAFT",
            RecordData.of(draftValues),
            submittedData,
            RecordOperationType.SAVE_DRAFT
        );
        saved.registerEvent(new RecordDraftSavedEvent(id, formId, formVersionId, operatorId));
        return saved;
    }

    public Record submit(
        PublishedFormSchema formSchema,
        RecordData newSubmittedData,
        Long operatorId,
        RecordDataValidationService validationService
    ) {
        if (!"DRAFT".equals(status)) {
            throw new BizException(ErrorCode.RECORD_STATUS_INVALID, "当前记录状态不允许提交");
        }
        assertBoundTo(formSchema);
        assertValid(validationService.validateForSubmit(formSchema, newSubmittedData.toMap()));
        Record submitted = new Record(
            id,
            formId,
            formVersionId,
            creatorId,
            operatorId,
            operatorId,
            "SUBMITTED",
            newSubmittedData,
            newSubmittedData,
            RecordOperationType.SUBMIT
        );
        submitted.registerEvent(new RecordSubmittedEvent(id, formId, formVersionId, operatorId));
        return submitted;
    }

    public Record submit(Map<String, Object> submittedValues, Long operatorId) {
        if (!"DRAFT".equals(status)) {
            throw new BizException(ErrorCode.RECORD_STATUS_INVALID, "当前记录状态不允许提交");
        }
        RecordData data = RecordData.of(submittedValues);
        Record submitted = new Record(
            id,
            formId,
            formVersionId,
            creatorId,
            operatorId,
            operatorId,
            "SUBMITTED",
            data,
            data,
            RecordOperationType.SUBMIT
        );
        submitted.registerEvent(new RecordSubmittedEvent(id, formId, formVersionId, operatorId));
        return submitted;
    }

    private void assertEditable() {
        if (!"DRAFT".equals(status)) {
            throw new BizException(ErrorCode.RECORD_STATUS_INVALID, "当前记录状态不允许保存草稿");
        }
    }

    private void assertBoundTo(PublishedFormSchema formSchema) {
        assertSchemaExists(formSchema);
        if (!formId.equals(formSchema.formId()) || !formVersionId.equals(formSchema.formVersionId())) {
            throw new BizException(ErrorCode.RECORD_DATA_INVALID, "记录绑定的表单版本与校验版本不一致");
        }
    }

    private static void assertSchemaExists(PublishedFormSchema formSchema) {
        if (formSchema == null) {
            throw new BizException(ErrorCode.FORM_NOT_FOUND, "表单版本不存在或未发布");
        }
    }

    private static void assertValid(ValidationResult validationResult) {
        if (!validationResult.isValid()) {
            String message = validationResult.issues().stream()
                .map(issue -> issue.fieldKey() + ":" + issue.message())
                .collect(Collectors.joining("; "));
            throw new BizException(ErrorCode.RECORD_DATA_INVALID, message);
        }
    }

    public RecordData readableData() {
        return "SUBMITTED".equals(status) ? submittedData : draftData;
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

    public RecordOperationType getLastOperationType() {
        return lastOperationType;
    }
}
