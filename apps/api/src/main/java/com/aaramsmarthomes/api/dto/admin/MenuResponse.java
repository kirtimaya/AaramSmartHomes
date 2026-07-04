package com.aaramsmarthomes.api.dto.admin;

import com.aaramsmarthomes.api.model.Menu;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

public record MenuResponse(
        String id,
        LocalDate date,
        String mealBlock,
        String notes,
        List<MenuItemResponse> items,
        List<MenuIngredientResponse> ingredients,
        OffsetDateTime createdAt
) {
    public static MenuResponse from(Menu menu, List<MenuItemResponse> items, List<MenuIngredientResponse> ingredients) {
        return new MenuResponse(menu.getId(), menu.getDate(), menu.getMealBlock(), menu.getNotes(), items, ingredients, menu.getCreatedAt());
    }
}
