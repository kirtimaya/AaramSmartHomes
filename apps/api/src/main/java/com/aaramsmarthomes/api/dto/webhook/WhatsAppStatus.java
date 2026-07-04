package com.aaramsmarthomes.api.dto.webhook;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public record WhatsAppStatus(
        String id,
        String status,
        String timestamp,
        @JsonProperty("recipient_id") String recipientId
) {}
