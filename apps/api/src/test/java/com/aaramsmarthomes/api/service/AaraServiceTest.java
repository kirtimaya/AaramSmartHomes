package com.aaramsmarthomes.api.service;

import com.aaramsmarthomes.api.config.AppProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * The actual HTTP round trip to the web app's /api/chat is not unit-tested here
 * (same convention as MediaService/WhatsAppService's raw HttpClient calls) —
 * these tests cover the pure request/response translation the proxy relies on.
 */
class AaraServiceTest {

    AaraService aaraService;

    @BeforeEach
    void setup() {
        AppProperties props = new AppProperties();
        props.setWebBaseUrl("http://localhost:3000");
        aaraService = new AaraService(props, new ObjectMapper());
    }

    @Test
    void buildRequestJson_wraps_message_as_non_streaming_chat_request() throws Exception {
        String json = aaraService.buildRequestJson("What's for lunch today?");

        assertThat(json).contains("\"message\":\"What's for lunch today?\"");
        assertThat(json).contains("\"stream\":false");
        assertThat(json).contains("\"history\":[]");
    }

    @Test
    void parseReply_extracts_reply_field_from_aggregate_response() throws Exception {
        String responseBody = "{\"reply\":\"Today's lunch is Dal Tadka and rice.\",\"action\":null,\"data\":null}";

        String reply = aaraService.parseReply(responseBody);

        assertThat(reply).isEqualTo("Today's lunch is Dal Tadka and rice.");
    }

    @Test
    void parseReply_returns_empty_string_when_reply_is_null() throws Exception {
        String responseBody = "{\"reply\":null,\"action\":\"navigate\",\"data\":{\"path\":\"/admin\"}}";

        String reply = aaraService.parseReply(responseBody);

        assertThat(reply).isEmpty();
    }

    @Test
    void parseReply_throws_on_malformed_json() {
        assertThatThrownBy(() -> aaraService.parseReply("not json"))
            .isInstanceOf(Exception.class);
    }
}
