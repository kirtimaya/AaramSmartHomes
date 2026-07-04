package com.aaramsmarthomes.api.controller.admin;

import com.aaramsmarthomes.api.config.AppProperties;
import com.aaramsmarthomes.api.config.SecurityConfig;
import com.aaramsmarthomes.api.config.UserPrincipalAuthority;
import com.aaramsmarthomes.api.model.Ticket;
import com.aaramsmarthomes.api.model.UserPrincipal;
import com.aaramsmarthomes.api.repository.ExternalServiceFeedbackRepository;
import com.aaramsmarthomes.api.repository.TicketDispatchRepository;
import com.aaramsmarthomes.api.repository.TicketRepository;
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
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = AdminMetricsController.class)
@Import(SecurityConfig.class)
@EnableConfigurationProperties(AppProperties.class)
class AdminMetricsControllerTest {

    @Autowired MockMvc mockMvc;

    @MockBean TicketRepository ticketRepository;
    @MockBean TicketDispatchRepository dispatchRepository;
    @MockBean ExternalServiceFeedbackRepository feedbackRepository;
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
    void tenant_cannot_read_metrics() throws Exception {
        mockMvc.perform(get("/api/admin/metrics/tickets").with(tenantJwt()))
            .andExpect(status().isForbidden());
    }

    @Test
    void admin_can_read_ticket_metrics() throws Exception {
        when(ticketRepository.countByStatus(any(Ticket.TicketStatus.class))).thenReturn(2L);
        when(dispatchRepository.countByStatus(anyString())).thenReturn(1L);

        mockMvc.perform(get("/api/admin/metrics/tickets").with(adminJwt()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.byCoarseStatus.Pending").value(2))
            .andExpect(jsonPath("$.byDispatchStatus.OFFERS_SENT").value(1));
    }

    @Test
    void admin_can_read_external_feedback_metrics() throws Exception {
        when(feedbackRepository.aggregateByService()).thenReturn(java.util.List.of());
        when(feedbackRepository.aggregateByRegion()).thenReturn(java.util.List.of());

        mockMvc.perform(get("/api/admin/metrics/external-feedback").with(adminJwt()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.byService.length()").value(0))
            .andExpect(jsonPath("$.byRegion.length()").value(0));
    }
}
