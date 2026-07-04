package com.aaramsmarthomes.api.dto.admin;

import jakarta.validation.constraints.NotBlank;

public record MenuItemInput(@NotBlank String itemName, int sortOrder) {}
