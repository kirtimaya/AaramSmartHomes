package com.aaramsmarthomes.api.dto.admin;

import jakarta.validation.constraints.NotBlank;

public record SlotInput(@NotBlank String id, @NotBlank String label) {}
