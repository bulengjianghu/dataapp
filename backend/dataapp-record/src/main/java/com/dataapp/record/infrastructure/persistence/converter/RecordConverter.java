package com.dataapp.record.infrastructure.persistence.converter;

import com.dataapp.record.domain.model.aggregate.Record;
import com.dataapp.record.domain.model.valueobject.RecordData;
import com.dataapp.record.infrastructure.persistence.po.RecordDetailRowPO;
import com.dataapp.record.infrastructure.persistence.po.RecordPO;
import com.dataapp.shared.exception.BizException;
import com.dataapp.shared.exception.ErrorCode;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class RecordConverter {

    private RecordConverter() {
    }

    public static Record toDomain(RecordPO po, List<RecordDetailRowPO> detailRows, ObjectMapper objectMapper) {
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
            new RecordData(readJson(po.getDraftDataJson(), objectMapper), toDetailTables(detailRows, objectMapper)),
            new RecordData(readJson(po.getSubmittedDataJson(), objectMapper), toDetailTables(detailRows, objectMapper))
        );
    }

    public static String writeJson(Map<String, Object> data, ObjectMapper objectMapper) {
        try {
            return objectMapper.writeValueAsString(data == null ? Map.of() : data);
        } catch (JsonProcessingException ex) {
            throw new BizException(ErrorCode.SYS_INTERNAL_ERROR, "记录数据序列化失败");
        }
    }

    public static Map<String, Object> readJson(String json, ObjectMapper objectMapper) {
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

    public static Map<String, List<Map<String, Object>>> toDetailTables(
        List<RecordDetailRowPO> detailRows,
        ObjectMapper objectMapper
    ) {
        if (detailRows == null || detailRows.isEmpty()) {
            return Map.of();
        }

        LinkedHashMap<String, List<Map<String, Object>>> detailTables = new LinkedHashMap<>();
        for (RecordDetailRowPO row : detailRows) {
            detailTables.computeIfAbsent(row.getDetailTableKey(), key -> new ArrayList<>())
                .add(readJson(row.getRowDataJson(), objectMapper));
        }
        return Map.copyOf(detailTables);
    }
}
