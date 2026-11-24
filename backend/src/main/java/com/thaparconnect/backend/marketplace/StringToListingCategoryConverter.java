package com.thaparconnect.backend.marketplace;

import org.springframework.core.convert.converter.Converter;
import org.springframework.stereotype.Component;

@Component
public class StringToListingCategoryConverter implements Converter<String, ListingCategory> {
    @Override
    public ListingCategory convert(String source) {
        return ListingCategory.fromString(source);
    }
}
