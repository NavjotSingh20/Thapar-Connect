package com.thaparconnect.backend.marketplace;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum ListingCategory {
    CYCLE("Cycle"),
    CALCULATOR("Calculator"),
    BOOKS("Books"),
    ELECTRONICS("Electronics"),
    FURNITURE("Furniture"),
    HOSTEL_ESSENTIALS("Hostel essentials"),
    OTHER("Other");

    private final String displayName;

    ListingCategory(String displayName) {
        this.displayName = displayName;
    }

    @JsonValue
    public String getDisplayName() {
        return displayName;
    }

    @JsonCreator
    public static ListingCategory fromString(String value) {
        if (value == null || value.trim().isEmpty()) {
            throw new IllegalArgumentException("Category is required and cannot be empty");
        }
        String clean = value.trim();
        for (ListingCategory category : values()) {
            if (category.displayName.equalsIgnoreCase(clean)
                    || category.name().equalsIgnoreCase(clean.replace(' ', '_'))) {
                return category;
            }
        }
        throw new IllegalArgumentException("Unknown listing category: " + value);
    }
}
