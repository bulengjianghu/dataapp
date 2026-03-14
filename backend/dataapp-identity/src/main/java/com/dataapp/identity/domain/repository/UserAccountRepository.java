package com.dataapp.identity.domain.repository;

import com.dataapp.identity.domain.model.UserAccount;

public interface UserAccountRepository {

    UserAccount findByUsername(String username);
}
