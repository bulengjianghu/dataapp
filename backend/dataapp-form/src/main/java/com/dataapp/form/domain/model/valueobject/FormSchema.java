package com.dataapp.form.domain.model.valueobject;

import com.dataapp.form.domain.model.entity.FormFieldIndex;
import com.dataapp.shared.exception.BizException;
import com.dataapp.shared.exception.ErrorCode;
import com.dataapp.shared.util.IdGenerator;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

public final class FormSchema {

    private final Map<String, Object> fields;
    private final List<FormFieldIndex> fieldIndexes;

    private FormSchema(Map<String, Object> fields, List<FormFieldIndex> fieldIndexes) {
        this.fields = Map.copyOf(fields);
        this.fieldIndexes = List.copyOf(fieldIndexes);
    }

    public static FormSchema forDraft(Map<String, Object> rawFields) {
        return normalize(rawFields, false);
    }

    public static FormSchema forPublish(Map<String, Object> rawFields) {
        return normalize(rawFields, true);
    }

    public Map<String, Object> fields() {
        return fields;
    }

    public List<FormFieldIndex> fieldIndexes() {
        return fieldIndexes;
    }

    @SuppressWarnings("unchecked")
    private static FormSchema normalize(Map<String, Object> rawFields, boolean strictPublishValidation) {
        Map<String, Object> source = rawFields == null ? Map.of() : rawFields;
        LinkedHashMap<String, LinkedHashMap<String, Object>> nodes = new LinkedHashMap<>();
        Set<String> fieldKeys = new LinkedHashSet<>();

        for (Map.Entry<String, Object> entry : source.entrySet()) {
            if (!(entry.getValue() instanceof Map<?, ?> rawNode)) {
                throw invalid("字段结构非法");
            }

            LinkedHashMap<String, Object> node = new LinkedHashMap<>();
            String nodeId = asString(rawNode.get("id"), entry.getKey());
            String nodeType = asRequiredString(rawNode.get("type"), "节点类型不能为空");
            if ("page".equals(nodeType)) {
                throw invalid("提交字段中不应包含 page_root");
            }

            String parentId = asNullableString(rawNode.get("parentId"));
            List<String> childrenIds = asStringList(rawNode.get("childrenIds"));
            LinkedHashMap<String, Object> props = asObjectMap(rawNode.get("props"));
            LinkedHashMap<String, Object> layout = asObjectMap(rawNode.get("layout"));
            Integer span = asNullableInteger(layout.get("span"));
            if (span != null) {
                if (span < 1 || span > 24) {
                    throw invalid("字段布局 span 必须在 1-24 范围内");
                }
                layout.put("span", span);
            }
            Integer order = asNullableInteger(layout.get("order"));
            if (order != null) {
                layout.put("order", order);
            }

            String serverId = asNullableString(rawNode.get("serverId"));
            if (serverId == null || serverId.isBlank()) {
                serverId = "fld_" + IdGenerator.nextId();
            }
            if (!fieldKeys.add(serverId)) {
                throw invalid("字段 serverId 重复: " + serverId);
            }

            node.put("id", nodeId);
            node.put("serverId", serverId);
            node.put("type", nodeType);
            node.put("parentId", parentId);
            node.put("childrenIds", childrenIds);
            node.put("props", props);
            node.put("layout", layout);
            nodes.put(nodeId, node);
        }

        validateGraph(nodes);
        validateComponents(nodes, strictPublishValidation);

        LinkedHashMap<String, Object> normalizedFields = new LinkedHashMap<>();
        for (Map.Entry<String, LinkedHashMap<String, Object>> entry : nodes.entrySet()) {
            normalizedFields.put(entry.getKey(), entry.getValue());
        }
        return new FormSchema(normalizedFields, buildFieldIndexes(nodes));
    }

    private static void validateGraph(LinkedHashMap<String, LinkedHashMap<String, Object>> nodes) {
        Set<String> roots = new LinkedHashSet<>();

        for (LinkedHashMap<String, Object> node : nodes.values()) {
            String nodeId = asString(node.get("id"), null);
            String nodeType = asString(node.get("type"), null);
            String parentId = asNullableString(node.get("parentId"));
            List<String> childrenIds = asStringList(node.get("childrenIds"));

            if (parentId == null) {
                roots.add(nodeId);
            } else if (!nodes.containsKey(parentId)) {
                throw invalid("节点父子关系非法: " + nodeId);
            }

            if (!"container".equals(nodeType) && !childrenIds.isEmpty()) {
                throw invalid("只有 container 节点允许包含子节点");
            }

            for (String childId : childrenIds) {
                LinkedHashMap<String, Object> child = nodes.get(childId);
                if (child == null) {
                    throw invalid("childrenIds 中存在不存在的节点: " + childId);
                }
                String childParentId = asNullableString(child.get("parentId"));
                if (!Objects.equals(nodeId, childParentId)) {
                    throw invalid("父子引用不一致: " + childId);
                }
            }
        }

        Set<String> visited = new LinkedHashSet<>();
        for (String rootId : roots) {
            dfs(rootId, nodes, visited, new LinkedHashSet<>());
        }
        if (visited.size() != nodes.size()) {
            throw invalid("字段结构存在孤儿节点或循环引用");
        }
    }

