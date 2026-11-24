package com.thaparconnect.backend.cabs.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.thaparconnect.backend.cabs.CabMemberStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class CabMemberDto {
    private UUID id;
    private UUID userId;
    private UUID cabGroupId;
    private Integer seatsRequested;
    private CabMemberStatus status;
    private String note;
    private UserSummaryDto user;
    private Instant createdAt;
}
