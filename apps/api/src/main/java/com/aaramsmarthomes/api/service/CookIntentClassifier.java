package com.aaramsmarthomes.api.service;

import com.aaramsmarthomes.api.config.AppProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.Map;

/**
 * Classifies a cook's transcribed voice-note reply against a proposed dish
 * using Groq's chat completions (same GROQ_API_KEY as AaraService/SttService),
 * strict-JSON, temperature 0. Extracted as its own injectable service (rather
 * than inlined in CookEngineService) so the state-machine branching logic in
 * CookEngineService can be unit-tested without a live network call.
 */
@Service
public class CookIntentClassifier {

    private static final String GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

    private final AppProperties props;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public CookIntentClassifier(AppProperties props, ObjectMapper objectMapper) {
        this.props = props;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newHttpClient();
    }

    public enum Intent { AGREE, REJECT, CONFUSED }

    /** A wrong guess here just falls through to CONFUSED — the deliberately safe default
     *  (ask the cook to repeat rather than act on a bad guess). */
    public Intent classify(String transcript, String proposedDish) throws Exception {
        String systemPrompt = """
            Tum ek smart home ke liye kaam karte ho. Cook Hindi mein bol raha hai ki aaj ka prastaavit dish theek hai ya nahi.
            Prastaavit dish: %s
            Cook ke jawab ko classify karo:
            - AGREE: haan, theek hai, sahi hai, chalega
            - REJECT: nahi, kuch aur banao, pasand nahi
            - CONFUSED: jawab unclear hai ya dish se related nahi hai
            Sirf JSON return karo, format: {"intent": "AGREE"} ya {"intent": "REJECT"} ya {"intent": "CONFUSED"}
            """.formatted(proposedDish);

        Map<String, Object> requestBody = Map.of(
            "model", props.getGroqModel(),
            "messages", List.of(
                Map.of("role", "system", "content", systemPrompt),
                Map.of("role", "user", "content", transcript)
            ),
            "temperature", 0,
            "max_tokens", 50,
            "response_format", Map.of("type", "json_object")
        );

        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(GROQ_API_URL))
            .header("Authorization", "Bearer " + props.getGroqApiKey())
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(requestBody)))
            .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200) {
            throw new RuntimeException("Groq intent classification failed: " + response.statusCode() + " " + response.body());
        }

        JsonNode json = objectMapper.readTree(response.body());
        String content = json.at("/choices/0/message/content").asText("{}");
        JsonNode intentJson = objectMapper.readTree(content);
        String intent = intentJson.path("intent").asText("CONFUSED").toUpperCase();
        return switch (intent) {
            case "AGREE" -> Intent.AGREE;
            case "REJECT" -> Intent.REJECT;
            default -> Intent.CONFUSED;
        };
    }
}
