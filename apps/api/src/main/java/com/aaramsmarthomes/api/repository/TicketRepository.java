package com.aaramsmarthomes.api.repository;

import com.aaramsmarthomes.api.model.Ticket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface TicketRepository extends JpaRepository<Ticket, String> {
    List<Ticket> findByRequesterIdOrderByCreatedAtDesc(String requesterId);

    @Query("SELECT t FROM Ticket t WHERE (:status IS NULL OR t.status = :status) " +
           "AND (:category IS NULL OR t.category = :category) ORDER BY t.createdAt DESC")
    List<Ticket> findForAdmin(@Param("status") Ticket.TicketStatus status, @Param("category") String category);

    long countByStatus(Ticket.TicketStatus status);

    long countByCategory(String category);
}
