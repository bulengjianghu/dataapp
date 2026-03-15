package com.dataapp.form.application.service;

import com.dataapp.form.domain.model.aggregate.FormDefinition;
import com.dataapp.form.domain.model.entity.FormDraft;
import com.dataapp.form.domain.model.entity.FormVersion;
import com.dataapp.form.domain.repository.FormDefinitionRepository;
import com.dataapp.form.interfaces.dto.FormCreateResponse;
import com.dataapp.form.interfaces.dto.FormDraftResponse;
import com.dataapp.form.interfaces.dto.FormPublishResponse;
import com.dataapp.shared.exception.BizException;
import com.dataapp.shared.exception.ErrorCode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FormCommandAppServiceTest {

    @Mock
    private FormDefinitionRepository formDefinitionRepository;

    @Test
    void shouldCreateDraftFormDefinition() {
        FormCommandAppService formCommandAppService = new FormCommandAppService(
            formDefinitionRepository,
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

    @Test
    void shouldSaveDraftThroughDomainBehavior() {
        FormCommandAppService formCommandAppService = new FormCommandAppService(
            formDefinitionRepository,
            new ObjectMapper()
        );
        when(formDefinitionRepository.findById(1L))
            .thenReturn(new FormDefinition(1L, "inspection_form", "巡检表", "", "DRAFT", null));
        when(formDefinitionRepository.findDraftByFormId(1L))
            .thenReturn(new FormDraft(11L, 1L, "{}", 2, 1L, null));

        FormDraftResponse response = formCommandAppService.saveDraft(
            1L,
            "巡检表V2",
            "说明",
            java.util.Map.of(
                "field_1",
                java.util.Map.of(
                    "id", "field_1",
                    "type", "field",
                    "childrenIds", java.util.List.of(),
                    "props", java.util.Map.of("component", "input", "label", "姓名"),
                    "layout", java.util.Map.of("span", 6)
                )
            )
        );

        verify(formDefinitionRepository).update(any(FormDefinition.class));
        verify(formDefinitionRepository).saveDraft(any(FormDraft.class));
        verify(formDefinitionRepository).replaceDraftFields(any(Long.class), any());
        assertThat(response.name()).isEqualTo("巡检表V2");
        assertThat(response.description()).isEqualTo("说明");
        assertThat(response.draftVersion()).isEqualTo(3);
        assertThat(response.fields()).containsKey("field_1");
    }

    @Test
    void shouldPublishCurrentDraft() {
        FormCommandAppService formCommandAppService = new FormCommandAppService(
            formDefinitionRepository,
            new ObjectMapper()
        );
        when(formDefinitionRepository.findById(1L))
            .thenReturn(new FormDefinition(1L, "inspection_form", "巡检表", "说明", "DRAFT", null));
        when(formDefinitionRepository.findDraftByFormId(1L))
            .thenReturn(new FormDraft(
                11L,
                1L,
                "{\"field_1\":{\"id\":\"field_1\",\"type\":\"field\",\"childrenIds\":[],\"props\":{\"component\":\"input\",\"label\":\"姓名\"},\"layout\":{\"span\":6}}}",
                2,
                1L,
                null
            ));
        when(formDefinitionRepository.nextVersionNo(1L)).thenReturn(3);

        FormPublishResponse response = formCommandAppService.publish(1L);

        verify(formDefinitionRepository).saveDraft(any(FormDraft.class));
        verify(formDefinitionRepository).saveVersion(any(FormVersion.class));
        verify(formDefinitionRepository).replaceVersionFields(any(Long.class), any(Long.class), any());
        verify(formDefinitionRepository).updateCurrentVersion(any(Long.class), any(Long.class), any(String.class));
        assertThat(response.formCode()).isEqualTo("inspection_form");
        assertThat(response.status()).isEqualTo("ACTIVE");
        assertThat(response.versionNo()).isEqualTo(3);
    }

    @Test
    void shouldThrowWhenPublishingWithoutDraft() {
        FormCommandAppService formCommandAppService = new FormCommandAppService(
            formDefinitionRepository,
            new ObjectMapper()
        );
        when(formDefinitionRepository.findById(1L))
            .thenReturn(new FormDefinition(1L, "inspection_form", "巡检表", "说明", "DRAFT", null));
        when(formDefinitionRepository.findDraftByFormId(1L)).thenReturn(null);

        assertThatThrownBy(() -> formCommandAppService.publish(1L))
            .isInstanceOf(BizException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.FORM_NOT_FOUND);
    }
}
