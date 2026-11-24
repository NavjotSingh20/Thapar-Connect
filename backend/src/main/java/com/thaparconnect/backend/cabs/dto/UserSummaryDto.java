package com.thaparconnect.backend.cabs.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class UserSummaryDto {
    private UUID id;
    private String name;
    private String hostel;
    private String phoneNumber;
    private String phone;

    public String getPhone() {
        return phone != null ? phone : phoneNumber;
    }

    public String getPhoneNumber() {
        return phoneNumber != null ? phoneNumber : phone;
    }
}
