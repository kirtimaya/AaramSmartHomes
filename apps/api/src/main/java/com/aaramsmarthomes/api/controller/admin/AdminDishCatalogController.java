package com.aaramsmarthomes.api.controller.admin;

import com.aaramsmarthomes.api.config.UserPrincipalAuthority;
import com.aaramsmarthomes.api.dto.admin.DishCatalogRequest;
import com.aaramsmarthomes.api.dto.admin.DishCatalogResponse;
import com.aaramsmarthomes.api.model.DishCatalog;
import com.aaramsmarthomes.api.model.UserPrincipal;
import com.aaramsmarthomes.api.repository.DishCatalogRepository;
import com.aaramsmarthomes.api.service.AuditService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/api/admin/dishes")
@PreAuthorize("hasRole('ADMIN')")
public class AdminDishCatalogController {

    private final DishCatalogRepository dishCatalogRepository;
    private final AuditService auditService;

    public AdminDishCatalogController(DishCatalogRepository dishCatalogRepository, AuditService auditService) {
        this.dishCatalogRepository = dishCatalogRepository;
        this.auditService = auditService;
    }

    @GetMapping
    public List<DishCatalogResponse> list() {
        return dishCatalogRepository.findAllByOrderByNameAsc().stream().map(DishCatalogResponse::from).toList();
    }

    @PostMapping
    public ResponseEntity<DishCatalogResponse> create(
            @Valid @RequestBody DishCatalogRequest req, Authentication auth,
            @RequestHeader(value = "X-Client-Source", required = false, defaultValue = "web") String source) {
        DishCatalog dish = new DishCatalog();
        apply(dish, req);
        DishCatalogResponse after = DishCatalogResponse.from(dishCatalogRepository.save(dish));
        auditService.record(extractPrincipal(auth), "dish.create", "dish", after.id(), null, after, source);
        return ResponseEntity.status(HttpStatus.CREATED).body(after);
    }

    @PutMapping("/{id}")
    public ResponseEntity<DishCatalogResponse> update(
            @PathVariable String id, @Valid @RequestBody DishCatalogRequest req, Authentication auth,
            @RequestHeader(value = "X-Client-Source", required = false, defaultValue = "web") String source) {
        DishCatalog dish = dishCatalogRepository.findById(id)
            .orElseThrow(() -> new NoSuchElementException("Dish not found: " + id));
        DishCatalogResponse before = DishCatalogResponse.from(dish);
        apply(dish, req);
        DishCatalogResponse after = DishCatalogResponse.from(dishCatalogRepository.save(dish));
        auditService.record(extractPrincipal(auth), "dish.update", "dish", id, before, after, source);
        return ResponseEntity.ok(after);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable String id, Authentication auth,
            @RequestHeader(value = "X-Client-Source", required = false, defaultValue = "web") String source) {
        DishCatalogResponse before = dishCatalogRepository.findById(id).map(DishCatalogResponse::from).orElse(null);
        dishCatalogRepository.deleteById(id);
        auditService.record(extractPrincipal(auth), "dish.delete", "dish", id, before, null, source);
        return ResponseEntity.noContent().build();
    }

    private UserPrincipal extractPrincipal(Authentication auth) {
        return auth.getAuthorities().stream()
            .filter(a -> a instanceof UserPrincipalAuthority)
            .map(a -> ((UserPrincipalAuthority) a).getPrincipal())
            .findFirst()
            .orElseThrow(() -> new IllegalStateException("No UserPrincipal in context"));
    }

    private void apply(DishCatalog dish, DishCatalogRequest req) {
        dish.setName(req.name());
        dish.setNameHi(req.nameHi());
        dish.setImageUrl(req.imageUrl());
        dish.setFallback(req.isFallback());
        dish.setFallbackPriority(req.fallbackPriority());
        dish.setActive(req.active());
    }
}
