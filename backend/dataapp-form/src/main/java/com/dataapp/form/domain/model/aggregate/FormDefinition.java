package com.dataapp.form.domain.model.aggregate;

import com.dataapp.shared.kernel.model.AggregateRoot;

public class FormDefinition extends AggregateRoot<Long> {

    private final Long id;
    private final String formCode;
    private final String name;
    private final String description;
    private final String status;
    private final Long currentVersionId;

    public FormDefinition(Long id, String formCode, String name, String description, String status, Long currentVersionId) {
        this.id = id;
        this.formCode = formCode;
        this.name = name;
        this.description = description;
        this.status = status;
        this.currentVersionId = currentVersionId;
    }

    @Override
    public Long getId() {
        return id;
    }

    public String getFormCode() {
        return formCode;
    }

    public String getName() {
        return name;
    }

    public String getDescription() {
        return description;
    }

    public String getStatus() {
        return status;
    }

    public Long getCurrentVersionId() {
        return currentVersionId;
    }
}
