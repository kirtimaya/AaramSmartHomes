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
import java.util.List;
import java.util.Map;

@Service
public class AaraService {

    private static final String GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

    private final AppProperties props;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public AaraService(AppProperties props, ObjectMapper objectMapper) {
        this.props = props;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newHttpClient();
    }

    public String chat(String userMessage, String context, UserPrincipal principal) throws Exception {
        String systemPrompt = buildSystemPrompt(principal, context);

        Map<String, Object> requestBody = Map.of(
            "model", props.getGroqModel(),
            "messages", List.of(
                Map.of("role", "system", "content", systemPrompt),
                Map.of("role", "user",   "content", userMessage)
            ),
            "temperature", 0.7,
            "max_tokens",  512
        );

        String requestJson = objectMapper.writeValueAsString(requestBody);

        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(GROQ_API_URL))
            .header("Authorization", "Bearer " + props.getGroqApiKey())
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(requestJson))
            .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            throw new RuntimeException("Groq API error: " + response.statusCode() + " " + response.body());
        }

        JsonNode json = objectMapper.readTree(response.body());
        return json.at("/choices/0/message/content").asText();
    }

    private String buildSystemPrompt(UserPrincipal principal, String context) {
        String role = principal.role().name().toLowerCase();
        String base = """
            You are Aara, a friendly and helpful AI assistant for Aaram Smart Homes — a smart property management platform.
            You help members, guests, and admins with property-related questions.
            Always be concise, warm, and professional. Keep replies under 150 words unless more detail is necessary.
            Current user role: %s.
            """.formatted(role);

        String rolePrompt = switch (principal.role()) {
            case ADMIN -> base + "You are assisting an admin. Help with member management, financial summaries, maintenance tickets, and operational questions.";
            case TENANT -> base + "You are assisting a member. Help with rent queries, maintenance requests, amenity information, and living tips.";
            case GUEST -> base + "You are assisting a prospective guest. Help with property discovery, visit scheduling, and general enquiries.";
        };

        return rolePrompt + (context != null && !context.isBlank() ? "\nAdditional context:\n" + context : "");
    }
}
