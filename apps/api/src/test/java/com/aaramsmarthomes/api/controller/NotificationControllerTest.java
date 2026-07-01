package com.aaramsmarthomes.api.controller;

import com.aaramsmarthomes.api.config.AppProperties;
import com.aaramsmarthomes.api.config.SecurityConfig;
import com.aaramsmarthomes.api.config.UserPrincipalAuthority;
import com.aaramsmarthomes.api.model.Notification;
import com.aaramsmarthomes.api.model.UserPrincipal;
import com.aaramsmarthomes.api.repository.NotificationRepository;
import com.aaramsmarthomes.api.service.RoleService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = NotificationController.class)
@Import(SecurityConfig.class)
@EnableConfigurationProperties(AppProperties.class)
class NotificationControllerTest {

    @Autowired MockMvc mockMvc;

    @MockBean NotificationRepository notificationRepository;
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
    void get_notifications_returns_list() throws Exception {
        Notification n = new Notification();
        n.setId("notif-1"); n.setUserId("uid-tenant");
        n.setTitle("Rent due"); n.setBody("Your rent is due tomorrow.");
        n.setType("payment"); n.setRead(false);
        when(notificationRepository.findByUserIdOrderByCreatedAtDesc("uid-tenant"))
            .thenReturn(List.of(n));

        mockMvc.perform(get("/api/notifications").with(tenantJwt()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].title").value("Rent due"))
            .andExpect(jsonPath("$[0].read").value(false));
    }

    @Test
    void get_notifications_requires_auth() throws Exception {
        mockMvc.perform(get("/api/notifications"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void mark_all_read_returns_updated_count() throws Exception {
        when(notificationRepository.markAllRead("uid-tenant")).thenReturn(3);

        mockMvc.perform(post("/api/notifications/read-all").with(tenantJwt()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.updated").value(3));
    }

    @Test
    void mark_all_read_requires_auth() throws Exception {
        mockMvc.perform(post("/api/notifications/read-all"))
            .andExpect(status().isUnauthorized());
    }
}
