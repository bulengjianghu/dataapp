package com.dataapp.form.infrastructure.persistence.mapper;

import com.dataapp.form.infrastructure.persistence.po.FormDefinitionPO;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface FormDefinitionMapper {

    @Select("select id, tenant_id, form_code, name, status from form_definition where id = #{id}")
    FormDefinitionPO selectById(Long id);

    @Insert("""
        insert into form_definition (id, tenant_id, form_code, name, status, created_by, updated_by)
        values (#{id}, #{tenantId}, #{formCode}, #{name}, #{status}, 1, 1)
        """)
    int insert(FormDefinitionPO formDefinitionPO);

    @Insert("""
        insert into form_draft (id, tenant_id, form_id, schema_json, version, updated_by)
        values (#{draftId}, #{tenantId}, #{formId}, cast(#{schemaJson} as jsonb), 0, 1)
        """)
    int insertDraft(
        @Param("draftId") Long draftId,
        @Param("tenantId") Long tenantId,
        @Param("formId") Long formId,
        @Param("schemaJson") String schemaJson
    );
}
