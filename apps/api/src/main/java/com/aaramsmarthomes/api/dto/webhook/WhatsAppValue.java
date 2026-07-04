package com.aaramsmarthomes.api.dto.webhook;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record WhatsAppValue(
        @JsonProperty("messaging_product") String messagingProduct,
        WhatsAppMetadata metadata,
        List<WhatsAppMessage> messages,
        List<WhatsAppStatus> statuses
) {}
