package com.aaramsmarthomes.api.repository;

import com.aaramsmarthomes.api.model.DishCatalog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DishCatalogRepository extends JpaRepository<DishCatalog, String> {
    List<DishCatalog> findAllByOrderByNameAsc();
    List<DishCatalog> findByIsFallbackTrueAndActiveTrueOrderByFallbackPriorityAsc();
    Optional<DishCatalog> findFirstByNameIgnoreCase(String name);
}
