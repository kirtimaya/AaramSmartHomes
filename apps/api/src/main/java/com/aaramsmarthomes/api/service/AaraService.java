package com.aaramsmarthomes.api.service;

import com.aaramsmarthomes.api.config.AppProperties;
import com.aaramsmarthomes.api.model.UserPrincipal;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Thin HTTP proxy from the mobile-facing /api/aara contract to the web app's
 * /api/chat — the actual Gemini function-calling agent (tools, role-scoped
 * data access, audit writes) lives there as of Phase 6/7. This keeps mobile
 * builds on the same stable {@link com.aaramsmarthomes.api.dto.AaraChatResponse}
 * shape while avoiding a second, divergent implementation of the agent.
 */
@Service
public class AaraService {

    private final AppProperties props;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public AaraService(AppProperties props, ObjectMapper objectMapper) {
        this.props = props;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newHttpClient();
    }

    public String chat(String userMessage, String context, UserPrincipal principal, String bearerToken) throws Exception {
        String combinedMessage = (context != null && !context.isBlank())
            ? userMessage + "\n\nContext: " + context
            : userMessage;

        String requestJson = buildRequestJson(combinedMessage);

        HttpRequest.Builder builder = HttpRequest.newBuilder()
            .uri(URI.create(props.getWebBaseUrl() + "/api/chat"))
            .header("Content-Type", "application/json")
            .header("X-Client-Source", "mobile")
            .POST(HttpRequest.BodyPublishers.ofString(requestJson));
        if (bearerToken != null && !bearerToken.isBlank()) {
            builder.header("Authorization", "Bearer " + bearerToken);
        }

        HttpResponse<String> response = httpClient.send(builder.build(), HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            throw new RuntimeException("Aara proxy error: " + response.statusCode() + " " + response.body());
        }

        return parseReply(response.body());
    }

    /** Builds the JSON body sent to /api/chat. `stream:false` so the response is one aggregate JSON payload. */
    String buildRequestJson(String message) throws Exception {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("message", message);
        body.put("history", java.util.List.of());
        body.put("stream", false);
        return objectMapper.writeValueAsString(body);
    }

    /** Extracts the `reply` field from /api/chat's aggregate `{reply, action, data}` response. */
    String parseReply(String responseBody) throws Exception {
        JsonNode json = objectMapper.readTree(responseBody);
        JsonNode reply = json.get("reply");
        return reply != null && !reply.isNull() ? reply.asText() : "";
    }
}
