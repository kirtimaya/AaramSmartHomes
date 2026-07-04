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
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TicketDispatchServiceTest {

    @Mock TicketDispatchRepository dispatchRepository;
    @Mock DispatchOfferRepository offerRepository;
    @Mock TicketRepository ticketRepository;
    @Mock ProfessionalRepository professionalRepository;
    @Mock WaConversationService waConversationService;
    @Mock WhatsAppService whatsAppService;
    @Mock OutboxService outboxService;

    TicketDispatchService service;

    @BeforeEach
    void setup() {
        service = new TicketDispatchService(dispatchRepository, offerRepository, ticketRepository,
            professionalRepository, waConversationService, whatsAppService, outboxService,
            new ObjectMapper());
    }

    private Ticket ticket(String id, String requesterId, String requesterType) {
        Ticket t = new Ticket();
        t.setId(id);
        t.setRequesterId(requesterId);
        t.setRequesterType(requesterType);
        t.setDescription("Tap leaking");
        t.setCategory("plumbing");
        t.setStatus(Ticket.TicketStatus.PENDING);
        return t;
    }

    private TicketDispatch dispatch(String id, String ticketId, String status) {
        TicketDispatch d = new TicketDispatch();
        d.setId(id);
        d.setTicketId(ticketId);
        d.setStatus(status);
        return d;
    }

    private Professional professional(String id, String phone) {
        Professional p = new Professional();
        p.setId(id);
        p.setName("Ramesh");
        p.setPhoneE164(phone);
        p.setRole("professional");
        return p;
    }

    @Test
    void dispatch_creates_offers_sends_messages_and_moves_to_OFFERS_SENT() {
        when(dispatchRepository.findByTicketId("t1")).thenReturn(Optional.empty());
        when(dispatchRepository.save(any(TicketDispatch.class))).thenAnswer(inv -> {
            TicketDispatch d = inv.getArgument(0);
            if (d.getId() == null) d.setId("d1");
            return d;
        });
        when(ticketRepository.findById("t1")).thenReturn(Optional.of(ticket("t1", "u1", "tenant")));
        when(ticketRepository.save(any(Ticket.class))).thenAnswer(inv -> inv.getArgument(0));
        when(professionalRepository.findById("p1")).thenReturn(Optional.of(professional("p1", "+919000000001")));
        when(offerRepository.save(any(DispatchOffer.class))).thenAnswer(inv -> {
            DispatchOffer o = inv.getArgument(0);
            if (o.getId() == null) o.setId("o1");
            return o;
        });

        DispatchRequest req = new DispatchRequest("plumbing", List.of("p1"),
            List.of(new SlotInput("s1", "Today 2-4 PM")));

        TicketDispatchResponse response = service.dispatch("t1", req);

        assertThat(response.status()).isEqualTo("OFFERS_SENT");
        verify(whatsAppService).sendInteractiveButtons(eq("+919000000001"), anyString(), anyList1());
        verify(outboxService).enqueueAt(eq("DISPATCH_OFFER_EXPIRE"), eq("dispatch_offer"), eq("o1"), any(), any());
        verify(ticketRepository).save(argThat(t -> t.getStatus() == Ticket.TicketStatus.PENDING));
    }

    @Test
    void dispatch_rejects_when_not_pending_assignment() {
        when(ticketRepository.findById("t1")).thenReturn(Optional.of(ticket("t1", "u1", "tenant")));
        when(dispatchRepository.findByTicketId("t1")).thenReturn(Optional.of(dispatch("d1", "t1", "SCHEDULED")));

        DispatchRequest req = new DispatchRequest("plumbing", List.of("p1"), List.of(new SlotInput("s1", "Today")));

        assertThatThrownBy(() -> service.dispatch("t1", req)).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void handleOfferButtonReply_accepts_offer_rescinds_siblings_and_moves_to_pending_confirmation() {
        DispatchOffer accepted = offer("o1", "d1", "p1", "PENDING");
        DispatchOffer sibling = offer("o2", "d1", "p2", "PENDING");
        when(offerRepository.findById("o1")).thenReturn(Optional.of(accepted));
        when(professionalRepository.findById("p1")).thenReturn(Optional.of(professional("p1", "+919000000001")));
        when(dispatchRepository.findById("d1")).thenReturn(Optional.of(dispatch("d1", "t1", "OFFERS_SENT")));
        when(offerRepository.save(any(DispatchOffer.class))).thenAnswer(inv -> inv.getArgument(0));
        when(offerRepository.findByDispatchIdAndStatus("d1", "PENDING")).thenReturn(List.of(sibling));
        when(dispatchRepository.save(any(TicketDispatch.class))).thenAnswer(inv -> inv.getArgument(0));
        when(ticketRepository.findById("t1")).thenReturn(Optional.of(ticket("t1", "u1", "tenant")));
        when(ticketRepository.save(any(Ticket.class))).thenAnswer(inv -> inv.getArgument(0));
        when(waConversationService.resolvePhoneForRequester("u1", "tenant")).thenReturn("+919999999999");

        service.handleOfferButtonReply("+919000000001", "o1", "s1");

        assertThat(accepted.getStatus()).isEqualTo("ACCEPTED");
        assertThat(sibling.getStatus()).isEqualTo("RESCINDED");
        verify(dispatchRepository).save(argThat(d -> "PENDING_CONFIRMATION".equals(d.getStatus()) && "p1".equals(d.getProfessionalId())));
        verify(ticketRepository).save(argThat(t -> t.getStatus() == Ticket.TicketStatus.IN_PROGRESS));
        verify(whatsAppService).sendInteractiveButtons(eq("+919999999999"), anyString(), anyList1());
    }

    @Test
    void handleOfferButtonReply_ignores_reply_from_wrong_phone() {
        when(offerRepository.findById("o1")).thenReturn(Optional.of(offer("o1", "d1", "p1", "PENDING")));
        when(professionalRepository.findById("p1")).thenReturn(Optional.of(professional("p1", "+919000000001")));

        service.handleOfferButtonReply("+911111111111", "o1", "s1");

        verify(offerRepository, never()).save(any());
        verify(dispatchRepository, never()).save(any());
    }

    @Test
    void handleOfferButtonReply_ignores_already_responded_offer() {
        when(offerRepository.findById("o1")).thenReturn(Optional.of(offer("o1", "d1", "p1", "ACCEPTED")));

        service.handleOfferButtonReply("+919000000001", "o1", "s1");

        verify(offerRepository, never()).save(any());
        verifyNoInteractions(whatsAppService);
    }

    @Test
    void handleConfirmButtonReply_moves_to_scheduled() {
        TicketDispatch d = dispatch("d1", "t1", "PENDING_CONFIRMATION");
        d.setProfessionalId("p1");
        when(dispatchRepository.findById("d1")).thenReturn(Optional.of(d));
        when(ticketRepository.findById("t1")).thenReturn(Optional.of(ticket("t1", "u1", "tenant")));
        when(ticketRepository.save(any(Ticket.class))).thenAnswer(inv -> inv.getArgument(0));
        when(dispatchRepository.save(any(TicketDispatch.class))).thenAnswer(inv -> inv.getArgument(0));
        when(waConversationService.resolveActor("+919999999999"))
            .thenReturn(new WaConversationService.ResolvedActor("tenant", "u1"));
        when(professionalRepository.findById("p1")).thenReturn(Optional.of(professional("p1", "+919000000001")));

        service.handleConfirmButtonReply("+919999999999", "d1");

        assertThat(d.getStatus()).isEqualTo("SCHEDULED");
        verify(ticketRepository).save(argThat(t -> t.getStatus() == Ticket.TicketStatus.IN_PROGRESS));
        verify(whatsAppService).sendText(eq("+919000000001"), anyString());
    }

    @Test
    void handleConfirmButtonReply_ignores_wrong_requester_phone() {
        TicketDispatch d = dispatch("d1", "t1", "PENDING_CONFIRMATION");
        when(dispatchRepository.findById("d1")).thenReturn(Optional.of(d));
        when(ticketRepository.findById("t1")).thenReturn(Optional.of(ticket("t1", "u1", "tenant")));
        when(waConversationService.resolveActor("+910000000000"))
            .thenReturn(new WaConversationService.ResolvedActor("unknown", null));

        service.handleConfirmButtonReply("+910000000000", "d1");

        assertThat(d.getStatus()).isEqualTo("PENDING_CONFIRMATION");
        verify(dispatchRepository, never()).save(any());
    }

    @Test
    void handleCancelButtonReply_returns_to_pending_assignment_and_rescinds_accepted_offer() {
        TicketDispatch d = dispatch("d1", "t1", "PENDING_CONFIRMATION");
        d.setProfessionalId("p1");
        when(dispatchRepository.findById("d1")).thenReturn(Optional.of(d));
        when(ticketRepository.findById("t1")).thenReturn(Optional.of(ticket("t1", "u1", "tenant")));
        when(ticketRepository.save(any(Ticket.class))).thenAnswer(inv -> inv.getArgument(0));
        when(dispatchRepository.save(any(TicketDispatch.class))).thenAnswer(inv -> inv.getArgument(0));
        when(waConversationService.resolveActor("+919999999999"))
            .thenReturn(new WaConversationService.ResolvedActor("tenant", "u1"));
        DispatchOffer accepted = offer("o1", "d1", "p1", "ACCEPTED");
        when(offerRepository.findByDispatchIdAndStatus("d1", "ACCEPTED")).thenReturn(List.of(accepted));
        when(offerRepository.save(any(DispatchOffer.class))).thenAnswer(inv -> inv.getArgument(0));

        service.handleCancelButtonReply("+919999999999", "d1");

        assertThat(d.getStatus()).isEqualTo("PENDING_ASSIGNMENT");
        assertThat(accepted.getStatus()).isEqualTo("RESCINDED");
        verify(ticketRepository).save(argThat(t -> t.getStatus() == Ticket.TicketStatus.PENDING));
    }

    @Test
    void expireOffer_reverts_dispatch_when_no_other_offer_open_or_accepted() {
        DispatchOffer o = offer("o1", "d1", "p1", "PENDING");
        when(offerRepository.findById("o1")).thenReturn(Optional.of(o));
        when(offerRepository.save(any(DispatchOffer.class))).thenAnswer(inv -> inv.getArgument(0));
        when(dispatchRepository.findById("d1")).thenReturn(Optional.of(dispatch("d1", "t1", "OFFERS_SENT")));
        when(offerRepository.findByDispatchId("d1")).thenReturn(List.of(o)); // now EXPIRED after save below
        when(dispatchRepository.save(any(TicketDispatch.class))).thenAnswer(inv -> inv.getArgument(0));
        when(ticketRepository.findById("t1")).thenReturn(Optional.of(ticket("t1", "u1", "tenant")));
        when(ticketRepository.save(any(Ticket.class))).thenAnswer(inv -> inv.getArgument(0));

        service.expireOffer("o1");

        assertThat(o.getStatus()).isEqualTo("EXPIRED");
        verify(dispatchRepository).save(argThat(d -> "PENDING_ASSIGNMENT".equals(d.getStatus())));
    }

    @Test
    void expireOffer_does_not_revert_when_another_offer_still_pending() {
        DispatchOffer expiring = offer("o1", "d1", "p1", "PENDING");
        DispatchOffer stillOpen = offer("o2", "d1", "p2", "PENDING");
        when(offerRepository.findById("o1")).thenReturn(Optional.of(expiring));
        when(offerRepository.save(any(DispatchOffer.class))).thenAnswer(inv -> inv.getArgument(0));
        when(dispatchRepository.findById("d1")).thenReturn(Optional.of(dispatch("d1", "t1", "OFFERS_SENT")));
        when(offerRepository.findByDispatchId("d1")).thenReturn(List.of(expiring, stillOpen));

        service.expireOffer("o1");

        assertThat(expiring.getStatus()).isEqualTo("EXPIRED");
        verify(dispatchRepository, never()).save(any());
    }

    @Test
    void expireConfirmation_returns_dispatch_to_pending_assignment() {
        TicketDispatch d = dispatch("d1", "t1", "PENDING_CONFIRMATION");
        when(dispatchRepository.findById("d1")).thenReturn(Optional.of(d));
        when(offerRepository.findByDispatchIdAndStatus("d1", "ACCEPTED")).thenReturn(List.of());
        when(dispatchRepository.save(any(TicketDispatch.class))).thenAnswer(inv -> inv.getArgument(0));
        when(ticketRepository.findById("t1")).thenReturn(Optional.of(ticket("t1", "u1", "tenant")));
        when(ticketRepository.save(any(Ticket.class))).thenAnswer(inv -> inv.getArgument(0));

        service.expireConfirmation("d1");

        assertThat(d.getStatus()).isEqualTo("PENDING_ASSIGNMENT");
    }

    @Test
    void resolveExternally_transitions_dispatch_and_ticket() {
        TicketDispatch d = dispatch("d1", "t1", "OFFERS_SENT");
        when(dispatchRepository.findByTicketId("t1")).thenReturn(Optional.of(d));
        when(offerRepository.findByDispatchIdAndStatus("d1", "PENDING")).thenReturn(List.of());
        when(dispatchRepository.save(any(TicketDispatch.class))).thenAnswer(inv -> inv.getArgument(0));
        when(ticketRepository.findById("t1")).thenReturn(Optional.of(ticket("t1", "u1", "tenant")));
        when(ticketRepository.save(any(Ticket.class))).thenAnswer(inv -> inv.getArgument(0));

        TicketDispatchResponse response = service.resolveExternally("t1", "Urban Company");

        assertThat(response.status()).isEqualTo("RESOLVED_EXTERNALLY");
        assertThat(response.externalService()).isEqualTo("Urban Company");
        verify(ticketRepository).save(argThat(t -> t.getStatus() == Ticket.TicketStatus.RESOLVED));
    }

    @Test
    void complete_requires_scheduled_status() {
        when(dispatchRepository.findByTicketId("t1")).thenReturn(Optional.of(dispatch("d1", "t1", "OFFERS_SENT")));

        assertThatThrownBy(() -> service.complete("t1")).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void cancel_transitions_dispatch_and_ticket() {
        TicketDispatch d = dispatch("d1", "t1", "PENDING_ASSIGNMENT");
        when(dispatchRepository.findByTicketId("t1")).thenReturn(Optional.of(d));
        when(offerRepository.findByDispatchIdAndStatus("d1", "PENDING")).thenReturn(List.of());
        when(dispatchRepository.save(any(TicketDispatch.class))).thenAnswer(inv -> inv.getArgument(0));
        when(ticketRepository.findById("t1")).thenReturn(Optional.of(ticket("t1", "u1", "tenant")));
        when(ticketRepository.save(any(Ticket.class))).thenAnswer(inv -> inv.getArgument(0));

        TicketDispatchResponse response = service.cancel("t1");

        assertThat(response.status()).isEqualTo("CANCELLED");
        verify(ticketRepository).save(argThat(t -> t.getStatus() == Ticket.TicketStatus.CANCELLED));
    }

    private DispatchOffer offer(String id, String dispatchId, String professionalId, String status) {
        DispatchOffer o = new DispatchOffer();
        o.setId(id);
        o.setDispatchId(dispatchId);
        o.setProfessionalId(professionalId);
        o.setSlots("[{\"id\":\"s1\",\"label\":\"Today 2-4 PM\"}]");
        o.setStatus(status);
        return o;
    }

    @SuppressWarnings("unchecked")
    private List<WhatsAppService.Button> anyList1() {
        return any(List.class);
    }
}
