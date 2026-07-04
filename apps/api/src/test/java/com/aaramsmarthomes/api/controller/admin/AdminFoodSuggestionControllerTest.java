package com.aaramsmarthomes.api.controller.admin;

import com.aaramsmarthomes.api.config.AppProperties;
import com.aaramsmarthomes.api.config.SecurityConfig;
import com.aaramsmarthomes.api.config.UserPrincipalAuthority;
import com.aaramsmarthomes.api.model.FoodSuggestion;
import com.aaramsmarthomes.api.model.UserPrincipal;
import com.aaramsmarthomes.api.repository.FoodSuggestionRepository;
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
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = AdminFoodSuggestionController.class)
@Import(SecurityConfig.class)
@EnableConfigurationProperties(AppProperties.class)
class AdminFoodSuggestionControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @MockBean FoodSuggestionRepository foodSuggestionRepository;
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
    void tenant_cannot_update_suggestion() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of("status", "noted"));
        mockMvc.perform(patch("/api/admin/food-suggestions/sugg-1")
                .with(tenantJwt())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isForbidden());
    }

    @Test
    void admin_can_update_suggestion_status() throws Exception {
        FoodSuggestion suggestion = new FoodSuggestion();
        suggestion.setId("sugg-1");
        suggestion.setSuggestion("more paneer please");
        suggestion.setStatus("pending");
        when(foodSuggestionRepository.findById("sugg-1")).thenReturn(Optional.of(suggestion));
        when(foodSuggestionRepository.save(any(FoodSuggestion.class))).thenAnswer(inv -> inv.getArgument(0));

        String body = objectMapper.writeValueAsString(Map.of("status", "noted", "adminNote", "will consider"));

        mockMvc.perform(patch("/api/admin/food-suggestions/sugg-1")
                .with(adminJwt())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("noted"))
            .andExpect(jsonPath("$.adminNote").value("will consider"));
    }
}
