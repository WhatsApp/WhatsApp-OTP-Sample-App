package com.whatsapp.otp.sample.app.otp.service;

public class OtpServiceException extends RuntimeException {

  public OtpServiceException(String message) {
    super(message);
  }

  public OtpServiceException(String message, Exception e) {
    super(message, e);
  }
}
