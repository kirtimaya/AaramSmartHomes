package com.aaramsmarthomes.api.dto.admin;

import jakarta.validation.constraints.NotBlank;

public record FoodSuggestionUpdateRequest(@NotBlank String status, String adminNote) {}
