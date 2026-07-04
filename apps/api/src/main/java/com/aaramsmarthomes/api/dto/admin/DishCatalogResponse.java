package com.aaramsmarthomes.api.dto.admin;

import com.aaramsmarthomes.api.model.DishCatalog;
import com.fasterxml.jackson.databind.ObjectMapper;

public record DishCatalogResponse(
        String id, String name, String nameHi, String imageUrl,
        boolean isFallback, int fallbackPriority, boolean active,
        DishNutritionDto nutrition
) {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    public static DishCatalogResponse from(DishCatalog d) {
        return new DishCatalogResponse(d.getId(), d.getName(), d.getNameHi(), d.getImageUrl(),
            d.isFallback(), d.getFallbackPriority(), d.isActive(),
            DishNutritionDto.from(d, MAPPER));
    }
}
