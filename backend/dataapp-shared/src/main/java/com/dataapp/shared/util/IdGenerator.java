package com.dataapp.shared.util;

import java.util.concurrent.atomic.AtomicInteger;

public final class IdGenerator {

    private static final AtomicInteger SEQUENCE = new AtomicInteger(0);

    private IdGenerator() {
    }

    public static long nextId() {
        long millis = System.currentTimeMillis();
        int sequence = SEQUENCE.updateAndGet(current -> (current + 1) % 1000);
        return millis * 1000 + sequence;
    }
}
