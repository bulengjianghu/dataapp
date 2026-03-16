package com.dataapp.record.domain.repository;

import com.dataapp.record.domain.model.valueobject.PublishedFormSchema;

public interface PublishedFormSchemaGateway {

    PublishedFormSchema load(Long formId, Long formVersionId);
}
