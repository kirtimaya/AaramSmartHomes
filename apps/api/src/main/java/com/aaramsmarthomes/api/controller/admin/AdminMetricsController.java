package com.aaramsmarthomes.api.controller.admin;

import com.aaramsmarthomes.api.dto.admin.ExternalFeedbackMetricsResponse;
import com.aaramsmarthomes.api.dto.admin.TicketMetricsResponse;
import com.aaramsmarthomes.api.model.Ticket;
import com.aaramsmarthomes.api.repository.ExternalServiceFeedbackRepository;
import com.aaramsmarthomes.api.repository.TicketDispatchRepository;
import com.aaramsmarthomes.api.repository.TicketRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/metrics")
@PreAuthorize("hasRole('ADMIN')")
public class AdminMetricsController {

    private static final List<String> DISPATCH_STATUSES = List.of(
        "PENDING_ASSIGNMENT", "OFFERS_SENT", "PENDING_CONFIRMATION", "SCHEDULED",
        "COMPLETED", "RESOLVED_EXTERNALLY", "CLOSED", "CANCELLED");

    private final TicketRepository ticketRepository;
    private final TicketDispatchRepository dispatchRepository;
    private final ExternalServiceFeedbackRepository feedbackRepository;

    public AdminMetricsController(TicketRepository ticketRepository, TicketDispatchRepository dispatchRepository,
                                   ExternalServiceFeedbackRepository feedbackRepository) {
        this.ticketRepository = ticketRepository;
        this.dispatchRepository = dispatchRepository;
        this.feedbackRepository = feedbackRepository;
    }

    @GetMapping("/tickets")
    public TicketMetricsResponse ticketMetrics() {
        Map<String, Long> byCoarseStatus = new LinkedHashMap<>();
        for (Ticket.TicketStatus status : Ticket.TicketStatus.values()) {
            byCoarseStatus.put(status.getDbValue(), ticketRepository.countByStatus(status));
        }

        Map<String, Long> byDispatchStatus = new LinkedHashMap<>();
        for (String status : DISPATCH_STATUSES) {
            byDispatchStatus.put(status, dispatchRepository.countByStatus(status));
        }

        return new TicketMetricsResponse(byCoarseStatus, byDispatchStatus);
    }

    /** Reads only the anonymized external_service_feedback table — no ticket/user linkage exists
     *  to read even if this endpoint wanted to expose it. */
    @GetMapping("/external-feedback")
    public ExternalFeedbackMetricsResponse externalFeedbackMetrics() {
        List<ExternalFeedbackMetricsResponse.ServiceStat> byService = feedbackRepository.aggregateByService().stream()
            .map(a -> new ExternalFeedbackMetricsResponse.ServiceStat(a.getServiceUsed(), a.getTotal(), a.getAvgCost(), a.getAvgSpeed()))
            .toList();
        List<ExternalFeedbackMetricsResponse.RegionStat> byRegion = feedbackRepository.aggregateByRegion().stream()
            .map(a -> new ExternalFeedbackMetricsResponse.RegionStat(a.getRegion(), a.getTotal(), a.getAvgCost(), a.getAvgSpeed()))
            .toList();
        return new ExternalFeedbackMetricsResponse(byService, byRegion);
    }
}
