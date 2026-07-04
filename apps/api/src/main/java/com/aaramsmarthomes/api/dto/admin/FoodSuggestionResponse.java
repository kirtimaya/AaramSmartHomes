package com.aaramsmarthomes.api.dto.admin;

import com.aaramsmarthomes.api.model.FoodSuggestion;

import java.time.OffsetDateTime;

public record FoodSuggestionResponse(
        String id, String suggestion, String source, String tenantId, String status,
        String adminNote, OffsetDateTime createdAt
) {
    public static FoodSuggestionResponse from(FoodSuggestion f) {
        return new FoodSuggestionResponse(f.getId(), f.getSuggestion(), f.getSource(), f.getTenantId(),
            f.getStatus(), f.getAdminNote(), f.getCreatedAt());
    }
}
