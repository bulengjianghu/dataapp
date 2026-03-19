package com.dataapp.rule.domain.model.valueobject;

import java.util.LinkedHashMap;
import java.util.Map;

public final class InteractionRuleMeta {

    public static final String DEFAULT_SCOPE_TYPE = "FORM";
    public static final String DEFAULT_EVENT_TYPE = "FIELD_CHANGE_MAIN";
    public static final int DEFAULT_PRIORITY = 100;

    private final String ruleName;
    private final String eventType;
    private final String scopeType;
    private final int priority;
    private final String description;
    private final boolean enabled;
    private final String compilerVersion;

    public InteractionRuleMeta(
        String ruleName,
        String eventType,
        String scopeType,
        int priority,
        String description,
        boolean enabled,
        String compilerVersion
    ) {
        this.ruleName = normalizeRuleName(ruleName);
        this.eventType = normalizeEventType(eventType);
        this.scopeType = normalizeScopeType(scopeType);
        this.priority = normalizePriority(priority);
        this.description = description == null ? "" : description.trim();
        this.enabled = enabled;
        this.compilerVersion = compilerVersion == null ? "" : compilerVersion.trim();
    }

    public static InteractionRuleMeta initialize(String ruleName, String eventType, Integer priority) {
        return new InteractionRuleMeta(
            ruleName,
            eventType,
            DEFAULT_SCOPE_TYPE,
            priority == null ? DEFAULT_PRIORITY : priority,
            "",
            true,
            ""
        );
    }

    public static InteractionRuleMeta reconstruct(
        String ruleName,
        String eventType,
        String scopeType,
        Integer priority,
        String description,
        boolean enabled,
        String compilerVersion
    ) {
        return new InteractionRuleMeta(
            ruleName,
            eventType,
            scopeType,
            priority == null ? DEFAULT_PRIORITY : priority,
            description,
            enabled,
            compilerVersion
        );
    }

    public Map<String, Object> toDraftSnapshot(String ruleCode) {
        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("ruleCode", ruleCode);
        snapshot.put("ruleName", ruleName);
        snapshot.put("eventType", eventType);
        snapshot.put("scopeType", scopeType);
        snapshot.put("priority", priority);
        snapshot.put("description", description);
        snapshot.put("enabled", enabled);
        snapshot.put("compilerVersion", compilerVersion);
        return snapshot;
    }

    public String getRuleName() {
        return ruleName;
    }

    public String getEventType() {
        return eventType;
    }

    public String getScopeType() {
        return scopeType;
    }

    public int getPriority() {
        return priority;
    }

    public String getDescription() {
        return description;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public String getCompilerVersion() {
        return compilerVersion;
    }

    private static String normalizeRuleName(String ruleName) {
        if (ruleName == null || ruleName.trim().isEmpty()) {
            return "未命名规则";
        }
        return ruleName.trim();
    }

    private static String normalizeEventType(String eventType) {
        if (eventType == null || eventType.trim().isEmpty()) {
            return DEFAULT_EVENT_TYPE;
        }
        return eventType.trim();
    }

    private static String normalizeScopeType(String scopeType) {
        if (scopeType == null || scopeType.trim().isEmpty()) {
            return DEFAULT_SCOPE_TYPE;
        }
        return scopeType.trim();
    }

    private static int normalizePriority(int priority) {
        return priority <= 0 ? DEFAULT_PRIORITY : priority;
    }
}
