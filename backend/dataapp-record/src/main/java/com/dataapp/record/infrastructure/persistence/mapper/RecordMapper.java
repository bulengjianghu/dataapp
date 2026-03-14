package com.dataapp.record.infrastructure.persistence.mapper;

import com.dataapp.record.infrastructure.persistence.po.RecordPO;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

@Mapper
public interface RecordMapper {

    @Select("select id, form_id, form_version_id, status, created_at from record_main where id = #{id}")
    RecordPO selectById(Long id);

    @Insert("""
        insert into record_main (id, tenant_id, form_id, form_version_id, status, created_by, updated_by)
        values (#{id}, 0, #{formId}, #{formVersionId}, #{status}, 1, 1)
        """)
    int insert(RecordPO recordPO);

    @Insert("""
        insert into record_data (id, tenant_id, record_id, data_json, search_json)
        values (#{id}, 0, #{recordId}, cast(#{dataJson} as jsonb), cast(#{searchJson} as jsonb))
        """)
    int insertData(
        @Param("id") Long id,
        @Param("recordId") Long recordId,
        @Param("dataJson") String dataJson,
        @Param("searchJson") String searchJson
    );

    @Update("""
        update record_main
        set status = #{status}, submitted_at = now(), updated_at = now()
        where id = #{id}
        """)
    int updateStatus(@Param("id") Long id, @Param("status") String status);
}
