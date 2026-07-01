package com.aaramsmarthomes.api.dto;

import com.aaramsmarthomes.api.model.Notification;

import java.time.OffsetDateTime;

public record NotificationResponse(
        String id,
        String userId,
        String title,
        String body,
        String type,
        boolean read,
        OffsetDateTime createdAt
) {
    public static NotificationResponse from(Notification n) {
        return new NotificationResponse(
            n.getId(), n.getUserId(), n.getTitle(), n.getBody(),
            n.getType(), n.isRead(), n.getCreatedAt()
        );
    }
}
