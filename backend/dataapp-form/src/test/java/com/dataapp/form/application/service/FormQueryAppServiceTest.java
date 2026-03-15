package com.dataapp.form.application.service;

import com.dataapp.form.domain.model.aggregate.FormDefinition;
import com.dataapp.form.domain.model.entity.FormDraft;
import com.dataapp.form.domain.model.entity.FormVersion;
import com.dataapp.form.domain.repository.FormDefinitionRepository;
import com.dataapp.form.infrastructure.persistence.po.FormDraftSummaryPO;
import com.dataapp.form.interfaces.dto.FormDraftListItemResponse;
import com.dataapp.form.interfaces.dto.FormDraftResponse;
import com.dataapp.form.interfaces.dto.FormDetailResponse;
import com.dataapp.form.interfaces.dto.FormRuntimeResponse;
import com.dataapp.shared.exception.BizException;
import com.dataapp.shared.exception.ErrorCode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doReturn;
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

    @Test
    void shouldReturnDraftWhenDraftExists() {
        FormQueryAppService formQueryAppService = new FormQueryAppService(formDefinitionRepository, new ObjectMapper());
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

        FormDraftResponse response = formQueryAppService.getDraft(1L);

        assertThat(response.draftVersion()).isEqualTo(2);
        assertThat(response.fields()).containsKey("field_1");
    }

    @Test
    void shouldListDrafts() {
        FormQueryAppService formQueryAppService = new FormQueryAppService(formDefinitionRepository, new ObjectMapper());
        FormDraftSummaryPO po = new FormDraftSummaryPO();
        po.setFormId(1L);
        po.setFormCode("inspection_form");
        po.setName("巡检表");
        po.setDescription("说明");
        po.setStatus("DRAFT");
        po.setDraftVersion(2);
        doReturn(java.util.List.of(po)).when(formDefinitionRepository).listDrafts();

        java.util.List<FormDraftListItemResponse> response = formQueryAppService.listDrafts();

        assertThat(response).hasSize(1);
        assertThat(response.getFirst().formCode()).isEqualTo("inspection_form");
    }

    @Test
    void shouldReturnPublishedRuntimeForm() {
        FormQueryAppService formQueryAppService = new FormQueryAppService(formDefinitionRepository, new ObjectMapper());
        when(formDefinitionRepository.findByFormCode("inspection_form"))
            .thenReturn(new FormDefinition(1L, "inspection_form", "巡检表", "说明", "ACTIVE", 99L));
        when(formDefinitionRepository.findCurrentVersionByFormCode("inspection_form"))
            .thenReturn(new FormVersion(
                99L,
                1L,
                3,
                "{\"field_1\":{\"id\":\"field_1\",\"type\":\"field\",\"childrenIds\":[],\"props\":{\"component\":\"input\",\"label\":\"姓名\"},\"layout\":{\"span\":6}}}",
                1L,
                null
            ));

        FormRuntimeResponse response = formQueryAppService.getPublishedByFormCode("inspection_form");

        assertThat(response.versionNo()).isEqualTo(3);
        assertThat(response.fields()).containsKey("field_1");
    }

    @Test
    void shouldThrowWhenPublishedVersionDoesNotExist() {
        FormQueryAppService formQueryAppService = new FormQueryAppService(formDefinitionRepository, new ObjectMapper());
        when(formDefinitionRepository.findByFormCode("inspection_form"))
            .thenReturn(new FormDefinition(1L, "inspection_form", "巡检表", "说明", "DRAFT", null));
        when(formDefinitionRepository.findCurrentVersionByFormCode("inspection_form")).thenReturn(null);

        assertThatThrownBy(() -> formQueryAppService.getPublishedByFormCode("inspection_form"))
            .isInstanceOf(BizException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.FORM_NOT_FOUND);
    }
}
