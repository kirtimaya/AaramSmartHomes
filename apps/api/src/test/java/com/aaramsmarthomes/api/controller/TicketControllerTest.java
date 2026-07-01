package com.aaramsmarthomes.api.controller;

import com.aaramsmarthomes.api.config.AppProperties;
import com.aaramsmarthomes.api.config.SecurityConfig;
import com.aaramsmarthomes.api.config.UserPrincipalAuthority;
import com.aaramsmarthomes.api.model.Ticket;
import com.aaramsmarthomes.api.model.UserPrincipal;
import com.aaramsmarthomes.api.repository.TicketRepository;
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

@WebMvcTest(controllers = TicketController.class)
@Import(SecurityConfig.class)
@EnableConfigurationProperties(AppProperties.class)
class TicketControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @MockBean TicketRepository ticketRepository;
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

    // ── POST /api/tickets ─────────────────────────────────────────────────

    @Test
    void create_ticket_returns_201_and_persists() throws Exception {
        Ticket saved = new Ticket();
        saved.setId("ticket-1");
        saved.setRequesterId("uid-tenant");
        saved.setTitle("Tap leaking");
        saved.setCategory("plumbing");
        saved.setPriority(Ticket.TicketPriority.high);
        when(ticketRepository.save(any(Ticket.class))).thenReturn(saved);

        String body = objectMapper.writeValueAsString(
            Map.of("title", "Tap leaking", "category", "plumbing", "priority", "high"));

        mockMvc.perform(post("/api/tickets")
                .with(tenantJwt())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").value("ticket-1"))
            .andExpect(jsonPath("$.requesterId").value("uid-tenant"))
            .andExpect(jsonPath("$.title").value("Tap leaking"))
            .andExpect(jsonPath("$.priority").value("high"));
    }

    @Test
    void create_ticket_requires_title() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of("description", "no title here"));

        mockMvc.perform(post("/api/tickets")
                .with(tenantJwt())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isBadRequest());
    }

    @Test
    void create_ticket_requires_auth() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of("title", "Test"));
        mockMvc.perform(post("/api/tickets")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isUnauthorized());
    }

    // ── GET /api/tickets ──────────────────────────────────────────────────

    @Test
    void get_tickets_returns_list_for_current_user() throws Exception {
        Ticket t1 = new Ticket();
        t1.setId("t1"); t1.setRequesterId("uid-tenant"); t1.setTitle("Leaking tap");
        Ticket t2 = new Ticket();
        t2.setId("t2"); t2.setRequesterId("uid-tenant"); t2.setTitle("AC broken");
        when(ticketRepository.findByRequesterIdOrderByCreatedAtDesc("uid-tenant"))
            .thenReturn(List.of(t1, t2));

        mockMvc.perform(get("/api/tickets").with(tenantJwt()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(2))
            .andExpect(jsonPath("$[0].id").value("t1"))
            .andExpect(jsonPath("$[1].id").value("t2"));
    }

    @Test
    void get_tickets_requires_auth() throws Exception {
        mockMvc.perform(get("/api/tickets"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void get_tickets_returns_empty_list_when_none() throws Exception {
        when(ticketRepository.findByRequesterIdOrderByCreatedAtDesc("uid-tenant"))
            .thenReturn(List.of());

        mockMvc.perform(get("/api/tickets").with(tenantJwt()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(0));
    }
}
