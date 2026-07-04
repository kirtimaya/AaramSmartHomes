package com.aaramsmarthomes.api.dto.admin;

import com.aaramsmarthomes.api.model.Professional;

import java.time.OffsetDateTime;

public record ProfessionalResponse(
        String id, String name, String phoneE164, String role, String trade, boolean active,
        String notes, OffsetDateTime createdAt
) {
    public static ProfessionalResponse from(Professional p) {
        return new ProfessionalResponse(p.getId(), p.getName(), p.getPhoneE164(), p.getRole(),
            p.getTrade(), p.isActive(), p.getNotes(), p.getCreatedAt());
    }
}
