package com.aaramsmarthomes.api.service;

import com.aaramsmarthomes.api.model.AuditLog;
import com.aaramsmarthomes.api.model.UserPrincipal;
import com.aaramsmarthomes.api.repository.AuditLogRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuditServiceTest {

    @Mock AuditLogRepository auditLogRepository;

    AuditService auditService;

    private final UserPrincipal admin = new UserPrincipal("uid-admin", "admin@test.com", UserPrincipal.Role.ADMIN);

    @BeforeEach
    void setup() {
        auditService = new AuditService(auditLogRepository, new ObjectMapper());
    }

    @Test
    void records_actor_action_and_serialized_before_after() {
        when(auditLogRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        auditService.record(admin, "menu.upsert", "menu", "menu-1",
            Map.of("notes", "old"), Map.of("notes", "new"), "web");

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(captor.capture());
        AuditLog saved = captor.getValue();

        assertThat(saved.getActorId()).isEqualTo("uid-admin");
        assertThat(saved.getActorEmail()).isEqualTo("admin@test.com");
        assertThat(saved.getActorRole()).isEqualTo("admin");
        assertThat(saved.getAction()).isEqualTo("menu.upsert");
        assertThat(saved.getEntityType()).isEqualTo("menu");
        assertThat(saved.getEntityId()).isEqualTo("menu-1");
        assertThat(saved.getBefore()).contains("\"old\"");
        assertThat(saved.getAfter()).contains("\"new\"");
        assertThat(saved.getSource()).isEqualTo("web");
    }

    @Test
    void null_before_and_after_are_stored_as_null_not_the_string_null() {
        when(auditLogRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        auditService.record(admin, "dish.create", "dish", "dish-1", null, Map.of("name", "Idli"), "web");

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(captor.capture());
        assertThat(captor.getValue().getBefore()).isNull();
        assertThat(captor.getValue().getAfter()).contains("Idli");
    }

    @Test
    void source_is_persisted_verbatim() {
        when(auditLogRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        auditService.record(admin, "room.status_update", "room", "room-1", null, null, "aara");

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(captor.capture());
        assertThat(captor.getValue().getSource()).isEqualTo("aara");
    }

    @Test
    void wraps_serialization_failure_in_runtime_exception() {
        // A self-referencing map defeats Jackson's default serialization.
        Map<String, Object> cyclic = new java.util.HashMap<>();
        cyclic.put("self", cyclic);

        assertThatThrownBy(() -> auditService.record(admin, "x.y", "x", "1", null, cyclic, "web"))
            .isInstanceOf(RuntimeException.class)
            .hasMessageContaining("Failed to record audit log");

        verifyNoInteractions(auditLogRepository);
    }
}
