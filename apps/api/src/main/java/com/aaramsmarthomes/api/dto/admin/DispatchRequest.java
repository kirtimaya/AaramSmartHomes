package com.aaramsmarthomes.api.dto.admin;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public record DispatchRequest(
        @NotBlank String trade,
        @NotEmpty List<String> professionalIds,
        @NotEmpty @Size(max = 3, message = "WhatsApp interactive messages support at most 3 buttons") List<SlotInput> slots
) {}
