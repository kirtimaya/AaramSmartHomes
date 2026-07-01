package com.aaramsmarthomes.api.controller;

import com.aaramsmarthomes.api.config.UserPrincipalAuthority;
import com.aaramsmarthomes.api.dto.NotificationResponse;
import com.aaramsmarthomes.api.model.UserPrincipal;
import com.aaramsmarthomes.api.repository.NotificationRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationRepository notificationRepository;

    public NotificationController(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    @GetMapping
    public List<NotificationResponse> myNotifications(Authentication auth) {
        UserPrincipal principal = extractPrincipal(auth);
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(principal.userId())
            .stream().map(NotificationResponse::from).toList();
    }

    @PostMapping("/read-all")
    @Transactional
    public ResponseEntity<Map<String, Integer>> markAllRead(Authentication auth) {
        UserPrincipal principal = extractPrincipal(auth);
        int count = notificationRepository.markAllRead(principal.userId());
        return ResponseEntity.ok(Map.of("updated", count));
    }

    private UserPrincipal extractPrincipal(Authentication auth) {
        return auth.getAuthorities().stream()
            .filter(a -> a instanceof UserPrincipalAuthority)
            .map(a -> ((UserPrincipalAuthority) a).getPrincipal())
            .findFirst()
            .orElseThrow(() -> new IllegalStateException("No UserPrincipal in context"));
    }
}
