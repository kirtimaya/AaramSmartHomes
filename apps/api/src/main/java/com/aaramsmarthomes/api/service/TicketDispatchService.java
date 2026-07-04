package com.aaramsmarthomes.api.service;

import com.aaramsmarthomes.api.dto.admin.DispatchRequest;
import com.aaramsmarthomes.api.dto.admin.SlotInput;
import com.aaramsmarthomes.api.dto.admin.TicketDispatchResponse;
import com.aaramsmarthomes.api.model.DispatchOffer;
import com.aaramsmarthomes.api.model.Professional;
import com.aaramsmarthomes.api.model.Ticket;
import com.aaramsmarthomes.api.model.TicketDispatch;
import com.aaramsmarthomes.api.repository.DispatchOfferRepository;
import com.aaramsmarthomes.api.repository.ProfessionalRepository;
import com.aaramsmarthomes.api.repository.TicketDispatchRepository;
import com.aaramsmarthomes.api.repository.TicketRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.Set;

/**
 * The ticket dispatch state machine — the single writer of both
 * ticket_dispatches.status (fine-grained) and tickets.status (coarse,
 * consumed by existing web/mobile UIs). See the transition table in the
 * project plan for the full state diagram; this class enforces it.
 */
@Service
public class TicketDispatchService {

    private static final Logger log = LoggerFactory.getLogger(TicketDispatchService.class);

    private static final int OFFER_TTL_HOURS = 4;
    private static final int CONFIRMATION_TIMEOUT_HOURS = 12;

    private final TicketDispatchRepository dispatchRepository;
    private final DispatchOfferRepository offerRepository;
    private final TicketRepository ticketRepository;
    private final ProfessionalRepository professionalRepository;
    private final WaConversationService waConversationService;
    private final WhatsAppService whatsAppService;
    private final OutboxService outboxService;
    private final ObjectMapper objectMapper;

    public TicketDispatchService(TicketDispatchRepository dispatchRepository, DispatchOfferRepository offerRepository,
                                  TicketRepository ticketRepository, ProfessionalRepository professionalRepository,
                                  WaConversationService waConversationService, WhatsAppService whatsAppService,
                                  OutboxService outboxService, ObjectMapper objectMapper) {
        this.dispatchRepository = dispatchRepository;
        this.offerRepository = offerRepository;
        this.ticketRepository = ticketRepository;
        this.professionalRepository = professionalRepository;
        this.waConversationService = waConversationService;
        this.whatsAppService = whatsAppService;
        this.outboxService = outboxService;
        this.objectMapper = objectMapper;
    }

    // ── Admin-triggered ──────────────────────────────────────────────────────

    @Transactional
    public TicketDispatchResponse dispatch(String ticketId, DispatchRequest req) {
        Ticket ticket = requireTicket(ticketId);
        TicketDispatch d = dispatchRepository.findByTicketId(ticketId).orElseGet(() -> newDispatch(ticketId));
        requireStatus(d, "PENDING_ASSIGNMENT");

        d.setTrade(req.trade());
        OffsetDateTime expiresAt = OffsetDateTime.now().plusHours(OFFER_TTL_HOURS);

        for (String professionalId : req.professionalIds()) {
            Professional pro = professionalRepository.findById(professionalId)
                .orElseThrow(() -> new NoSuchElementException("Professional not found: " + professionalId));

            DispatchOffer offer = new DispatchOffer();
            offer.setDispatchId(d.getId());
            offer.setProfessionalId(professionalId);
            offer.setSlots(writeJson(req.slots()));
            offer.setStatus("PENDING");
            offer.setSentAt(OffsetDateTime.now());
            offer.setExpiresAt(expiresAt);
            DispatchOffer saved = offerRepository.save(offer);

            sendOfferMessage(pro, ticket, saved, req.slots());
            outboxService.enqueueAt("DISPATCH_OFFER_EXPIRE", "dispatch_offer", saved.getId(), Map.of(), expiresAt);
        }

        transition(d, "OFFERS_SENT");
        return TicketDispatchResponse.from(dispatchRepository.save(d));
    }

