package com.aaramsmarthomes.api.service;

import com.aaramsmarthomes.api.config.AppProperties;
import com.aaramsmarthomes.api.dto.webhook.WhatsAppMessage;
import com.aaramsmarthomes.api.model.DishCatalog;
import com.aaramsmarthomes.api.model.Menu;
import com.aaramsmarthomes.api.model.MenuItem;
import com.aaramsmarthomes.api.model.WaConversation;
import com.aaramsmarthomes.api.model.WaMessage;
import com.aaramsmarthomes.api.repository.DishCatalogRepository;
import com.aaramsmarthomes.api.repository.MenuItemRepository;
import com.aaramsmarthomes.api.repository.MenuRepository;
import com.aaramsmarthomes.api.repository.WaMessageRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * The cook voice-note state loop: inbound audio → STT → strict-JSON intent
 * classification (CookIntentClassifier) against the day's already-admin-set
 * menu → AGREE (confirm + dish image + Hindi TTS) / REJECT (offer next
 * fallback dish, up to MAX_ALTERNATIVES) / CONFUSED (ask to repeat,
 * escalate after repeats). Alexa remains a separate, untouched channel for
 * the same kitchen data.
 */
@Service
public class CookEngineService {

    private static final Logger log = LoggerFactory.getLogger(CookEngineService.class);
    private static final ZoneId IST = ZoneId.of("Asia/Kolkata");
    private static final int MAX_ALTERNATIVES = 2;
    private static final int MAX_CONFUSED_REPLIES = 2;

    private final AppProperties props;
    private final MenuRepository menuRepository;
    private final MenuItemRepository menuItemRepository;
    private final DishCatalogRepository dishCatalogRepository;
    private final WaConversationService waConversationService;
    private final WaMessageRepository waMessageRepository;
    private final WhatsAppService whatsAppService;
    private final MediaService mediaService;
    private final SttService sttService;
    private final TtsService ttsService;
    private final CookIntentClassifier intentClassifier;
    private final ObjectMapper objectMapper;