    private static void validateComponents(
        LinkedHashMap<String, LinkedHashMap<String, Object>> nodes,
        boolean strictPublishValidation
    ) {
        for (LinkedHashMap<String, Object> node : nodes.values()) {
            String nodeType = asString(node.get("type"), null);
            LinkedHashMap<String, Object> props = asObjectMap(node.get("props"));
            String serverId = asNullableString(node.get("serverId"));

            if (strictPublishValidation && (serverId == null || serverId.isBlank())) {
                throw invalid("发布前必须补齐所有字段 serverId");
            }

            if (!"field".equals(nodeType)) {
                continue;
            }

            String label = asNullableString(props.get("label"));
            if (label == null || label.isBlank()) {
                throw invalid("字段标题不能为空");
            }

            String component = asNullableString(props.get("component"));
            if (component == null || component.isBlank()) {
                throw invalid("字段组件类型不能为空");
            }

            if (List.of("radio", "checkbox", "select").contains(component)) {
                Object options = props.get("options");
                if (!(options instanceof Collection<?> optionList) || optionList.isEmpty()) {
                    throw invalid("选项类字段至少需要一个选项");
                }
            }
        }
    }

    private static void dfs(
        String nodeId,
        LinkedHashMap<String, LinkedHashMap<String, Object>> nodes,
        Set<String> visited,
        Set<String> stack
    ) {
        if (stack.contains(nodeId)) {
            throw invalid("字段结构存在循环引用");
        }
        if (visited.contains(nodeId)) {
            return;
        }
        stack.add(nodeId);
        LinkedHashMap<String, Object> node = nodes.get(nodeId);
        for (String childId : asStringList(node.get("childrenIds"))) {
            dfs(childId, nodes, visited, stack);
        }
        stack.remove(nodeId);
        visited.add(nodeId);
    }

    private static List<FormFieldIndex> buildFieldIndexes(LinkedHashMap<String, LinkedHashMap<String, Object>> nodes) {
        List<FormFieldIndex> indexes = new ArrayList<>();
        List<LinkedHashMap<String, Object>> sortedNodes = new ArrayList<>(nodes.values());
        sortedNodes.sort(Comparator.comparingInt(FormSchema::sortOrder));

        for (LinkedHashMap<String, Object> node : sortedNodes) {
            String nodeId = asString(node.get("id"), null);
            LinkedHashMap<String, Object> props = asObjectMap(node.get("props"));
            String parentId = asNullableString(node.get("parentId"));
            LinkedHashMap<String, Object> parent = parentId == null ? null : nodes.get(parentId);

            indexes.add(new FormFieldIndex(
                asString(node.get("serverId"), null),
                firstNonBlank(
                    asNullableString(props.get("fieldCode")),
                    asNullableString(props.get("name")),
                    nodeId
                ),
                firstNonBlank(
                    asNullableString(props.get("label")),
                    asNullableString(props.get("title")),
                    nodeId
                ),
                asString(node.get("type"), null),
                asNullableString(props.get("component")),
                parent == null ? null : asString(parent.get("serverId"), null),
                sortOrder(node)
            ));
        }
        return indexes;
    }

    private static int sortOrder(Map<String, Object> node) {
        Map<String, Object> layout = asObjectMap(node.get("layout"));
        Integer order = asNullableInteger(layout.get("order"));
        return order == null ? Integer.MAX_VALUE : order;
    }

    private static LinkedHashMap<String, Object> asObjectMap(Object value) {
        LinkedHashMap<String, Object> map = new LinkedHashMap<>();
        if (value instanceof Map<?, ?> rawMap) {
            for (Map.Entry<?, ?> entry : rawMap.entrySet()) {
                map.put(String.valueOf(entry.getKey()), entry.getValue());
            }
        }
        return map;
    }

    private static List<String> asStringList(Object value) {
        List<String> values = new ArrayList<>();
        if (value instanceof Collection<?> collection) {
            for (Object item : collection) {
                values.add(String.valueOf(item));
            }
        }
        return values;
    }

    private static String asRequiredString(Object value, String message) {
        String normalized = asNullableString(value);
        if (normalized == null || normalized.isBlank()) {
            throw invalid(message);
        }
        return normalized;
    }

    private static String asString(Object value, String defaultValue) {
        String normalized = asNullableString(value);
        return normalized == null ? defaultValue : normalized;
    }

    private static String asNullableString(Object value) {
        if (value == null) {
            return null;
        }
        String normalized = String.valueOf(value).trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private static Integer asNullableInteger(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.intValue();
        }
        try {
            return Integer.parseInt(String.valueOf(value));
        } catch (NumberFormatException ex) {
            throw invalid("字段布局值非法");
        }
    }

    private static String firstNonBlank(String... candidates) {
        for (String candidate : candidates) {
            if (candidate != null && !candidate.isBlank()) {
                return candidate;
            }
        }
        return null;
    }

    private static BizException invalid(String message) {
        return new BizException(ErrorCode.FORM_DRAFT_INVALID, message);
    }
}
