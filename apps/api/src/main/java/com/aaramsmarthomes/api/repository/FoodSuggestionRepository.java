package com.aaramsmarthomes.api.repository;

import com.aaramsmarthomes.api.model.FoodSuggestion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FoodSuggestionRepository extends JpaRepository<FoodSuggestion, String> {
    List<FoodSuggestion> findByStatusOrderByCreatedAtDesc(String status);
    List<FoodSuggestion> findAllByOrderByCreatedAtDesc();
}
