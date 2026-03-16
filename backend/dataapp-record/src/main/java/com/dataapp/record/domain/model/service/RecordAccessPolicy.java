package com.dataapp.record.domain.model.service;

import com.dataapp.record.domain.model.aggregate.Record;
import com.dataapp.shared.security.CurrentUser;

import java.util.Objects;

public final class RecordAccessPolicy {

    private RecordAccessPolicy() {
    }

    public static boolean canAccess(CurrentUser currentUser, Record record) {
        return currentUser != null
            && (currentUser.roles().stream().anyMatch(role -> "SUPER_ADMIN".equals(role) || "FORM_ADMIN".equals(role))
            || Objects.equals(currentUser.userId(), record.getCreatorId()));
    }
}
