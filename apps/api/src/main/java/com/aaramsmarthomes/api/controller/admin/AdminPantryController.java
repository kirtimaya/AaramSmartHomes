package com.aaramsmarthomes.api.controller.admin;

import com.aaramsmarthomes.api.config.UserPrincipalAuthority;
import com.aaramsmarthomes.api.dto.admin.PantryItemRequest;
import com.aaramsmarthomes.api.dto.admin.PantryItemResponse;
import com.aaramsmarthomes.api.model.PantryItem;
import com.aaramsmarthomes.api.model.UserPrincipal;
import com.aaramsmarthomes.api.repository.PantryItemRepository;
import com.aaramsmarthomes.api.service.AuditService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/api/admin/pantry")
@PreAuthorize("hasRole('ADMIN')")
public class AdminPantryController {

    private final PantryItemRepository pantryItemRepository;
    private final AuditService auditService;

    public AdminPantryController(PantryItemRepository pantryItemRepository, AuditService auditService) {
        this.pantryItemRepository = pantryItemRepository;
        this.auditService = auditService;
    }

    @GetMapping
    public List<PantryItemResponse> list() {
        return pantryItemRepository.findAllByOrderByCategoryAscNameAsc().stream()
            .map(PantryItemResponse::from).toList();
    }

    @PostMapping
    public ResponseEntity<PantryItemResponse> create(
            @Valid @RequestBody PantryItemRequest req, Authentication auth,
            @RequestHeader(value = "X-Client-Source", required = false, defaultValue = "web") String source) {
        PantryItem item = new PantryItem();
        applyRequest(item, req);
        PantryItemResponse after = PantryItemResponse.from(pantryItemRepository.save(item));
        auditService.record(extractPrincipal(auth), "pantry_item.create", "pantry_item", after.id(), null, after, source);
        return ResponseEntity.status(HttpStatus.CREATED).body(after);
    }

    @PutMapping("/{id}")
    public ResponseEntity<PantryItemResponse> update(
            @PathVariable String id, @Valid @RequestBody PantryItemRequest req, Authentication auth,
            @RequestHeader(value = "X-Client-Source", required = false, defaultValue = "web") String source) {
        PantryItem item = pantryItemRepository.findById(id)
            .orElseThrow(() -> new NoSuchElementException("Pantry item not found: " + id));
        PantryItemResponse before = PantryItemResponse.from(item);
        applyRequest(item, req);
        PantryItemResponse after = PantryItemResponse.from(pantryItemRepository.save(item));
        auditService.record(extractPrincipal(auth), "pantry_item.update", "pantry_item", id, before, after, source);
        return ResponseEntity.ok(after);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable String id, Authentication auth,
            @RequestHeader(value = "X-Client-Source", required = false, defaultValue = "web") String source) {
        PantryItemResponse before = pantryItemRepository.findById(id).map(PantryItemResponse::from).orElse(null);
        pantryItemRepository.deleteById(id);
        auditService.record(extractPrincipal(auth), "pantry_item.delete", "pantry_item", id, before, null, source);
        return ResponseEntity.noContent().build();
    }

    private UserPrincipal extractPrincipal(Authentication auth) {
        return auth.getAuthorities().stream()
            .filter(a -> a instanceof UserPrincipalAuthority)
            .map(a -> ((UserPrincipalAuthority) a).getPrincipal())
            .findFirst()
            .orElseThrow(() -> new IllegalStateException("No UserPrincipal in context"));
    }

    private void applyRequest(PantryItem item, PantryItemRequest req) {
        item.setName(req.name());
        item.setCategory(req.category() != null ? req.category() : "General");
        item.setQuantity(req.quantity());
        item.setUnit(req.unit());
        item.setStatus(req.status());
        item.setMinThreshold(req.minThreshold());
        item.setMinThresholdUnit(req.minThresholdUnit());
        item.setLastUpdatedAt(OffsetDateTime.now());
    }
}
