package com.aaramsmarthomes.api.controller.admin;

import com.aaramsmarthomes.api.dto.admin.CookSessionMessageResponse;
import com.aaramsmarthomes.api.dto.admin.CookSessionResponse;
import com.aaramsmarthomes.api.model.WaConversation;
import com.aaramsmarthomes.api.model.WaMessage;
import com.aaramsmarthomes.api.repository.WaConversationRepository;
import com.aaramsmarthomes.api.repository.WaMessageRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/api/admin/cook-sessions")
@PreAuthorize("hasRole('ADMIN')")
public class AdminCookSessionController {

    private final WaConversationRepository conversationRepository;
    private final WaMessageRepository waMessageRepository;
    private final ObjectMapper objectMapper;

    public AdminCookSessionController(WaConversationRepository conversationRepository,
                                       WaMessageRepository waMessageRepository, ObjectMapper objectMapper) {
        this.conversationRepository = conversationRepository;
        this.waMessageRepository = waMessageRepository;
        this.objectMapper = objectMapper;
    }

    @GetMapping
    public List<CookSessionResponse> list(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        List<WaConversation> conversations = date != null
            ? conversationRepository.findByFlowAndCreatedAtBetween("cook_menu",
                date.atStartOfDay(ZoneOffset.UTC).toOffsetDateTime(),
                date.plusDays(1).atStartOfDay(ZoneOffset.UTC).toOffsetDateTime())
            : conversationRepository.findByFlowOrderByCreatedAtDesc("cook_menu");
        return conversations.stream().map(CookSessionResponse::from).toList();
    }

    @GetMapping("/{id}/messages")
    public List<CookSessionMessageResponse> messages(@PathVariable String id) {
        conversationRepository.findById(id).orElseThrow(() -> new NoSuchElementException("Cook session not found: " + id));
        return waMessageRepository.findByConversationIdOrderByCreatedAtAsc(id).stream()
            .map(this::toMessageResponse)
            .toList();
    }

    private CookSessionMessageResponse toMessageResponse(WaMessage message) {
        String text = message.getPayload();
        try {
            if (message.getPayload() != null) {
                text = objectMapper.readTree(message.getPayload()).path("text").asText(message.getPayload());
            }
        } catch (Exception ignored) {
            // fall back to the raw payload string if it isn't the expected {"text": "..."} shape
        }
        OffsetDateTime createdAt = message.getCreatedAt();
        return new CookSessionMessageResponse(message.getId(), message.getDirection(), text, createdAt);
    }
}
