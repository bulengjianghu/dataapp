package com.dataapp.form.domain.model.event;

import com.dataapp.shared.kernel.event.DomainEvent;

public record FormDraftSavedEvent(
    Long formId,
    Integer draftVersion
) implements DomainEvent {

    @Override
    public String eventType() {
        return "FormDraftSavedEvent";
    }
}
