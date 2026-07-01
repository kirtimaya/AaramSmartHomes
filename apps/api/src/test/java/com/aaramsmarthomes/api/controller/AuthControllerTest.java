package com.aaramsmarthomes.api.controller;

import com.aaramsmarthomes.api.config.AppProperties;
import com.aaramsmarthomes.api.config.SecurityConfig;
import com.aaramsmarthomes.api.config.UserPrincipalAuthority;
import com.aaramsmarthomes.api.model.UserPrincipal;
import com.aaramsmarthomes.api.service.RoleService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = {AuthController.class, HealthController.class})
@Import(SecurityConfig.class)
@EnableConfigurationProperties(AppProperties.class)
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private RoleService roleService;

    @MockBean
    private JwtDecoder jwtDecoder;

    // ── /api/health is open (no auth) ──────────────────────────────────────

    @Test
    void health_returns_ok_without_auth() throws Exception {
        mockMvc.perform(get("/api/health"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("ok"))
            .andExpect(jsonPath("$.service").value("aaram-api"));
    }

    // ── /api/auth/me requires JWT ──────────────────────────────────────────

    @Test
    void me_returns_401_without_token() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void me_returns_admin_role_for_admin_user() throws Exception {
        UserPrincipal adminPrincipal = new UserPrincipal("uid-admin", "admin@test.com", UserPrincipal.Role.ADMIN);
        when(roleService.resolve(any(Jwt.class))).thenReturn(adminPrincipal);

        mockMvc.perform(get("/api/auth/me")
                .with(jwt()
                    .jwt(j -> j.subject("uid-admin")
                        .claim("email", "admin@test.com")
                        .issuedAt(Instant.now())
                        .expiresAt(Instant.now().plusSeconds(3600)))
                    .authorities(new UserPrincipalAuthority(adminPrincipal))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.userId").value("uid-admin"))
            .andExpect(jsonPath("$.email").value("admin@test.com"))
            .andExpect(jsonPath("$.role").value("admin"));
    }

    @Test
    void me_returns_tenant_role_for_tenant_user() throws Exception {
        UserPrincipal tenantPrincipal = new UserPrincipal("uid-tenant", "tenant@test.com", UserPrincipal.Role.TENANT);
        when(roleService.resolve(any(Jwt.class))).thenReturn(tenantPrincipal);

        mockMvc.perform(get("/api/auth/me")
                .with(jwt()
                    .jwt(j -> j.subject("uid-tenant")
                        .claim("email", "tenant@test.com"))
                    .authorities(new UserPrincipalAuthority(tenantPrincipal))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.role").value("tenant"));
    }

    @Test
    void me_returns_guest_role_for_unknown_user() throws Exception {
        UserPrincipal guestPrincipal = new UserPrincipal("uid-guest", "guest@test.com", UserPrincipal.Role.GUEST);
        when(roleService.resolve(any(Jwt.class))).thenReturn(guestPrincipal);

        mockMvc.perform(get("/api/auth/me")
                .with(jwt()
                    .jwt(j -> j.subject("uid-guest")
                        .claim("email", "guest@test.com"))
                    .authorities(new UserPrincipalAuthority(guestPrincipal))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.role").value("guest"));
    }

    @Test
    void me_handles_null_email_in_jwt() throws Exception {
        UserPrincipal guestPrincipal = new UserPrincipal("uid-noemail", null, UserPrincipal.Role.GUEST);
        when(roleService.resolve(any(Jwt.class))).thenReturn(guestPrincipal);

        mockMvc.perform(get("/api/auth/me")
                .with(jwt()
                    .jwt(j -> j.subject("uid-noemail"))
                    .authorities(new UserPrincipalAuthority(guestPrincipal))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.email").value(""))
            .andExpect(jsonPath("$.role").value("guest"));
    }
}
