package com.aaramsmarthomes.api.dto;

import com.aaramsmarthomes.api.model.Ticket.TicketPriority;
import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;

public record CreateTicketRequest(
        @NotBlank String description,
        @NotBlank String category,
        TicketPriority priority,
        String imageUrl,
        String roomId,
        String bookingId,
        LocalDate preferredMoveIn
) {}
