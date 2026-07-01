package com.aaramsmarthomes.api.controller;

import com.aaramsmarthomes.api.config.AppProperties;
import com.aaramsmarthomes.api.config.SecurityConfig;
import com.aaramsmarthomes.api.config.UserPrincipalAuthority;
import com.aaramsmarthomes.api.model.UserPrincipal;
import com.aaramsmarthomes.api.model.VisitRequest;
import com.aaramsmarthomes.api.repository.VisitRequestRepository;
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

import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = VisitRequestController.class)
@Import(SecurityConfig.class)
@EnableConfigurationProperties(AppProperties.class)
class VisitRequestControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @MockBean VisitRequestRepository visitRepository;
    @MockBean RoleService roleService;
    @MockBean JwtDecoder jwtDecoder;

    private final UserPrincipal guestPrincipal =
        new UserPrincipal("uid-guest", "guest@test.com", UserPrincipal.Role.GUEST);

    @BeforeEach
    void setup() {
        when(roleService.resolve(any())).thenReturn(guestPrincipal);
    }

    private org.springframework.test.web.servlet.request.RequestPostProcessor guestJwt() {
        return jwt()
            .jwt(j -> j.subject("uid-guest").claim("email", "guest@test.com"))
            .authorities(new UserPrincipalAuthority(guestPrincipal));
    }

    @Test
    void create_visit_returns_201() throws Exception {
        VisitRequest saved = new VisitRequest();
        saved.setId("visit-1");
        saved.setRequesterId("uid-guest");
        saved.setRequesterType("guest");
        saved.setPropertyId("prop-1");
        saved.setPreferredDate("2026-07-15");
        when(visitRepository.save(any(VisitRequest.class))).thenReturn(saved);

        String body = objectMapper.writeValueAsString(
            Map.of("propertyId", "prop-1", "preferredDate", "2026-07-15"));

        mockMvc.perform(post("/api/visits")
                .with(guestJwt())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").value("visit-1"))
            .andExpect(jsonPath("$.requesterType").value("guest"))
            .andExpect(jsonPath("$.propertyId").value("prop-1"));
    }

    @Test
    void create_visit_requires_property_id() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of("preferredDate", "2026-07-15"));
        mockMvc.perform(post("/api/visits")
                .with(guestJwt())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isBadRequest());
    }

    @Test
    void create_visit_requires_preferred_date() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of("propertyId", "prop-1"));
        mockMvc.perform(post("/api/visits")
                .with(guestJwt())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isBadRequest());
    }

    @Test
    void get_visits_returns_list() throws Exception {
        VisitRequest v = new VisitRequest();
        v.setId("visit-1"); v.setRequesterId("uid-guest");
        when(visitRepository.findByRequesterIdOrderByCreatedAtDesc("uid-guest"))
            .thenReturn(List.of(v));

        mockMvc.perform(get("/api/visits").with(guestJwt()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    void get_visits_requires_auth() throws Exception {
        mockMvc.perform(get("/api/visits"))
            .andExpect(status().isUnauthorized());
    }
}
