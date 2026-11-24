package com.thaparconnect.backend.chat;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ConversationRepository extends JpaRepository<Conversation, UUID> {

    Optional<Conversation> findByContextTypeAndContextIdAndUser1IdAndUser2Id(
            ContextType contextType,
            UUID contextId,
            UUID user1Id,
            UUID user2Id
    );

    Optional<Conversation> findByContextTypeAndContextIdAndIsGroupTrue(
            ContextType contextType,
            UUID contextId
    );

    List<Conversation> findByContextTypeAndContextId(
            ContextType contextType,
            UUID contextId
    );

    @Query("SELECT c FROM Conversation c WHERE (c.user1.id = :userId OR (c.user2 IS NOT NULL AND c.user2.id = :userId)) AND c.isGroup = false ORDER BY c.updatedAt DESC")
    List<Conversation> findAllDirectForUser(@Param("userId") UUID userId);

    @Query("SELECT c FROM Conversation c WHERE c.contextType = 'CAB_GROUP' AND c.contextId IN :cabGroupIds AND c.isGroup = true ORDER BY c.updatedAt DESC")
    List<Conversation> findGroupConversationsForCabGroups(@Param("cabGroupIds") java.util.Collection<UUID> cabGroupIds);

    @Query("SELECT c FROM Conversation c WHERE c.user1.id = :userId OR (c.user2 IS NOT NULL AND c.user2.id = :userId) ORDER BY c.updatedAt DESC")
    List<Conversation> findAllForUser(@Param("userId") UUID userId);
}
