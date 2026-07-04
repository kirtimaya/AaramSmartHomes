package com.aaramsmarthomes.api.repository;

import com.aaramsmarthomes.api.model.GroceryAlert;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GroceryAlertRepository extends JpaRepository<GroceryAlert, String> {
    List<GroceryAlert> findByResolvedAtIsNullOrderByLoggedAtDesc();
    List<GroceryAlert> findByResolvedAtIsNotNullOrderByLoggedAtDesc();
    List<GroceryAlert> findAllByOrderByLoggedAtDesc();
}
