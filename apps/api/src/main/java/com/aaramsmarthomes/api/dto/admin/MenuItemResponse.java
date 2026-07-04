package com.aaramsmarthomes.api.dto.admin;

import com.aaramsmarthomes.api.model.MenuItem;

public record MenuItemResponse(String id, String itemName, int sortOrder) {
    public static MenuItemResponse from(MenuItem m) {
        return new MenuItemResponse(m.getId(), m.getItemName(), m.getSortOrder());
    }
}
