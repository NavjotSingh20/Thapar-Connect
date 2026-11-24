package com.thaparconnect.backend.marketplace;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum ListingCondition {
    NEW("New"),
    LIKE_NEW("Like new"),
    USED("Used"),
    HEAVILY_USED("Heavily used");

    private final String displayName;

    ListingCondition(String displayName) {
        this.displayName = displayName;
    }

    @JsonValue
    public String getDisplayName() {
        return displayName;
    }

    @JsonCreator
    public static ListingCondition fromString(String value) {
        if (value == null || value.trim().isEmpty()) {
            throw new IllegalArgumentException("Condition is required and cannot be empty");
        }
        String clean = value.trim();
        for (ListingCondition condition : values()) {
            if (condition.displayName.equalsIgnoreCase(clean)
                    || condition.name().equalsIgnoreCase(clean.replace(' ', '_'))) {
                return condition;
            }
        }
        throw new IllegalArgumentException("Unknown listing condition: " + value);
    }
}
