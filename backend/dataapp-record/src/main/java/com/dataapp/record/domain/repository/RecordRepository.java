package com.dataapp.record.domain.repository;

import com.dataapp.record.domain.model.aggregate.Record;

public interface RecordRepository {

    Record findById(Long id);

    java.util.List<Record> findByFormId(Long formId);

    void save(Record record);
}
