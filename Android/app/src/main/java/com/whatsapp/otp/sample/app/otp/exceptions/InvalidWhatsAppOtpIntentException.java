package com.whatsapp.otp.sample.app.otp.exceptions;

import androidx.annotation.NonNull;

public class InvalidWhatsAppOtpIntentException extends RuntimeException {

  public InvalidWhatsAppOtpIntentException(final @NonNull String message) {
    super(message);
  }
}
