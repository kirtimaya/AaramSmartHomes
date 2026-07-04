package com.aaramsmarthomes.api.controller;

import com.aaramsmarthomes.api.config.AppProperties;
import com.aaramsmarthomes.api.config.SecurityConfig;
import com.aaramsmarthomes.api.service.FeedbackAnonymizationService;
import com.aaramsmarthomes.api.service.OutboxProcessor;
import com.aaramsmarthomes.api.service.RoleService;
import com.aaramsmarthomes.api.service.WaConversationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = InternalTasksController.class)
@Import(SecurityConfig.class)
@EnableConfigurationProperties(AppProperties.class)
@TestPropertySource(properties = "app.tasks-secret=test-tasks-secret")
class InternalTasksControllerTest {

    @Autowired MockMvc mockMvc;

    @MockBean OutboxProcessor outboxProcessor;
    @MockBean WaConversationService waConversationService;
    @MockBean FeedbackAnonymizationService feedbackAnonymizationService;
    @MockBean RoleService roleService;
    @MockBean JwtDecoder jwtDecoder;

    @Test
    void process_outbox_rejects_missing_secret() throws Exception {
        mockMvc.perform(post("/api/internal/tasks/process-outbox"))
            .andExpect(status().isUnauthorized());
        verifyNoInteractions(outboxProcessor);
    }

    @Test
    void process_outbox_rejects_wrong_secret() throws Exception {
        mockMvc.perform(post("/api/internal/tasks/process-outbox")
                .header("X-Tasks-Secret", "wrong-secret"))
            .andExpect(status().isUnauthorized());
        verifyNoInteractions(outboxProcessor);
    }

    @Test
    void process_outbox_runs_with_correct_secret_and_no_jwt() throws Exception {
        when(outboxProcessor.processBatch()).thenReturn(3);

        mockMvc.perform(post("/api/internal/tasks/process-outbox")
                .header("X-Tasks-Secret", "test-tasks-secret"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.processed").value(3));

        verify(outboxProcessor).processBatch();
    }

    @Test
    void run_timers_rejects_missing_secret() throws Exception {
        mockMvc.perform(post("/api/internal/tasks/run-timers"))
            .andExpect(status().isUnauthorized());
        verifyNoInteractions(waConversationService);
    }

    @Test
    void run_timers_runs_with_correct_secret() throws Exception {
        when(waConversationService.expireStaleConversations()).thenReturn(2);
        when(feedbackAnonymizationService.expireStaleTokens()).thenReturn(1);

        mockMvc.perform(post("/api/internal/tasks/run-timers")
                .header("X-Tasks-Secret", "test-tasks-secret"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.expiredConversations").value(2))
            .andExpect(jsonPath("$.expiredFeedbackTokens").value(1));
    }
}
