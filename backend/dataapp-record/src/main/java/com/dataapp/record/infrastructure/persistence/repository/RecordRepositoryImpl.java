package com.dataapp.record.infrastructure.persistence.repository;

import com.dataapp.record.domain.model.aggregate.Record;
import com.dataapp.record.domain.repository.RecordRepository;
import com.dataapp.record.infrastructure.persistence.converter.RecordConverter;
import com.dataapp.record.infrastructure.persistence.mapper.RecordMapper;
import com.dataapp.record.infrastructure.persistence.po.RecordPO;
import com.dataapp.shared.util.IdGenerator;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Repository;

import java.util.LinkedHashMap;
import java.util.Map;

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
        return RecordConverter.toDomain(
            recordMapper.selectById(id),
            recordMapper.selectDetailRowsByRecordId(id),
            objectMapper
        );
    }

    @Override
    public java.util.List<Record> findByFormId(Long formId) {
        return recordMapper.selectByFormId(formId).stream()
            .map(po -> RecordConverter.toDomain(po, java.util.List.of(), objectMapper))
            .toList();
    }

    @Override
    public void save(Record record) {
        RecordPO existing = recordMapper.selectById(record.getId());
        String draftJson = RecordConverter.writeJson(record.getDraftData().mainData(), objectMapper);
        String submittedJson = RecordConverter.writeJson(record.getSubmittedData().mainData(), objectMapper);
        String afterJson = RecordConverter.writeJson(record.getDraftData().toMap(), objectMapper);

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
            replaceDetailRows(record);
            recordMapper.insertHistory(IdGenerator.nextId(), record.getId(), "CREATE", "{}", afterJson, record.getUpdatedBy());
            return;
        }

        RecordPO po = new RecordPO();
        po.setId(record.getId());
        po.setUpdatedBy(record.getUpdatedBy());
        po.setStatus(record.getStatus());
        recordMapper.updateMain(po);
        recordMapper.updateData(record.getId(), draftJson, submittedJson);
        replaceDetailRows(record);
        recordMapper.insertHistory(
            IdGenerator.nextId(),
            record.getId(),
            "SUBMITTED".equals(record.getStatus()) ? "SUBMIT" : "SAVE_DRAFT",
            buildBeforeJson(existing),
            afterJson,
            record.getUpdatedBy()
        );
    }

    private void replaceDetailRows(Record record) {
        recordMapper.deleteDetailRowsByRecordId(record.getId());
        record.getDraftData().detailTables().forEach((detailTableKey, rows) -> {
            for (int i = 0; i < rows.size(); i++) {
                recordMapper.insertDetailRow(
                    IdGenerator.nextId(),
                    record.getId(),
                    detailTableKey,
                    i,
                    RecordConverter.writeJson(rows.get(i), objectMapper)
                );
            }
        });
    }

    private String buildBeforeJson(RecordPO existing) {
        LinkedHashMap<String, Object> before = new LinkedHashMap<>();
        before.put("mainData", RecordConverter.readJson(existing.getDraftDataJson(), objectMapper));
        before.put("detailTables", Map.of());
        return RecordConverter.writeJson(before, objectMapper);
    }
}
