package com.aaramsmarthomes.api.service;

import com.aaramsmarthomes.api.dto.admin.MenuIngredientInput;
import com.aaramsmarthomes.api.dto.admin.MenuItemInput;
import com.aaramsmarthomes.api.dto.admin.MenuResponse;
import com.aaramsmarthomes.api.dto.admin.MenuUpsertRequest;
import com.aaramsmarthomes.api.model.Menu;
import com.aaramsmarthomes.api.model.MenuIngredient;
import com.aaramsmarthomes.api.model.MenuItem;
import com.aaramsmarthomes.api.repository.MenuIngredientRepository;
import com.aaramsmarthomes.api.repository.MenuItemRepository;
import com.aaramsmarthomes.api.repository.MenuRepository;
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
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MenuServiceTest {

    @Mock MenuRepository menuRepository;
    @Mock MenuItemRepository menuItemRepository;
    @Mock MenuIngredientRepository menuIngredientRepository;

    MenuService menuService;

    @BeforeEach
    void setup() {
        menuService = new MenuService(menuRepository, menuItemRepository, menuIngredientRepository);
    }

    private MenuItem item(String menuId, String name, int order) {
        MenuItem i = new MenuItem();
        i.setId("item-" + name);
        i.setMenuId(menuId);
        i.setItemName(name);
        i.setSortOrder(order);
        return i;
    }

    @Test
    void upsert_rejects_invalid_meal_block() {
        MenuUpsertRequest req = new MenuUpsertRequest(LocalDate.of(2026, 7, 3), "Brunch", null, List.of(), List.of());

        assertThatThrownBy(() -> menuService.upsert(req))
            .isInstanceOf(IllegalArgumentException.class);

        verifyNoInteractions(menuRepository);
    }

    @Test
    void upsert_creates_new_menu_when_none_exists_for_date_and_block() {
        LocalDate date = LocalDate.of(2026, 7, 3);
        when(menuRepository.findByDateAndMealBlock(date, "Breakfast")).thenReturn(Optional.empty());
        when(menuRepository.save(any(Menu.class))).thenAnswer(inv -> {
            Menu m = inv.getArgument(0);
            m.setId("menu-1");
            return m;
        });
        when(menuItemRepository.findByMenuIdOrderBySortOrderAsc("menu-1")).thenReturn(
            List.of(item("menu-1", "Idli", 0), item("menu-1", "Sambar", 1)));

        MenuUpsertRequest req = new MenuUpsertRequest(date, "Breakfast", "South Indian",
            List.of(new MenuItemInput("Idli", 0), new MenuItemInput("Sambar", 1)),
            List.of());

        MenuResponse response = menuService.upsert(req);

        assertThat(response.id()).isEqualTo("menu-1");
        assertThat(response.mealBlock()).isEqualTo("Breakfast");
        assertThat(response.items()).hasSize(2);
        verify(menuItemRepository).deleteByMenuId("menu-1");
        verify(menuIngredientRepository).deleteByMenuId("menu-1"); // ingredients: List.of() is non-null → clears
    }

    @Test
    void upsert_replaces_items_and_ingredients_wholesale_when_both_present() {
        LocalDate date = LocalDate.of(2026, 7, 3);
        Menu existing = new Menu();
        existing.setId("menu-existing");
        existing.setDate(date);
        existing.setMealBlock("Lunch");
        when(menuRepository.findByDateAndMealBlock(date, "Lunch")).thenReturn(Optional.of(existing));
        when(menuRepository.save(any(Menu.class))).thenAnswer(inv -> inv.getArgument(0));
        when(menuItemRepository.findByMenuIdOrderBySortOrderAsc("menu-existing"))
            .thenReturn(List.of(item("menu-existing", "Rice", 0)));
        when(menuIngredientRepository.findByMenuId("menu-existing")).thenReturn(List.of());

        MenuUpsertRequest req = new MenuUpsertRequest(date, "Lunch", "updated notes",
            List.of(new MenuItemInput("Rice", 0)),
            List.of(new MenuIngredientInput("Rice", "1", "kg", null)));

        MenuResponse response = menuService.upsert(req);

        assertThat(response.id()).isEqualTo("menu-existing");
        assertThat(response.notes()).isEqualTo("updated notes");
        verify(menuItemRepository).deleteByMenuId("menu-existing");
        verify(menuIngredientRepository).deleteByMenuId("menu-existing");

        ArgumentCaptor<MenuIngredient> ingredientCaptor = ArgumentCaptor.forClass(MenuIngredient.class);
        verify(menuIngredientRepository).save(ingredientCaptor.capture());
        assertThat(ingredientCaptor.getValue().getIngredientName()).isEqualTo("Rice");
        assertThat(ingredientCaptor.getValue().getMenuId()).isEqualTo("menu-existing");
    }

    @Test
    void upsert_with_null_ingredients_does_not_touch_existing_ingredients() {
        // The weekly grid editor only ever sends items — it must never wipe ingredients
        // the day builder set for the same (date, mealBlock).
        LocalDate date = LocalDate.of(2026, 7, 3);
        Menu existing = new Menu();
        existing.setId("menu-existing");
        existing.setDate(date);
        existing.setMealBlock("Dinner");
        when(menuRepository.findByDateAndMealBlock(date, "Dinner")).thenReturn(Optional.of(existing));
        when(menuRepository.save(any(Menu.class))).thenAnswer(inv -> inv.getArgument(0));
        when(menuItemRepository.findByMenuIdOrderBySortOrderAsc("menu-existing"))
            .thenReturn(List.of(item("menu-existing", "Roti", 0)));
        when(menuIngredientRepository.findByMenuId("menu-existing"))
            .thenReturn(List.of()); // stubbed for the read-back in toResponseWithChildren

        MenuUpsertRequest req = new MenuUpsertRequest(date, "Dinner", "Roti + Dal",
            List.of(new MenuItemInput("Roti", 0)), null);

        menuService.upsert(req);

        verify(menuItemRepository).deleteByMenuId("menu-existing");
        verify(menuIngredientRepository, never()).deleteByMenuId(any());
        verify(menuIngredientRepository, never()).save(any());
    }

    @Test
    void upsert_with_null_items_does_not_touch_existing_items() {
        LocalDate date = LocalDate.of(2026, 7, 3);
        Menu existing = new Menu();
        existing.setId("menu-existing");
        existing.setDate(date);
        existing.setMealBlock("Lunch");
        when(menuRepository.findByDateAndMealBlock(date, "Lunch")).thenReturn(Optional.of(existing));
        when(menuRepository.save(any(Menu.class))).thenAnswer(inv -> inv.getArgument(0));
        when(menuItemRepository.findByMenuIdOrderBySortOrderAsc("menu-existing"))
            .thenReturn(List.of(item("menu-existing", "Rice", 0)));
        when(menuIngredientRepository.findByMenuId("menu-existing")).thenReturn(List.of());

        MenuUpsertRequest req = new MenuUpsertRequest(date, "Lunch", "notes only", null,
            List.of(new MenuIngredientInput("Rice", "1", "kg", null)));

        menuService.upsert(req);

        verify(menuItemRepository, never()).deleteByMenuId(any());
        verify(menuIngredientRepository).deleteByMenuId("menu-existing");
    }

    @Test
    void delete_removes_items_ingredients_then_menu() {
        menuService.delete("menu-1");

        verify(menuItemRepository).deleteByMenuId("menu-1");
        verify(menuIngredientRepository).deleteByMenuId("menu-1");
        verify(menuRepository).deleteById("menu-1");
    }
}
