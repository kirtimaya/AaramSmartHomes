package com.aaramsmarthomes.api.controller;

import com.aaramsmarthomes.api.config.UserPrincipalAuthority;
import com.aaramsmarthomes.api.model.UserPrincipal;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> me(Authentication authentication) {
        UserPrincipal principal = authentication.getAuthorities().stream()
            .filter(a -> a instanceof UserPrincipalAuthority)
            .map(a -> ((UserPrincipalAuthority) a).getPrincipal())
            .findFirst()
            .orElseThrow(() -> new IllegalStateException("No UserPrincipal in context"));

        return ResponseEntity.ok(Map.of(
            "userId", principal.userId(),
            "email",  principal.email() != null ? principal.email() : "",
            "role",   principal.role().name().toLowerCase()
        ));
    }
}
