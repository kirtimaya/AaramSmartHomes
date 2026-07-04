package com.aaramsmarthomes.api.controller.admin;

import com.aaramsmarthomes.api.config.UserPrincipalAuthority;
import com.aaramsmarthomes.api.dto.admin.MenuResponse;
import com.aaramsmarthomes.api.dto.admin.MenuUpsertRequest;
import com.aaramsmarthomes.api.model.UserPrincipal;
import com.aaramsmarthomes.api.service.AuditService;
import com.aaramsmarthomes.api.service.MenuService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/menus")
@PreAuthorize("hasRole('ADMIN')")
public class AdminMenuController {

    private final MenuService menuService;
    private final AuditService auditService;

    public AdminMenuController(MenuService menuService, AuditService auditService) {
        this.menuService = menuService;
        this.auditService = auditService;
    }

    @GetMapping
    public List<MenuResponse> list(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return menuService.findRange(from, to);
    }

    /** Upsert-by-(date, mealBlock), replacing items/ingredients wholesale — mirrors the web
     *  admin's existing "save the whole day" MenuBuilder UX. */
    @PutMapping
    public ResponseEntity<MenuResponse> upsert(
            @Valid @RequestBody MenuUpsertRequest req,
            Authentication auth,
            @RequestHeader(value = "X-Client-Source", required = false, defaultValue = "web") String source) {
        MenuResponse before = menuService.findRange(req.date(), req.date()).stream()
            .filter(m -> m.mealBlock().equals(req.mealBlock()))
            .findFirst().orElse(null);
        MenuResponse after = menuService.upsert(req);
        auditService.record(extractPrincipal(auth), "menu.upsert", "menu", after.id(), before, after, source);
        return ResponseEntity.ok(after);
    }

    @PatchMapping("/{id}/notes")
    public ResponseEntity<MenuResponse> updateNotes(
            @PathVariable String id, @RequestBody Map<String, String> body,
            Authentication auth,
            @RequestHeader(value = "X-Client-Source", required = false, defaultValue = "web") String source) {
        MenuResponse before = menuService.findById(id);
        MenuResponse after = menuService.updateNotes(id, body.get("notes"));
        auditService.record(extractPrincipal(auth), "menu.update_notes", "menu", id, before, after, source);
        return ResponseEntity.ok(after);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable String id,
            Authentication auth,
            @RequestHeader(value = "X-Client-Source", required = false, defaultValue = "web") String source) {
        MenuResponse before = menuService.findById(id);
        menuService.delete(id);
        auditService.record(extractPrincipal(auth), "menu.delete", "menu", id, before, null, source);
        return ResponseEntity.noContent().build();
    }

    private UserPrincipal extractPrincipal(Authentication auth) {
        return auth.getAuthorities().stream()
            .filter(a -> a instanceof UserPrincipalAuthority)
            .map(a -> ((UserPrincipalAuthority) a).getPrincipal())
            .findFirst()
            .orElseThrow(() -> new IllegalStateException("No UserPrincipal in context"));
    }
}
