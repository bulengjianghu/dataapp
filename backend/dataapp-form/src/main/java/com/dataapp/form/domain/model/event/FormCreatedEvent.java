package com.dataapp.form.domain.model.event;

import com.dataapp.shared.kernel.event.DomainEvent;

public record FormCreatedEvent(
    Long formId,
    String formCode
) implements DomainEvent {

    @Override
    public String eventType() {
        return "FormCreatedEvent";
    }
}
