package com.aaramsmarthomes.api.repository;

import com.aaramsmarthomes.api.model.MenuIngredient;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MenuIngredientRepository extends JpaRepository<MenuIngredient, String> {
    List<MenuIngredient> findByMenuId(String menuId);
    void deleteByMenuId(String menuId);
}
