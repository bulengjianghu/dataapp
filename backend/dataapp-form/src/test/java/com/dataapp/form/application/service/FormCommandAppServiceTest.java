package com.dataapp.form.application.service;

import com.dataapp.form.domain.model.aggregate.FormDefinition;
import com.dataapp.form.domain.model.entity.FormDraft;
import com.dataapp.form.domain.repository.FormDefinitionRepository;
import com.dataapp.form.interfaces.dto.FormCreateResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class FormCommandAppServiceTest {

    @Mock
    private FormDefinitionRepository formDefinitionRepository;

    @Test
    void shouldCreateDraftFormDefinition() {
        FormCommandAppService formCommandAppService = new FormCommandAppService(
            formDefinitionRepository,
            new FormSchemaNormalizer(),
            new ObjectMapper()
        );

        FormCreateResponse response = formCommandAppService.create("巡检表", "inspection_form");

        ArgumentCaptor<FormDefinition> captor = ArgumentCaptor.forClass(FormDefinition.class);
        verify(formDefinitionRepository).save(captor.capture());
        FormDefinition formDefinition = captor.getValue();

        verify(formDefinitionRepository).saveDraft(org.mockito.ArgumentMatchers.any(FormDraft.class));
        assertThat(response.formId()).isEqualTo(formDefinition.getId());
        assertThat(response.formCode()).isEqualTo("inspection_form");
        assertThat(formDefinition.getName()).isEqualTo("巡检表");
        assertThat(formDefinition.getFormCode()).isEqualTo("inspection_form");
        assertThat(formDefinition.getDescription()).isEmpty();
        assertThat(formDefinition.getStatus()).isEqualTo("DRAFT");
    }
}
