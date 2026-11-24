package com.thaparconnect.backend.users;

import java.util.Set;
import java.util.stream.Collectors;

public class TietHostel {

    public static final Set<String> VALID_HOSTELS = Set.of(
            "Hostel A",
            "Hostel B",
            "Hostel C",
            "Hostel D",
            "Hostel E",
            "Hostel G",
            "Hostel H",
            "Hostel I",
            "Hostel J",
            "Hostel K",
            "Hostel L",
            "Hostel M",
            "Hostel N",
            "Hostel O",
            "Hostel Q",
            "Hostel PG",
            "Hostel FRF",
            "Hostel FRG",
            "Fraser Hall",
            "Fraser Hostel",
            "Mother Teresa Hostel",
            "Day Scholar"
    );

    private static final Set<String> NORMALIZED_HOSTELS = VALID_HOSTELS.stream()
            .map(h -> h.trim().toLowerCase())
            .collect(Collectors.toSet());

    public static boolean isValidHostel(String hostel) {
        if (hostel == null || hostel.trim().isEmpty()) {
            return false;
        }
        String normalized = hostel.trim().toLowerCase();
        return NORMALIZED_HOSTELS.contains(normalized);
    }

    public static String normalizeHostel(String hostel) {
        if (hostel == null) {
            return null;
        }
        String trimmed = hostel.trim();
        for (String valid : VALID_HOSTELS) {
            if (valid.equalsIgnoreCase(trimmed)) {
                return valid;
            }
        }
        return trimmed;
    }
}
