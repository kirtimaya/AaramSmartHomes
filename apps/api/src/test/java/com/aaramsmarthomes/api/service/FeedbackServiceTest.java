package com.aaramsmarthomes.api.service;

import com.aaramsmarthomes.api.dto.webhook.WhatsAppNfmReply;
import com.aaramsmarthomes.api.model.FeedbackFlowToken;
import com.aaramsmarthomes.api.model.Ticket;
import com.aaramsmarthomes.api.model.TicketDispatch;
import com.aaramsmarthomes.api.repository.FeedbackFlowTokenRepository;
import com.aaramsmarthomes.api.repository.TicketRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FeedbackServiceTest {

    @Mock FeedbackFlowTokenRepository tokenRepository;
    @Mock TicketRepository ticketRepository;
    @Mock WaConversationService waConversationService;
    @Mock WhatsAppService whatsAppService;
    @Mock FeedbackAnonymizationService anonymizationService;

    FeedbackService service;

    @BeforeEach
    void setup() {
        service = new FeedbackService(tokenRepository, ticketRepository, waConversationService,
            whatsAppService, anonymizationService, new ObjectMapper());
    }

    private WhatsAppNfmReply nfmReply(String json) {
        return new WhatsAppNfmReply("feedback_form", "Submitted", json);
    }

    @Test
    void handleFlowSubmission_parses_checkbox_array_consent_as_true() {
        String json = "{\"flow_token\":\"tok-1\",\"service_used\":\"Urban Company\",\"cost_score\":\"3\",\"speed_score\":\"2\",\"consent\":[\"granted\"]}";

        service.handleFlowSubmission(nfmReply(json));

        ArgumentCaptor<FeedbackAnonymizationService.SubmittedFeedback> captor =
            ArgumentCaptor.forClass(FeedbackAnonymizationService.SubmittedFeedback.class);
        verify(anonymizationService).recordSubmission(eq("tok-1"), captor.capture());
        assertThat(captor.getValue().consent()).isTrue();
        assertThat(captor.getValue().serviceUsed()).isEqualTo("Urban Company");
        assertThat(captor.getValue().costScore()).isEqualTo(3);
        assertThat(captor.getValue().speedScore()).isEqualTo(2);
    }

    @Test
    void handleFlowSubmission_treats_empty_consent_array_as_no_consent() {
        String json = "{\"flow_token\":\"tok-1\",\"service_used\":\"Urban Company\",\"cost_score\":\"3\",\"speed_score\":\"2\",\"consent\":[]}";

        service.handleFlowSubmission(nfmReply(json));

        ArgumentCaptor<FeedbackAnonymizationService.SubmittedFeedback> captor =
            ArgumentCaptor.forClass(FeedbackAnonymizationService.SubmittedFeedback.class);
        verify(anonymizationService).recordSubmission(eq("tok-1"), captor.capture());
        assertThat(captor.getValue().consent()).isFalse();
    }

    @Test
    void handleFlowSubmission_discards_when_no_flow_token() {
        String json = "{\"service_used\":\"Urban Company\",\"cost_score\":\"3\",\"speed_score\":\"2\",\"consent\":[\"granted\"]}";

        service.handleFlowSubmission(nfmReply(json));

        verifyNoInteractions(anonymizationService);
    }

    @Test
    void sendFeedbackRequest_mints_token_and_sends_flow() {
        TicketDispatch dispatch = new TicketDispatch();
        dispatch.setId("d1");
        dispatch.setTicketId("t1");
        dispatch.setExternalService("Urban Company");

        Ticket ticket = new Ticket();
        ticket.setId("t1");
        ticket.setRequesterId("u1");
        ticket.setRequesterType("tenant");

        when(ticketRepository.findById("t1")).thenReturn(Optional.of(ticket));
        when(waConversationService.resolvePhoneForRequester("u1", "tenant")).thenReturn("+919999999999");
        when(tokenRepository.save(any(FeedbackFlowToken.class))).thenAnswer(inv -> {
            FeedbackFlowToken t = inv.getArgument(0);
            t.setToken("minted-token");
            return t;
        });

        service.sendFeedbackRequest(dispatch);

        verify(whatsAppService).sendFlow(eq("+919999999999"), any(), eq("minted-token"), any());
        ArgumentCaptor<FeedbackFlowToken> tokenCaptor = ArgumentCaptor.forClass(FeedbackFlowToken.class);
        verify(tokenRepository).save(tokenCaptor.capture());
        assertThat(tokenCaptor.getValue().getDispatchId()).isEqualTo("d1");
    }

    @Test
    void sendFeedbackRequest_skips_when_no_phone_on_file() {
        TicketDispatch dispatch = new TicketDispatch();
        dispatch.setId("d1");
        dispatch.setTicketId("t1");

        Ticket ticket = new Ticket();
        ticket.setId("t1");
        ticket.setRequesterId("u1");
        ticket.setRequesterType("tenant");

        when(ticketRepository.findById("t1")).thenReturn(Optional.of(ticket));
        when(waConversationService.resolvePhoneForRequester("u1", "tenant")).thenReturn(null);

        service.sendFeedbackRequest(dispatch);

        verifyNoInteractions(whatsAppService);
        verify(tokenRepository, never()).save(any());
    }
}
