package com.aaramsmarthomes.api.dto;

import com.aaramsmarthomes.api.model.VisitRequest;

import java.time.OffsetDateTime;

public record VisitRequestResponse(
        String id,
        String requesterId,
        String requesterType,
        String propertyId,
        String roomId,
        String preferredDate,
        String message,
        String status,
        OffsetDateTime createdAt
) {
    public static VisitRequestResponse from(VisitRequest v) {
        return new VisitRequestResponse(
            v.getId(), v.getRequesterId(), v.getRequesterType(),
            v.getPropertyId(), v.getRoomId(), v.getPreferredDate(),
            v.getMessage(),
            v.getStatus() != null ? v.getStatus().name() : null,
            v.getCreatedAt()
        );
    }
}
