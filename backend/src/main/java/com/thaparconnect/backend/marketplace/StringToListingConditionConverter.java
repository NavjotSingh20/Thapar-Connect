package com.thaparconnect.backend.marketplace;

import org.springframework.core.convert.converter.Converter;
import org.springframework.stereotype.Component;

@Component
public class StringToListingConditionConverter implements Converter<String, ListingCondition> {
    @Override
    public ListingCondition convert(String source) {
        return ListingCondition.fromString(source);
    }
}
