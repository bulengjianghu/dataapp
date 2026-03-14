package com.dataapp.form.application.service;

import com.dataapp.form.domain.model.aggregate.FormDefinition;
import com.dataapp.form.domain.repository.FormDefinitionRepository;
import com.dataapp.form.interfaces.dto.FormDetailResponse;
import com.dataapp.shared.exception.BizException;
import com.dataapp.shared.exception.ErrorCode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FormQueryAppServiceTest {

    @Mock
    private FormDefinitionRepository formDefinitionRepository;

    @Test
    void shouldReturnFormDetailWhenFormExists() {
        FormQueryAppService formQueryAppService = new FormQueryAppService(formDefinitionRepository, new ObjectMapper());
        when(formDefinitionRepository.findById(1L))
            .thenReturn(new FormDefinition(1L, "inspection_form", "巡检表", "巡检说明", "DRAFT", null));

        FormDetailResponse response = formQueryAppService.getById(1L);

        assertThat(response.id()).isEqualTo(1L);
        assertThat(response.formCode()).isEqualTo("inspection_form");
        assertThat(response.name()).isEqualTo("巡检表");
        assertThat(response.description()).isEqualTo("巡检说明");
        assertThat(response.status()).isEqualTo("DRAFT");
    }

    @Test
    void shouldThrowBizExceptionWhenFormDoesNotExist() {
        FormQueryAppService formQueryAppService = new FormQueryAppService(formDefinitionRepository, new ObjectMapper());
        when(formDefinitionRepository.findById(2L)).thenReturn(null);

        assertThatThrownBy(() -> formQueryAppService.getById(2L))
            .isInstanceOf(BizException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.FORM_NOT_FOUND);
    }
}
