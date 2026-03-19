package com.dataapp.rule.infrastructure.persistence.mapper;

import com.dataapp.rule.infrastructure.persistence.po.RuleDefinitionPO;
import com.dataapp.rule.infrastructure.persistence.po.RuleDraftPO;
import com.dataapp.rule.infrastructure.persistence.po.RuleDraftSummaryPO;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.util.List;

@Mapper
public interface InteractionRuleMapper {

    @Select("""
        select id, form_id, rule_code, rule_name, event_type, scope_type, status, description, updated_at
        from rule_definition
        where id = #{ruleId}
          and form_id = #{formId}
          and deleted = false
        """)
    RuleDefinitionPO selectDefinitionById(@Param("formId") Long formId, @Param("ruleId") Long ruleId);

    @Insert("""
        insert into rule_definition (
            id, tenant_id, rule_code, rule_name, rule_type, biz_domain,
            form_id, event_type, scope_type, status, description, created_by, updated_by
        ) values (
            #{id}, 0, #{ruleCode}, #{ruleName}, 'INTERACTION', 'FORM',
            #{formId}, #{eventType}, #{scopeType}, #{status}, #{description}, 1, 1
        )
        """)
    int insertDefinition(RuleDefinitionPO ruleDefinitionPO);

    @Update("""
        update rule_definition
        set rule_name = #{ruleName},
            event_type = #{eventType},
            scope_type = #{scopeType},
            description = #{description},
            updated_by = 1,
            updated_at = now()
        where id = #{id}
          and form_id = #{formId}
          and deleted = false
        """)
    int updateDefinition(RuleDefinitionPO ruleDefinitionPO);

    @Select("""
        select rd.id as rule_id,
               rd.rule_code,
               rd.rule_name,
               rd.event_type,
               d.draft_json::text as draft_json,
               rd.status,
               d.updated_at
        from rule_definition rd
        inner join rule_draft d on d.rule_id = rd.id and d.deleted = false
        where rd.form_id = #{formId}
          and rd.rule_type = 'INTERACTION'
          and rd.deleted = false
        order by d.updated_at desc, rd.id desc
        """)
    List<RuleDraftSummaryPO> selectDraftSummariesByFormId(Long formId);

    @Select("""
        select id, rule_id, draft_json::text as draft_json, graph_json::text as graph_json,
               compiled_json::text as compiled_json, normalized_json::text as normalized_json,
               version, checksum, compiler_version, updated_by, updated_at
        from rule_draft
        where rule_id = #{ruleId}
          and deleted = false
        """)
    RuleDraftPO selectDraftByRuleId(Long ruleId);

    @Insert("""
        insert into rule_draft (
            id, tenant_id, rule_id, draft_json, graph_json, compiled_json, normalized_json,
            version, checksum, compiler_version, updated_by
        ) values (
            #{id}, 0, #{ruleId}, cast(#{draftJson} as jsonb), cast(#{graphJson} as jsonb),
            cast(#{compiledJson} as jsonb), cast(#{normalizedJson} as jsonb),
            #{version}, #{checksum}, #{compilerVersion}, #{updatedBy}
        )
        on conflict (rule_id) do update
        set draft_json = excluded.draft_json,
            graph_json = excluded.graph_json,
            compiled_json = excluded.compiled_json,
            normalized_json = excluded.normalized_json,
            version = excluded.version,
            checksum = excluded.checksum,
            compiler_version = excluded.compiler_version,
            updated_by = excluded.updated_by,
            updated_at = now(),
            deleted = false
        """)
    int upsertDraft(RuleDraftPO ruleDraftPO);
}
