package com.dataapp.record.domain.model.event;

import com.dataapp.shared.kernel.event.DomainEvent;

public record RecordDraftSavedEvent(
    Long recordId,
    Long formId,
    Long formVersionId,
    Long operatorId
) implements DomainEvent {

    @Override
    public String eventType() {
        return "RecordDraftSavedEvent";
    }
}
