package com.thaparconnect.backend.cabs.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.ArrayList;
import java.util.List;

@Data
@EqualsAndHashCode(callSuper = true)
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class CabGroupDetailDto extends CabGroupSummaryDto {
    @Builder.Default
    private List<CabMemberDto> members = new ArrayList<>();
}
