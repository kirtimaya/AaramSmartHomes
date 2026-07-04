package com.aaramsmarthomes.api.service;

import com.aaramsmarthomes.api.dto.webhook.WhatsAppNfmReply;
import com.aaramsmarthomes.api.model.FeedbackFlowToken;
import com.aaramsmarthomes.api.model.Ticket;
import com.aaramsmarthomes.api.model.TicketDispatch;
import com.aaramsmarthomes.api.repository.FeedbackFlowTokenRepository;
import com.aaramsmarthomes.api.repository.TicketRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

/**
 * Sends the anonymous-feedback WhatsApp Flow after a ticket is marked
 * "resolved externally", and parses the Flow's submission. Minting a token
 * is the ONLY place a feedback submission can be traced back to a dispatch
 * — FeedbackAnonymizationService deletes that link the moment a submission
 * (or the token's 72h expiry) arrives.
 */
@Service
public class FeedbackService {

    private static final Logger log = LoggerFactory.getLogger(FeedbackService.class);
    private static final int TOKEN_TTL_HOURS = 72;

    private final FeedbackFlowTokenRepository tokenRepository;
    private final TicketRepository ticketRepository;
    private final WaConversationService waConversationService;
    private final WhatsAppService whatsAppService;
    private final FeedbackAnonymizationService anonymizationService;
    private final ObjectMapper objectMapper;

    public FeedbackService(FeedbackFlowTokenRepository tokenRepository, TicketRepository ticketRepository,
                            WaConversationService waConversationService, WhatsAppService whatsAppService,
                            FeedbackAnonymizationService anonymizationService, ObjectMapper objectMapper) {
        this.tokenRepository = tokenRepository;
        this.ticketRepository = ticketRepository;
        this.waConversationService = waConversationService;
        this.whatsAppService = whatsAppService;
        this.anonymizationService = anonymizationService;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public void sendFeedbackRequest(TicketDispatch dispatch) {
        Ticket ticket = ticketRepository.findById(dispatch.getTicketId()).orElse(null);
        if (ticket == null) {
            log.warn("No ticket found for dispatch {} — cannot send feedback request", dispatch.getId());
            return;
        }
        String phone = waConversationService.resolvePhoneForRequester(ticket.getRequesterId(), ticket.getRequesterType());
        if (phone == null) {
            log.warn("No phone on file for ticket {} requester — cannot send feedback request", ticket.getId());
            return;
        }

        FeedbackFlowToken token = new FeedbackFlowToken();
        token.setDispatchId(dispatch.getId());
        token.setExpiresAt(OffsetDateTime.now().plusHours(TOKEN_TTL_HOURS));
        FeedbackFlowToken saved = tokenRepository.save(token);

        String body = "Your ticket was resolved via " + dispatch.getExternalService()
            + ". 30 seconds of anonymous feedback helps your neighbours.";
        whatsAppService.sendFlow(phone, body, saved.getToken(), "Give feedback");
    }

    /** response_json is itself a JSON-encoded string (Meta's convention) containing the
     *  submitted screen's field values plus the echoed flow_token. Field names here must match
     *  the published Flow's component names: service_used, cost_score, speed_score, consent. */
    public void handleFlowSubmission(WhatsAppNfmReply nfmReply) {
        try {
            JsonNode fields = objectMapper.readTree(nfmReply.responseJson());
            String token = fields.path("flow_token").asText(null);
            if (token == null) {
                log.warn("Flow submission had no flow_token, discarding");
                return;
            }
            var submission = new FeedbackAnonymizationService.SubmittedFeedback(
                fields.path("service_used").asText(null),
                fields.path("cost_score").asInt(0),
                fields.path("speed_score").asInt(0),
                hasConsent(fields.path("consent")));
            anonymizationService.recordSubmission(token, submission);
        } catch (Exception e) {
            log.error("Failed to parse feedback Flow submission", e);
        }
    }

    /** Meta's CheckboxGroup always submits an array of selected option ids (e.g. ["granted"]),
     *  never a bare boolean — even for a single-option "I consent" checkbox. */
    private boolean hasConsent(JsonNode consentNode) {
        return consentNode.isArray() && !consentNode.isEmpty();
    }
}
