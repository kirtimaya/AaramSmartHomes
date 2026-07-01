package com.aaramsmarthomes.api.repository;

import com.aaramsmarthomes.api.model.Ticket;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TicketRepository extends JpaRepository<Ticket, String> {
    List<Ticket> findByRequesterIdOrderByCreatedAtDesc(String requesterId);
}
