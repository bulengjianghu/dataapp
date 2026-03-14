package com.dataapp.boot;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(scanBasePackages = "com.dataapp")
public class DataAppApplication {

    public static void main(String[] args) {
        SpringApplication.run(DataAppApplication.class, args);
    }
}
