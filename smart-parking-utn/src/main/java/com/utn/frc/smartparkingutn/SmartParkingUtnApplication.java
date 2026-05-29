package com.utn.frc.smartparkingutn;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class SmartParkingUtnApplication {

    public static void main(String[] args) {
        SpringApplication.run(SmartParkingUtnApplication.class, args);
    }

}
