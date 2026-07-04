package com.aaramsmarthomes.api.controller;

import com.aaramsmarthomes.api.config.AppProperties;
import com.aaramsmarthomes.api.config.SecurityConfig;
import com.aaramsmarthomes.api.config.WhatsAppProperties;
import com.aaramsmarthomes.api.repository.WaMessageRepository;
import com.aaramsmarthomes.api.service.OutboxService;
import com.aaramsmarthomes.api.service.RoleService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = WhatsAppWebhookController.class)
@Import(SecurityConfig.class)
@EnableConfigurationProperties({AppProperties.class, WhatsAppProperties.class})
@TestPropertySource(properties = {
    "app.whatsapp.verify-token=test-verify-token",
    "app.whatsapp.app-secret=test-app-secret"
})
class WhatsAppWebhookControllerTest {

    private static final String APP_SECRET = "test-app-secret";

    @Autowired MockMvc mockMvc;

    @MockBean WaMessageRepository waMessageRepository;
    @MockBean OutboxService outboxService;
    @MockBean RoleService roleService;
    @MockBean JwtDecoder jwtDecoder;

    private String hmac(String body) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(APP_SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return "sha256=" + HexFormat.of().formatHex(mac.doFinal(body.getBytes(StandardCharsets.UTF_8)));
    }

    private String samplePayload(String wamid) {
        return """
            {"object":"whatsapp_business_account","entry":[{"id":"waba-1","changes":[{"field":"messages","value":
            {"messaging_product":"whatsapp","messages":[{"from":"+919876543210","id":"%s","timestamp":"1","type":"text","text":{"body":"hi"}}]}
            }]}]}
            """.formatted(wamid);
    }

    // ── GET verify (Meta's one-time subscribe handshake) ───────────────────

    @Test
    void verify_echoes_challenge_when_token_matches() throws Exception {
        mockMvc.perform(get("/api/webhooks/whatsapp")
                .param("hub.mode", "subscribe")
                .param("hub.verify_token", "test-verify-token")
                .param("hub.challenge", "12345"))
            .andExpect(status().isOk())
            .andExpect(content().string("12345"));
    }

    @Test
    void verify_rejects_wrong_token() throws Exception {
        mockMvc.perform(get("/api/webhooks/whatsapp")
                .param("hub.mode", "subscribe")
                .param("hub.verify_token", "wrong-token")
                .param("hub.challenge", "12345"))
            .andExpect(status().isForbidden());
    }

    @Test
    void verify_is_reachable_without_jwt() throws Exception {
        // Proves the /api/webhooks/** permitAll matcher — no Authorization header sent at all.
        mockMvc.perform(get("/api/webhooks/whatsapp")
                .param("hub.mode", "subscribe")
                .param("hub.verify_token", "test-verify-token")
                .param("hub.challenge", "ok"))
            .andExpect(status().isOk());
    }

    // ── POST receive ─────────────────────────────────────────────────────

    @Test
    void receive_accepts_valid_signature_and_enqueues() throws Exception {
        String body = samplePayload("wamid.TEST1");
        when(waMessageRepository.insertIfNewWamid(eq("wamid.TEST1"), eq("inbound"), any(), any(), any()))
            .thenReturn(1);

        mockMvc.perform(post("/api/webhooks/whatsapp")
                .header("X-Hub-Signature-256", hmac(body))
                .contentType("application/json")
                .content(body))
            .andExpect(status().isOk());

        verify(outboxService).enqueue(eq("WA_INBOUND"), eq("wa_message"), eq("wamid.TEST1"), any());
    }

    @Test
    void receive_rejects_missing_signature() throws Exception {
        String body = samplePayload("wamid.TEST2");
        mockMvc.perform(post("/api/webhooks/whatsapp")
                .contentType("application/json")
                .content(body))
            .andExpect(status().isUnauthorized());
        verifyNoInteractions(outboxService);
    }

    @Test
    void receive_rejects_invalid_signature() throws Exception {
        String body = samplePayload("wamid.TEST3");
        mockMvc.perform(post("/api/webhooks/whatsapp")
                .header("X-Hub-Signature-256", "sha256=deadbeef")
                .contentType("application/json")
                .content(body))
            .andExpect(status().isUnauthorized());
        verifyNoInteractions(outboxService);
    }

    @Test
    void receive_skips_enqueue_on_duplicate_wamid() throws Exception {
        String body = samplePayload("wamid.DUP");
        when(waMessageRepository.insertIfNewWamid(eq("wamid.DUP"), any(), any(), any(), any()))
            .thenReturn(0);

        mockMvc.perform(post("/api/webhooks/whatsapp")
                .header("X-Hub-Signature-256", hmac(body))
                .contentType("application/json")
                .content(body))
            .andExpect(status().isOk());

        verifyNoInteractions(outboxService);
    }
}
