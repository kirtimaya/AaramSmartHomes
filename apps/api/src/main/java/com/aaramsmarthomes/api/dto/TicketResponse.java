package com.aaramsmarthomes.api.dto;

import com.aaramsmarthomes.api.model.Ticket;

import java.time.LocalDate;
import java.time.OffsetDateTime;

public record TicketResponse(
        String id,
        String requesterId,
        String requesterType,
        String description,
        String category,
        String priority,
        String status,
        String imageUrl,
        String adminNote,
        String bookingId,
        String roomId,
        LocalDate preferredMoveIn,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
    public static TicketResponse from(Ticket t) {
        return new TicketResponse(
            t.getId(), t.getRequesterId(), t.getRequesterType(), t.getDescription(),
            t.getCategory(),
            t.getPriority() != null ? t.getPriority().getDbValue() : null,
            t.getStatus() != null ? t.getStatus().getDbValue() : null,
            t.getImageUrl(), t.getAdminNote(), t.getBookingId(), t.getRoomId(),
            t.getPreferredMoveIn(), t.getCreatedAt(), t.getUpdatedAt()
        );
    }
}
