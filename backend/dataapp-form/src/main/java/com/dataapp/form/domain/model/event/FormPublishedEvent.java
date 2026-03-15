package com.dataapp.form.domain.model.event;

import com.dataapp.shared.kernel.event.DomainEvent;

public record FormPublishedEvent(
    Long formId,
    Long versionId,
    Integer versionNo
) implements DomainEvent {

    @Override
    public String eventType() {
        return "FormPublishedEvent";
    }
}
