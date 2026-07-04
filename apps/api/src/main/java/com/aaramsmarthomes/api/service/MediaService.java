package com.aaramsmarthomes.api.service;

import com.aaramsmarthomes.api.config.WhatsAppProperties;
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
 * Downloads/uploads binary media (voice notes, images) against the WhatsApp
 * Cloud API. See MultipartBodyBuilder for the hand-rolled multipart body —
 * not worth a library dependency for this.
 */
@Service
public class MediaService {

    private final WhatsAppProperties props;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public MediaService(WhatsAppProperties props, ObjectMapper objectMapper) {
        this.props = props;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newHttpClient();
    }

    public record DownloadedMedia(byte[] bytes, String mimeType) {}

    /** Resolves a Meta media id to its short-lived signed URL, then downloads the bytes.
     *  Media ids expire after ~30 days server-side, so callers should download promptly. */
    public DownloadedMedia downloadMedia(String mediaId) throws Exception {
        HttpRequest metaRequest = HttpRequest.newBuilder()
            .uri(URI.create(props.graphBaseUrl() + "/" + mediaId))
            .header("Authorization", "Bearer " + props.getToken())
            .GET()
            .build();
        HttpResponse<String> metaResponse = httpClient.send(metaRequest, HttpResponse.BodyHandlers.ofString());
        if (metaResponse.statusCode() != 200) {
            throw new RuntimeException("Failed to resolve media " + mediaId + ": " + metaResponse.statusCode() + " " + metaResponse.body());
        }
        JsonNode json = objectMapper.readTree(metaResponse.body());
        String url = json.path("url").asText(null);
        String mimeType = json.path("mime_type").asText("application/octet-stream");
        if (url == null) {
            throw new RuntimeException("Media metadata for " + mediaId + " had no download url");
        }

        HttpRequest downloadRequest = HttpRequest.newBuilder()
            .uri(URI.create(url))
            .header("Authorization", "Bearer " + props.getToken())
            .GET()
            .build();
        HttpResponse<byte[]> downloadResponse = httpClient.send(downloadRequest, HttpResponse.BodyHandlers.ofByteArray());
        if (downloadResponse.statusCode() != 200) {
            throw new RuntimeException("Failed to download media " + mediaId + ": " + downloadResponse.statusCode());
        }
        return new DownloadedMedia(downloadResponse.body(), mimeType);
    }

    /** Uploads bytes to WhatsApp's media endpoint (required before sending audio/other binary
     *  media by id — unlike images, audio cannot be sent by public link) and returns the media id. */
    public String uploadMedia(byte[] bytes, String mimeType, String filename) throws Exception {
        String boundary = "----aaram-" + UUID.randomUUID();
        byte[] body = MultipartBodyBuilder.build(boundary,
            List.of(new MultipartBodyBuilder.TextField("messaging_product", "whatsapp"),
                    new MultipartBodyBuilder.TextField("type", mimeType)),
            "file", filename, mimeType, bytes);

        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(props.graphBaseUrl() + "/" + props.getPhoneNumberId() + "/media"))
            .header("Authorization", "Bearer " + props.getToken())
            .header("Content-Type", "multipart/form-data; boundary=" + boundary)
            .POST(HttpRequest.BodyPublishers.ofByteArray(body))
            .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200) {
            throw new RuntimeException("Media upload failed: " + response.statusCode() + " " + response.body());
        }
        JsonNode json = objectMapper.readTree(response.body());
        return json.path("id").asText(null);
    }
}
