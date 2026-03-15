package com.dataapp.form.domain.model.valueobject;

import com.dataapp.shared.exception.BizException;
import com.dataapp.shared.exception.ErrorCode;

public record FormMeta(
    String name,
    String description
) {

    public FormMeta {
        String normalizedName = name == null ? null : name.trim();
        if (normalizedName == null || normalizedName.isEmpty()) {
            throw new BizException(ErrorCode.FORM_DRAFT_INVALID, "表单名称不能为空");
        }
        name = normalizedName;
        description = description == null ? "" : description.trim();
    }
}
