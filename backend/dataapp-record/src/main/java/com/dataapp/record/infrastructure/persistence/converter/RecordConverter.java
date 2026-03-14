package com.dataapp.record.infrastructure.persistence.converter;

import com.dataapp.record.domain.model.aggregate.Record;
import com.dataapp.record.infrastructure.persistence.po.RecordPO;

public final class RecordConverter {

    private RecordConverter() {
    }

    public static Record toDomain(RecordPO po) {
        return po == null ? null : new Record(po.getId(), po.getFormId(), po.getFormVersionId(), po.getStatus());
    }
}
