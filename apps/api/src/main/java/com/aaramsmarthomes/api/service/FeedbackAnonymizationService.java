package com.aaramsmarthomes.api.service;

import com.aaramsmarthomes.api.model.ExternalServiceFeedback;
import com.aaramsmarthomes.api.model.FeedbackFlowToken;
import com.aaramsmarthomes.api.model.Ticket;
import com.aaramsmarthomes.api.model.TicketDispatch;
import com.aaramsmarthomes.api.model.WaMessage;
import com.aaramsmarthomes.api.repository.ExternalServiceFeedbackRepository;
import com.aaramsmarthomes.api.repository.FeedbackFlowTokenRepository;
import com.aaramsmarthomes.api.repository.TicketDispatchRepository;
import com.aaramsmarthomes.api.repository.TicketRepository;
import com.aaramsmarthomes.api.repository.WaMessageRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

/**
 * The single write path into external_service_feedback. Resolves
 * token → dispatch → ticket → property/region ONCE, writes only the metric
 * tokens plus the abstract property/region, then deletes the token and
 * purges every wa_messages row tied to the ticket — nothing survives that
 * could re-link a feedback row back to a person.
 */
@Service
public class FeedbackAnonymizationService {

    private static final Logger log = LoggerFactory.getLogger(FeedbackAnonymizationService.class);

    private final FeedbackFlowTokenRepository tokenRepository;
    private final ExternalServiceFeedbackRepository feedbackRepository;
    private final TicketDispatchRepository dispatchRepository;
    private final TicketRepository ticketRepository;
    private final TicketDispatchService ticketDispatchService;
    private final WaMessageRepository waMessageRepository;
    private final OutboxService outboxService;
    private final JdbcTemplate jdbc;

    public FeedbackAnonymizationService(FeedbackFlowTokenRepository tokenRepository,
                                         ExternalServiceFeedbackRepository feedbackRepository,
                                         TicketDispatchRepository dispatchRepository,
                                         TicketRepository ticketRepository,
                                         TicketDispatchService ticketDispatchService,
                                         WaMessageRepository waMessageRepository,
                                         OutboxService outboxService,
                                         JdbcTemplate jdbc) {
        this.tokenRepository = tokenRepository;
        this.feedbackRepository = feedbackRepository;
        this.dispatchRepository = dispatchRepository;
        this.ticketRepository = ticketRepository;
        this.ticketDispatchService = ticketDispatchService;
        this.waMessageRepository = waMessageRepository;
        this.outboxService = outboxService;
        this.jdbc = jdbc;
    }

    public record SubmittedFeedback(String serviceUsed, int costScore, int speedScore, boolean consent) {}

    @Transactional
    public void recordSubmission(String token, SubmittedFeedback submission) {
        FeedbackFlowToken tokenRow = tokenRepository.findById(token).orElse(null);
        if (tokenRow == null) {
            log.warn("Feedback submitted with an unknown or already-consumed token — discarding");
            return;
        }
        String dispatchId = tokenRow.getDispatchId();
        tokenRepository.deleteById(token);

        if (!submission.consent()) {
            log.info("Feedback submitted without consent for dispatch {} — no row written", dispatchId);
            closeAndPurge(dispatchId, false);
            return;
        }

        TicketDispatch dispatch = dispatchRepository.findById(dispatchId).orElse(null);
        Ticket ticket = dispatch != null ? ticketRepository.findById(dispatch.getTicketId()).orElse(null) : null;

        ExternalServiceFeedback feedback = new ExternalServiceFeedback();
        feedback.setServiceUsed(submission.serviceUsed());
        feedback.setCostScore(submission.costScore());
        feedback.setSpeedScore(submission.speedScore());
        feedback.setConsent(true);
        if (ticket != null) {
            feedback.setTicketCategory(ticket.getCategory());
            if (ticket.getRoomId() != null) resolvePropertyAndRegion(ticket.getRoomId(), feedback);
        }
        feedbackRepository.save(feedback);

        closeAndPurge(dispatchId, true);
    }

    @Transactional
    public void expireToken(String token) {
        tokenRepository.findById(token).ifPresent(tokenRow -> {
            tokenRepository.deleteById(token);
            closeAndPurge(tokenRow.getDispatchId(), false);
        });
    }

    /** Periodic sweep (see InternalTasksController#runTimers) for tokens whose 72h window
     *  passed without a submission — closes those dispatches with feedback_received=false. */
    @Transactional
    public int expireStaleTokens() {
        List<FeedbackFlowToken> expired = tokenRepository.findByExpiresAtBefore(OffsetDateTime.now());
        for (FeedbackFlowToken tokenRow : expired) {
            expireToken(tokenRow.getToken());
        }
        return expired.size();
    }

    private void closeAndPurge(String dispatchId, boolean received) {
        ticketDispatchService.markFeedbackReceivedAndClose(dispatchId, received);
        outboxService.enqueue("FEEDBACK_PURGE", "ticket_dispatch", dispatchId, Map.of());
    }

    /** Called by the FEEDBACK_PURGE outbox handler — nulls payload/phone on every wa_messages
     *  row tied to the ticket behind this dispatch, so no transcript survives that could be
     *  correlated with the anonymized feedback row. */
    @Transactional
    public void purgeMessagesForDispatch(String dispatchId) {
        TicketDispatch dispatch = dispatchRepository.findById(dispatchId).orElse(null);
        if (dispatch == null) return;
        List<WaMessage> messages = waMessageRepository.findByTicketIdOrderByCreatedAtAsc(dispatch.getTicketId());
        for (WaMessage message : messages) {
            message.setPayload(null);
            message.setPhoneE164(null);
            message.setPurgedAt(OffsetDateTime.now());
            waMessageRepository.save(message);
        }
    }

    private void resolvePropertyAndRegion(String roomId, ExternalServiceFeedback feedback) {
        List<Map<String, Object>> rows = jdbc.queryForList(
            "SELECT p.id::text AS property_id, p.region AS region FROM rooms r JOIN properties p ON r.property_id = p.id WHERE r.id = ?::uuid",
            roomId);
        if (!rows.isEmpty()) {
            feedback.setPropertyId((String) rows.get(0).get("property_id"));
            feedback.setRegion((String) rows.get(0).get("region"));
        }
    }
}
