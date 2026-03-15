package com.dataapp.form.domain.model.aggregate;

import com.dataapp.form.domain.model.entity.FormDraft;
import com.dataapp.form.domain.model.entity.FormVersion;
import com.dataapp.form.domain.model.valueobject.FormMeta;
import com.dataapp.shared.exception.BizException;
import com.dataapp.shared.exception.ErrorCode;
import com.dataapp.shared.kernel.model.AggregateRoot;

import java.time.OffsetDateTime;

public class FormDefinition extends AggregateRoot<Long> {

    public static final String STATUS_DRAFT = "DRAFT";
    public static final String STATUS_ACTIVE = "ACTIVE";
    public static final String STATUS_DELETED = "DELETED";

    private final Long id;
    private final String formCode;
    private final String name;
    private final String description;
    private final String status;
    private final Long currentVersionId;

    public FormDefinition(Long id, String formCode, String name, String description, String status, Long currentVersionId) {
        this.id = id;
        this.formCode = formCode;
        this.name = name;
        this.description = description;
        this.status = status;
        this.currentVersionId = currentVersionId;
    }

    @Override
    public Long getId() {
        return id;
    }

    public String getFormCode() {
        return formCode;
    }

    public String getName() {
        return name;
    }

    public String getDescription() {
        return description;
    }

    public String getStatus() {
        return status;
    }

    public Long getCurrentVersionId() {
        return currentVersionId;
    }

    public static FormDefinition create(Long id, String formCode, FormMeta meta) {
        String resolvedFormCode = formCode == null || formCode.isBlank() ? "form_" + id : formCode.trim();
        return new FormDefinition(id, resolvedFormCode, meta.name(), meta.description(), STATUS_DRAFT, null);
    }

    public FormDefinition saveDraft(FormMeta meta) {
        assertNotDeleted();
        return new FormDefinition(id, formCode, meta.name(), meta.description(), STATUS_DRAFT, currentVersionId);
    }

    public DraftSaveResult saveDraft(
        FormMeta meta,
        FormDraft currentDraft,
        String fieldsJson,
        Long draftId,
        Long operatorId,
        OffsetDateTime now
    ) {
        FormDefinition updatedDefinition = saveDraft(meta);
        FormDraft nextDraft = currentDraft == null
            ? new FormDraft(draftId, id, fieldsJson, 1, operatorId, now)
            : currentDraft.save(fieldsJson, operatorId, now);
        return new DraftSaveResult(updatedDefinition, nextDraft);
    }

    public PublishResult publish(
        FormDraft draft,
        String fieldsJson,
        Integer versionNo,
        Long versionId,
        Long operatorId,
        OffsetDateTime now
    ) {
        assertNotDeleted();
        if (draft == null) {
            throw new BizException(ErrorCode.FORM_NOT_FOUND, "表单草稿不存在");
        }
        FormDraft normalizedDraft = draft.repersist(fieldsJson, operatorId, now);
        FormVersion version = FormVersion.create(versionId, id, versionNo, fieldsJson, operatorId, now);
        FormDefinition activatedDefinition = new FormDefinition(
            id,
            formCode,
            name,
            description,
            STATUS_ACTIVE,
            versionId
        );
        return new PublishResult(activatedDefinition, normalizedDraft, version);
    }

    private void assertNotDeleted() {
        if (STATUS_DELETED.equals(status)) {
            throw new BizException(ErrorCode.FORM_NOT_FOUND, "表单已删除");
        }
    }

    public record DraftSaveResult(
        FormDefinition formDefinition,
        FormDraft draft
    ) {
    }

    public record PublishResult(
        FormDefinition formDefinition,
        FormDraft draft,
        FormVersion version
    ) {
    }
}
