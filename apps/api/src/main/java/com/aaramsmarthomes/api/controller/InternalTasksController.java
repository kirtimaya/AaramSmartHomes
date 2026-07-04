package com.aaramsmarthomes.api.controller;

import com.aaramsmarthomes.api.config.AppProperties;
import com.aaramsmarthomes.api.service.FeedbackAnonymizationService;
import com.aaramsmarthomes.api.service.OutboxProcessor;
import com.aaramsmarthomes.api.service.WaConversationService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;

/**
 * Endpoints invoked by Cloud Scheduler, not by end users — permitted
 * without JWT in SecurityConfig and instead guarded by a shared
 * X-Tasks-Secret header, compared in constant time.
 */
@RestController
@RequestMapping("/api/internal/tasks")
public class InternalTasksController {

    private final AppProperties props;
    private final OutboxProcessor outboxProcessor;
    private final WaConversationService waConversationService;
    private final FeedbackAnonymizationService feedbackAnonymizationService;

    public InternalTasksController(AppProperties props, OutboxProcessor outboxProcessor,
                                    WaConversationService waConversationService,
                                    FeedbackAnonymizationService feedbackAnonymizationService) {
        this.props = props;
        this.outboxProcessor = outboxProcessor;
        this.waConversationService = waConversationService;
        this.feedbackAnonymizationService = feedbackAnonymizationService;
    }

    @PostMapping("/process-outbox")
    public ResponseEntity<Map<String, Object>> processOutbox(
            @RequestHeader(value = "X-Tasks-Secret", required = false) String secret) {
        if (!isAuthorized(secret)) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        int processed = outboxProcessor.processBatch();
        return ResponseEntity.ok(Map.of("processed", processed));
    }

    @PostMapping("/run-timers")
    public ResponseEntity<Map<String, Object>> runTimers(
            @RequestHeader(value = "X-Tasks-Secret", required = false) String secret) {
        if (!isAuthorized(secret)) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        int expiredConversations = waConversationService.expireStaleConversations();
        int expiredFeedbackTokens = feedbackAnonymizationService.expireStaleTokens();
        return ResponseEntity.ok(Map.of(
            "expiredConversations", expiredConversations,
            "expiredFeedbackTokens", expiredFeedbackTokens));
    }

    private boolean isAuthorized(String provided) {
        String expected = props.getTasksSecret();
        if (expected == null || expected.isBlank() || provided == null) return false;
        return MessageDigest.isEqual(
            expected.getBytes(StandardCharsets.UTF_8),
            provided.getBytes(StandardCharsets.UTF_8));
    }
}
