package com.aaramsmarthomes.api.repository;

import com.aaramsmarthomes.api.model.MenuItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MenuItemRepository extends JpaRepository<MenuItem, String> {
    List<MenuItem> findByMenuIdOrderBySortOrderAsc(String menuId);
    void deleteByMenuId(String menuId);
}
