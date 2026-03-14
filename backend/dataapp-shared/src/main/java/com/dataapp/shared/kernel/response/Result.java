package com.dataapp.shared.kernel.response;

public record Result<T>(String code, String message, T data) {

    public static <T> Result<T> success(T data) {
        return new Result<>("SUCCESS", "ok", data);
    }
}
