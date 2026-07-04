package com.aaramsmarthomes.api.dto.admin;

import com.aaramsmarthomes.api.model.PantryItem;

import java.time.OffsetDateTime;

public record PantryItemResponse(
        String id, String name, String category, String quantity, String unit, String status,
        String minThreshold, String minThresholdUnit, OffsetDateTime lastUpdatedAt
) {
    public static PantryItemResponse from(PantryItem p) {
        return new PantryItemResponse(p.getId(), p.getName(), p.getCategory(), p.getQuantity(), p.getUnit(),
            p.getStatus(), p.getMinThreshold(), p.getMinThresholdUnit(), p.getLastUpdatedAt());
    }
}
