package com.aaramsmarthomes.api.dto.webhook;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record WhatsAppMessage(
        String from,
        String id,
        String timestamp,
        String type,
        WhatsAppText text,
        WhatsAppMedia audio,
        WhatsAppMedia image,
        WhatsAppInteractive interactive,
        WhatsAppButtonPayload button
) {}
