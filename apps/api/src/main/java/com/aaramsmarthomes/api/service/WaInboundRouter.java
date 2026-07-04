package com.aaramsmarthomes.api.service;

import com.aaramsmarthomes.api.dto.webhook.WhatsAppMessage;
import com.aaramsmarthomes.api.model.WaConversation;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * Routes an inbound WhatsApp message to whichever conversation flow owns it.
 * Dispatch offer/confirm/cancel button replies and Flow submissions
 * (nfm_reply) are stateless — the payload carries the offer/dispatch id or
 * flow_token, so they're routed here directly without a wa_conversations
 * lookup. cook_menu is multi-turn (CookEngineService owns the loop);
 * ticket_create still needs its own handler, added the same way — a plain
 * branch rather than a plugin registry (this will only ever have a
 * handful of call sites).
 */
@Service
public class WaInboundRouter {

    private static final Logger log = LoggerFactory.getLogger(WaInboundRouter.class);

    private final WaConversationService conversationService;
    private final WhatsAppService whatsAppService;
    private final TicketDispatchService ticketDispatchService;
    private final FeedbackService feedbackService;
    private final CookEngineService cookEngineService;

    public WaInboundRouter(WaConversationService conversationService, WhatsAppService whatsAppService,
                            TicketDispatchService ticketDispatchService, FeedbackService feedbackService,
                            CookEngineService cookEngineService) {
        this.conversationService = conversationService;
        this.whatsAppService = whatsAppService;
        this.ticketDispatchService = ticketDispatchService;
        this.feedbackService = feedbackService;
        this.cookEngineService = cookEngineService;
    }

    public void route(String phoneE164, WhatsAppMessage message) {
        if (message.interactive() != null && message.interactive().nfmReply() != null) {
            feedbackService.handleFlowSubmission(message.interactive().nfmReply());
            return;
        }

        String buttonId = extractButtonId(message);
        if (buttonId != null && routeButtonReply(phoneE164, buttonId)) {
            return;
        }

        WaConversationService.ResolvedActor actor = conversationService.resolveActor(phoneE164);
        Optional<WaConversation> existing = conversationService.findActive(phoneE164);

        if (existing.isPresent()) {
            handleExistingConversation(existing.get(), message);
            return;
        }

        if ("cook".equals(actor.actorType())) {
            cookEngineService.handleCookAudio(phoneE164, message);
            return;
        }

        if ("unknown".equals(actor.actorType())) {
            whatsAppService.sendText(phoneE164,
                "Sorry, we couldn't find your account. Please use the Aaram Smart Homes app to raise a request.");
            return;
        }

        log.info("No active conversation and no flow wired yet for known actor {} ({}), message type {}",
            actor.actorId(), actor.actorType(), message.type());
    }

    /** button.payload carries a template quick-reply tap; interactive.button_reply.id carries a
     *  free-form interactive tap (in-session). WhatsAppService.sendInteractiveButtons sends the
     *  latter; templates (sent when out-of-session) surface the former — handle both shapes. */
    private String extractButtonId(WhatsAppMessage message) {
        if (message.interactive() != null && message.interactive().buttonReply() != null) {
            return message.interactive().buttonReply().id();
        }
        if (message.button() != null) {
            return message.button().payload();
        }
        return null;
    }

    private boolean routeButtonReply(String phoneE164, String buttonId) {
        String[] parts = buttonId.split(":");
        if (parts.length == 4 && "offer".equals(parts[0]) && "slot".equals(parts[2])) {
            ticketDispatchService.handleOfferButtonReply(phoneE164, parts[1], parts[3]);
            return true;
        }
        if (parts.length == 2 && "confirm".equals(parts[0])) {
            ticketDispatchService.handleConfirmButtonReply(phoneE164, parts[1]);
            return true;
        }
        if (parts.length == 2 && "cancel".equals(parts[0])) {
            ticketDispatchService.handleCancelButtonReply(phoneE164, parts[1]);
            return true;
        }
        return false;
    }

    private void handleExistingConversation(WaConversation conversation, WhatsAppMessage message) {
        switch (conversation.getFlow()) {
            case "cook_menu" -> cookEngineService.handleCookAudio(conversation.getPhoneE164(), message);
            case "ticket_create" ->
                log.warn("No handler wired yet for flow {} (conversation {})", conversation.getFlow(), conversation.getId());
            default ->
                log.warn("Unknown conversation flow {} (conversation {})", conversation.getFlow(), conversation.getId());
        }
    }
}
