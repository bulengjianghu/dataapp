package com.dataapp.form.domain.model.aggregate;

import com.dataapp.shared.kernel.model.AggregateRoot;

public class FormDefinition extends AggregateRoot<Long> {

    private final Long id;
    private final String formCode;
    private final String name;
    private final String status;

    public FormDefinition(Long id, String formCode, String name, String status) {
        this.id = id;
        this.formCode = formCode;
        this.name = name;
        this.status = status;
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

    public String getStatus() {
        return status;
    }
}
