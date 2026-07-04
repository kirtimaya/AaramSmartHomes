package com.aaramsmarthomes.api.controller.admin;

import com.aaramsmarthomes.api.config.AppProperties;
import com.aaramsmarthomes.api.config.SecurityConfig;
import com.aaramsmarthomes.api.config.UserPrincipalAuthority;
import com.aaramsmarthomes.api.model.UserPrincipal;
import com.aaramsmarthomes.api.model.WaConversation;
import com.aaramsmarthomes.api.repository.WaConversationRepository;
import com.aaramsmarthomes.api.repository.WaMessageRepository;
import com.aaramsmarthomes.api.service.RoleService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = AdminCookSessionController.class)
@Import(SecurityConfig.class)
@EnableConfigurationProperties(AppProperties.class)
class AdminCookSessionControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @MockBean WaConversationRepository conversationRepository;
    @MockBean WaMessageRepository waMessageRepository;
    @MockBean RoleService roleService;
    @MockBean JwtDecoder jwtDecoder;

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
    void tenant_cannot_list_cook_sessions() throws Exception {
        mockMvc.perform(get("/api/admin/cook-sessions").with(tenantJwt()))
            .andExpect(status().isForbidden());
    }

    @Test
    void admin_can_list_cook_sessions() throws Exception {
        WaConversation conv = new WaConversation();
        conv.setId("conv-1");
        conv.setPhoneE164("+919876543210");
        conv.setFlow("cook_menu");
        conv.setState("AWAIT_RESPONSE");
        when(conversationRepository.findByFlowOrderByCreatedAtDesc("cook_menu")).thenReturn(List.of(conv));

        mockMvc.perform(get("/api/admin/cook-sessions").with(adminJwt()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].id").value("conv-1"));
    }

    @Test
    void admin_can_read_cook_session_messages() throws Exception {
        WaConversation conv = new WaConversation();
        conv.setId("conv-1");
        when(conversationRepository.findById("conv-1")).thenReturn(Optional.of(conv));
        when(waMessageRepository.findByConversationIdOrderByCreatedAtAsc("conv-1")).thenReturn(List.of());

        mockMvc.perform(get("/api/admin/cook-sessions/conv-1/messages").with(adminJwt()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(0));
    }
}
