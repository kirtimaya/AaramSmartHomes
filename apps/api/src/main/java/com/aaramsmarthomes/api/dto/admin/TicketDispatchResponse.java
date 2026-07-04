package com.aaramsmarthomes.api.dto.admin;

import com.aaramsmarthomes.api.model.TicketDispatch;

import java.time.OffsetDateTime;

public record TicketDispatchResponse(
        String id, String ticketId, String status, String trade, String professionalId,
        String scheduledSlot, OffsetDateTime scheduledAt, String externalService,
        boolean feedbackReceived, OffsetDateTime createdAt, OffsetDateTime updatedAt
) {
    public static TicketDispatchResponse from(TicketDispatch d) {
        return new TicketDispatchResponse(d.getId(), d.getTicketId(), d.getStatus(), d.getTrade(),
            d.getProfessionalId(), d.getScheduledSlot(), d.getScheduledAt(), d.getExternalService(),
            d.isFeedbackReceived(), d.getCreatedAt(), d.getUpdatedAt());
    }
}
