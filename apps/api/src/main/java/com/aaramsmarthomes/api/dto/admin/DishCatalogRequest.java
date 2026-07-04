package com.aaramsmarthomes.api.dto.admin;

import jakarta.validation.constraints.NotBlank;

import java.math.BigDecimal;
import java.util.List;

public record DishCatalogRequest(
        @NotBlank String name,
        String nameHi,
        String imageUrl,
        boolean isFallback,
        int fallbackPriority,
        boolean active,
        NutritionInput nutrition // optional — null leaves nutrition fields untouched
) {
    public record NutritionInput(
            String servingSize,
            BigDecimal calories,
            BigDecimal protein,
            BigDecimal carbs,
            BigDecimal fats,
            BigDecimal fiber,
            List<MicroInput> micros,
            List<String> wholeSpices,
            List<String> benefits,
            String cookingTip,
            String status // "none" | "estimated" | "approved"
    ) {}

    public record MicroInput(String name, BigDecimal value, String unit, BigDecimal rdv, String benefit, String color) {}
}
