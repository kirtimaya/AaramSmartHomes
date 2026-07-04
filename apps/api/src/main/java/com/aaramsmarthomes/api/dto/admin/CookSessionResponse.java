package com.aaramsmarthomes.api.dto.admin;

import com.aaramsmarthomes.api.model.WaConversation;

import java.time.OffsetDateTime;

public record CookSessionResponse(
        String id, String phoneE164, String state, boolean active,
        OffsetDateTime createdAt, OffsetDateTime updatedAt
) {
    public static CookSessionResponse from(WaConversation c) {
        return new CookSessionResponse(c.getId(), c.getPhoneE164(), c.getState(), c.isActive(), c.getCreatedAt(), c.getUpdatedAt());
    }
}
