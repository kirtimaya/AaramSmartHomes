package com.aaramsmarthomes.api.controller;

import com.aaramsmarthomes.api.config.AppProperties;
import com.aaramsmarthomes.api.config.SecurityConfig;
import com.aaramsmarthomes.api.config.UserPrincipalAuthority;
import com.aaramsmarthomes.api.model.UserPrincipal;
import com.aaramsmarthomes.api.service.AaraService;
import com.aaramsmarthomes.api.service.RoleService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = AaraController.class)
@Import(SecurityConfig.class)
@EnableConfigurationProperties(AppProperties.class)
class AaraControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @MockBean AaraService aaraService;
    @MockBean RoleService roleService;
    @MockBean JwtDecoder jwtDecoder;

    private final UserPrincipal tenantPrincipal =
        new UserPrincipal("uid-tenant", "tenant@test.com", UserPrincipal.Role.TENANT);

    @BeforeEach
    void setup() {
        when(roleService.resolve(any())).thenReturn(tenantPrincipal);
    }

    private org.springframework.test.web.servlet.request.RequestPostProcessor tenantJwt() {
        return jwt()
            .jwt(j -> j.subject("uid-tenant").claim("email", "tenant@test.com"))
            .authorities(new UserPrincipalAuthority(tenantPrincipal));
    }

    @Test
    void chat_returns_reply_with_role() throws Exception {
        when(aaraService.chat(eq("How do I raise a maintenance ticket?"), isNull(), any()))
            .thenReturn("Go to your portal, tap 'New Ticket', fill in the details and submit.");

        String body = objectMapper.writeValueAsString(
            Map.of("message", "How do I raise a maintenance ticket?"));

        mockMvc.perform(post("/api/aara")
                .with(tenantJwt())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.reply").value("Go to your portal, tap 'New Ticket', fill in the details and submit."))
            .andExpect(jsonPath("$.role").value("tenant"));
    }

    @Test
    void chat_passes_context_to_service() throws Exception {
        when(aaraService.chat(eq("What's the status?"), eq("Room 4B, AC issue"), any()))
            .thenReturn("Your ticket for Room 4B AC is under review.");

        String body = objectMapper.writeValueAsString(
            Map.of("message", "What's the status?", "context", "Room 4B, AC issue"));

        mockMvc.perform(post("/api/aara")
                .with(tenantJwt())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.reply").value("Your ticket for Room 4B AC is under review."));
    }

    @Test
    void chat_requires_message_field() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of("context", "some context"));

        mockMvc.perform(post("/api/aara")
                .with(tenantJwt())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isBadRequest());
    }

    @Test
    void chat_requires_auth() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of("message", "Hello"));
        mockMvc.perform(post("/api/aara")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void chat_reflects_admin_role() throws Exception {
        UserPrincipal adminPrincipal = new UserPrincipal("uid-admin", "admin@test.com", UserPrincipal.Role.ADMIN);
        when(roleService.resolve(any())).thenReturn(adminPrincipal);
        when(aaraService.chat(any(), any(), any())).thenReturn("Admin dashboard summary here.");

        String body = objectMapper.writeValueAsString(Map.of("message", "Summarize financials"));

        mockMvc.perform(post("/api/aara")
                .with(jwt()
                    .jwt(j -> j.subject("uid-admin").claim("email", "admin@test.com"))
                    .authorities(new UserPrincipalAuthority(adminPrincipal)))
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.role").value("admin"));
    }
}
