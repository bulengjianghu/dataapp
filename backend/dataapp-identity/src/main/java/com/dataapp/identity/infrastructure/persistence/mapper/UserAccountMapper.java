package com.dataapp.identity.infrastructure.persistence.mapper;

import com.dataapp.identity.infrastructure.persistence.po.UserAccountPO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface UserAccountMapper {

    @Select("""
        select u.id, u.username, u.display_name, u.status, u.password_hash, r.role_code
        from iam_user u
        left join iam_user_role ur on ur.user_id = u.id
        left join iam_role r on r.id = ur.role_id
        where u.username = #{username}
        """)
    List<UserAccountPO> selectByUsername(String username);
}
