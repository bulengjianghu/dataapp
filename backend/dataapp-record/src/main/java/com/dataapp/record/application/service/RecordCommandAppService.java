package com.dataapp.record.application.service;

import com.dataapp.record.domain.model.aggregate.Record;
import com.dataapp.record.domain.model.service.RecordAccessPolicy;
import com.dataapp.record.domain.model.service.RecordDataValidationService;
import com.dataapp.record.domain.model.valueobject.PublishedFormSchema;
import com.dataapp.record.domain.model.valueobject.RecordData;
import com.dataapp.record.domain.repository.PublishedFormSchemaGateway;
import com.dataapp.record.domain.repository.RecordRepository;
import com.dataapp.shared.exception.BizException;
import com.dataapp.shared.exception.ErrorCode;
import com.dataapp.shared.security.CurrentUser;
import com.dataapp.shared.util.IdGenerator;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class RecordCommandAppService {

    private final RecordRepository recordRepository;
    private final PublishedFormSchemaGateway publishedFormSchemaGateway;
    private final RecordDataValidationService recordDataValidationService;
    private final ApplicationEventPublisher eventPublisher;

    public RecordCommandAppService(
        RecordRepository recordRepository,
        PublishedFormSchemaGateway publishedFormSchemaGateway,
        RecordDataValidationService recordDataValidationService,
        ApplicationEventPublisher eventPublisher
    ) {
        this.recordRepository = recordRepository;
        this.publishedFormSchemaGateway = publishedFormSchemaGateway;
        this.recordDataValidationService = recordDataValidationService;
        this.eventPublisher = eventPublisher;
    }

    public Long create(CurrentUser currentUser, Long formId, Long formVersionId, Map<String, Object> data) {
        PublishedFormSchema formSchema = loadFormSchema(formId, formVersionId);
        Long recordId = IdGenerator.nextId();
        Record record = Record.create(
            recordId,
            formSchema,
            currentUser.userId(),
            RecordData.of(data),
            recordDataValidationService
        );
        recordRepository.save(record);
        publishDomainEvents(record);
        return recordId;
    }

    public void saveDraft(CurrentUser currentUser, Long recordId, Map<String, Object> data) {
        Record record = getRecord(recordId);
        assertAccess(currentUser, record);
        PublishedFormSchema formSchema = loadFormSchema(record.getFormId(), record.getFormVersionId());
        Record saved = record.saveDraft(formSchema, RecordData.of(data), currentUser.userId(), recordDataValidationService);
        recordRepository.save(saved);
        publishDomainEvents(saved);
    }

    public void submit(CurrentUser currentUser, Long recordId, Map<String, Object> data) {
        Record record = getRecord(recordId);
        assertAccess(currentUser, record);
        PublishedFormSchema formSchema = loadFormSchema(record.getFormId(), record.getFormVersionId());
        Record submitted = record.submit(formSchema, RecordData.of(data), currentUser.userId(), recordDataValidationService);
        recordRepository.save(submitted);
        publishDomainEvents(submitted);
    }

    private Record getRecord(Long recordId) {
        Record record = recordRepository.findById(recordId);
        if (record == null) {
            throw new BizException(ErrorCode.RECORD_NOT_FOUND, "记录不存在");
        }
        return record;
    }

    private PublishedFormSchema loadFormSchema(Long formId, Long formVersionId) {
        PublishedFormSchema formSchema = publishedFormSchemaGateway.load(formId, formVersionId);
        if (formSchema == null) {
            throw new BizException(ErrorCode.FORM_NOT_FOUND, "表单版本不存在或未发布");
        }
        return formSchema;
    }

    private void assertAccess(CurrentUser currentUser, Record record) {
        if (!RecordAccessPolicy.canAccess(currentUser, record)) {
            throw new BizException(ErrorCode.UNAUTHORIZED, "无权操作该记录");
        }
    }

    private void publishDomainEvents(Record record) {
        record.pullDomainEvents().forEach(eventPublisher::publishEvent);
    }
}
