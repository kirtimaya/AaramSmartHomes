package com.aaramsmarthomes.api.controller.admin;

import com.aaramsmarthomes.api.config.AppProperties;
import com.aaramsmarthomes.api.config.SecurityConfig;
import com.aaramsmarthomes.api.config.UserPrincipalAuthority;
import com.aaramsmarthomes.api.model.DishCatalog;
import com.aaramsmarthomes.api.model.UserPrincipal;
import com.aaramsmarthomes.api.repository.DishCatalogRepository;
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

import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = AdminDishCatalogController.class)
@Import(SecurityConfig.class)
@EnableConfigurationProperties(AppProperties.class)
class AdminDishCatalogControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @MockBean DishCatalogRepository dishCatalogRepository;
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
    void tenant_cannot_create_dish() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of("name", "Idli", "isFallback", false, "fallbackPriority", 0, "active", true));
        mockMvc.perform(post("/api/admin/dishes")
                .with(tenantJwt())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isForbidden());
    }

    @Test
    void admin_can_create_dish() throws Exception {
        DishCatalog saved = new DishCatalog();
        saved.setId("dish-1");
        saved.setName("Idli");
        when(dishCatalogRepository.save(any(DishCatalog.class))).thenReturn(saved);

        String body = objectMapper.writeValueAsString(Map.of("name", "Idli", "isFallback", false, "fallbackPriority", 0, "active", true));

        mockMvc.perform(post("/api/admin/dishes")
                .with(adminJwt())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.name").value("Idli"));

        verify(auditService).record(eq(adminPrincipal), eq("dish.create"), eq("dish"), eq("dish-1"), isNull(), any(), eq("web"));
    }

    @Test
    void admin_can_create_dish_with_nutrition_round_trip() throws Exception {
        when(dishCatalogRepository.save(any(DishCatalog.class))).thenAnswer(inv -> {
            DishCatalog d = inv.getArgument(0);
            d.setId("dish-2");
            return d;
        });

        Map<String, Object> nutrition = Map.ofEntries(
            Map.entry("servingSize", "3 idlis (150g)"),
            Map.entry("calories", 168), Map.entry("protein", 7), Map.entry("carbs", 32),
            Map.entry("fats", 2), Map.entry("fiber", 4.5),
            Map.entry("micros", List.of(Map.of("name", "Calcium", "value", 244, "unit", "mg", "rdv", 1000, "benefit", "Bone health", "color", "#A8C5DA"))),
            Map.entry("wholeSpices", List.of("Fenugreek seeds")),
            Map.entry("benefits", List.of("Naturally gluten-free")),
            Map.entry("cookingTip", "Ferment 10-12 hours"),
            Map.entry("status", "approved")
        );
        Map<String, Object> body = Map.of(
            "name", "Ragi Idli", "isFallback", false, "fallbackPriority", 0, "active", true,
            "nutrition", nutrition
        );

        mockMvc.perform(post("/api/admin/dishes")
                .with(adminJwt())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.nutrition.servingSize").value("3 idlis (150g)"))
            .andExpect(jsonPath("$.nutrition.calories").value(168))
            .andExpect(jsonPath("$.nutrition.status").value("approved"))
            .andExpect(jsonPath("$.nutrition.micros[0].name").value("Calcium"))
            .andExpect(jsonPath("$.nutrition.wholeSpices[0]").value("Fenugreek seeds"));
    }

    @Test
    void create_dish_rejects_invalid_nutrition_status() throws Exception {
        Map<String, Object> body = Map.of(
            "name", "Idli", "isFallback", false, "fallbackPriority", 0, "active", true,
            "nutrition", Map.of("status", "bogus")
        );

        mockMvc.perform(post("/api/admin/dishes")
                .with(adminJwt())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
            .andExpect(status().isBadRequest());
    }

    @Test
    void create_dish_without_nutrition_returns_null_nutrition() throws Exception {
        DishCatalog saved = new DishCatalog();
        saved.setId("dish-3");
        saved.setName("Plain Dish");
        when(dishCatalogRepository.save(any(DishCatalog.class))).thenReturn(saved);

        String body = objectMapper.writeValueAsString(Map.of("name", "Plain Dish", "isFallback", false, "fallbackPriority", 0, "active", true));

        mockMvc.perform(post("/api/admin/dishes")
                .with(adminJwt())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.nutrition").value(org.hamcrest.Matchers.nullValue()));
    }
}
