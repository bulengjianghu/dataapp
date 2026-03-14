package com.dataapp.shared.exception;

import com.dataapp.shared.kernel.response.Result;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(BizException.class)
    public Result<Void> handleBizException(BizException ex) {
        return new Result<>(ex.getCode(), ex.getMessage(), null);
    }

    @ExceptionHandler(Exception.class)
    public Result<Void> handleException(Exception ex) {
        return new Result<>(ErrorCode.SYS_INTERNAL_ERROR, ex.getMessage(), null);
    }
}
