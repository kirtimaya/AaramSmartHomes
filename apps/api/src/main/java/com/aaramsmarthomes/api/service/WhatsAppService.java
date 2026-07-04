package com.aaramsmarthomes.api.service;

import com.aaramsmarthomes.api.config.WhatsAppProperties;
import com.aaramsmarthomes.api.model.WaMessage;
import com.aaramsmarthomes.api.repository.WaMessageRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Thin wrapper over the WhatsApp Cloud API (Graph API). Every send method
 * no-ops (logs only) when app.whatsapp.enabled=false or credentials are
 * absent, mirroring apps/web/src/lib/whatsapp.ts's existing no-op contract
 * so this stays safe to deploy dark. Every send attempt — including no-ops
 * and failures — is logged to wa_messages for the admin dashboard.
 */
@Service
public class WhatsAppService {

    private static final Logger log = LoggerFactory.getLogger(WhatsAppService.class);

    // WhatsApp's own hard limit on interactive reply buttons per message.
    private static final int MAX_INTERACTIVE_BUTTONS = 3;

    private final WhatsAppProperties props;
    private final WaMessageRepository waMessageRepository;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public WhatsAppService(WhatsAppProperties props, WaMessageRepository waMessageRepository, ObjectMapper objectMapper) {
        this.props = props;
        this.waMessageRepository = waMessageRepository;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newHttpClient();
    }

    public record Button(String id, String title) {}

    public void sendText(String toE164, String body) {
        Map<String, Object> message = Map.of(
            "messaging_product", "whatsapp",
            "to", toE164,
            "type", "text",
            "text", Map.of("body", body)
        );
        send(toE164, "text", message);
    }

    public void sendInteractiveButtons(String toE164, String bodyText, List<Button> buttons) {
        if (buttons.isEmpty() || buttons.size() > MAX_INTERACTIVE_BUTTONS) {
            throw new IllegalArgumentException(
                "WhatsApp interactive messages support 1-" + MAX_INTERACTIVE_BUTTONS + " buttons, got " + buttons.size());
        }
        List<Map<String, Object>> buttonObjects = buttons.stream().map(this::buttonObject).toList();

        Map<String, Object> message = Map.of(
            "messaging_product", "whatsapp",
            "to", toE164,
            "type", "interactive",
            "interactive", Map.of(
                "type", "button",
                "body", Map.of("text", bodyText),
                "action", Map.of("buttons", buttonObjects)
            )
        );
        send(toE164, "interactive", message);
    }

    /** components: raw Graph API template component list, e.g. body/button parameter substitutions. */
    public void sendTemplate(String toE164, String templateName, String languageCode, Object components) {
        Map<String, Object> template = new LinkedHashMap<>();
        template.put("name", templateName);
        template.put("language", Map.of("code", languageCode));
        if (components != null) template.put("components", components);

        Map<String, Object> message = Map.of(
            "messaging_product", "whatsapp",
            "to", toE164,
            "type", "template",
            "template", template
        );
        send(toE164, "template", message);
    }

    /** Sends a CTA that launches a published WhatsApp Flow. flowToken round-trips back on submit. */
    public void sendFlow(String toE164, String bodyText, String flowToken, String ctaText) {
        Map<String, Object> message = Map.of(
            "messaging_product", "whatsapp",
            "to", toE164,
            "type", "interactive",
            "interactive", Map.of(
                "type", "flow",
                "body", Map.of("text", bodyText),
                "action", Map.of(
                    "name", "flow",
                    "parameters", Map.of(
                        "flow_message_version", "3",
                        "flow_token", flowToken,
                        "flow_id", props.getFeedbackFlowId(),
                        "flow_cta", ctaText,
                        "flow_action", "navigate"
                    )
                )
            )
        );
        send(toE164, "interactive", message);
    }

    public void sendImageByLink(String toE164, String imageUrl, String caption) {
        Map<String, Object> imagePayload = caption != null
            ? Map.of("link", imageUrl, "caption", caption)
            : Map.of("link", imageUrl);
        Map<String, Object> message = Map.of(
            "messaging_product", "whatsapp",
            "to", toE164,
            "type", "image",
            "image", imagePayload
        );
        send(toE164, "image", message);
    }

    /** mediaId must come from MediaService.uploadMedia — WhatsApp requires audio to be pre-uploaded. */
    public void sendAudioById(String toE164, String mediaId) {
        Map<String, Object> message = Map.of(
            "messaging_product", "whatsapp",
            "to", toE164,
            "type", "audio",
            "audio", Map.of("id", mediaId)
        );
        send(toE164, "audio", message);
    }

    private Map<String, Object> buttonObject(Button b) {
        return Map.of("type", "reply", "reply", Map.of("id", b.id(), "title", b.title()));
    }

    private void send(String toE164, String messageType, Map<String, Object> body) {
        if (!isConfigured()) {
            log.info("[whatsapp:disabled] would send {} to {}: {}", messageType, toE164, body);
            logMessage(toE164, messageType, body, null);
            return;
        }
        try {
            String requestJson = objectMapper.writeValueAsString(body);
            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(props.graphBaseUrl() + "/" + props.getPhoneNumberId() + "/messages"))
                .header("Authorization", "Bearer " + props.getToken())
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(requestJson))
                .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() / 100 != 2) {
                log.error("WhatsApp send failed ({}): {}", response.statusCode(), response.body());
                logMessage(toE164, messageType, body, null);
                return;
            }
            logMessage(toE164, messageType, body, extractMessageId(response.body()));
        } catch (Exception e) {
            log.error("WhatsApp send error", e);
            logMessage(toE164, messageType, body, null);
        }
    }

    private boolean isConfigured() {
        return props.isEnabled()
            && props.getToken() != null && !props.getToken().isBlank()
            && props.getPhoneNumberId() != null && !props.getPhoneNumberId().isBlank();
    }

    private String extractMessageId(String responseBody) {
        try {
            JsonNode json = objectMapper.readTree(responseBody);
            JsonNode idNode = json.at("/messages/0/id");
            return idNode.isMissingNode() ? null : idNode.asText();
        } catch (Exception e) {
            return null;
        }
    }

    private void logMessage(String toE164, String messageType, Map<String, Object> body, String waMessageId) {
        try {
            WaMessage msg = new WaMessage();
            msg.setWaMessageId(waMessageId);
            msg.setDirection("outbound");
            msg.setPhoneE164(toE164);
            msg.setMessageType(messageType);
            msg.setPayload(objectMapper.writeValueAsString(body));
            waMessageRepository.save(msg);
        } catch (Exception e) {
            log.error("Failed to log outbound wa_message", e);
        }
    }
}
