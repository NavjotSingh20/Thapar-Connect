package com.thaparconnect.backend.cabs;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CabMemberRepository extends JpaRepository<CabMember, UUID> {

    List<CabMember> findByCabGroupId(UUID cabGroupId);

    List<CabMember> findByCabGroupIdOrderByCreatedAtAsc(UUID cabGroupId);

    Optional<CabMember> findByCabGroupIdAndUserId(UUID cabGroupId, UUID userId);

    boolean existsByCabGroupIdAndUserIdAndStatusIn(UUID cabGroupId, UUID userId, Collection<CabMemberStatus> statuses);

    long countByCabGroupIdAndStatus(UUID cabGroupId, CabMemberStatus status);
}
