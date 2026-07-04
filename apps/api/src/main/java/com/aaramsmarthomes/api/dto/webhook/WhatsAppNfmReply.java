package com.aaramsmarthomes.api.dto.webhook;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

// The submitted-form payload from a WhatsApp Flow. `responseJson` is itself
// a JSON-encoded string (not a nested object) containing the screen's field
// values — Meta double-encodes it this way regardless of Flow complexity.
@JsonIgnoreProperties(ignoreUnknown = true)
public record WhatsAppNfmReply(
        String name,
        String body,
        @JsonProperty("response_json") String responseJson
) {}
