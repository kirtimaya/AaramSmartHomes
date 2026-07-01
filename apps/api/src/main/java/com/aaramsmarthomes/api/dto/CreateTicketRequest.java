package com.aaramsmarthomes.api.dto;

import com.aaramsmarthomes.api.model.Ticket.TicketPriority;
import jakarta.validation.constraints.NotBlank;

public record CreateTicketRequest(
        @NotBlank String title,
        String description,
        String category,
        TicketPriority priority
) {}
