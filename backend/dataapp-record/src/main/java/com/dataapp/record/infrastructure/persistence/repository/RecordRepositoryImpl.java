package com.dataapp.record.infrastructure.persistence.repository;

import com.dataapp.record.domain.model.aggregate.Record;
import com.dataapp.record.domain.repository.RecordRepository;
import com.dataapp.record.infrastructure.persistence.converter.RecordConverter;
import com.dataapp.record.infrastructure.persistence.mapper.RecordMapper;
import com.dataapp.record.infrastructure.persistence.po.RecordPO;
import com.dataapp.shared.util.IdGenerator;
import org.springframework.stereotype.Repository;

@Repository
public class RecordRepositoryImpl implements RecordRepository {

    private final RecordMapper recordMapper;

    public RecordRepositoryImpl(RecordMapper recordMapper) {
        this.recordMapper = recordMapper;
    }

    @Override
    public Record findById(Long id) {
        return RecordConverter.toDomain(recordMapper.selectById(id));
    }

    @Override
    public void save(Record record, String dataJson) {
        RecordPO po = new RecordPO();
        po.setId(record.getId());
        po.setFormId(record.getFormId());
        po.setFormVersionId(record.getFormVersionId());
        po.setStatus(record.getStatus());
        recordMapper.insert(po);
        recordMapper.insertData(IdGenerator.nextId(), record.getId(), dataJson, dataJson);
    }

    @Override
    public void updateStatus(Long id, String status) {
        recordMapper.updateStatus(id, status);
    }
}
