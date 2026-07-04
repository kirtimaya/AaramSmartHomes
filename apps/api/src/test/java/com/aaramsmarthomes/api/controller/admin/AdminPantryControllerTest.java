package com.aaramsmarthomes.api.controller.admin;

import com.aaramsmarthomes.api.config.AppProperties;
import com.aaramsmarthomes.api.config.SecurityConfig;
import com.aaramsmarthomes.api.config.UserPrincipalAuthority;
import com.aaramsmarthomes.api.model.PantryItem;
import com.aaramsmarthomes.api.model.UserPrincipal;
import com.aaramsmarthomes.api.repository.PantryItemRepository;
import com.aaramsmarthomes.api.service.AuditService;
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
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = AdminPantryController.class)
@Import(SecurityConfig.class)
@EnableConfigurationProperties(AppProperties.class)
class AdminPantryControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @MockBean PantryItemRepository pantryItemRepository;
    @MockBean RoleService roleService;
    @MockBean JwtDecoder jwtDecoder;
    @MockBean AuditService auditService;

    private final UserPrincipal tenantPrincipal = new UserPrincipal("uid-tenant", "tenant@test.com", UserPrincipal.Role.TENANT);
    private final UserPrincipal adminPrincipal = new UserPrincipal("uid-admin", "admin@test.com", UserPrincipal.Role.ADMIN);

    @BeforeEach
    void setup() {
        when(roleService.resolve(any())).thenReturn(tenantPrincipal);
    }

    private RequestPostProcessor tenantJwt() {
        return jwt().jwt(j -> j.subject("uid-tenant").claim("email", "tenant@test.com"))
            .authorities(new UserPrincipalAuthority(tenantPrincipal));
    }

    private RequestPostProcessor adminJwt() {
        return jwt().jwt(j -> j.subject("uid-admin").claim("email", "admin@test.com"))
            .authorities(new UserPrincipalAuthority(adminPrincipal));
    }

    @Test
    void tenant_cannot_create_pantry_item() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of("name", "Rice", "status", "In Stock"));
        mockMvc.perform(post("/api/admin/pantry")
                .with(tenantJwt())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isForbidden());
    }

    @Test
    void admin_can_create_pantry_item() throws Exception {
        PantryItem saved = new PantryItem();
        saved.setId("pantry-1");
        saved.setName("Rice");
        saved.setStatus("In Stock");
        when(pantryItemRepository.save(any(PantryItem.class))).thenReturn(saved);

        String body = objectMapper.writeValueAsString(Map.of("name", "Rice", "status", "In Stock"));

        mockMvc.perform(post("/api/admin/pantry")
                .with(adminJwt())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").value("pantry-1"))
            .andExpect(jsonPath("$.name").value("Rice"));

        verify(auditService).record(eq(adminPrincipal), eq("pantry_item.create"), eq("pantry_item"), eq("pantry-1"), isNull(), any(), eq("web"));
    }

    @Test
    void admin_create_requires_name() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of("status", "In Stock"));
        mockMvc.perform(post("/api/admin/pantry")
                .with(adminJwt())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isBadRequest());
    }
}
