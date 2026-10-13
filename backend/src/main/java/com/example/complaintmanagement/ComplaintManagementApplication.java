package com.example.complaintmanagement;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.LinkedHashSet;
import java.util.Set;

@SpringBootApplication
public class ComplaintManagementApplication {

    @Value("${app.cors.allowed-origin:http://localhost:5173}")
    private String configuredCorsOrigin;

    public static void main(String[] args) {
        SpringApplication.run(ComplaintManagementApplication.class, args);
    }

    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                Set<String> origins = new LinkedHashSet<>();
                // Always allow local Vite development servers
                origins.add("http://localhost:5173");
                origins.add("http://127.0.0.1:5173");

                // Allow production or custom origins configured via environment variable
                if (configuredCorsOrigin != null && !configuredCorsOrigin.isBlank()) {
                    for (String origin : configuredCorsOrigin.split(",")) {
                        String trimmed = origin.trim();
                        if (!trimmed.isEmpty()) {
                            origins.add(trimmed);
                        }
                    }
                }

                registry.addMapping("/api/**")
                        .allowedOrigins(origins.toArray(new String[0]))
                        .allowedMethods("GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS")
                        .allowedHeaders("*");
            }
        };
    }
}
