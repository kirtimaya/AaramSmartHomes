package com.aaramsmarthomes.api.dto;

import com.aaramsmarthomes.api.model.Ticket;

import java.time.OffsetDateTime;

public record TicketResponse(
        String id,
        String requesterId,
        String title,
        String description,
        String category,
        String priority,
        String status,
        String adminNote,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
    public static TicketResponse from(Ticket t) {
        return new TicketResponse(
            t.getId(), t.getRequesterId(), t.getTitle(), t.getDescription(),
            t.getCategory(),
            t.getPriority() != null ? t.getPriority().name() : null,
            t.getStatus() != null ? t.getStatus().name() : null,
            t.getAdminNote(), t.getCreatedAt(), t.getUpdatedAt()
        );
    }
}
