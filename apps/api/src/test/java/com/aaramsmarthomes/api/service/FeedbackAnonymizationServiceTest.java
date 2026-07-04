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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FeedbackAnonymizationServiceTest {

    @Mock FeedbackFlowTokenRepository tokenRepository;
    @Mock ExternalServiceFeedbackRepository feedbackRepository;
    @Mock TicketDispatchRepository dispatchRepository;
    @Mock TicketRepository ticketRepository;
    @Mock TicketDispatchService ticketDispatchService;
    @Mock WaMessageRepository waMessageRepository;
    @Mock OutboxService outboxService;
    @Mock JdbcTemplate jdbc;

    FeedbackAnonymizationService service;

    @BeforeEach
    void setup() {
        service = new FeedbackAnonymizationService(tokenRepository, feedbackRepository, dispatchRepository,
            ticketRepository, ticketDispatchService, waMessageRepository, outboxService, jdbc);
    }

    private FeedbackFlowToken token(String tokenValue, String dispatchId) {
        FeedbackFlowToken t = new FeedbackFlowToken();
        t.setToken(tokenValue);
        t.setDispatchId(dispatchId);
        t.setExpiresAt(OffsetDateTime.now().plusHours(72));
        return t;
    }

    private TicketDispatch dispatch(String id, String ticketId) {
        TicketDispatch d = new TicketDispatch();
        d.setId(id);
        d.setTicketId(ticketId);
        return d;
    }

    private Ticket ticket(String id, String roomId) {
        Ticket t = new Ticket();
        t.setId(id);
        t.setCategory("plumbing");
        t.setRoomId(roomId);
        return t;
    }

    @Test
    void recordSubmission_with_consent_writes_anonymized_row_with_no_pii_and_closes_dispatch() {
        when(tokenRepository.findById("tok-1")).thenReturn(Optional.of(token("tok-1", "d1")));
        when(dispatchRepository.findById("d1")).thenReturn(Optional.of(dispatch("d1", "t1")));
        when(ticketRepository.findById("t1")).thenReturn(Optional.of(ticket("t1", "room-1")));
        when(jdbc.queryForList(anyString(), eq("room-1")))
            .thenReturn(List.of(java.util.Map.of("property_id", "prop-1", "region", "BBSR-Patia")));

        var submission = new FeedbackAnonymizationService.SubmittedFeedback("Urban Company", 3, 2, true);
        service.recordSubmission("tok-1", submission);

        ArgumentCaptor<ExternalServiceFeedback> captor = ArgumentCaptor.forClass(ExternalServiceFeedback.class);
        verify(feedbackRepository).save(captor.capture());
        ExternalServiceFeedback saved = captor.getValue();
        assertThat(saved.getServiceUsed()).isEqualTo("Urban Company");
        assertThat(saved.getCostScore()).isEqualTo(3);
        assertThat(saved.getSpeedScore()).isEqualTo(2);
        assertThat(saved.isConsent()).isTrue();
        assertThat(saved.getPropertyId()).isEqualTo("prop-1");
        assertThat(saved.getRegion()).isEqualTo("BBSR-Patia");
        assertThat(saved.getTicketCategory()).isEqualTo("plumbing");

        verify(tokenRepository).deleteById("tok-1");
        verify(ticketDispatchService).markFeedbackReceivedAndClose("d1", true);
        verify(outboxService).enqueue(eq("FEEDBACK_PURGE"), eq("ticket_dispatch"), eq("d1"), any());
    }

    @Test
    void recordSubmission_without_consent_writes_no_row_but_still_closes_dispatch() {
        when(tokenRepository.findById("tok-1")).thenReturn(Optional.of(token("tok-1", "d1")));

        var submission = new FeedbackAnonymizationService.SubmittedFeedback("Urban Company", 3, 2, false);
        service.recordSubmission("tok-1", submission);

        verify(feedbackRepository, never()).save(any());
        verify(tokenRepository).deleteById("tok-1");
        verify(ticketDispatchService).markFeedbackReceivedAndClose("d1", false);
        verify(outboxService).enqueue(eq("FEEDBACK_PURGE"), any(), eq("d1"), any());
    }

    @Test
    void recordSubmission_with_unknown_token_does_nothing() {
        when(tokenRepository.findById("bogus")).thenReturn(Optional.empty());

        service.recordSubmission("bogus", new FeedbackAnonymizationService.SubmittedFeedback("X", 1, 1, true));

        verifyNoInteractions(feedbackRepository, ticketDispatchService, outboxService);
        verify(tokenRepository, never()).deleteById(any());
    }

    @Test
    void expireToken_closes_dispatch_with_feedback_received_false() {
        when(tokenRepository.findById("tok-1")).thenReturn(Optional.of(token("tok-1", "d1")));

        service.expireToken("tok-1");

        verify(tokenRepository).deleteById("tok-1");
        verify(ticketDispatchService).markFeedbackReceivedAndClose("d1", false);
    }

    @Test
    void expireStaleTokens_processes_every_expired_token() {
        when(tokenRepository.findByExpiresAtBefore(any())).thenReturn(
            List.of(token("tok-1", "d1"), token("tok-2", "d2")));
        when(tokenRepository.findById("tok-1")).thenReturn(Optional.of(token("tok-1", "d1")));
        when(tokenRepository.findById("tok-2")).thenReturn(Optional.of(token("tok-2", "d2")));

        int count = service.expireStaleTokens();

        assertThat(count).isEqualTo(2);
        verify(ticketDispatchService).markFeedbackReceivedAndClose("d1", false);
        verify(ticketDispatchService).markFeedbackReceivedAndClose("d2", false);
    }

    @Test
    void purgeMessagesForDispatch_nulls_payload_and_phone_on_every_ticket_message() {
        when(dispatchRepository.findById("d1")).thenReturn(Optional.of(dispatch("d1", "t1")));
        WaMessage m1 = new WaMessage();
        m1.setId("m1");
        m1.setPayload("{\"body\":\"hi\"}");
        m1.setPhoneE164("+919999999999");
        WaMessage m2 = new WaMessage();
        m2.setId("m2");
        m2.setPayload("{\"body\":\"bye\"}");
        m2.setPhoneE164("+919999999999");
        when(waMessageRepository.findByTicketIdOrderByCreatedAtAsc("t1")).thenReturn(List.of(m1, m2));

        service.purgeMessagesForDispatch("d1");

        assertThat(m1.getPayload()).isNull();
        assertThat(m1.getPhoneE164()).isNull();
        assertThat(m1.getPurgedAt()).isNotNull();
        assertThat(m2.getPayload()).isNull();
        assertThat(m2.getPhoneE164()).isNull();
        verify(waMessageRepository, times(2)).save(any(WaMessage.class));
    }
}
