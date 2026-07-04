package com.aaramsmarthomes.api.service;

import com.aaramsmarthomes.api.dto.webhook.WhatsAppMessage;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Claims and processes outbox_events rows. Claiming uses a raw JdbcTemplate
 * UPDATE ... WHERE id IN (SELECT ... FOR UPDATE SKIP LOCKED) RETURNING —
 * expressing atomic claim-with-lock-skip isn't something Spring Data JPA
 * repositories do well, and this is the one place in the outbox where it
 * matters (multiple Cloud Run instances may poll concurrently).
 *
 * Triggered both by a local @Scheduled tick (belt) and by Cloud Scheduler
 * hitting /api/internal/tasks/process-outbox (suspenders — Cloud Run may
 * scale this instance away between local ticks).
 */
@Service
public class OutboxProcessor {

    private static final Logger log = LoggerFactory.getLogger(OutboxProcessor.class);
    private static final int BATCH_SIZE = 10;
    private static final int MAX_ATTEMPTS = 6;
    private static final int[] BACKOFF_MINUTES = {1, 2, 4, 8, 16};

    private final JdbcTemplate jdbc;
    private final ObjectMapper objectMapper;
    private final WaInboundRouter waInboundRouter;
    private final TicketDispatchService ticketDispatchService;
    private final FeedbackAnonymizationService feedbackAnonymizationService;
    private final String instanceId = UUID.randomUUID().toString();

    public OutboxProcessor(JdbcTemplate jdbc, ObjectMapper objectMapper, WaInboundRouter waInboundRouter,
                            TicketDispatchService ticketDispatchService,
                            FeedbackAnonymizationService feedbackAnonymizationService) {
        this.jdbc = jdbc;
        this.objectMapper = objectMapper;
        this.waInboundRouter = waInboundRouter;
        this.ticketDispatchService = ticketDispatchService;
        this.feedbackAnonymizationService = feedbackAnonymizationService;
    }

    public record ClaimedEvent(String id, String eventType, String aggregateType, String aggregateId, String payload, int attempts) {}

    @Scheduled(fixedDelay = 5000)
    public void tick() {
        processBatch();
    }

    public int processBatch() {
        List<ClaimedEvent> claimed = claimBatch();
        for (ClaimedEvent event : claimed) {
            processOne(event);
        }
        return claimed.size();
    }

    private List<ClaimedEvent> claimBatch() {
        String sql = """
            UPDATE outbox_events
            SET status = 'PROCESSING', locked_by = ?, locked_until = ?
            WHERE id IN (
                SELECT id FROM outbox_events
                WHERE status IN ('PENDING', 'FAILED') AND next_attempt_at <= ?
                ORDER BY created_at
                LIMIT ?
                FOR UPDATE SKIP LOCKED
            )
            RETURNING id::text, event_type, aggregate_type, aggregate_id::text, payload::text, attempts
            """;
        OffsetDateTime now = OffsetDateTime.now();
        Timestamp lockUntil = Timestamp.from(now.plusMinutes(2).toInstant());
        RowMapper<ClaimedEvent> mapper = (rs, i) -> new ClaimedEvent(
            rs.getString("id"), rs.getString("event_type"), rs.getString("aggregate_type"),
            rs.getString("aggregate_id"), rs.getString("payload"), rs.getInt("attempts"));
        return jdbc.query(sql, mapper, instanceId, lockUntil, Timestamp.from(now.toInstant()), BATCH_SIZE);
    }

    private void processOne(ClaimedEvent event) {
        try {
            dispatch(event);
            markDone(event.id());
        } catch (Exception e) {
            log.error("Outbox event {} ({}) failed on attempt {}", event.id(), event.eventType(), event.attempts() + 1, e);
            markFailed(event.id(), event.attempts() + 1, e.getMessage());
        }
    }

    private void dispatch(ClaimedEvent event) throws Exception {
        switch (event.eventType()) {
            case "WA_INBOUND" -> {
                JsonNode payload = objectMapper.readTree(event.payload());
                String phone = payload.path("phone").asText();
                WhatsAppMessage message = objectMapper.treeToValue(payload.path("message"), WhatsAppMessage.class);
                waInboundRouter.route(phone, message);
            }
            case "DISPATCH_OFFER_EXPIRE" -> ticketDispatchService.expireOffer(event.aggregateId());
            case "CONFIRMATION_TIMEOUT" -> ticketDispatchService.expireConfirmation(event.aggregateId());
            case "FEEDBACK_PURGE" -> feedbackAnonymizationService.purgeMessagesForDispatch(event.aggregateId());
            default -> log.warn("No handler registered for outbox event type {}", event.eventType());
        }
    }

    private void markDone(String id) {
        jdbc.update("UPDATE outbox_events SET status = 'DONE', processed_at = NOW(), locked_by = NULL, locked_until = NULL WHERE id = ?::uuid", id);
    }

    private void markFailed(String id, int attempts, String error) {
        if (attempts >= MAX_ATTEMPTS) {
            jdbc.update("UPDATE outbox_events SET status = 'DEAD', attempts = ?, last_error = ?, locked_by = NULL, locked_until = NULL WHERE id = ?::uuid",
                attempts, truncate(error), id);
            return;
        }
        int backoffMinutes = BACKOFF_MINUTES[Math.min(attempts - 1, BACKOFF_MINUTES.length - 1)];
        jdbc.update("""
            UPDATE outbox_events
            SET status = 'FAILED', attempts = ?, last_error = ?, next_attempt_at = NOW() + (? || ' minutes')::interval,
                locked_by = NULL, locked_until = NULL
            WHERE id = ?::uuid
            """, attempts, truncate(error), backoffMinutes, id);
    }

    private String truncate(String s) {
        if (s == null) return null;
        return s.length() > 2000 ? s.substring(0, 2000) : s;
    }
}
