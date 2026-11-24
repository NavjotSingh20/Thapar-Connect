package com.thaparconnect.backend.users;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;

class TietHostelTest {

    @ParameterizedTest
    @ValueSource(strings = {
            "Hostel A", "Hostel B", "Hostel C", "Hostel D", "Hostel E",
            "Hostel G", "Hostel H", "Hostel I", "Hostel J", "Hostel K",
            "Hostel L", "Hostel M", "Hostel N", "Hostel O", "Hostel Q",
            "Hostel PG", "Hostel FRF", "Hostel FRG", "Fraser Hall",
            "Fraser Hostel", "Mother Teresa Hostel", "Day Scholar"
    })
    void shouldAcceptAllValidHostels(String hostel) {
        assertThat(TietHostel.isValidHostel(hostel)).isTrue();
        assertThat(TietHostel.isValidHostel(hostel.toLowerCase())).isTrue();
        assertThat(TietHostel.isValidHostel(hostel.toUpperCase())).isTrue();
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "Hostel BogusXYZ",
            "Hostel <script>alert(1)</script>",
            "Hostel Fake",
            "Fraser Bogus",
            "Day Scholar Unknown",
            "Random Hostel",
            "",
            "   "
    })
    void shouldRejectInvalidHostelStrings(String hostel) {
        assertThat(TietHostel.isValidHostel(hostel)).isFalse();
    }

    @Test
    void shouldNormalizeHostelCorrectly() {
        assertThat(TietHostel.normalizeHostel("hostel j")).isEqualTo("Hostel J");
        assertThat(TietHostel.normalizeHostel("day scholar")).isEqualTo("Day Scholar");
        assertThat(TietHostel.normalizeHostel("FRASER HALL")).isEqualTo("Fraser Hall");
    }
}
