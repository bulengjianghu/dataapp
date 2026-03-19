package com.dataapp.rule.domain.model.entity;

import com.dataapp.shared.exception.BizException;
import com.dataapp.shared.exception.ErrorCode;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.OffsetDateTime;

public final class InteractionRuleDraft {

    private final Long id;
    private final Long ruleId;
    private final String draftJson;
    private final String graphJson;
    private final String compiledJson;
    private final String normalizedJson;
    private final Integer version;
    private final String checksum;
    private final String compilerVersion;
    private final Long updatedBy;
    private final OffsetDateTime updatedAt;

    public InteractionRuleDraft(
        Long id,
        Long ruleId,
        String draftJson,
        String graphJson,
        String compiledJson,
        String normalizedJson,
        Integer version,
        String checksum,
        String compilerVersion,
        Long updatedBy,
        OffsetDateTime updatedAt
    ) {
        this.id = id;
        this.ruleId = ruleId;
        this.draftJson = draftJson;
        this.graphJson = graphJson;
        this.compiledJson = compiledJson;
        this.normalizedJson = normalizedJson;
        this.version = version;
        this.checksum = checksum;
        this.compilerVersion = compilerVersion;
        this.updatedBy = updatedBy;
        this.updatedAt = updatedAt;
    }

    public static InteractionRuleDraft initialize(
        Long id,
        Long ruleId,
        String draftJson,
        String graphJson,
        String compiledJson,
        String normalizedJson,
        String compilerVersion,
        Long operatorId,
        OffsetDateTime now
    ) {
        return new InteractionRuleDraft(
            id,
            ruleId,
            draftJson,
            graphJson,
            compiledJson,
            normalizedJson,
            1,
            createChecksum(draftJson, graphJson, compiledJson),
            compilerVersion == null ? "" : compilerVersion,
            operatorId,
            now
        );
    }

    public InteractionRuleDraft save(
        String nextDraftJson,
        String nextGraphJson,
        String nextCompiledJson,
        String nextNormalizedJson,
        String nextCompilerVersion,
        Long operatorId,
        OffsetDateTime now
    ) {
        int nextVersion = version == null ? 1 : version + 1;
        return new InteractionRuleDraft(
            id,
            ruleId,
            nextDraftJson,
            nextGraphJson,
            nextCompiledJson,
            nextNormalizedJson,
            nextVersion,
            createChecksum(nextDraftJson, nextGraphJson, nextCompiledJson),
            nextCompilerVersion == null ? "" : nextCompilerVersion,
            operatorId,
            now
        );
    }

    public Long getId() {
        return id;
    }

    public Long getRuleId() {
        return ruleId;
    }

    public String getDraftJson() {
        return draftJson;
    }

    public String getGraphJson() {
        return graphJson;
    }

    public String getCompiledJson() {
        return compiledJson;
    }

    public String getNormalizedJson() {
        return normalizedJson;
    }

    public Integer getVersion() {
        return version;
    }

    public String getChecksum() {
        return checksum;
    }

    public String getCompilerVersion() {
        return compilerVersion;
    }

    public Long getUpdatedBy() {
        return updatedBy;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }

    private static String createChecksum(String draftJson, String graphJson, String compiledJson) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest((draftJson + "|" + graphJson + "|" + compiledJson).getBytes(StandardCharsets.UTF_8));
            StringBuilder builder = new StringBuilder();
            for (byte item : hashed) {
                builder.append(String.format("%02x", item));
            }
            return builder.toString();
        } catch (NoSuchAlgorithmException ex) {
            throw new BizException(ErrorCode.SYS_INTERNAL_ERROR, "规则草稿摘要计算失败");
        }
    }
}
