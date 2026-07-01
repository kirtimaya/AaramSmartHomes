package com.aaramsmarthomes.api.controller;

import com.aaramsmarthomes.api.config.UserPrincipalAuthority;
import com.aaramsmarthomes.api.dto.AaraChatRequest;
import com.aaramsmarthomes.api.dto.AaraChatResponse;
import com.aaramsmarthomes.api.model.UserPrincipal;
import com.aaramsmarthomes.api.service.AaraService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/aara")
public class AaraController {

    private final AaraService aaraService;

    public AaraController(AaraService aaraService) {
        this.aaraService = aaraService;
    }

    @PostMapping
    public ResponseEntity<AaraChatResponse> chat(
            @Valid @RequestBody AaraChatRequest req,
            Authentication auth) throws Exception {
        UserPrincipal principal = auth.getAuthorities().stream()
            .filter(a -> a instanceof UserPrincipalAuthority)
            .map(a -> ((UserPrincipalAuthority) a).getPrincipal())
            .findFirst()
            .orElseThrow(() -> new IllegalStateException("No UserPrincipal in context"));

        String reply = aaraService.chat(req.message(), req.context(), principal);
        return ResponseEntity.ok(new AaraChatResponse(reply, principal.role().name().toLowerCase()));
    }
}