    @Transactional
    public TicketDispatchResponse resolveExternally(String ticketId, String externalService) {
        TicketDispatch d = requireDispatch(ticketId);
        requireStatus(d, "PENDING_ASSIGNMENT", "OFFERS_SENT", "PENDING_CONFIRMATION", "SCHEDULED");
        rescindPendingOffers(d.getId());
        d.setExternalService(externalService);
        transition(d, "RESOLVED_EXTERNALLY");
        return TicketDispatchResponse.from(dispatchRepository.save(d));
    }

    @Transactional
    public TicketDispatchResponse complete(String ticketId) {
        TicketDispatch d = requireDispatch(ticketId);
        requireStatus(d, "SCHEDULED");
        transition(d, "COMPLETED");
        return TicketDispatchResponse.from(dispatchRepository.save(d));
    }

    @Transactional
    public TicketDispatchResponse cancel(String ticketId) {
        TicketDispatch d = requireDispatch(ticketId);
        requireStatus(d, "PENDING_ASSIGNMENT", "OFFERS_SENT", "PENDING_CONFIRMATION", "SCHEDULED");
        rescindPendingOffers(d.getId());
        transition(d, "CANCELLED");
        return TicketDispatchResponse.from(dispatchRepository.save(d));
    }

    /** Called by FeedbackAnonymizationService (P5) once anonymized feedback has been recorded. */
    @Transactional
    public void markFeedbackReceivedAndClose(String dispatchId, boolean received) {
        TicketDispatch d = dispatchRepository.findById(dispatchId)
            .orElseThrow(() -> new NoSuchElementException("Dispatch not found: " + dispatchId));
        requireStatus(d, "RESOLVED_EXTERNALLY");
        d.setFeedbackReceived(received);
        transition(d, "CLOSED");
        dispatchRepository.save(d);
    }

    // ── WhatsApp-triggered (stateless button replies, parsed by WaInboundRouter) ──

    @Transactional
    public void handleOfferButtonReply(String phoneE164, String offerId, String slotId) {
        DispatchOffer offer = offerRepository.findById(offerId).orElse(null);
        if (offer == null) { log.warn("Offer button reply for unknown offer {}", offerId); return; }
        if (!"PENDING".equals(offer.getStatus())) { log.info("Offer {} already {}, ignoring reply", offerId, offer.getStatus()); return; }
        if (!professionalPhoneMatches(offer.getProfessionalId(), phoneE164)) {
            log.warn("Offer {} button reply from phone {} does not match assigned professional, ignoring", offerId, phoneE164);
            return;
        }

        TicketDispatch d = dispatchRepository.findById(offer.getDispatchId()).orElse(null);
        if (d == null || !"OFFERS_SENT".equals(d.getStatus())) {
            log.info("Dispatch for offer {} is not in OFFERS_SENT, ignoring reply", offerId);
            return;
        }

        offer.setStatus("ACCEPTED");
        offer.setChosenSlot(slotId);
        offer.setRespondedAt(OffsetDateTime.now());
        offerRepository.save(offer);

        offerRepository.findByDispatchIdAndStatus(d.getId(), "PENDING").forEach(sibling -> {
            sibling.setStatus("RESCINDED");
            sibling.setRespondedAt(OffsetDateTime.now());
            offerRepository.save(sibling);
        });

        d.setProfessionalId(offer.getProfessionalId());
        d.setScheduledSlot(slotId);
        transition(d, "PENDING_CONFIRMATION");
        dispatchRepository.save(d);

        Ticket ticket = requireTicket(d.getTicketId());
        String slotLabel = findSlotLabel(offer.getSlots(), slotId);
        sendConfirmMessage(ticket, d, slotLabel);
        outboxService.enqueueAt("CONFIRMATION_TIMEOUT", "ticket_dispatch", d.getId(), Map.of(),
            OffsetDateTime.now().plusHours(CONFIRMATION_TIMEOUT_HOURS));
    }

