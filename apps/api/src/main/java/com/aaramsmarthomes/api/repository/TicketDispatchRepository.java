package com.aaramsmarthomes.api.repository;

import com.aaramsmarthomes.api.model.TicketDispatch;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TicketDispatchRepository extends JpaRepository<TicketDispatch, String> {
    Optional<TicketDispatch> findByTicketId(String ticketId);
    List<TicketDispatch> findByStatusOrderByUpdatedAtDesc(String status);
    List<TicketDispatch> findAllByOrderByUpdatedAtDesc();
    long countByStatus(String status);
}
