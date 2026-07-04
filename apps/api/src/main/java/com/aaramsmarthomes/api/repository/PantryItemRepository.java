package com.aaramsmarthomes.api.repository;

import com.aaramsmarthomes.api.model.PantryItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PantryItemRepository extends JpaRepository<PantryItem, String> {
    List<PantryItem> findAllByOrderByCategoryAscNameAsc();
}
