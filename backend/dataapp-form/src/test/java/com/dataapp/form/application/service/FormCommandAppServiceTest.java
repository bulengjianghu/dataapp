package com.dataapp.form.application.service;

import com.dataapp.form.domain.model.aggregate.FormDefinition;
import com.dataapp.form.domain.repository.FormDefinitionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class FormCommandAppServiceTest {

    @Mock
    private FormDefinitionRepository formDefinitionRepository;

    @InjectMocks
    private FormCommandAppService formCommandAppService;

    @Test
    void shouldCreateDraftFormDefinition() {
        String formId = formCommandAppService.create("巡检表", "inspection_form");

        ArgumentCaptor<FormDefinition> captor = ArgumentCaptor.forClass(FormDefinition.class);
        verify(formDefinitionRepository).save(captor.capture());
        FormDefinition formDefinition = captor.getValue();

        assertThat(formId).isEqualTo(String.valueOf(formDefinition.getId()));
        assertThat(formDefinition.getName()).isEqualTo("巡检表");
        assertThat(formDefinition.getFormCode()).isEqualTo("inspection_form");
        assertThat(formDefinition.getStatus()).isEqualTo("DRAFT");
    }
}
