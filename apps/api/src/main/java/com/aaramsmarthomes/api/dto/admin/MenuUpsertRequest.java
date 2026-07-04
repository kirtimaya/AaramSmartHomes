package com.aaramsmarthomes.api.dto.admin;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;

public record MenuUpsertRequest(
        @NotNull LocalDate date,
        @NotBlank String mealBlock,
        String notes,
        List<MenuItemInput> items,
        List<MenuIngredientInput> ingredients
) {}
