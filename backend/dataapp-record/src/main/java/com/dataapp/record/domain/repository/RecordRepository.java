package com.dataapp.record.domain.repository;

import com.dataapp.record.domain.model.aggregate.Record;

public interface RecordRepository {

    Record findById(Long id);

    void save(Record record, String dataJson);

    void updateStatus(Long id, String status);
}
