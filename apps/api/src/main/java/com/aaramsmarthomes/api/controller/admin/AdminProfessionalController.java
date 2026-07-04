package com.aaramsmarthomes.api.controller.admin;

import com.aaramsmarthomes.api.dto.admin.ProfessionalRequest;
import com.aaramsmarthomes.api.dto.admin.ProfessionalResponse;
import com.aaramsmarthomes.api.model.Professional;
import com.aaramsmarthomes.api.repository.ProfessionalRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/api/admin/professionals")
@PreAuthorize("hasRole('ADMIN')")
public class AdminProfessionalController {

    private final ProfessionalRepository professionalRepository;

    public AdminProfessionalController(ProfessionalRepository professionalRepository) {
        this.professionalRepository = professionalRepository;
    }

    @GetMapping
    public List<ProfessionalResponse> list() {
        return professionalRepository.findAll().stream().map(ProfessionalResponse::from).toList();
    }

    @PostMapping
    public ResponseEntity<ProfessionalResponse> create(@Valid @RequestBody ProfessionalRequest req) {
        Professional p = new Professional();
        apply(p, req);
        return ResponseEntity.status(HttpStatus.CREATED).body(ProfessionalResponse.from(professionalRepository.save(p)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProfessionalResponse> update(@PathVariable String id, @Valid @RequestBody ProfessionalRequest req) {
        Professional p = professionalRepository.findById(id)
            .orElseThrow(() -> new NoSuchElementException("Professional not found: " + id));
        apply(p, req);
        return ResponseEntity.ok(ProfessionalResponse.from(professionalRepository.save(p)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        professionalRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    private void apply(Professional p, ProfessionalRequest req) {
        p.setName(req.name());
        p.setPhoneE164(req.phoneE164());
        p.setRole(req.role());
        p.setTrade(req.trade());
        p.setActive(req.active());
        p.setNotes(req.notes());
    }
}
