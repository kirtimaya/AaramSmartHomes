package com.aaramsmarthomes.api.repository;

import com.aaramsmarthomes.api.model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, String> {
    List<Notification> findByUserIdOrderByCreatedAtDesc(String userId);

    @Modifying
    @Query("UPDATE Notification n SET n.read = true WHERE n.userId = :userId AND n.read = false")
    int markAllRead(String userId);
}
