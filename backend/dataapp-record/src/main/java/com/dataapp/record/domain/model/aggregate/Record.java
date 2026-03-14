package com.dataapp.record.domain.model.aggregate;

import com.dataapp.shared.kernel.model.AggregateRoot;

public class Record extends AggregateRoot<Long> {

    private final Long id;
    private final Long formId;
    private final Long formVersionId;
    private final String status;

    public Record(Long id, Long formId, Long formVersionId, String status) {
        this.id = id;
        this.formId = formId;
        this.formVersionId = formVersionId;
        this.status = status;
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

    public String getStatus() {
        return status;
    }
}
