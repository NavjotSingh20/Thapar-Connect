package com.thaparconnect.backend.cabs;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Slf4j
@Component
@RequiredArgsConstructor
public class CabExpirationScheduler {

    private final CabGroupRepository cabGroupRepository;

    @Scheduled(fixedRate = 120000)
    @Transactional
    public void expirePastCabGroups() {
        Instant now = Instant.now();
        int count = cabGroupRepository.expirePastCabGroups(now);
        if (count > 0) {
            log.info("Expired {} past-departure cab groups at {}", count, now);
        }
    }
}
