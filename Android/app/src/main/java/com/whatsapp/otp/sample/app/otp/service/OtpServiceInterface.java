package com.whatsapp.otp.sample.app.otp.service;

import java.util.function.Consumer;

public interface OtpServiceInterface {

  enum OtpStatus {
    VALID,
    INVALID
  }

  void sendOtp(String phoneNumber,
      Runnable onSuccessHandler,
      Consumer<String> onFailureHandler);

  void validateOtp(String phoneNumber,
      String code,
      Consumer<OtpStatus> onRequestCompleted,
      Consumer<String> onRequestFailureHandler);
}
