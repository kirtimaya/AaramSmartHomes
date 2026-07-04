package com.aaramsmarthomes.api.dto.admin;

import jakarta.validation.constraints.NotBlank;

public record DishCatalogRequest(
        @NotBlank String name,
        String nameHi,
        String imageUrl,
        boolean isFallback,
        int fallbackPriority,
        boolean active
) {}
