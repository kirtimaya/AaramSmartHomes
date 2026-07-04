package com.aaramsmarthomes.api.controller.admin;

import com.aaramsmarthomes.api.config.AppProperties;
import com.aaramsmarthomes.api.config.SecurityConfig;
import com.aaramsmarthomes.api.config.UserPrincipalAuthority;
import com.aaramsmarthomes.api.dto.admin.TicketDispatchResponse;
import com.aaramsmarthomes.api.model.TicketDispatch;
import com.aaramsmarthomes.api.model.UserPrincipal;
import com.aaramsmarthomes.api.repository.TicketDispatchRepository;
import com.aaramsmarthomes.api.repository.TicketRepository;
import com.aaramsmarthomes.api.service.FeedbackService;
import com.aaramsmarthomes.api.service.RoleService;
import com.aaramsmarthomes.api.service.TicketDispatchService;
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

import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = AdminTicketController.class)
@Import(SecurityConfig.class)
@EnableConfigurationProperties(AppProperties.class)
class AdminTicketControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @MockBean TicketRepository ticketRepository;
    @MockBean TicketDispatchRepository dispatchRepository;
    @MockBean TicketDispatchService dispatchService;
    @MockBean FeedbackService feedbackService;
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
    void tenant_cannot_list_admin_tickets() throws Exception {
        mockMvc.perform(get("/api/admin/tickets").with(tenantJwt()))
            .andExpect(status().isForbidden());
    }

    @Test
    void admin_can_list_tickets() throws Exception {
        when(ticketRepository.findForAdmin(any(), any())).thenReturn(List.of());

        mockMvc.perform(get("/api/admin/tickets").with(adminJwt()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void admin_can_dispatch_ticket() throws Exception {
        TicketDispatchResponse response = new TicketDispatchResponse(
            "d1", "t1", "OFFERS_SENT", "plumbing", null, null, null, null, false, null, null);
        when(dispatchService.dispatch(org.mockito.ArgumentMatchers.eq("t1"), any())).thenReturn(response);

        String body = objectMapper.writeValueAsString(Map.of(
            "trade", "plumbing",
            "professionalIds", List.of("p1"),
            "slots", List.of(Map.of("id", "s1", "label", "Today 2-4 PM"))));

        mockMvc.perform(post("/api/admin/tickets/t1/dispatch")
                .with(adminJwt())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("OFFERS_SENT"));
    }

    @Test
    void admin_resolve_external_triggers_feedback_request() throws Exception {
        TicketDispatchResponse response = new TicketDispatchResponse(
            "d1", "t1", "RESOLVED_EXTERNALLY", null, null, null, null, "Urban Company", false, null, null);
        when(dispatchService.resolveExternally(org.mockito.ArgumentMatchers.eq("t1"), org.mockito.ArgumentMatchers.eq("Urban Company")))
            .thenReturn(response);
        TicketDispatch dispatchEntity = new TicketDispatch();
        dispatchEntity.setId("d1");
        when(dispatchRepository.findById("d1")).thenReturn(java.util.Optional.of(dispatchEntity));

        String body = objectMapper.writeValueAsString(Map.of("externalService", "Urban Company"));

        mockMvc.perform(post("/api/admin/tickets/t1/resolve-external")
                .with(adminJwt())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("RESOLVED_EXTERNALLY"));

        org.mockito.Mockito.verify(feedbackService).sendFeedbackRequest(dispatchEntity);
    }

    @Test
    void admin_dispatch_rejects_more_than_three_slots() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
            "trade", "plumbing",
            "professionalIds", List.of("p1"),
            "slots", List.of(
                Map.of("id", "s1", "label", "Slot 1"),
                Map.of("id", "s2", "label", "Slot 2"),
                Map.of("id", "s3", "label", "Slot 3"),
                Map.of("id", "s4", "label", "Slot 4"))));

        mockMvc.perform(post("/api/admin/tickets/t1/dispatch")
                .with(adminJwt())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isBadRequest());
    }
}
