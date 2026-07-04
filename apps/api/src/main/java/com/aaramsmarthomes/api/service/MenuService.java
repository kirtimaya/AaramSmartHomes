package com.aaramsmarthomes.api.service;

import com.aaramsmarthomes.api.dto.admin.MenuIngredientInput;
import com.aaramsmarthomes.api.dto.admin.MenuIngredientResponse;
import com.aaramsmarthomes.api.dto.admin.MenuItemInput;
import com.aaramsmarthomes.api.dto.admin.MenuItemResponse;
import com.aaramsmarthomes.api.dto.admin.MenuResponse;
import com.aaramsmarthomes.api.dto.admin.MenuUpsertRequest;
import com.aaramsmarthomes.api.model.Menu;
import com.aaramsmarthomes.api.model.MenuIngredient;
import com.aaramsmarthomes.api.model.MenuItem;
import com.aaramsmarthomes.api.repository.DishCatalogRepository;
import com.aaramsmarthomes.api.repository.MenuIngredientRepository;
import com.aaramsmarthomes.api.repository.MenuItemRepository;
import com.aaramsmarthomes.api.repository.MenuRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Set;

@Service
public class MenuService {

    private static final Set<String> VALID_MEAL_BLOCKS = Set.of("Breakfast", "Lunch", "Dinner");

    private final MenuRepository menuRepository;
    private final MenuItemRepository menuItemRepository;
    private final MenuIngredientRepository menuIngredientRepository;
    private final DishCatalogRepository dishCatalogRepository;

    public MenuService(MenuRepository menuRepository, MenuItemRepository menuItemRepository,
                        MenuIngredientRepository menuIngredientRepository, DishCatalogRepository dishCatalogRepository) {
        this.menuRepository = menuRepository;
        this.menuItemRepository = menuItemRepository;
        this.menuIngredientRepository = menuIngredientRepository;
        this.dishCatalogRepository = dishCatalogRepository;
    }

    /** Upserts a menu keyed by (date, meal_block). Items and ingredients are each replaced
     *  wholesale (delete-then-reinsert) ONLY when present in the request — null (vs. an empty
     *  list) means "don't touch this collection". This matters because two different admin UIs
     *  write here: the weekly grid editor only ever sends items (a "Dal + Rice"-style cell,
     *  split on save) and must never wipe ingredients the day builder set for the same meal,
     *  and vice versa. */
    @Transactional
    public MenuResponse upsert(MenuUpsertRequest req) {
        if (!VALID_MEAL_BLOCKS.contains(req.mealBlock())) {
            throw new IllegalArgumentException("mealBlock must be one of " + VALID_MEAL_BLOCKS);
        }

        Menu menu = menuRepository.findByDateAndMealBlock(req.date(), req.mealBlock()).orElseGet(Menu::new);
        menu.setDate(req.date());
        menu.setMealBlock(req.mealBlock());
        menu.setNotes(req.notes());
        Menu saved = menuRepository.save(menu);

        if (req.items() != null) {
            menuItemRepository.deleteByMenuId(saved.getId());
            req.items().forEach(input -> saveItem(saved.getId(), input));
        }
        if (req.ingredients() != null) {
            menuIngredientRepository.deleteByMenuId(saved.getId());
            req.ingredients().forEach(input -> saveIngredient(saved.getId(), input));
        }

        return toResponseWithChildren(saved);
    }

    @Transactional(readOnly = true)
    public List<MenuResponse> findRange(LocalDate from, LocalDate to) {
        return menuRepository.findByDateBetweenOrderByDateAscMealBlockAsc(from, to).stream()
            .map(this::toResponseWithChildren)
            .toList();
    }

    /** Used by callers (e.g. audit-log before-image capture) that only have the menu id. */
    @Transactional(readOnly = true)
    public MenuResponse findById(String menuId) {
        return menuRepository.findById(menuId).map(this::toResponseWithChildren).orElse(null);
    }

    @Transactional
    public void delete(String menuId) {
        menuItemRepository.deleteByMenuId(menuId);
        menuIngredientRepository.deleteByMenuId(menuId);
        menuRepository.deleteById(menuId);
    }

    @Transactional
    public MenuResponse updateNotes(String menuId, String notes) {
        Menu menu = menuRepository.findById(menuId)
            .orElseThrow(() -> new NoSuchElementException("Menu not found: " + menuId));
        menu.setNotes(notes);
        return toResponseWithChildren(menuRepository.save(menu));
    }

    /** Links item_name to dish_catalog by case-insensitive exact match so nutrition (Phase 3)
     *  and consumption aggregation (Phase 5) can join through dish_id. Composite weekly-grid
     *  entries (e.g. "Poha + Sev") won't match anything — dish_id stays null and downstream
     *  nutrition views degrade gracefully for those items. */
    private void saveItem(String menuId, MenuItemInput input) {
        MenuItem item = new MenuItem();
        item.setMenuId(menuId);
        item.setItemName(input.itemName());
        item.setSortOrder(input.sortOrder());
        dishCatalogRepository.findFirstByNameIgnoreCase(input.itemName())
            .ifPresent(dish -> item.setDishId(dish.getId()));
        menuItemRepository.save(item);
    }

    private void saveIngredient(String menuId, MenuIngredientInput input) {
        MenuIngredient ingredient = new MenuIngredient();
        ingredient.setMenuId(menuId);
        ingredient.setIngredientName(input.ingredientName());
        ingredient.setQuantity(input.quantity());
        ingredient.setUnit(input.unit());
        ingredient.setNotes(input.notes());
        menuIngredientRepository.save(ingredient);
    }

    private MenuResponse toResponseWithChildren(Menu menu) {
        List<MenuItemResponse> items = menuItemRepository.findByMenuIdOrderBySortOrderAsc(menu.getId())
            .stream().map(MenuItemResponse::from).toList();
        List<MenuIngredientResponse> ingredients = menuIngredientRepository.findByMenuId(menu.getId())
            .stream().map(MenuIngredientResponse::from).toList();
        return MenuResponse.from(menu, items, ingredients);
    }
}
