package com.aaramsmarthomes.api.dto.admin;

import com.aaramsmarthomes.api.model.MenuIngredient;

public record MenuIngredientResponse(String id, String ingredientName, String quantity, String unit, String notes) {
    public static MenuIngredientResponse from(MenuIngredient m) {
        return new MenuIngredientResponse(m.getId(), m.getIngredientName(), m.getQuantity(), m.getUnit(), m.getNotes());
    }
}
