package com.dataapp.identity.infrastructure.persistence.repository;

import com.dataapp.identity.domain.model.UserAccount;
import com.dataapp.identity.domain.repository.UserAccountRepository;
import com.dataapp.identity.infrastructure.persistence.mapper.UserAccountMapper;
import com.dataapp.identity.infrastructure.persistence.po.UserAccountPO;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Objects;

@Repository
public class UserAccountRepositoryImpl implements UserAccountRepository {

    private final UserAccountMapper userAccountMapper;

    public UserAccountRepositoryImpl(UserAccountMapper userAccountMapper) {
        this.userAccountMapper = userAccountMapper;
    }

    @Override
    public UserAccount findByUsername(String username) {
        List<UserAccountPO> rows = userAccountMapper.selectByUsername(username);
        if (rows == null || rows.isEmpty()) {
            return null;
        }
        UserAccountPO first = rows.getFirst();
        List<String> roles = rows.stream()
            .map(UserAccountPO::getRoleCode)
            .filter(Objects::nonNull)
            .distinct()
            .toList();
        return new UserAccount(
            first.getId(),
            first.getUsername(),
            first.getDisplayName(),
            first.getStatus(),
            first.getPasswordHash(),
            roles
        );
    }
}