    public CookEngineService(AppProperties props, MenuRepository menuRepository, MenuItemRepository menuItemRepository,
                              DishCatalogRepository dishCatalogRepository, WaConversationService waConversationService,
                              WaMessageRepository waMessageRepository, WhatsAppService whatsAppService,
                              MediaService mediaService, SttService sttService, TtsService ttsService,
                              CookIntentClassifier intentClassifier, ObjectMapper objectMapper) {
        this.props = props;
        this.menuRepository = menuRepository;
        this.menuItemRepository = menuItemRepository;
        this.dishCatalogRepository = dishCatalogRepository;
        this.waConversationService = waConversationService;
        this.waMessageRepository = waMessageRepository;
        this.whatsAppService = whatsAppService;
        this.mediaService = mediaService;
        this.sttService = sttService;
        this.ttsService = ttsService;
        this.intentClassifier = intentClassifier;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public void handleCookAudio(String phoneE164, WhatsAppMessage message) {
        if (message.audio() == null) {
            whatsAppService.sendText(phoneE164, "Kripya voice note bhejein — text abhi samajh nahi aata.");
            return;
        }

        WaConversation conversation = waConversationService.getOrCreate(phoneE164, "cook_menu", "AWAIT_RESPONSE");
        try {
            var media = mediaService.downloadMedia(message.audio().id());
            String transcript = sttService.transcribe(media.bytes(), media.mimeType());
            logTurn(conversation, "inbound", transcript);

            String mealBlock = currentMealBlock();
            Menu menu = menuRepository.findByDateAndMealBlock(LocalDate.now(IST), mealBlock).orElse(null);
            if (menu == null) {
                escalate(phoneE164, conversation, "Aaj ka " + mealBlock + " ka menu set nahi hai.");
                return;
            }

            List<MenuItem> items = menuItemRepository.findByMenuIdOrderBySortOrderAsc(menu.getId());
            if (items.isEmpty()) {
                escalate(phoneE164, conversation, "Aaj ka " + mealBlock + " ka menu khaali hai.");
                return;
            }
            MenuItem primaryItem = items.get(0);

            CookIntentClassifier.Intent intent = intentClassifier.classify(transcript, primaryItem.getItemName());
            log.info("Cook {} said \"{}\" for dish \"{}\" — classified as {}", phoneE164, transcript, primaryItem.getItemName(), intent);

            switch (intent) {
                case AGREE -> handleAgree(phoneE164, conversation, primaryItem);
                case REJECT -> handleReject(phoneE164, conversation, primaryItem);
                case CONFUSED -> handleConfused(phoneE164, conversation);
            }
        } catch (Exception e) {
            log.error("Cook engine error for {}", phoneE164, e);
            escalate(phoneE164, conversation, "Kuch technical dikkat aa gayi.");
        }
    }

    private void handleAgree(String phoneE164, WaConversation conversation, MenuItem item) {
        whatsAppService.sendText(phoneE164, item.getItemName() + " confirm! Dhanyavaad.");
        sendDishMediaBestEffort(phoneE164, item.getItemName(), "Confirmed: " + item.getItemName());
        logTurn(conversation, "outbound", "AGREE confirmed: " + item.getItemName());
        waConversationService.end(conversation);
    }

    private void handleReject(String phoneE164, WaConversation conversation, MenuItem currentItem) {
        ObjectNode context = readContext(conversation);
        List<String> offered = offeredNames(context);
        offered.add(currentItem.getItemName());

        Optional<DishCatalog> next = dishCatalogRepository.findByIsFallbackTrueAndActiveTrueOrderByFallbackPriorityAsc().stream()
            .filter(d -> !containsIgnoreCase(offered, d.getName()))
            .findFirst();

        if (next.isEmpty() || offered.size() > MAX_ALTERNATIVES) {
            escalate(phoneE164, conversation, "Koi alternative dish available nahi hai.");
            return;
        }

        DishCatalog dish = next.get();
        currentItem.setItemName(dish.getName());
        currentItem.setDishId(dish.getId());
        menuItemRepository.save(currentItem);

        ArrayNode offeredArray = objectMapper.createArrayNode();
        offered.forEach(offeredArray::add);
        context.set("offered", offeredArray);
        context.remove("confusedCount");
        waConversationService.transitionState(conversation, "AWAIT_RESPONSE", writeContext(context));

        String prompt = "Iske jagah " + dish.getName() + " kaisa rahega?";
        whatsAppService.sendText(phoneE164, prompt);
        sendDishMediaBestEffort(phoneE164, dish.getNameHi() != null ? dish.getNameHi() : dish.getName(), prompt);
        logTurn(conversation, "outbound", "REJECT alternative offered: " + dish.getName());
    }

    private void handleConfused(String phoneE164, WaConversation conversation) {
        ObjectNode context = readContext(conversation);
        int confusedCount = context.path("confusedCount").asInt(0) + 1;

        if (confusedCount >= MAX_CONFUSED_REPLIES) {
            escalate(phoneE164, conversation, "Baat samajhne mein dikkat ho rahi hai.");
            return;
        }

        context.put("confusedCount", confusedCount);
        waConversationService.transitionState(conversation, "AWAIT_RESPONSE", writeContext(context));
        String reply = "Samajh nahi aaya. Kripya 'haan' ya 'nahi' bolein.";
        whatsAppService.sendText(phoneE164, reply);
        logTurn(conversation, "outbound", "CONFUSED, asked to repeat");
    }

    private void escalate(String phoneE164, WaConversation conversation, String reason) {
        String number = props.getEmergencyContactNumber();
        String text = reason + " Kripya admin ko call karein" + (number != null ? ": " + number : ".");
        whatsAppService.sendText(phoneE164, text);
        try {
            byte[] audio = ttsService.synthesize(text);
            String mediaId = mediaService.uploadMedia(audio, "audio/ogg", "escalation.ogg");
            whatsAppService.sendAudioById(phoneE164, mediaId);
        } catch (Exception e) {
            log.warn("Failed to send escalation voice note to {}", phoneE164, e);
        }
        logTurn(conversation, "outbound", "ESCALATED: " + reason);
        waConversationService.end(conversation);
    }

    /** Best-effort — a missing catalog image or a TTS failure shouldn't block the confirm/offer text. */
    private void sendDishMediaBestEffort(String phoneE164, String hindiLabel, String captionEnglish) {
        try {
            dishCatalogRepository.findFirstByNameIgnoreCase(hindiLabel).map(DishCatalog::getImageUrl)
                .ifPresent(url -> whatsAppService.sendImageByLink(phoneE164, url, captionEnglish));
        } catch (Exception e) {
            log.warn("Failed to send dish image to {}", phoneE164, e);
        }
        try {
            byte[] audio = ttsService.synthesize(hindiLabel);
            String mediaId = mediaService.uploadMedia(audio, "audio/ogg", "reply.ogg");
            whatsAppService.sendAudioById(phoneE164, mediaId);
        } catch (Exception e) {
            log.warn("Failed to send TTS voice note to {}", phoneE164, e);
        }
    }

    private String currentMealBlock() {
        LocalTime now = ZonedDateTime.now(IST).toLocalTime();
        if (now.isBefore(LocalTime.of(11, 0))) return "Breakfast";
        if (now.isBefore(LocalTime.of(16, 30))) return "Lunch";
        return "Dinner";
    }

    private ObjectNode readContext(WaConversation conversation) {
        try {
            JsonNode node = objectMapper.readTree(conversation.getContext());
            return node.isObject() ? (ObjectNode) node : objectMapper.createObjectNode();
        } catch (Exception e) {
            return objectMapper.createObjectNode();
        }
    }

    private String writeContext(ObjectNode context) {
        return context.toString();
    }

    private List<String> offeredNames(ObjectNode context) {
        List<String> names = new ArrayList<>();
        JsonNode offered = context.path("offered");
        if (offered.isArray()) offered.forEach(n -> names.add(n.asText()));
        return names;
    }

    private boolean containsIgnoreCase(List<String> list, String value) {
        return list.stream().anyMatch(v -> v.equalsIgnoreCase(value));
    }

    private void logTurn(WaConversation conversation, String direction, String text) {
        try {
            WaMessage msg = new WaMessage();
            msg.setDirection(direction);
            msg.setPhoneE164(conversation.getPhoneE164());
            msg.setMessageType("cook_engine_turn");
            msg.setPayload(objectMapper.writeValueAsString(Map.of("text", text)));
            msg.setConversationId(conversation.getId());
            waMessageRepository.save(msg);
        } catch (Exception e) {
            log.warn("Failed to log cook engine turn", e);
        }
    }
}
