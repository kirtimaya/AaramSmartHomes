package com.aaramsmarthomes.api.model.converter;

import com.aaramsmarthomes.api.model.Ticket.TicketStatus;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TicketStatusConverterTest {

    private final TicketStatusConverter converter = new TicketStatusConverter();

    @Test
    void converts_enum_to_db_hyphenated_string() {
        assertThat(converter.convertToDatabaseColumn(TicketStatus.IN_PROGRESS)).isEqualTo("In-Progress");
        assertThat(converter.convertToDatabaseColumn(TicketStatus.PENDING)).isEqualTo("Pending");
        assertThat(converter.convertToDatabaseColumn(TicketStatus.CANCELLED)).isEqualTo("Cancelled");
    }

    @Test
    void converts_db_hyphenated_string_back_to_enum() {
        assertThat(converter.convertToEntityAttribute("In-Progress")).isEqualTo(TicketStatus.IN_PROGRESS);
        assertThat(converter.convertToEntityAttribute("Pending")).isEqualTo(TicketStatus.PENDING);
        assertThat(converter.convertToEntityAttribute("Resolved")).isEqualTo(TicketStatus.RESOLVED);
    }

    @Test
    void nulls_pass_through() {
        assertThat(converter.convertToDatabaseColumn(null)).isNull();
        assertThat(converter.convertToEntityAttribute(null)).isNull();
    }

    @Test
    void unknown_value_throws() {
        assertThatThrownBy(() -> converter.convertToEntityAttribute("Bogus"))
            .isInstanceOf(IllegalArgumentException.class);
    }
}
