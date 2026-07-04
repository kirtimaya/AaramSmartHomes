package com.aaramsmarthomes.api.controller.admin;

import com.aaramsmarthomes.api.dto.TicketResponse;
import com.aaramsmarthomes.api.dto.admin.DispatchRequest;
import com.aaramsmarthomes.api.dto.admin.ResolveExternalRequest;
import com.aaramsmarthomes.api.dto.admin.TicketDispatchResponse;
import com.aaramsmarthomes.api.model.Ticket;
import com.aaramsmarthomes.api.model.TicketDispatch;
import com.aaramsmarthomes.api.repository.TicketDispatchRepository;
import com.aaramsmarthomes.api.repository.TicketRepository;
import com.aaramsmarthomes.api.service.FeedbackService;
import com.aaramsmarthomes.api.service.TicketDispatchService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminTicketController {

    private static final Logger log = LoggerFactory.getLogger(AdminTicketController.class);

    private final TicketRepository ticketRepository;
    private final TicketDispatchRepository dispatchRepository;
    private final TicketDispatchService dispatchService;
    private final FeedbackService feedbackService;

    public AdminTicketController(TicketRepository ticketRepository, TicketDispatchRepository dispatchRepository,
                                  TicketDispatchService dispatchService, FeedbackService feedbackService) {
        this.ticketRepository = ticketRepository;
        this.dispatchRepository = dispatchRepository;
        this.dispatchService = dispatchService;
        this.feedbackService = feedbackService;
    }

    @GetMapping("/tickets")
    public List<TicketResponse> listTickets(@RequestParam(required = false) String status,
                                             @RequestParam(required = false) String category) {
        Ticket.TicketStatus statusEnum = status != null ? Ticket.TicketStatus.fromDbValue(status) : null;
        return ticketRepository.findForAdmin(statusEnum, category).stream().map(TicketResponse::from).toList();
    }

    @GetMapping("/dispatches")
    public List<TicketDispatchResponse> listDispatches(@RequestParam(required = false) String status) {
        var dispatches = status != null
            ? dispatchRepository.findByStatusOrderByUpdatedAtDesc(status)
            : dispatchRepository.findAllByOrderByUpdatedAtDesc();
        return dispatches.stream().map(TicketDispatchResponse::from).toList();
    }

    @PostMapping("/tickets/{id}/dispatch")
    public ResponseEntity<TicketDispatchResponse> dispatch(@PathVariable String id, @Valid @RequestBody DispatchRequest req) {
        return ResponseEntity.ok(dispatchService.dispatch(id, req));
    }

    @PostMapping("/tickets/{id}/resolve-external")
    public ResponseEntity<TicketDispatchResponse> resolveExternal(@PathVariable String id, @Valid @RequestBody ResolveExternalRequest req) {
        TicketDispatchResponse response = dispatchService.resolveExternally(id, req.externalService());
        dispatchRepository.findById(response.id()).ifPresent(this::sendFeedbackRequestSafely);
        return ResponseEntity.ok(response);
    }

    private void sendFeedbackRequestSafely(TicketDispatch dispatch) {
        try {
            feedbackService.sendFeedbackRequest(dispatch);
        } catch (Exception e) {
            // The dispatch transition already committed — a feedback-send failure shouldn't
            // roll that back or fail the admin's request, but it must be visible somewhere.
            log.error("Failed to send feedback request for dispatch {}", dispatch.getId(), e);
        }
    }

    @PostMapping("/tickets/{id}/complete")
    public ResponseEntity<TicketDispatchResponse> complete(@PathVariable String id) {
        return ResponseEntity.ok(dispatchService.complete(id));
    }

    @PostMapping("/tickets/{id}/cancel")
    public ResponseEntity<TicketDispatchResponse> cancel(@PathVariable String id) {
        return ResponseEntity.ok(dispatchService.cancel(id));
    }
}
