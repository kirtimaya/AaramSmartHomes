package com.aaramsmarthomes.api.controller;

import com.aaramsmarthomes.api.config.UserPrincipalAuthority;
import com.aaramsmarthomes.api.dto.CreateTicketRequest;
import com.aaramsmarthomes.api.dto.TicketResponse;
import com.aaramsmarthomes.api.model.Ticket;
import com.aaramsmarthomes.api.model.UserPrincipal;
import com.aaramsmarthomes.api.repository.TicketRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tickets")
public class TicketController {

    private final TicketRepository ticketRepository;

    public TicketController(TicketRepository ticketRepository) {
        this.ticketRepository = ticketRepository;
    }

    @PostMapping
    public ResponseEntity<TicketResponse> create(
            @Valid @RequestBody CreateTicketRequest req,
            Authentication auth) {
        UserPrincipal principal = extractPrincipal(auth);

        Ticket ticket = new Ticket();
        ticket.setRequesterId(principal.userId());
        ticket.setRequesterType(principal.role() == UserPrincipal.Role.GUEST ? "guest" : "tenant");
        ticket.setDescription(req.description());
        ticket.setCategory(req.category());
        if (req.priority() != null) ticket.setPriority(req.priority());
        ticket.setImageUrl(req.imageUrl());
        ticket.setRoomId(req.roomId());
        ticket.setBookingId(req.bookingId());
        ticket.setPreferredMoveIn(req.preferredMoveIn());

        Ticket saved = ticketRepository.save(ticket);
        return ResponseEntity.status(HttpStatus.CREATED).body(TicketResponse.from(saved));
    }

    @GetMapping
    public List<TicketResponse> myTickets(Authentication auth) {
        UserPrincipal principal = extractPrincipal(auth);
        return ticketRepository.findByRequesterIdOrderByCreatedAtDesc(principal.userId())
            .stream().map(TicketResponse::from).toList();
    }

    private UserPrincipal extractPrincipal(Authentication auth) {
        return auth.getAuthorities().stream()
            .filter(a -> a instanceof UserPrincipalAuthority)
            .map(a -> ((UserPrincipalAuthority) a).getPrincipal())
            .findFirst()
            .orElseThrow(() -> new IllegalStateException("No UserPrincipal in context"));
    }
}
