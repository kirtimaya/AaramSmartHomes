package com.aaramsmarthomes.api.dto.admin;

import jakarta.validation.constraints.NotBlank;

public record MenuIngredientInput(@NotBlank String ingredientName, String quantity, String unit, String notes) {}
