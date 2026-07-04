package com.aaramsmarthomes.api.dto.admin;

import jakarta.validation.constraints.NotBlank;

public record ResolveExternalRequest(@NotBlank String externalService) {}
