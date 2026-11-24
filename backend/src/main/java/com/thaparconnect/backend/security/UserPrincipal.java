package com.thaparconnect.backend.security;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.thaparconnect.backend.users.Role;
import com.thaparconnect.backend.users.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

@Getter
@Builder
@AllArgsConstructor
public class UserPrincipal implements UserDetails {

    private final UUID id;
    private final String email;
    private final String fullName;
    private final Role role;

    @JsonProperty("isOnboarded")
    private final boolean isOnboarded;

    @JsonProperty("isBanned")
    private final boolean isBanned;

    private final Collection<? extends GrantedAuthority> authorities;

    public static UserPrincipal create(User user) {
        List<GrantedAuthority> authorities = Collections.singletonList(
                new SimpleGrantedAuthority("ROLE_" + user.getRole().name())
        );

        return UserPrincipal.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole())
                .isOnboarded(user.isOnboarded())
                .isBanned(user.isBanned())
                .authorities(authorities)
                .build();
    }

    public static UserPrincipal create(UUID id, String email, Role role, boolean isOnboarded) {
        List<GrantedAuthority> authorities = Collections.singletonList(
                new SimpleGrantedAuthority("ROLE_" + (role != null ? role.name() : Role.USER.name()))
        );

        return UserPrincipal.builder()
                .id(id)
                .email(email)
                .fullName(email != null ? email.split("@")[0] : "")
                .role(role != null ? role : Role.USER)
                .isOnboarded(isOnboarded)
                .isBanned(false)
                .authorities(authorities)
                .build();
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public String getPassword() {
        return "";
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return !isBanned;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return !isBanned;
    }
}
