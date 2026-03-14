package com.dataapp.boot.config;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.context.annotation.Configuration;

@Configuration
@MapperScan({
    "com.dataapp.identity.infrastructure.persistence.mapper",
    "com.dataapp.form.infrastructure.persistence.mapper",
    "com.dataapp.record.infrastructure.persistence.mapper"
})
public class MybatisConfig {
}
