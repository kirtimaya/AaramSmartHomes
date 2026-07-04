package com.aaramsmarthomes.api.dto.webhook;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public record WhatsAppInteractive(
        String type,
        @JsonProperty("button_reply") WhatsAppButtonReply buttonReply,
        @JsonProperty("nfm_reply") WhatsAppNfmReply nfmReply
) {}
