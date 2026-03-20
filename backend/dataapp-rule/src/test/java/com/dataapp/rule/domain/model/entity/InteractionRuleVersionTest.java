package com.dataapp.rule.domain.model.entity;

import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class InteractionRuleVersionTest {

    @Test
    void shouldMatchRuntimeScopeWhenActiveFormRule() {
        InteractionRuleVersion version = new InteractionRuleVersion(
            4001L,
            2001L,
            1,
            "INTERACTION",
            1001L,
            null,
            "FIELD_CHANGE_MAIN",
            300,
            Map.of(),
            Map.of(),
            Map.of(),
            Map.of(),
            "continue",
            "v0.2.0",
            1L,
            OffsetDateTime.parse("2026-03-20T10:00:00+08:00"),
            "ACTIVE"
        );

        assertThat(version.matchesRuntimeScope(1001L, null)).isTrue();
        assertThat(version.matchesRuntimeScope(1001L, 9001L)).isTrue();
    }

    @Test
    void shouldRejectRuntimeScopeWhenInactiveOrFormVersionMismatch() {
        InteractionRuleVersion inactive = new InteractionRuleVersion(
            4002L,
            2002L,
            1,
            "INTERACTION",
            1001L,
            null,
            "FIELD_CHANGE_MAIN",
            100,
            Map.of(),
            Map.of(),
            Map.of(),
            Map.of(),
            "continue",
            "v0.2.0",
            1L,
            OffsetDateTime.parse("2026-03-20T10:00:00+08:00"),
            "INACTIVE"
        );
        InteractionRuleVersion scoped = new InteractionRuleVersion(
            4003L,
            2003L,
            2,
            "INTERACTION",
            1001L,
            7001L,
            "FORM_INIT",
            200,
            Map.of(),
            Map.of(),
            Map.of(),
            Map.of(),
            "continue",
            "v0.2.0",
            1L,
            OffsetDateTime.parse("2026-03-20T10:00:00+08:00"),
            "ACTIVE"
        );

        assertThat(inactive.matchesRuntimeScope(1001L, null)).isFalse();
        assertThat(scoped.matchesRuntimeScope(1001L, 7001L)).isTrue();
        assertThat(scoped.matchesRuntimeScope(1001L, 7002L)).isFalse();
        assertThat(scoped.matchesRuntimeScope(1002L, 7001L)).isFalse();
    }
}
