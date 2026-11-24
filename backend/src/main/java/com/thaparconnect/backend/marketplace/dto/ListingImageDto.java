package com.thaparconnect.backend.marketplace.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ListingImageDto {
    private UUID id;
    private String imageUrl;

    @JsonProperty("orderIndex")
    private Integer orderIndex;

    @JsonProperty("displayOrder")
    public Integer getDisplayOrder() {
        return orderIndex;
    }
}
