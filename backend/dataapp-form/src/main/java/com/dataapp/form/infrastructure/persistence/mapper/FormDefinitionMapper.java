package com.dataapp.form.infrastructure.persistence.mapper;

import com.dataapp.form.infrastructure.persistence.po.FormDefinitionPO;
import com.dataapp.form.infrastructure.persistence.po.FormDraftPO;
import com.dataapp.form.infrastructure.persistence.po.FormDraftSummaryPO;
import com.dataapp.form.infrastructure.persistence.po.FormVersionPO;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.util.List;

@Mapper
public interface FormDefinitionMapper {

    @Select("select id, tenant_id, form_code, name, description, status, current_version_id from form_definition where id = #{id}")
    FormDefinitionPO selectById(Long id);

    @Select("select id, tenant_id, form_code, name, description, status, current_version_id from form_definition where form_code = #{formCode}")
    FormDefinitionPO selectByFormCode(String formCode);

    @Insert("""
        insert into form_definition (id, tenant_id, form_code, name, description, status, created_by, updated_by)
        values (#{id}, #{tenantId}, #{formCode}, #{name}, #{description}, #{status}, 1, 1)
        """)
    int insert(FormDefinitionPO formDefinitionPO);

    @Update("""
        update form_definition
        set name = #{name},
            description = #{description},
            status = #{status},
            updated_by = 1,
            updated_at = now()
        where id = #{id}
        """)
    int update(FormDefinitionPO formDefinitionPO);

    @Update("""
        update form_definition
        set current_version_id = #{versionId},
            status = #{status},
            updated_by = 1,
            updated_at = now()
        where id = #{formId}
        """)
    int updateCurrentVersion(
        @Param("formId") Long formId,
        @Param("versionId") Long versionId,
        @Param("status") String status
    );

    @Select("""
        select id, form_id, fields_json::text as fields_json, version, updated_by, updated_at
        from form_draft
        where form_id = #{formId}
        """)
    FormDraftPO selectDraftByFormId(Long formId);

    @Select("""
        select fd.id as form_id,
               fd.form_code,
               fd.name,
               fd.description,
               fd.status,
               d.version as draft_version,
               d.updated_at
        from form_definition fd
        inner join form_draft d on d.form_id = fd.id
        order by d.updated_at desc, fd.id desc
        """)
    List<FormDraftSummaryPO> selectDraftSummaries();

    @Insert("""
        insert into form_draft (id, tenant_id, form_id, schema_json, fields_json, version, updated_by)
        values (#{id}, 0, #{formId}, cast(#{fieldsJson} as jsonb), cast(#{fieldsJson} as jsonb), #{version}, #{updatedBy})
        on conflict (form_id) do update
        set schema_json = excluded.schema_json,
            fields_json = excluded.fields_json,
            version = excluded.version,
            updated_by = excluded.updated_by,
            updated_at = now()
        """)
    int upsertDraft(FormDraftPO formDraftPO);

    @Select("select coalesce(max(version_no), 0) from form_version where form_id = #{formId}")
    Integer selectMaxVersionNo(Long formId);

    @Insert("""
        insert into form_version (id, tenant_id, form_id, version_no, schema_json, fields_json, published_by)
        values (#{id}, 0, #{formId}, #{versionNo}, cast(#{fieldsJson} as jsonb), cast(#{fieldsJson} as jsonb), #{publishedBy})
        """)
    int insertVersion(FormVersionPO formVersionPO);

    @Select("""
        select fv.id, fv.form_id, fv.version_no, fv.fields_json::text as fields_json, fv.published_by, fv.published_at
        from form_version fv
        inner join form_definition fd on fd.current_version_id = fv.id
        where fd.form_code = #{formCode}
        """)
    FormVersionPO selectCurrentVersionByFormCode(String formCode);

    @Select("""
        select id, form_id, version_no, fields_json::text as fields_json, published_by, published_at
        from form_version
        where id = #{versionId}
        """)
    FormVersionPO selectVersionById(Long versionId);

    @Delete("delete from form_field where form_id = #{formId}")
    int deleteDraftFieldsByFormId(Long formId);

    @Delete("delete from form_version_field where form_id = #{formId}")
    int deleteVersionFieldsByFormId(Long formId);

    @Delete("delete from form_version where form_id = #{formId}")
    int deleteVersionsByFormId(Long formId);

    @Delete("delete from form_draft where form_id = #{formId}")
    int deleteDraftByFormId(Long formId);

    @Delete("delete from form_definition where id = #{formId}")
    int deleteByFormId(Long formId);

    @Insert("""
        insert into form_field (
            id, tenant_id, form_id, field_key, field_code, field_name,
            node_type, component_type, parent_field_key, sort_no, status
        ) values (
            #{id}, 0, #{formId}, #{fieldKey}, #{fieldCode}, #{fieldName},
            #{nodeType}, #{componentType}, #{parentFieldKey}, #{sortNo}, #{status}
        )
        """)
    int insertDraftField(
        @Param("id") Long id,
        @Param("formId") Long formId,
        @Param("fieldKey") String fieldKey,
        @Param("fieldCode") String fieldCode,
        @Param("fieldName") String fieldName,
        @Param("nodeType") String nodeType,
        @Param("componentType") String componentType,
        @Param("parentFieldKey") String parentFieldKey,
        @Param("sortNo") Integer sortNo,
        @Param("status") String status
    );

    @Delete("delete from form_version_field where form_version_id = #{formVersionId}")
    int deleteVersionFieldsByVersionId(Long formVersionId);

    @Insert("""
        insert into form_version_field (
            id, tenant_id, form_version_id, form_id, field_key, field_code, field_name,
            node_type, component_type, parent_field_key, sort_no
        ) values (
            #{id}, 0, #{formVersionId}, #{formId}, #{fieldKey}, #{fieldCode}, #{fieldName},
            #{nodeType}, #{componentType}, #{parentFieldKey}, #{sortNo}
        )
        """)
    int insertVersionField(
        @Param("id") Long id,
        @Param("formVersionId") Long formVersionId,
        @Param("formId") Long formId,
        @Param("fieldKey") String fieldKey,
        @Param("fieldCode") String fieldCode,
        @Param("fieldName") String fieldName,
        @Param("nodeType") String nodeType,
        @Param("componentType") String componentType,
        @Param("parentFieldKey") String parentFieldKey,
        @Param("sortNo") Integer sortNo
    );
}
