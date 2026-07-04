package com.aaramsmarthomes.api.controller.admin;

import com.aaramsmarthomes.api.config.AppProperties;
import com.aaramsmarthomes.api.config.SecurityConfig;
import com.aaramsmarthomes.api.config.UserPrincipalAuthority;
import com.aaramsmarthomes.api.dto.admin.MenuResponse;
import com.aaramsmarthomes.api.model.UserPrincipal;
import com.aaramsmarthomes.api.service.AuditService;
import com.aaramsmarthomes.api.service.MenuService;
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

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = AdminMenuController.class)
@Import(SecurityConfig.class)
@EnableConfigurationProperties(AppProperties.class)
class AdminMenuControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @MockBean MenuService menuService;
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
    void tenant_cannot_list_menus() throws Exception {
        mockMvc.perform(get("/api/admin/menus")
                .param("from", "2026-07-01").param("to", "2026-07-07")
                .with(tenantJwt()))
            .andExpect(status().isForbidden());
    }

    @Test
    void listing_menus_does_not_write_audit() throws Exception {
        when(menuService.findRange(any(), any())).thenReturn(List.of());

        mockMvc.perform(get("/api/admin/menus")
                .param("from", "2026-07-01").param("to", "2026-07-07")
                .with(adminJwt()))
            .andExpect(status().isOk());

        verify(auditService, never()).record(any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void admin_can_list_menus() throws Exception {
        when(menuService.findRange(any(), any())).thenReturn(List.of());

        mockMvc.perform(get("/api/admin/menus")
                .param("from", "2026-07-01").param("to", "2026-07-07")
                .with(adminJwt()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void admin_can_upsert_menu() throws Exception {
        MenuResponse response = new MenuResponse("menu-1", LocalDate.of(2026, 7, 3), "Breakfast", "notes", List.of(), List.of(), null);
        when(menuService.findRange(any(), any())).thenReturn(List.of());
        when(menuService.upsert(any())).thenReturn(response);

        String body = objectMapper.writeValueAsString(Map.of(
            "date", "2026-07-03", "mealBlock", "Breakfast", "notes", "notes",
            "items", List.of(Map.of("itemName", "Idli", "sortOrder", 1)),
            "ingredients", List.of()));

        mockMvc.perform(put("/api/admin/menus")
                .with(adminJwt())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value("menu-1"))
            .andExpect(jsonPath("$.mealBlock").value("Breakfast"));

        verify(auditService).record(eq(adminPrincipal), eq("menu.upsert"), eq("menu"), eq("menu-1"), isNull(), eq(response), eq("web"));
    }

    @Test
    void upsert_from_mobile_records_mobile_source() throws Exception {
        MenuResponse response = new MenuResponse("menu-1", LocalDate.of(2026, 7, 3), "Breakfast", "notes", List.of(), List.of(), null);
        when(menuService.findRange(any(), any())).thenReturn(List.of());
        when(menuService.upsert(any())).thenReturn(response);

        String body = objectMapper.writeValueAsString(Map.of(
            "date", "2026-07-03", "mealBlock", "Breakfast",
            "items", List.of(), "ingredients", List.of()));

        mockMvc.perform(put("/api/admin/menus")
                .with(adminJwt())
                .header("X-Client-Source", "mobile")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isOk());

        verify(auditService).record(eq(adminPrincipal), eq("menu.upsert"), eq("menu"), eq("menu-1"), any(), any(), eq("mobile"));
    }

    @Test
    void unauthenticated_request_is_rejected() throws Exception {
        mockMvc.perform(get("/api/admin/menus").param("from", "2026-07-01").param("to", "2026-07-07"))
            .andExpect(status().isUnauthorized());
    }
}
