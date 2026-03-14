package com.dataapp.shared.kernel.event;

import java.time.Instant;

public interface DomainEvent {

    String eventType();

    default Instant occurredAt() {
        return Instant.now();
    }
}
