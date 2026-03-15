package com.dataapp.shared.kernel.model;

import com.dataapp.shared.kernel.event.DomainEvent;

import java.util.ArrayList;
import java.util.List;

public abstract class AggregateRoot<ID> {

    public abstract ID getId();

    private final List<DomainEvent> domainEvents = new ArrayList<>();

    protected void registerEvent(DomainEvent domainEvent) {
        domainEvents.add(domainEvent);
    }

    public List<DomainEvent> pullDomainEvents() {
        List<DomainEvent> snapshot = List.copyOf(domainEvents);
        domainEvents.clear();
        return snapshot;
    }
}
