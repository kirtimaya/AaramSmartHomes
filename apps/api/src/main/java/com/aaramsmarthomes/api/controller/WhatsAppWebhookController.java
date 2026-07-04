package com.aaramsmarthomes.api.controller;

import com.aaramsmarthomes.api.config.WhatsAppProperties;
import com.aaramsmarthomes.api.dto.webhook.WhatsAppChange;
import com.aaramsmarthomes.api.dto.webhook.WhatsAppEntry;
import com.aaramsmarthomes.api.dto.webhook.WhatsAppMessage;
import com.aaramsmarthomes.api.dto.webhook.WhatsAppValue;
import com.aaramsmarthomes.api.dto.webhook.WhatsAppWebhookPayload;
import com.aaramsmarthomes.api.repository.WaMessageRepository;
import com.aaramsmarthomes.api.service.OutboxService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.Map;

/**
 * Meta Cloud API webhook receiver. Permitted without JWT in SecurityConfig
 * — authenticity comes from hub.verify_token (GET, one-time subscribe
 * handshake) and the X-Hub-Signature-256 HMAC (POST, every delivery), not
 * from Spring Security. Every POST is ack'd fast: verify, dedupe by wamid,
 * enqueue to the outbox, return 200. Nothing is processed inline — Meta
 * retries aggressively on slow responses, and a cold Cloud Run instance
 * plus an inline Groq/WhatsApp round trip could easily blow past its timeout.
 */
@RestController
@RequestMapping("/api/webhooks/whatsapp")
public class WhatsAppWebhookController {

    private static final Logger log = LoggerFactory.getLogger(WhatsAppWebhookController.class);
    private static final String HMAC_ALGO = "HmacSHA256";

    private final WhatsAppProperties props;
    private final WaMessageRepository waMessageRepository;
    private final OutboxService outboxService;
    private final ObjectMapper objectMapper;

    public WhatsAppWebhookController(WhatsAppProperties props, WaMessageRepository waMessageRepository,
                                      OutboxService outboxService, ObjectMapper objectMapper) {
        this.props = props;
        this.waMessageRepository = waMessageRepository;
        this.outboxService = outboxService;
        this.objectMapper = objectMapper;
    }

    @GetMapping
    public ResponseEntity<String> verify(
            @RequestParam("hub.mode") String mode,
            @RequestParam("hub.verify_token") String verifyToken,
            @RequestParam("hub.challenge") String challenge) {
        boolean tokenConfigured = props.getVerifyToken() != null && !props.getVerifyToken().isBlank();
        if ("subscribe".equals(mode) && tokenConfigured && props.getVerifyToken().equals(verifyToken)) {
            return ResponseEntity.ok(challenge);
        }
        return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
    }

    @PostMapping
    public ResponseEntity<Void> receive(
            @RequestHeader(value = "X-Hub-Signature-256", required = false) String signature,
            @RequestBody String rawBody) {

        if (!isValidSignature(rawBody, signature)) {
            log.warn("WhatsApp webhook signature verification failed");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            WhatsAppWebhookPayload payload = objectMapper.readValue(rawBody, WhatsAppWebhookPayload.class);
            handlePayload(payload);
        } catch (Exception e) {
            // Ack anyway: Meta retries aggressively on non-2xx, and a payload that fails to
            // parse now will fail to parse identically on every retry.
            log.error("Failed to process WhatsApp webhook payload", e);
        }
        return ResponseEntity.ok().build();
    }

    private void handlePayload(WhatsAppWebhookPayload payload) {
        if (payload.entry() == null) return;
        for (WhatsAppEntry entry : payload.entry()) {
            if (entry.changes() == null) continue;
            for (WhatsAppChange change : entry.changes()) {
                WhatsAppValue value = change.value();
                if (value == null || value.messages() == null) continue;
                value.messages().forEach(this::handleInboundMessage);
                // Delivery statuses (sent/delivered/read/failed) are intentionally not persisted —
                // wa_messages already records our own outbound sends against their wamid.
            }
        }
    }

    private void handleInboundMessage(WhatsAppMessage message) {
        try {
            String payloadJson = objectMapper.writeValueAsString(message);
            int inserted = waMessageRepository.insertIfNewWamid(
                message.id(), "inbound", message.from(), message.type(), payloadJson);
            if (inserted == 0) {
                log.info("Duplicate inbound WhatsApp message {}, skipping", message.id());
                return;
            }
            outboxService.enqueue("WA_INBOUND", "wa_message", message.id(),
                Map.of("phone", message.from(), "message", message));
        } catch (Exception e) {
            log.error("Failed to enqueue inbound WhatsApp message {}", message.id(), e);
        }
    }

    private boolean isValidSignature(String rawBody, String signatureHeader) {
        if (props.getAppSecret() == null || props.getAppSecret().isBlank()) {
            // No secret configured — fail closed. This endpoint has no other authentication,
            // so an unconfigured secret must mean "not ready to receive traffic", not "trust
            // everything". Manual/local testing sets a real WHATSAPP_APP_SECRET and computes
            // a matching HMAC (see TESTING.md), same as genuine Meta traffic would.
            return false;
        }
        if (signatureHeader == null || !signatureHeader.startsWith("sha256=")) return false;
        try {
            Mac mac = Mac.getInstance(HMAC_ALGO);
            mac.init(new SecretKeySpec(props.getAppSecret().getBytes(StandardCharsets.UTF_8), HMAC_ALGO));
            byte[] computed = mac.doFinal(rawBody.getBytes(StandardCharsets.UTF_8));
            String computedHex = HexFormat.of().formatHex(computed);
            String providedHex = signatureHeader.substring("sha256=".length());
            return MessageDigest.isEqual(
                computedHex.getBytes(StandardCharsets.UTF_8),
                providedHex.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            log.error("Signature verification error", e);
            return false;
        }
    }
}
