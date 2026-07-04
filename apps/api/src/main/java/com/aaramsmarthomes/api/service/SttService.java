package com.aaramsmarthomes.api.service;

import com.aaramsmarthomes.api.config.AppProperties;
import com.aaramsmarthomes.api.service.support.MultipartBodyBuilder;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.UUID;

/**
 * Speech-to-text for cook voice notes via Groq's Whisper endpoint — same
 * GROQ_API_KEY already used by AaraService for chat completions, so no new
 * credential to provision.
 */
@Service
public class SttService {

    private static final String GROQ_TRANSCRIPTION_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
    private static final String MODEL = "whisper-large-v3";

    private final AppProperties props;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public SttService(AppProperties props, ObjectMapper objectMapper) {
        this.props = props;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newHttpClient();
    }

    /** Transcribes Hindi speech from raw audio bytes. WhatsApp voice notes arrive as
     *  audio/ogg;codecs=opus and are passed through unchanged — Whisper accepts ogg directly. */
    public String transcribe(byte[] audioBytes, String mimeType) throws Exception {
        String boundary = "----aaram-stt-" + UUID.randomUUID();
        byte[] body = MultipartBodyBuilder.build(boundary,
            List.of(new MultipartBodyBuilder.TextField("model", MODEL),
                    new MultipartBodyBuilder.TextField("language", "hi"),
                    new MultipartBodyBuilder.TextField("response_format", "json")),
            "file", "voice.ogg", mimeType, audioBytes);

        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(GROQ_TRANSCRIPTION_URL))
            .header("Authorization", "Bearer " + props.getGroqApiKey())
            .header("Content-Type", "multipart/form-data; boundary=" + boundary)
            .POST(HttpRequest.BodyPublishers.ofByteArray(body))
            .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200) {
            throw new RuntimeException("Groq transcription failed: " + response.statusCode() + " " + response.body());
        }
        JsonNode json = objectMapper.readTree(response.body());
        return json.path("text").asText("");
    }
}
