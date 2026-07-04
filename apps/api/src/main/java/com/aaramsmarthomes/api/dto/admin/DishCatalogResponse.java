package com.aaramsmarthomes.api.dto.admin;

import com.aaramsmarthomes.api.model.DishCatalog;

public record DishCatalogResponse(
        String id, String name, String nameHi, String imageUrl,
        boolean isFallback, int fallbackPriority, boolean active
) {
    public static DishCatalogResponse from(DishCatalog d) {
        return new DishCatalogResponse(d.getId(), d.getName(), d.getNameHi(), d.getImageUrl(),
            d.isFallback(), d.getFallbackPriority(), d.isActive());
    }
}
