package com.thaparconnect.backend.cabs;

public interface GeocodingService {

    record Coordinates(double latitude, double longitude) {}

    Coordinates geocode(String locationName);

    Coordinates getCampusDefaultCoordinates();
}
