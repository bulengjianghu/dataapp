package com.dataapp.rule.domain.model.entity;

import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;

import static org.assertj.core.api.Assertions.assertThat;

class InteractionRuleDraftTest {

    @Test
    void shouldGenerateStableChecksumFromPayload() {
        InteractionRuleDraft first = InteractionRuleDraft.initialize(
            3001L,
            2001L,
            "{\"ruleCode\":\"IR-2001\"}",
            "{\"nodes\":[]}",
            "{\"steps\":[]}",
            "{}",
            "v0.1.0",
            1L,
            OffsetDateTime.parse("2026-03-19T10:00:00+08:00")
        );
        InteractionRuleDraft second = InteractionRuleDraft.initialize(
            3002L,
            2001L,
            "{\"ruleCode\":\"IR-2001\"}",
            "{\"nodes\":[]}",
            "{\"steps\":[]}",
            "{}",
            "v0.1.0",
            1L,
            OffsetDateTime.parse("2026-03-19T10:01:00+08:00")
        );

        assertThat(first.getChecksum()).isEqualTo(second.getChecksum());
    }

    @Test
    void shouldChangeChecksumWhenGraphOrCompiledPayloadChanges() {
        InteractionRuleDraft current = InteractionRuleDraft.initialize(
            3001L,
            2001L,
            "{\"ruleCode\":\"IR-2001\"}",
            "{\"nodes\":[]}",
            "{\"steps\":[]}",
            "{}",
            "v0.1.0",
            1L,
            OffsetDateTime.parse("2026-03-19T10:00:00+08:00")
        );

        InteractionRuleDraft updated = current.save(
            "{\"ruleCode\":\"IR-2001\"}",
            "{\"nodes\":[1]}",
            "{\"steps\":[1]}",
            "{}",
            "v0.2.0",
            2L,
            OffsetDateTime.parse("2026-03-19T11:00:00+08:00")
        );

        assertThat(updated.getVersion()).isEqualTo(2);
        assertThat(updated.getChecksum()).isNotEqualTo(current.getChecksum());
        assertThat(updated.getCompilerVersion()).isEqualTo("v0.2.0");
    }
}
