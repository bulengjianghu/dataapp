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

    @Test
    void shouldBuildFieldIndexesForDetailTableAndColumns() {
        LinkedHashMap<String, Object> detailTable = new LinkedHashMap<>();
        detailTable.put("id", "detail_1");
        detailTable.put("type", "detail_table");
        detailTable.put("serverId", "dt_order_items");
        detailTable.put("parentId", null);
        detailTable.put("childrenIds", List.of("detail_field_1"));
        detailTable.put("props", Map.of(
            "component", "detail-table",
            "title", "订单明细",
            "minRows", 1,
            "maxRows", 10
        ));
        detailTable.put("layout", Map.of("order", 2));

        LinkedHashMap<String, Object> detailField = new LinkedHashMap<>();
        detailField.put("id", "detail_field_1");
        detailField.put("type", "field");
        detailField.put("serverId", "fld_item_name");
        detailField.put("parentId", "detail_1");
        detailField.put("childrenIds", List.of());
        detailField.put("props", Map.of(
            "component", "input",
            "label", "商品名称"
        ));
        detailField.put("layout", Map.of("order", 3));

        FormSchema schema = FormSchema.forPublish(Map.of(
            "detail_1", detailTable,
            "detail_field_1", detailField
        ));

        assertThat(schema.fieldIndexes()).hasSize(2);
        assertThat(schema.fieldIndexes()).anySatisfy(index -> {
            assertThat(index.fieldKey()).isEqualTo("dt_order_items");
            assertThat(index.nodeType()).isEqualTo("detail_table");
            assertThat(index.componentType()).isEqualTo("detail-table");
        });
        assertThat(schema.fieldIndexes()).anySatisfy(index -> {
            assertThat(index.fieldKey()).isEqualTo("fld_item_name");
            assertThat(index.parentFieldKey()).isEqualTo("dt_order_items");
        });
    }

    @Test
    void shouldRejectPublishWhenDetailTableHasNoColumns() {
        LinkedHashMap<String, Object> detailTable = new LinkedHashMap<>();
        detailTable.put("id", "detail_1");
        detailTable.put("type", "detail_table");
        detailTable.put("serverId", "dt_order_items");
        detailTable.put("parentId", null);
        detailTable.put("childrenIds", List.of());
        detailTable.put("props", Map.of(
            "component", "detail-table",
            "title", "订单明细",
            "minRows", 1,
            "maxRows", 10
        ));
        detailTable.put("layout", Map.of());

        assertThatThrownBy(() -> FormSchema.forPublish(Map.of("detail_1", detailTable)))
            .isInstanceOf(BizException.class)
            .hasMessageContaining("至少有一个有效列");
    }

    @Test
    void shouldRejectPublishWhenRelationSelectConfigIsIncomplete() {
        LinkedHashMap<String, Object> relationField = new LinkedHashMap<>();
        relationField.put("id", "field_2");
        relationField.put("type", "field");
        relationField.put("serverId", "fld_customer_ref");
        relationField.put("parentId", null);
        relationField.put("childrenIds", List.of());
        relationField.put("props", Map.of(
            "component", "relation-select",
            "label", "关联客户",
            "mappings", List.of(Map.of("targetFieldKey", "fld_customer_name"))
        ));
        relationField.put("layout", Map.of("span", 12));

        assertThatThrownBy(() -> FormSchema.forPublish(Map.of("field_2", relationField)))
            .isInstanceOf(BizException.class)
            .hasMessageContaining("关联选择");
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
