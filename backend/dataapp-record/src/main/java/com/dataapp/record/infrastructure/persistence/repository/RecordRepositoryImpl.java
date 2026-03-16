package com.dataapp.record.infrastructure.persistence.repository;

import com.dataapp.record.domain.model.aggregate.Record;
import com.dataapp.record.domain.repository.RecordRepository;
import com.dataapp.record.infrastructure.persistence.converter.RecordConverter;
import com.dataapp.record.infrastructure.persistence.mapper.RecordMapper;
import com.dataapp.record.infrastructure.persistence.po.RecordPO;
import com.dataapp.shared.util.IdGenerator;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Repository;

@Repository
public class RecordRepositoryImpl implements RecordRepository {

    private final RecordMapper recordMapper;
    private final ObjectMapper objectMapper;

    public RecordRepositoryImpl(RecordMapper recordMapper, ObjectMapper objectMapper) {
        this.recordMapper = recordMapper;
        this.objectMapper = objectMapper;
    }

    @Override
    public Record findById(Long id) {
        return RecordConverter.toDomain(recordMapper.selectById(id), objectMapper);
    }

    @Override
    public java.util.List<Record> findByFormId(Long formId) {
        return recordMapper.selectByFormId(formId).stream()
            .map(po -> RecordConverter.toDomain(po, objectMapper))
            .toList();
    }

    @Override
    public void save(Record record) {
        RecordPO existing = recordMapper.selectById(record.getId());
        String draftJson = RecordConverter.writeJson(record.getDraftData().values(), objectMapper);
        String submittedJson = RecordConverter.writeJson(record.getSubmittedData().values(), objectMapper);

        if (existing == null) {
            RecordPO po = new RecordPO();
            po.setId(record.getId());
            po.setFormId(record.getFormId());
            po.setFormVersionId(record.getFormVersionId());
            po.setCreatorId(record.getCreatorId());
            po.setUpdatedBy(record.getUpdatedBy());
            po.setStatus(record.getStatus());
            recordMapper.insertMain(po);
            recordMapper.insertData(IdGenerator.nextId(), record.getId(), draftJson, submittedJson);
            recordMapper.insertHistory(IdGenerator.nextId(), record.getId(), "CREATE", "{}", draftJson, record.getUpdatedBy());
            return;
        }

        RecordPO po = new RecordPO();
        po.setId(record.getId());
        po.setUpdatedBy(record.getUpdatedBy());
        po.setStatus(record.getStatus());
        recordMapper.updateMain(po);
        recordMapper.updateData(record.getId(), draftJson, submittedJson);
        recordMapper.insertHistory(
            IdGenerator.nextId(),
            record.getId(),
            "SUBMITTED".equals(record.getStatus()) ? "SUBMIT" : "SAVE_DRAFT",
            existing.getDraftDataJson() == null ? "{}" : existing.getDraftDataJson(),
            draftJson,
            record.getUpdatedBy()
        );
    }
}
