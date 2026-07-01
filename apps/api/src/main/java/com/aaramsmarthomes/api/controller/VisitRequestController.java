package com.aaramsmarthomes.api.controller;

import com.aaramsmarthomes.api.config.UserPrincipalAuthority;
import com.aaramsmarthomes.api.dto.CreateVisitRequest;
import com.aaramsmarthomes.api.dto.VisitRequestResponse;
import com.aaramsmarthomes.api.model.UserPrincipal;
import com.aaramsmarthomes.api.model.VisitRequest;
import com.aaramsmarthomes.api.repository.VisitRequestRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/visits")
public class VisitRequestController {

    private final VisitRequestRepository visitRepository;

    public VisitRequestController(VisitRequestRepository visitRepository) {
        this.visitRepository = visitRepository;
    }

    @PostMapping
    public ResponseEntity<VisitRequestResponse> create(
            @Valid @RequestBody CreateVisitRequest req,
            Authentication auth) {
        UserPrincipal principal = extractPrincipal(auth);

        VisitRequest visit = new VisitRequest();
        visit.setRequesterId(principal.userId());
        visit.setRequesterType(principal.isAdmin() ? "admin" : principal.isTenant() ? "tenant" : "guest");
        visit.setPropertyId(req.propertyId());
        visit.setRoomId(req.roomId());
        visit.setPreferredDate(req.preferredDate());
        visit.setMessage(req.message() != null && !req.message().isBlank() ? req.message() : null);

        VisitRequest saved = visitRepository.save(visit);
        return ResponseEntity.status(HttpStatus.CREATED).body(VisitRequestResponse.from(saved));
    }

    @GetMapping
    public List<VisitRequestResponse> myVisits(Authentication auth) {
        UserPrincipal principal = extractPrincipal(auth);
        return visitRepository.findByRequesterIdOrderByCreatedAtDesc(principal.userId())
            .stream().map(VisitRequestResponse::from).toList();
    }

    private UserPrincipal extractPrincipal(Authentication auth) {
        return auth.getAuthorities().stream()
            .filter(a -> a instanceof UserPrincipalAuthority)
            .map(a -> ((UserPrincipalAuthority) a).getPrincipal())
            .findFirst()
            .orElseThrow(() -> new IllegalStateException("No UserPrincipal in context"));
    }
}
