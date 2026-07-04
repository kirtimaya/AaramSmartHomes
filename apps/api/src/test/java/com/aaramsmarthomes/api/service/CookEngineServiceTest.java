package com.aaramsmarthomes.api.service;

import com.aaramsmarthomes.api.config.AppProperties;
import com.aaramsmarthomes.api.dto.webhook.WhatsAppMedia;
import com.aaramsmarthomes.api.dto.webhook.WhatsAppMessage;
import com.aaramsmarthomes.api.model.DishCatalog;
import com.aaramsmarthomes.api.model.Menu;
import com.aaramsmarthomes.api.model.MenuItem;
import com.aaramsmarthomes.api.model.WaConversation;
import com.aaramsmarthomes.api.repository.DishCatalogRepository;
import com.aaramsmarthomes.api.repository.MenuItemRepository;
import com.aaramsmarthomes.api.repository.MenuRepository;
import com.aaramsmarthomes.api.repository.WaMessageRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CookEngineServiceTest {

    @Mock MenuRepository menuRepository;
    @Mock MenuItemRepository menuItemRepository;
    @Mock DishCatalogRepository dishCatalogRepository;
    @Mock WaConversationService waConversationService;
    @Mock WaMessageRepository waMessageRepository;
    @Mock WhatsAppService whatsAppService;
    @Mock MediaService mediaService;
    @Mock SttService sttService;
    @Mock TtsService ttsService;
    @Mock CookIntentClassifier intentClassifier;

    CookEngineService service;
    AppProperties props;

    private static final String PHONE = "+919876543210";

    @BeforeEach
    void setup() {
        props = new AppProperties();
        props.setEmergencyContactNumber("+911234567890");
        service = new CookEngineService(props, menuRepository, menuItemRepository, dishCatalogRepository,
            waConversationService, waMessageRepository, whatsAppService, mediaService, sttService,
            ttsService, intentClassifier, new ObjectMapper());
    }

    private WhatsAppMessage audioMessage() {
        return new WhatsAppMessage(PHONE, "wamid.1", "1", "audio", null,
            new WhatsAppMedia("media-1", "audio/ogg", null), null, null, null);
    }

    private WaConversation conversation() {
        WaConversation c = new WaConversation();
        c.setId("conv-1");
        c.setPhoneE164(PHONE);
        c.setFlow("cook_menu");
        c.setState("AWAIT_RESPONSE");
        c.setContext("{}");
        c.setActive(true);
        return c;
    }

    private Menu menu() {
        Menu m = new Menu();
        m.setId("menu-1");
        m.setDate(LocalDate.now());
        m.setMealBlock("Lunch");
        return m;
    }

    private MenuItem item(String name) {
        MenuItem i = new MenuItem();
        i.setId("item-1");
        i.setMenuId("menu-1");
        i.setItemName(name);
        i.setSortOrder(0);
        return i;
    }

    private void stubMediaAndStt(String transcript) throws Exception {
        when(mediaService.downloadMedia("media-1")).thenReturn(new MediaService.DownloadedMedia(new byte[]{1, 2, 3}, "audio/ogg"));
        when(sttService.transcribe(any(), any())).thenReturn(transcript);
    }

    @Test
    void ignores_non_audio_messages() {
        WhatsAppMessage textMessage = new WhatsAppMessage(PHONE, "wamid.2", "1", "text", null, null, null, null, null);

        service.handleCookAudio(PHONE, textMessage);

        verify(whatsAppService).sendText(eq(PHONE), contains("voice note"));
        verifyNoInteractions(mediaService, sttService, intentClassifier);
    }

    @Test
    void agree_sends_confirmation_and_ends_conversation() throws Exception {
        WaConversation conv = conversation();
        when(waConversationService.getOrCreate(PHONE, "cook_menu", "AWAIT_RESPONSE")).thenReturn(conv);
        stubMediaAndStt("haan theek hai");
        when(menuRepository.findByDateAndMealBlock(any(), any())).thenReturn(Optional.of(menu()));
        when(menuItemRepository.findByMenuIdOrderBySortOrderAsc("menu-1")).thenReturn(List.of(item("Dal Tadka")));
        when(intentClassifier.classify(eq("haan theek hai"), eq("Dal Tadka"))).thenReturn(CookIntentClassifier.Intent.AGREE);
        when(dishCatalogRepository.findFirstByNameIgnoreCase(any())).thenReturn(Optional.empty());
        when(ttsService.synthesize(any())).thenReturn(new byte[]{9});
        when(mediaService.uploadMedia(any(), any(), any())).thenReturn("tts-media-1");

        service.handleCookAudio(PHONE, audioMessage());

        verify(whatsAppService).sendText(eq(PHONE), contains("Dal Tadka"));
        verify(whatsAppService).sendAudioById(eq(PHONE), eq("tts-media-1"));
        verify(waConversationService).end(conv);
        verify(menuItemRepository, never()).save(any());
    }

    @Test
    void reject_swaps_menu_item_to_next_available_fallback_and_stays_active() throws Exception {
        WaConversation conv = conversation();
        when(waConversationService.getOrCreate(PHONE, "cook_menu", "AWAIT_RESPONSE")).thenReturn(conv);
        stubMediaAndStt("nahi kuch aur banao");
        when(menuRepository.findByDateAndMealBlock(any(), any())).thenReturn(Optional.of(menu()));
        MenuItem currentItem = item("Dal Tadka");
        when(menuItemRepository.findByMenuIdOrderBySortOrderAsc("menu-1")).thenReturn(List.of(currentItem));
        when(intentClassifier.classify(any(), any())).thenReturn(CookIntentClassifier.Intent.REJECT);

        DishCatalog alt1 = fallbackDish("Rajma Chawal", 0);
        DishCatalog alt2 = fallbackDish("Chole", 1);
        when(dishCatalogRepository.findByIsFallbackTrueAndActiveTrueOrderByFallbackPriorityAsc())
            .thenReturn(List.of(alt1, alt2));
        when(dishCatalogRepository.findFirstByNameIgnoreCase(any())).thenReturn(Optional.empty());
        when(ttsService.synthesize(any())).thenReturn(new byte[]{9});
        when(mediaService.uploadMedia(any(), any(), any())).thenReturn("tts-media-1");

        service.handleCookAudio(PHONE, audioMessage());

        ArgumentCaptor<MenuItem> captor = ArgumentCaptor.forClass(MenuItem.class);
        verify(menuItemRepository).save(captor.capture());
        assertThat(captor.getValue().getItemName()).isEqualTo("Rajma Chawal");
        assertThat(captor.getValue().getDishId()).isEqualTo(alt1.getId());

        // offered[] tracks dishes already rejected (the old dish name), not the newly-proposed one
        verify(waConversationService).transitionState(eq(conv), eq("AWAIT_RESPONSE"), contains("Dal Tadka"));
        verify(waConversationService, never()).end(any());
        verify(whatsAppService).sendText(eq(PHONE), contains("Rajma Chawal"));
    }

    @Test
    void reject_escalates_when_no_fallback_dishes_available() throws Exception {
        WaConversation conv = conversation();
        when(waConversationService.getOrCreate(PHONE, "cook_menu", "AWAIT_RESPONSE")).thenReturn(conv);
        stubMediaAndStt("nahi kuch aur banao");
        when(menuRepository.findByDateAndMealBlock(any(), any())).thenReturn(Optional.of(menu()));
        when(menuItemRepository.findByMenuIdOrderBySortOrderAsc("menu-1")).thenReturn(List.of(item("Dal Tadka")));
        when(intentClassifier.classify(any(), any())).thenReturn(CookIntentClassifier.Intent.REJECT);
        when(dishCatalogRepository.findByIsFallbackTrueAndActiveTrueOrderByFallbackPriorityAsc()).thenReturn(List.of());
        when(ttsService.synthesize(any())).thenReturn(new byte[]{9});
        when(mediaService.uploadMedia(any(), any(), any())).thenReturn("tts-media-1");

        service.handleCookAudio(PHONE, audioMessage());

        verify(whatsAppService).sendText(eq(PHONE), contains("+911234567890"));
        verify(waConversationService).end(conv);
        verify(menuItemRepository, never()).save(any());
    }

    @Test
    void confused_once_asks_cook_to_repeat_without_escalating() throws Exception {
        WaConversation conv = conversation();
        when(waConversationService.getOrCreate(PHONE, "cook_menu", "AWAIT_RESPONSE")).thenReturn(conv);
        stubMediaAndStt("kya bola samajh nahi aaya");
        when(menuRepository.findByDateAndMealBlock(any(), any())).thenReturn(Optional.of(menu()));
        when(menuItemRepository.findByMenuIdOrderBySortOrderAsc("menu-1")).thenReturn(List.of(item("Dal Tadka")));
        when(intentClassifier.classify(any(), any())).thenReturn(CookIntentClassifier.Intent.CONFUSED);

        service.handleCookAudio(PHONE, audioMessage());

        verify(waConversationService).transitionState(eq(conv), eq("AWAIT_RESPONSE"), contains("confusedCount"));
        verify(waConversationService, never()).end(any());
        verify(whatsAppService).sendText(eq(PHONE), contains("Samajh nahi aaya"));
        verifyNoInteractions(ttsService);
    }

    @Test
    void confused_twice_escalates() throws Exception {
        WaConversation conv = conversation();
        conv.setContext("{\"confusedCount\":1}");
        when(waConversationService.getOrCreate(PHONE, "cook_menu", "AWAIT_RESPONSE")).thenReturn(conv);
        stubMediaAndStt("???");
        when(menuRepository.findByDateAndMealBlock(any(), any())).thenReturn(Optional.of(menu()));
        when(menuItemRepository.findByMenuIdOrderBySortOrderAsc("menu-1")).thenReturn(List.of(item("Dal Tadka")));
        when(intentClassifier.classify(any(), any())).thenReturn(CookIntentClassifier.Intent.CONFUSED);
        when(ttsService.synthesize(any())).thenReturn(new byte[]{9});
        when(mediaService.uploadMedia(any(), any(), any())).thenReturn("tts-media-1");

        service.handleCookAudio(PHONE, audioMessage());

        verify(waConversationService).end(conv);
        verify(whatsAppService).sendText(eq(PHONE), contains("+911234567890"));
    }

    @Test
    void escalates_when_no_menu_set_for_current_meal_block() throws Exception {
        WaConversation conv = conversation();
        when(waConversationService.getOrCreate(PHONE, "cook_menu", "AWAIT_RESPONSE")).thenReturn(conv);
        stubMediaAndStt("haan");
        when(menuRepository.findByDateAndMealBlock(any(), any())).thenReturn(Optional.empty());
        when(ttsService.synthesize(any())).thenReturn(new byte[]{9});
        when(mediaService.uploadMedia(any(), any(), any())).thenReturn("tts-media-1");

        service.handleCookAudio(PHONE, audioMessage());

        verify(waConversationService).end(conv);
        verifyNoInteractions(intentClassifier);
    }

    private DishCatalog fallbackDish(String name, int priority) {
        DishCatalog d = new DishCatalog();
        d.setId("dish-" + name.hashCode());
        d.setName(name);
        d.setFallback(true);
        d.setFallbackPriority(priority);
        d.setActive(true);
        return d;
    }
}
