package com.aaramsmarthomes.api.dto.admin;

import com.aaramsmarthomes.api.model.DishCatalog;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

public record DishNutritionDto(
        String servingSize,
        BigDecimal calories,
        BigDecimal protein,
        BigDecimal carbs,
        BigDecimal fats,
        BigDecimal fiber,
        List<MicroDto> micros,
        List<String> wholeSpices,
        List<String> benefits,
        String cookingTip,
        String status,
        OffsetDateTime updatedAt
) {
    public record MicroDto(String name, BigDecimal value, String unit, BigDecimal rdv, String benefit, String color) {}

    /** Returns null when the dish has no nutrition data at all yet ("none" + no calories recorded). */
    public static DishNutritionDto from(DishCatalog d, ObjectMapper mapper) {
        if ("none".equals(d.getNutritionStatus()) && d.getCalories() == null) return null;
        try {
            List<MicroDto> micros = d.getMicros() != null
                ? mapper.readValue(d.getMicros(), new TypeReference<List<MicroDto>>() {})
                : List.of();
            List<String> spices = d.getWholeSpices() != null
                ? mapper.readValue(d.getWholeSpices(), new TypeReference<List<String>>() {})
                : List.of();
            List<String> benefits = d.getBenefits() != null
                ? mapper.readValue(d.getBenefits(), new TypeReference<List<String>>() {})
                : List.of();
            return new DishNutritionDto(d.getServingSize(), d.getCalories(), d.getProteinG(), d.getCarbsG(),
                d.getFatsG(), d.getFiberG(), micros, spices, benefits, d.getCookingTip(),
                d.getNutritionStatus(), d.getNutritionUpdatedAt());
        } catch (Exception e) {
            throw new RuntimeException("Failed to deserialize dish nutrition JSON for dish " + d.getId(), e);
        }
    }
}
