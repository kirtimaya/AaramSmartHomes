package com.aaramsmarthomes.api.dto.admin;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record ProfessionalRequest(
        @NotBlank String name,
        @NotBlank @Pattern(regexp = "^\\+[1-9][0-9]{7,14}$", message = "must be E.164 format, e.g. +919876543210")
        String phoneE164,
        @NotBlank String role,
        String trade,
        boolean active,
        String notes
) {}
