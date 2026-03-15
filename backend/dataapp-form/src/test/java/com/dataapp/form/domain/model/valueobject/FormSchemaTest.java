package com.dataapp.form.domain.model.valueobject;

import com.dataapp.shared.exception.BizException;
import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class FormSchemaTest {

    @Test
    void shouldGenerateServerIdAndBuildFieldIndexesWhenDraftSchemaIsValid() {
        FormSchema schema = FormSchema.forDraft(Map.of("node_1", fieldNode("node_1", null)));

        @SuppressWarnings("unchecked")
        Map<String, Object> node = (Map<String, Object>) schema.fields().get("node_1");
        assertThat(node.get("serverId")).asString().startsWith("fld_");
        assertThat(schema.fieldIndexes()).hasSize(1);
        assertThat(schema.fieldIndexes().getFirst().fieldName()).isEqualTo("姓名");
    }

    @Test
    void shouldRejectInvalidGraphWhenChildParentMismatch() {
        LinkedHashMap<String, Object> container = new LinkedHashMap<>();
        container.put("id", "container_1");
        container.put("type", "container");
        container.put("parentId", null);
        container.put("childrenIds", List.of("field_1"));
        container.put("props", Map.of("title", "分组"));
        container.put("layout", Map.of());

        assertThatThrownBy(() -> FormSchema.forDraft(Map.of(
            "container_1", container,
            "field_1", fieldNode("field_1", "other_parent")
        )))
            .isInstanceOf(BizException.class)
            .hasMessageContaining("field_1");
    }

    private Map<String, Object> fieldNode(String id, String parentId) {
        LinkedHashMap<String, Object> node = new LinkedHashMap<>();
        node.put("id", id);
        node.put("type", "field");
        node.put("parentId", parentId);
        node.put("childrenIds", List.of());
        node.put("props", Map.of(
            "component", "input",
            "label", "姓名"
        ));
        node.put("layout", Map.of("span", 6));
        return node;
    }
}
