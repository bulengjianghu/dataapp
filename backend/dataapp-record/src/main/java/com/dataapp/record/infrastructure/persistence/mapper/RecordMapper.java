package com.dataapp.record.infrastructure.persistence.mapper;

import com.dataapp.record.infrastructure.persistence.po.RecordPO;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

@Mapper
public interface RecordMapper {

    @Select("""
        select
            rm.id,
            rm.form_id,
            rm.form_version_id,
            rm.created_by as creator_id,
            rm.updated_by,
            rm.status,
            rd.data_json::text as draft_data_json,
            rd.search_json::text as submitted_data_json,
            rm.created_at
        from record_main rm
        left join record_data rd on rd.record_id = rm.id
        where rm.id = #{id} and rm.deleted = false
        """)
    RecordPO selectById(Long id);

    @Select("""
        select
            rm.id,
            rm.form_id,
            rm.form_version_id,
            rm.created_by as creator_id,
            rm.updated_by,
            rm.status,
            rd.data_json::text as draft_data_json,
            rd.search_json::text as submitted_data_json,
            rm.created_at
        from record_main rm
        left join record_data rd on rd.record_id = rm.id
        where rm.form_id = #{formId} and rm.deleted = false
        order by rm.updated_at desc, rm.created_at desc
        """)
    java.util.List<RecordPO> selectByFormId(Long formId);

    @Insert("""
        insert into record_main (id, tenant_id, form_id, form_version_id, status, created_by, updated_by)
        values (#{id}, 0, #{formId}, #{formVersionId}, #{status}, #{creatorId}, #{updatedBy})
        """)
    int insertMain(RecordPO recordPO);

    @Insert("""
        insert into record_data (id, tenant_id, record_id, data_json, search_json)
        values (#{id}, 0, #{recordId}, cast(#{draftDataJson} as jsonb), cast(#{submittedDataJson} as jsonb))
        """)
    int insertData(
        @Param("id") Long id,
        @Param("recordId") Long recordId,
        @Param("draftDataJson") String draftDataJson,
        @Param("submittedDataJson") String submittedDataJson
    );

    @Update("""
        update record_main
        set status = #{status},
            updated_by = #{updatedBy},
            updated_at = now(),
            submitted_at = case when #{status} = 'SUBMITTED' then now() else submitted_at end
        where id = #{id}
        """)
    int updateMain(RecordPO recordPO);

    @Update("""
        update record_data
        set data_json = cast(#{draftDataJson} as jsonb),
            search_json = cast(#{submittedDataJson} as jsonb)
        where record_id = #{recordId}
        """)
    int updateData(
        @Param("recordId") Long recordId,
        @Param("draftDataJson") String draftDataJson,
        @Param("submittedDataJson") String submittedDataJson
    );

    @Insert("""
        insert into record_history (id, tenant_id, record_id, op_type, before_json, after_json, operated_by)
        values (#{id}, 0, #{recordId}, #{opType}, cast(#{beforeJson} as jsonb), cast(#{afterJson} as jsonb), #{operatedBy})
        """)
    int insertHistory(
        @Param("id") Long id,
        @Param("recordId") Long recordId,
        @Param("opType") String opType,
        @Param("beforeJson") String beforeJson,
        @Param("afterJson") String afterJson,
        @Param("operatedBy") Long operatedBy
    );
}
