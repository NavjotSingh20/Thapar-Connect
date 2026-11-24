package com.thaparconnect.backend.marketplace.dto;

import com.thaparconnect.backend.marketplace.ListingCategory;
import com.thaparconnect.backend.marketplace.ListingCondition;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ListingUpdateRequest {

    @NotBlank(message = "Title is required")
    @Size(max = 255, message = "Title cannot exceed 255 characters")
    private String title;

    @NotNull(message = "Category is required")
    private ListingCategory category;

    @NotBlank(message = "Description is required")
    private String description;

    @NotNull(message = "Condition is required")
    private ListingCondition condition;

    @NotNull(message = "Price is required")
    @DecimalMin(value = "0.01", message = "Price must be greater than zero")
    @DecimalMax(value = "1000000.00", message = "Price cannot exceed 1,000,000 INR")
    private BigDecimal price;

    private String hostel;
}
