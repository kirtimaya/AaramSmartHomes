package com.aaramsmarthomes.api.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateVisitRequest(
        @NotBlank String propertyId,
        String roomId,
        @NotBlank String preferredDate,
        String message
) {}
