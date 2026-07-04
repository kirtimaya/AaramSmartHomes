package com.aaramsmarthomes.api.service;

import com.aaramsmarthomes.api.config.AppProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Base64;
import java.util.Map;

/**
 * Hindi text-to-speech via the Google Cloud TTS REST API with a plain API
 * key (no service-account JSON / ADC). Chosen over the GCP Java SDK: one
 * HTTP call, zero new Maven dependencies (the SDK pulls in gRPC), and
 * OGG_OPUS output is exactly WhatsApp's voice-note codec so the result is
 * uploadable to MediaService.uploadMedia without transcoding.
 */
@Service
public class TtsService {

    private static final String TTS_URL = "https://texttospeech.googleapis.com/v1/text:synthesize";

    private final AppProperties props;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public TtsService(AppProperties props, ObjectMapper objectMapper) {
        this.props = props;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newHttpClient();
    }

    /** Synthesizes Hindi speech, returning OGG_OPUS-encoded audio bytes ready to upload. */
    public byte[] synthesize(String text) throws Exception {
        Map<String, Object> requestBody = Map.of(
            "input", Map.of("text", text),
            "voice", Map.of("languageCode", "hi-IN", "name", props.getGoogleTtsVoice()),
            "audioConfig", Map.of("audioEncoding", "OGG_OPUS")
        );
        String requestJson = objectMapper.writeValueAsString(requestBody);

        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(TTS_URL + "?key=" + props.getGoogleTtsApiKey()))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(requestJson))
            .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200) {
            throw new RuntimeException("Google TTS synthesis failed: " + response.statusCode() + " " + response.body());
        }

        JsonNode json = objectMapper.readTree(response.body());
        String base64Audio = json.path("audioContent").asText(null);
        if (base64Audio == null) {
            throw new RuntimeException("Google TTS response had no audioContent");
        }
        return Base64.getDecoder().decode(base64Audio);
    }
}
