package com.aaramsmarthomes.api.controller.admin;

import com.aaramsmarthomes.api.dto.admin.FoodSuggestionResponse;
import com.aaramsmarthomes.api.dto.admin.FoodSuggestionUpdateRequest;
import com.aaramsmarthomes.api.model.FoodSuggestion;
import com.aaramsmarthomes.api.repository.FoodSuggestionRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/api/admin/food-suggestions")
@PreAuthorize("hasRole('ADMIN')")
public class AdminFoodSuggestionController {

    private final FoodSuggestionRepository foodSuggestionRepository;

    public AdminFoodSuggestionController(FoodSuggestionRepository foodSuggestionRepository) {
        this.foodSuggestionRepository = foodSuggestionRepository;
    }

    @GetMapping
    public List<FoodSuggestionResponse> list(@RequestParam(required = false) String status) {
        List<FoodSuggestion> suggestions = status != null
            ? foodSuggestionRepository.findByStatusOrderByCreatedAtDesc(status)
            : foodSuggestionRepository.findAllByOrderByCreatedAtDesc();
        return suggestions.stream().map(FoodSuggestionResponse::from).toList();
    }

    @PatchMapping("/{id}")
    public ResponseEntity<FoodSuggestionResponse> update(@PathVariable String id, @Valid @RequestBody FoodSuggestionUpdateRequest req) {
        FoodSuggestion suggestion = foodSuggestionRepository.findById(id)
            .orElseThrow(() -> new NoSuchElementException("Food suggestion not found: " + id));
        suggestion.setStatus(req.status());
        if (req.adminNote() != null) suggestion.setAdminNote(req.adminNote());
        return ResponseEntity.ok(FoodSuggestionResponse.from(foodSuggestionRepository.save(suggestion)));
    }
}
