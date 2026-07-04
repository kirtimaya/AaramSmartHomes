package com.aaramsmarthomes.api.dto.admin;

import com.aaramsmarthomes.api.model.GroceryAlert;

import java.time.OffsetDateTime;
import java.util.List;

public record GroceryAlertResponse(
        String id, String menuId, String mealBlock, String rawUtterance, List<String> extractedItems,
        OffsetDateTime loggedAt, OffsetDateTime resolvedAt, String resolvedBy
) {
    public static GroceryAlertResponse from(GroceryAlert g) {
        return new GroceryAlertResponse(g.getId(), g.getMenuId(), g.getMealBlock(), g.getRawUtterance(),
            List.of(g.getExtractedItems()), g.getLoggedAt(), g.getResolvedAt(), g.getResolvedBy());
    }
}
