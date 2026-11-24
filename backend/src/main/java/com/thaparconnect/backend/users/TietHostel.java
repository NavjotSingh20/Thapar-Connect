package com.thaparconnect.backend.users;

import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

public class TietHostel {

    public static final Set<String> OFFICIAL_HOSTELS = Set.of(
            // Boys Hostels
            "Agira Hall (Hostel A)",
            "Amritam Hall (Hostel B)",
            "Prithvi Hall (Hostel C)",
            "Neeram Hall (Hostel D)",
            "Vyan Hall (Hostel H)",
            "Tejas Hall (Hostel J)",
            "Ambaram Hall (Hostel K)",
            "Viyat Hall (Hostel L)",
            "Anantam Hall (Hostel M)",
            "Vyom Hall (Hostel O)",
            "Hostel FRF/G",

            // Girls Hostels
            "Vasudha Hall - Block E (Hostel E)",
            "Vasudha Hall - Block G (Hostel G)",
            "Ira Hall (Hostel I)",
            "Ananta Hall (Hostel N)",
            "Dhriti Hall (Hostel PG)",
            "Vahni Hall (Hostel Q)",
            "Pavani Hall (Hostel PG-2)",

            // Other
            "Day Scholar",
            "Day Scholar (Non-Hostelite)",
            "Faculty Housing");

    public static final Set<String> LEGACY_HOSTELS = Set.of(
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
            "Mother Teresa Hostel");

    public static final Set<String> VALID_HOSTELS = Set.of(
            // Boys Hostels
            "Agira Hall (Hostel A)",
            "Amritam Hall (Hostel B)",
            "Prithvi Hall (Hostel C)",
            "Neeram Hall (Hostel D)",
            "Vyan Hall (Hostel H)",
            "Tejas Hall (Hostel J)",
            "Ambaram Hall (Hostel K)",
            "Viyat Hall (Hostel L)",
            "Anantam Hall (Hostel M)",
            "Vyom Hall (Hostel O)",
            "Hostel FRF/G",

            // Girls Hostels
            "Vasudha Hall - Block E (Hostel E)",
            "Vasudha Hall - Block G (Hostel G)",
            "Ira Hall (Hostel I)",
            "Ananta Hall (Hostel N)",
            "Dhriti Hall (Hostel PG)",
            "Vahni Hall (Hostel Q)",
            "Pavani Hall (Hostel PG-2)",

            // Other
            "Day Scholar",
            "Day Scholar (Non-Hostelite)",
            "Faculty Housing",

            // Legacy Short Names for Backward Compatibility
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
            "Mother Teresa Hostel"
    );

    private static final Map<String, String> LEGACY_TO_OFFICIAL_MAP = Map.ofEntries(
            Map.entry("hostel a", "Agira Hall (Hostel A)"),
            Map.entry("hostel-a", "Agira Hall (Hostel A)"),
            Map.entry("hostel b", "Amritam Hall (Hostel B)"),
            Map.entry("hostel-b", "Amritam Hall (Hostel B)"),
            Map.entry("hostel c", "Prithvi Hall (Hostel C)"),
            Map.entry("hostel-c", "Prithvi Hall (Hostel C)"),
            Map.entry("hostel d", "Neeram Hall (Hostel D)"),
            Map.entry("hostel-d", "Neeram Hall (Hostel D)"),
            Map.entry("hostel e", "Vasudha Hall - Block E (Hostel E)"),
            Map.entry("hostel-e", "Vasudha Hall - Block E (Hostel E)"),
            Map.entry("hostel g", "Vasudha Hall - Block G (Hostel G)"),
            Map.entry("hostel-g", "Vasudha Hall - Block G (Hostel G)"),
            Map.entry("hostel h", "Vyan Hall (Hostel H)"),
            Map.entry("hostel-h", "Vyan Hall (Hostel H)"),
            Map.entry("hostel i", "Ira Hall (Hostel I)"),
            Map.entry("hostel-i", "Ira Hall (Hostel I)"),
            Map.entry("hostel j", "Tejas Hall (Hostel J)"),
            Map.entry("hostel-j", "Tejas Hall (Hostel J)"),
            Map.entry("hostel k", "Ambaram Hall (Hostel K)"),
            Map.entry("hostel-k", "Ambaram Hall (Hostel K)"),
            Map.entry("hostel l", "Viyat Hall (Hostel L)"),
            Map.entry("hostel-l", "Viyat Hall (Hostel L)"),
            Map.entry("hostel m", "Anantam Hall (Hostel M)"),
            Map.entry("hostel-m", "Anantam Hall (Hostel M)"),
            Map.entry("hostel n", "Ananta Hall (Hostel N)"),
            Map.entry("hostel-n", "Ananta Hall (Hostel N)"),
            Map.entry("hostel o", "Vyom Hall (Hostel O)"),
            Map.entry("hostel-o", "Vyom Hall (Hostel O)"),
            Map.entry("hostel q", "Vahni Hall (Hostel Q)"),
            Map.entry("hostel-q", "Vahni Hall (Hostel Q)"),
            Map.entry("hostel pg", "Dhriti Hall (Hostel PG)"),
            Map.entry("hostel-pg", "Dhriti Hall (Hostel PG)"),
            Map.entry("hostel pg-2", "Pavani Hall (Hostel PG-2)"),
            Map.entry("hostel-pg-2", "Pavani Hall (Hostel PG-2)"),
            Map.entry("hostel frf", "Hostel FRF/G"),
            Map.entry("hostel frg", "Hostel FRF/G"),
            Map.entry("hostel-frf/g", "Hostel FRF/G"),
            Map.entry("hostel frf/g", "Hostel FRF/G"),
            Map.entry("fraser hostel", "Hostel FRF/G"),
            Map.entry("fraser hall", "Hostel FRF/G"),
            Map.entry("mother teresa hostel", "Hostel FRF/G"),
            Map.entry("day scholar", "Day Scholar (Non-Hostelite)"));

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

    public static String toOfficialName(String hostel) {
        if (hostel == null) {
            return null;
        }
        String trimmed = hostel.trim();
        String mapped = LEGACY_TO_OFFICIAL_MAP.get(trimmed.toLowerCase());
        if (mapped != null) {
            return mapped;
        }
        for (String valid : VALID_HOSTELS) {
            if (valid.equalsIgnoreCase(trimmed)) {
                return valid;
            }
        }
        return trimmed;
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
