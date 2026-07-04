package com.aaramsmarthomes.api.controller.admin;

import com.aaramsmarthomes.api.config.UserPrincipalAuthority;
import com.aaramsmarthomes.api.dto.admin.GroceryAlertResponse;
import com.aaramsmarthomes.api.model.GroceryAlert;
import com.aaramsmarthomes.api.model.UserPrincipal;
import com.aaramsmarthomes.api.repository.GroceryAlertRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/api/admin/grocery-alerts")
@PreAuthorize("hasRole('ADMIN')")
public class AdminGroceryAlertController {

    private final GroceryAlertRepository groceryAlertRepository;

    public AdminGroceryAlertController(GroceryAlertRepository groceryAlertRepository) {
        this.groceryAlertRepository = groceryAlertRepository;
    }

    /** resolved omitted → all; resolved=true → resolved only; resolved=false → pending only. */
    @GetMapping
    public List<GroceryAlertResponse> list(@RequestParam(required = false) Boolean resolved) {
        List<GroceryAlert> alerts;
        if (resolved == null) {
            alerts = groceryAlertRepository.findAllByOrderByLoggedAtDesc();
        } else if (resolved) {
            alerts = groceryAlertRepository.findByResolvedAtIsNotNullOrderByLoggedAtDesc();
        } else {
            alerts = groceryAlertRepository.findByResolvedAtIsNullOrderByLoggedAtDesc();
        }
        return alerts.stream().map(GroceryAlertResponse::from).toList();
    }

    @PostMapping("/{id}/resolve")
    public ResponseEntity<GroceryAlertResponse> resolve(@PathVariable String id, Authentication auth) {
        GroceryAlert alert = groceryAlertRepository.findById(id)
            .orElseThrow(() -> new NoSuchElementException("Grocery alert not found: " + id));
        UserPrincipal principal = extractPrincipal(auth);
        alert.setResolvedAt(OffsetDateTime.now());
        alert.setResolvedBy(principal.email());
        return ResponseEntity.ok(GroceryAlertResponse.from(groceryAlertRepository.save(alert)));
    }

    private UserPrincipal extractPrincipal(Authentication auth) {
        return auth.getAuthorities().stream()
            .filter(a -> a instanceof UserPrincipalAuthority)
            .map(a -> ((UserPrincipalAuthority) a).getPrincipal())
            .findFirst()
            .orElseThrow(() -> new IllegalStateException("No UserPrincipal in context"));
    }
}
