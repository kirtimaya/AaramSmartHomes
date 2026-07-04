package com.aaramsmarthomes.api.model.converter;

import com.aaramsmarthomes.api.model.Ticket.TicketPriority;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TicketPriorityConverterTest {

    private final TicketPriorityConverter converter = new TicketPriorityConverter();

    @Test
    void converts_enum_to_db_capitalized_string() {
        assertThat(converter.convertToDatabaseColumn(TicketPriority.URGENT)).isEqualTo("Urgent");
        assertThat(converter.convertToDatabaseColumn(TicketPriority.LOW)).isEqualTo("Low");
    }

    @Test
    void converts_db_capitalized_string_back_to_enum() {
        assertThat(converter.convertToEntityAttribute("Urgent")).isEqualTo(TicketPriority.URGENT);
        assertThat(converter.convertToEntityAttribute("Medium")).isEqualTo(TicketPriority.MEDIUM);
    }

    @Test
    void nulls_pass_through() {
        assertThat(converter.convertToDatabaseColumn(null)).isNull();
        assertThat(converter.convertToEntityAttribute(null)).isNull();
    }

    @Test
    void unknown_value_throws() {
        assertThatThrownBy(() -> converter.convertToEntityAttribute("Critical"))
            .isInstanceOf(IllegalArgumentException.class);
    }
}
