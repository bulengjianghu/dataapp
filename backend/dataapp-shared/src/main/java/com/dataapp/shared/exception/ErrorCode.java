package com.dataapp.shared.exception;

public final class ErrorCode {

    public static final String SYS_INTERNAL_ERROR = "SYS_INTERNAL_ERROR";
    public static final String UNAUTHORIZED = "UNAUTHORIZED";
    public static final String FORM_NOT_FOUND = "FORM_NOT_FOUND";
    public static final String FORM_DRAFT_INVALID = "FORM_DRAFT_INVALID";
    public static final String RULE_NOT_FOUND = "RULE_NOT_FOUND";
    public static final String RULE_DRAFT_INVALID = "RULE_DRAFT_INVALID";
    public static final String RULE_VERSION_NOT_FOUND = "RULE_VERSION_NOT_FOUND";
    public static final String RECORD_NOT_FOUND = "RECORD_NOT_FOUND";
    public static final String RECORD_STATUS_INVALID = "RECORD_STATUS_INVALID";
    public static final String RECORD_DATA_INVALID = "RECORD_DATA_INVALID";

    private ErrorCode() {
    }
}