    @Transactional
    public void handleConfirmButtonReply(String phoneE164, String dispatchId) {
        TicketDispatch d = dispatchRepository.findById(dispatchId).orElse(null);
        if (d == null || !"PENDING_CONFIRMATION".equals(d.getStatus())) return;
        Ticket ticket = requireTicket(d.getTicketId());
        if (!requesterPhoneMatches(ticket.getRequesterId(), phoneE164)) {
            log.warn("Confirm reply for dispatch {} from phone {} does not match ticket requester, ignoring", dispatchId, phoneE164);
            return;
        }

        d.setScheduledAt(OffsetDateTime.now());
        transition(d, "SCHEDULED");
        dispatchRepository.save(d);

        professionalRepository.findById(d.getProfessionalId()).ifPresent(pro ->
            whatsAppService.sendText(pro.getPhoneE164(),
                "Confirmed! Please proceed with the visit for: " + ticket.getCategory() + " — " + ticket.getDescription()));
    }

    @Transactional
    public void handleCancelButtonReply(String phoneE164, String dispatchId) {
        TicketDispatch d = dispatchRepository.findById(dispatchId).orElse(null);
        if (d == null || !"PENDING_CONFIRMATION".equals(d.getStatus())) return;
        Ticket ticket = requireTicket(d.getTicketId());
        if (!requesterPhoneMatches(ticket.getRequesterId(), phoneE164)) {
            log.warn("Cancel reply for dispatch {} from phone {} does not match ticket requester, ignoring", dispatchId, phoneE164);
            return;
        }
        backToPendingAssignment(d, "user cancelled the scheduled visit");
    }

    // ── Timer-triggered (outbox delayed events) ─────────────────────────────

    @Transactional
    public void expireOffer(String offerId) {
        DispatchOffer offer = offerRepository.findById(offerId).orElse(null);
        if (offer == null || !"PENDING".equals(offer.getStatus())) return;
        offer.setStatus("EXPIRED");
        offer.setRespondedAt(OffsetDateTime.now());
        offerRepository.save(offer);

        TicketDispatch d = dispatchRepository.findById(offer.getDispatchId()).orElse(null);
        if (d == null || !"OFFERS_SENT".equals(d.getStatus())) return;

        boolean anyStillOpenOrAccepted = offerRepository.findByDispatchId(d.getId()).stream()
            .anyMatch(o -> Set.of("PENDING", "ACCEPTED").contains(o.getStatus()));
        if (!anyStillOpenOrAccepted) {
            transition(d, "PENDING_ASSIGNMENT");
            dispatchRepository.save(d);
            log.info("All offers for dispatch {} expired with no acceptance — back to PENDING_ASSIGNMENT", d.getId());
        }
    }

