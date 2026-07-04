package com.aaramsmarthomes.api.dto.admin;

import jakarta.validation.constraints.NotBlank;

public record PantryItemRequest(
        @NotBlank String name,
        String category,
        String quantity,
        String unit,
        @NotBlank String status,
        String minThreshold,
        String minThresholdUnit
) {}
