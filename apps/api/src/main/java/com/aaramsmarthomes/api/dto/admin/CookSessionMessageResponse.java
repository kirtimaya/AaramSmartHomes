package com.aaramsmarthomes.api.dto.admin;

import java.time.OffsetDateTime;

public record CookSessionMessageResponse(String id, String direction, String text, OffsetDateTime createdAt) {}
