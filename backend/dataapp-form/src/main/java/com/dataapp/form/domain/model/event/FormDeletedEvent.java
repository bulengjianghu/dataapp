package com.dataapp.form.domain.model.event;

import com.dataapp.shared.kernel.event.DomainEvent;

public record FormDeletedEvent(
    Long formId
) implements DomainEvent {

    @Override
    public String eventType() {
        return "FormDeletedEvent";
    }
}
