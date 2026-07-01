package com.aaramsmarthomes.api.dto;

import jakarta.validation.constraints.NotBlank;

public record AaraChatRequest(
        @NotBlank String message,
        String context
) {}
