package com.thaparconnect.backend.chat;

import com.thaparconnect.backend.cabs.CabMemberStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CabGroupMemberSummaryDto {
    private UUID id;
    private String name;
    private String hostel;
    private String phoneNumber;
    private String phone;
    private String profilePictureUrl;
    private String role; // "HOST" or "RIDER"
    private CabMemberStatus status;
    private Integer seats;
}
