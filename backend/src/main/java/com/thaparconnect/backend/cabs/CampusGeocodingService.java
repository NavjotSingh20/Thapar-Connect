package com.thaparconnect.backend.cabs;

import org.springframework.stereotype.Service;

import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class CampusGeocodingService implements GeocodingService {

    private static final Coordinates THAPAR_CAMPUS = new Coordinates(30.3547, 76.3697);

    private final Map<String, Coordinates> knownLocations = new ConcurrentHashMap<>();

    public CampusGeocodingService() {
        // TIET Campus
        knownLocations.put("thapar", THAPAR_CAMPUS);
        knownLocations.put("thapar university", THAPAR_CAMPUS);
        knownLocations.put("thapar campus", THAPAR_CAMPUS);
        knownLocations.put("thapar university campus, patiala", THAPAR_CAMPUS);
        knownLocations.put("thapar institute of engineering & technology", THAPAR_CAMPUS);
        knownLocations.put("tiet", THAPAR_CAMPUS);
        knownLocations.put("campus", THAPAR_CAMPUS);

        // Chandigarh Airport (IXC)
        Coordinates chdAirport = new Coordinates(30.6735, 76.7885);
        knownLocations.put("chandigarh airport", chdAirport);
        knownLocations.put("chandigarh international airport", chdAirport);
        knownLocations.put("ixc", chdAirport);
        knownLocations.put("shaheed bhagat singh international airport", chdAirport);

        // Delhi Airport (DEL)
        Coordinates delAirport = new Coordinates(28.5562, 77.1000);
        knownLocations.put("delhi airport", delAirport);
        knownLocations.put("igi airport", delAirport);
        knownLocations.put("delhi t3", delAirport);
        knownLocations.put("delhi t1", delAirport);
        knownLocations.put("indira gandhi international airport", delAirport);

        // Patiala Transit Hubs
        Coordinates busStand = new Coordinates(30.3256, 76.4022);
        knownLocations.put("patiala bus stand", busStand);
        knownLocations.put("bus stand", busStand);
        knownLocations.put("prtc bus stand", busStand);

        Coordinates railwayStation = new Coordinates(30.3340, 76.3980);
        knownLocations.put("patiala railway station", railwayStation);
        knownLocations.put("patiala station", railwayStation);

        // Nearby Junctions
        Coordinates rajpura = new Coordinates(30.4840, 76.5938);
        knownLocations.put("rajpura", rajpura);
        knownLocations.put("rajpura junction", rajpura);

        Coordinates ambala = new Coordinates(30.3312, 76.8406);
        knownLocations.put("ambala", ambala);
        knownLocations.put("ambala cantt", ambala);
    }

    @Override
    public Coordinates geocode(String locationName) {
        if (locationName == null || locationName.trim().isEmpty()) {
            return THAPAR_CAMPUS;
        }

        String normalized = locationName.toLowerCase(Locale.ROOT).trim();

        for (Map.Entry<String, Coordinates> entry : knownLocations.entrySet()) {
            if (normalized.contains(entry.getKey())) {
                return entry.getValue();
            }
        }

        // Default to campus if unknown
        return THAPAR_CAMPUS;
    }

    @Override
    public Coordinates getCampusDefaultCoordinates() {
        return THAPAR_CAMPUS;
    }
}
