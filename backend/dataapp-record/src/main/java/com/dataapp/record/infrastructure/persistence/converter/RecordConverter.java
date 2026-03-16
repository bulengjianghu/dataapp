package com.dataapp.record.infrastructure.persistence.converter;

import com.dataapp.record.domain.model.aggregate.Record;
import com.dataapp.record.domain.model.valueobject.RecordData;
import com.dataapp.record.infrastructure.persistence.po.RecordPO;
import com.dataapp.shared.exception.BizException;
import com.dataapp.shared.exception.ErrorCode;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.Map;

public final class RecordConverter {

    private RecordConverter() {
    }

    public static Record toDomain(RecordPO po, ObjectMapper objectMapper) {
        if (po == null) {
            return null;
        }
        return new Record(
            po.getId(),
            po.getFormId(),
            po.getFormVersionId(),
            po.getCreatorId(),
            po.getUpdatedBy(),
            null,
            po.getStatus(),
            RecordData.of(readJson(po.getDraftDataJson(), objectMapper)),
            RecordData.of(readJson(po.getSubmittedDataJson(), objectMapper))
        );
    }

    public static String writeJson(Map<String, Object> data, ObjectMapper objectMapper) {
        try {
            return objectMapper.writeValueAsString(data == null ? Map.of() : data);
        } catch (JsonProcessingException ex) {
            throw new BizException(ErrorCode.SYS_INTERNAL_ERROR, "记录数据序列化失败");
        }
    }

    private static Map<String, Object> readJson(String json, ObjectMapper objectMapper) {
        if (json == null || json.isBlank()) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {
            });
        } catch (JsonProcessingException ex) {
            throw new BizException(ErrorCode.SYS_INTERNAL_ERROR, "记录数据反序列化失败");
        }
    }
}