    @Transactional
    public void expireConfirmation(String dispatchId) {
        TicketDispatch d = dispatchRepository.findById(dispatchId).orElse(null);
        if (d == null || !"PENDING_CONFIRMATION".equals(d.getStatus())) return;
        backToPendingAssignment(d, "confirmation window expired");
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private void backToPendingAssignment(TicketDispatch d, String reason) {
        offerRepository.findByDispatchIdAndStatus(d.getId(), "ACCEPTED").forEach(o -> {
            o.setStatus("RESCINDED");
            o.setRespondedAt(OffsetDateTime.now());
            offerRepository.save(o);
        });
        d.setProfessionalId(null);
        d.setScheduledSlot(null);
        transition(d, "PENDING_ASSIGNMENT");
        dispatchRepository.save(d);
        log.info("Dispatch {} returned to PENDING_ASSIGNMENT: {}", d.getId(), reason);
    }

    private TicketDispatch newDispatch(String ticketId) {
        TicketDispatch d = new TicketDispatch();
        d.setTicketId(ticketId);
        d.setStatus("PENDING_ASSIGNMENT");
        d.setUpdatedAt(OffsetDateTime.now());
        return dispatchRepository.save(d);
    }

    private TicketDispatch requireDispatch(String ticketId) {
        return dispatchRepository.findByTicketId(ticketId)
            .orElseThrow(() -> new NoSuchElementException("No dispatch for ticket: " + ticketId));
    }

    private Ticket requireTicket(String ticketId) {
        return ticketRepository.findById(ticketId)
            .orElseThrow(() -> new NoSuchElementException("Ticket not found: " + ticketId));
    }

    private void requireStatus(TicketDispatch d, String... allowed) {
        for (String s : allowed) if (s.equals(d.getStatus())) return;
        throw new IllegalStateException("Dispatch " + d.getId() + " is " + d.getStatus()
            + ", expected one of " + List.of(allowed));
    }

    /** Single point where ticket_dispatches.status changes and tickets.status is kept in sync. */
    private void transition(TicketDispatch d, String newStatus) {
        d.setStatus(newStatus);
        d.setUpdatedAt(OffsetDateTime.now());

        String coarse = switch (newStatus) {
            case "PENDING_ASSIGNMENT", "OFFERS_SENT" -> "Pending";
            case "PENDING_CONFIRMATION", "SCHEDULED" -> "In-Progress";
            case "COMPLETED", "RESOLVED_EXTERNALLY", "CLOSED" -> "Resolved";
            case "CANCELLED" -> "Cancelled";
            default -> throw new IllegalStateException("Unmapped dispatch status: " + newStatus);
        };
        Ticket ticket = requireTicket(d.getTicketId());
        ticket.setStatus(Ticket.TicketStatus.fromDbValue(coarse));
        ticketRepository.save(ticket);
    }

    private void rescindPendingOffers(String dispatchId) {
        offerRepository.findByDispatchIdAndStatus(dispatchId, "PENDING").forEach(o -> {
            o.setStatus("RESCINDED");
            o.setRespondedAt(OffsetDateTime.now());
            offerRepository.save(o);
        });
    }

    private boolean professionalPhoneMatches(String professionalId, String phoneE164) {
        return professionalRepository.findById(professionalId)
            .map(p -> p.getPhoneE164().equals(phoneE164))
            .orElse(false);
    }

    private boolean requesterPhoneMatches(String requesterId, String phoneE164) {
        WaConversationService.ResolvedActor actor = waConversationService.resolveActor(phoneE164);
        return requesterId != null && requesterId.equals(actor.actorId());
    }

    private void sendOfferMessage(Professional pro, Ticket ticket, DispatchOffer offer, List<SlotInput> slots) {
        List<WhatsAppService.Button> buttons = slots.stream()
            .map(s -> new WhatsAppService.Button("offer:" + offer.getId() + ":slot:" + s.id(), s.label()))
            .toList();
        String body = "New " + ticket.getCategory() + " job: " + ticket.getDescription() + ". Can you take it? Pick a slot.";
        whatsAppService.sendInteractiveButtons(pro.getPhoneE164(), body, buttons);
    }

    private void sendConfirmMessage(Ticket ticket, TicketDispatch d, String slotLabel) {
        String requesterPhone = waConversationService.resolvePhoneForRequester(ticket.getRequesterId(), ticket.getRequesterType());
        if (requesterPhone == null) {
            log.warn("No phone on file for ticket {} requester {} ({}) — cannot send confirm/cancel",
                ticket.getId(), ticket.getRequesterId(), ticket.getRequesterType());
            return;
        }
        Optional<Professional> pro = professionalRepository.findById(d.getProfessionalId());
        String proName = pro.map(Professional::getName).orElse("A professional");
        String body = proName + " can come " + (slotLabel != null ? slotLabel : "soon")
            + " for your ticket \"" + ticket.getDescription() + "\". Confirm?";
        List<WhatsAppService.Button> buttons = List.of(
            new WhatsAppService.Button("confirm:" + d.getId(), "Confirm"),
            new WhatsAppService.Button("cancel:" + d.getId(), "Cancel"));
        whatsAppService.sendInteractiveButtons(requesterPhone, body, buttons);
    }

    private String writeJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception e) {
            throw new RuntimeException("Failed to serialize dispatch offer slots", e);
        }
    }

    private String findSlotLabel(String slotsJson, String slotId) {
        try {
            JsonNode slots = objectMapper.readTree(slotsJson);
            for (JsonNode slot : slots) {
                if (slotId.equals(slot.path("id").asText())) return slot.path("label").asText(null);
            }
        } catch (Exception e) {
            log.warn("Failed to parse slots JSON for label lookup", e);
        }
        return null;
    }
}
