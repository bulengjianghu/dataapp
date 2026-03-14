package com.dataapp.form.infrastructure.persistence.converter;

import com.dataapp.form.domain.model.aggregate.FormDefinition;
import com.dataapp.form.infrastructure.persistence.po.FormDefinitionPO;

public final class FormDefinitionConverter {

    private FormDefinitionConverter() {
    }

    public static FormDefinition toDomain(FormDefinitionPO po) {
        return po == null ? null : new FormDefinition(po.getId(), po.getFormCode(), po.getName(), po.getStatus());
    }
}
