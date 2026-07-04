package com.aaramsmarthomes.api.dto.webhook;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

// The `button` object on an inbound message sent in reply to a quick-reply
// template button (as opposed to `interactive.button_reply`, which arrives
// for free-form interactive messages — Meta uses different shapes for each).
@JsonIgnoreProperties(ignoreUnknown = true)
public record WhatsAppButtonPayload(String text, String payload) {}
