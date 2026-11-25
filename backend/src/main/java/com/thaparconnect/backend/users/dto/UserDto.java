package com.thaparconnect.backend.users.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.thaparconnect.backend.users.Role;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDto {
    private UUID id;
    private String email;
    private String fullName;
    private String profilePictureUrl;
    private String phoneNumber;
    private String hostel;
    private String rollNumber;
    private String branch;
    private Integer year;
    private Role role;

    @JsonProperty("isOnboarded")
    private boolean isOnboarded;

    @JsonProperty("isBanned")
    private boolean isBanned;

    @JsonProperty("phoneVisibleConfirmedOnly")
    private boolean phoneVisibleConfirmedOnly;

    private Instant createdAt;

    @JsonInclude(JsonInclude.Include.NON_NULL)
    private String accessToken;

    @JsonProperty("name")
    public String getName() {
        return fullName;
    }

    public void setName(String name) {
        if (this.fullName == null) {
            this.fullName = name;
        }
    }
}
