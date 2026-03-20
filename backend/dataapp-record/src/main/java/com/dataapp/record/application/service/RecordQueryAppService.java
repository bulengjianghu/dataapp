package com.dataapp.record.application.service;

import com.dataapp.record.domain.model.aggregate.Record;
import com.dataapp.record.domain.model.service.RecordAccessPolicy;
import com.dataapp.record.domain.repository.RecordRepository;
import com.dataapp.record.interfaces.dto.RecordDetailResponse;
import com.dataapp.record.interfaces.dto.RecordListItemResponse;
import com.dataapp.record.interfaces.dto.RelationRecordOptionResponse;
import com.dataapp.record.interfaces.dto.RelationRecordQueryFilterRequest;
import com.dataapp.record.interfaces.dto.RelationRecordQueryRequest;
import com.dataapp.record.interfaces.dto.RelationRecordQueryResponse;
import com.dataapp.record.interfaces.dto.RelationRecordQuerySorterRequest;
import com.dataapp.shared.exception.BizException;
import com.dataapp.shared.exception.ErrorCode;
import com.dataapp.shared.security.CurrentUser;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class RecordQueryAppService {

    private final RecordRepository recordRepository;

    public RecordQueryAppService(RecordRepository recordRepository) {
        this.recordRepository = recordRepository;
    }

    public RecordDetailResponse getById(CurrentUser currentUser, Long recordId) {
        Record record = recordRepository.findById(recordId);
        if (record == null) {
            throw new BizException(ErrorCode.RECORD_NOT_FOUND, "记录不存在");
        }
        if (!RecordAccessPolicy.canAccess(currentUser, record)) {
            throw new BizException(ErrorCode.UNAUTHORIZED, "无权查看该记录");
        }
        return new RecordDetailResponse(
            record.getId(),
            record.getFormId(),
            record.getFormVersionId(),
            record.getStatus(),
            record.readableData().mainData(),
            record.readableData().detailTables()
        );
    }

    public List<RecordListItemResponse> listByFormId(CurrentUser currentUser, Long formId) {
        return recordRepository.findByFormId(formId).stream()
            .filter(record -> RecordAccessPolicy.canAccess(currentUser, record))
            .map(record -> new RecordListItemResponse(
                record.getId(),
                record.getFormId(),
                record.getFormVersionId(),
                record.getStatus(),
                record.getCreatorId()
            ))
            .toList();
    }

    public List<RelationRecordOptionResponse> listRelationOptionsByFormId(CurrentUser currentUser, Long formId) {
        if (currentUser == null) {
            throw new BizException(ErrorCode.UNAUTHORIZED, "请先登录后再继续");
        }
        return recordRepository.findByFormId(formId).stream()
            .map(record -> new RelationRecordOptionResponse(
                record.getId(),
                record.getFormId(),
                record.getFormVersionId(),
                record.getStatus(),
                record.readableData().mainData(),
                record.readableData().detailTables()
            ))
            .toList();
    }

    public RelationRecordQueryResponse queryRelationOptionsByFormId(
        CurrentUser currentUser,
        Long formId,
        RelationRecordQueryRequest request
    ) {
        if (currentUser == null) {
            throw new BizException(ErrorCode.UNAUTHORIZED, "请先登录后再继续");
        }

        List<RelationRecordOptionResponse> allRecords = listRelationOptionsByFormId(currentUser, formId);
        List<String> displayFields = request.displayFields() == null ? List.of() : request.displayFields();
        List<RelationRecordOptionResponse> filteredRecords = allRecords.stream()
            .filter(record -> matchesKeyword(record, request.keyword(), displayFields))
            .filter(record -> matchesFilters(record, request.filters()))
            .sorted(buildComparator(request.sorters()))
            .toList();

        int pageNo = request.pageNo() == null || request.pageNo() < 1 ? 1 : request.pageNo();
        int pageSize = request.pageSize() == null || request.pageSize() < 1 ? filteredRecords.size() : request.pageSize();
        int fromIndex = Math.max(0, (pageNo - 1) * pageSize);
        int toIndex = Math.min(filteredRecords.size(), fromIndex + pageSize);
        List<RelationRecordOptionResponse> pageRecords =
            fromIndex >= filteredRecords.size() ? List.of() : filteredRecords.subList(fromIndex, toIndex);

        return new RelationRecordQueryResponse((long) filteredRecords.size(), pageRecords);
    }

    private boolean matchesKeyword(
        RelationRecordOptionResponse record,
        String keyword,
        List<String> displayFields
    ) {
        if (keyword == null || keyword.isBlank()) {
            return true;
        }
        String normalizedKeyword = normalize(keyword);
        if (normalize(String.valueOf(record.id())).contains(normalizedKeyword)) {
            return true;
        }
        return displayFields.stream()
            .map(fieldKey -> record.mainData().get(fieldKey))
            .filter(value -> value != null)
            .map(value -> normalize(String.valueOf(value)))
            .anyMatch(text -> text.contains(normalizedKeyword));
    }

    private boolean matchesFilters(
        RelationRecordOptionResponse record,
        List<RelationRecordQueryFilterRequest> filters
    ) {
        if (filters == null || filters.isEmpty()) {
            return true;
        }
        return filters.stream().allMatch(filter -> matchesFilter(record.mainData(), filter));
    }

    private boolean matchesFilter(Map<String, Object> mainData, RelationRecordQueryFilterRequest filter) {
        if (filter == null || filter.fieldKey() == null || filter.fieldKey().isBlank()) {
            return true;
        }
        Object actual = mainData.get(filter.fieldKey());
        Object expected = filter.value();
        String operator = filter.operator() == null || filter.operator().isBlank() ? "eq" : filter.operator();

        if ("contains".equalsIgnoreCase(operator)) {
            return normalize(String.valueOf(actual)).contains(normalize(String.valueOf(expected)));
        }
        return normalize(String.valueOf(actual)).equals(normalize(String.valueOf(expected)));
    }

    private Comparator<RelationRecordOptionResponse> buildComparator(List<RelationRecordQuerySorterRequest> sorters) {
        if (sorters == null || sorters.isEmpty()) {
            return Comparator.comparing(RelationRecordOptionResponse::id);
        }
        Comparator<RelationRecordOptionResponse> comparator = null;
        for (RelationRecordQuerySorterRequest sorter : sorters) {
            if (sorter == null || sorter.fieldKey() == null || sorter.fieldKey().isBlank()) {
                continue;
            }
            Comparator<RelationRecordOptionResponse> currentComparator = Comparator.comparing(
                record -> normalize(String.valueOf(record.mainData().get(sorter.fieldKey()))),
                Comparator.nullsLast(String::compareTo)
            );
            if ("desc".equalsIgnoreCase(sorter.direction())) {
                currentComparator = currentComparator.reversed();
            }
            comparator = comparator == null ? currentComparator : comparator.thenComparing(currentComparator);
        }
        return comparator == null ? Comparator.comparing(RelationRecordOptionResponse::id) : comparator;
    }

    private String normalize(String raw) {
        return raw == null ? "" : raw.trim().toLowerCase(Locale.ROOT).replace(" ", "");
    }
}
