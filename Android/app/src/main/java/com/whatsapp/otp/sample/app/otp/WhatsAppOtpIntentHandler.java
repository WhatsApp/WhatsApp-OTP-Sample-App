package com.whatsapp.otp.sample.app.otp;

import android.content.Context;
import androidx.annotation.NonNull;
import com.whatsapp.otp.android.sdk.WhatsAppOtpHandler;
import com.whatsapp.otp.common.WaLogger;
import com.whatsapp.otp.sample.app.otp.service.OtpServiceInterface;
import java.util.function.Consumer;
import javax.inject.Inject;
import org.apache.commons.lang3.Validate;

public class WhatsAppOtpIntentHandler {

  private static final WaLogger WA_LOGGER = WaLogger.getLogger(WhatsAppOtpIntentHandler.class);

  private final WhatsAppOtpHandler whatsAppOtpHandler;

  @NonNull
  private final OtpServiceInterface otpService;


  @Inject
  public WhatsAppOtpIntentHandler(
      @NonNull final OtpServiceInterface otpServiceInterface,
      @NonNull final WhatsAppOtpHandler whatsAppOtpHandler) {
    Validate.notNull(otpServiceInterface);
    Validate.notNull(whatsAppOtpHandler);
    this.otpService = otpServiceInterface;
    this.whatsAppOtpHandler = whatsAppOtpHandler;
  }

  public void sendOtp(
      final @NonNull String phoneNumber,
      final @NonNull Context context,
      final @NonNull Runnable onSuccessHandler,
      final @NonNull Consumer<String> onFailureHandler) {
    Validate.notNull(phoneNumber);
    Validate.notNull(context);
    Validate.notNull(onSuccessHandler);
    Validate.notNull(onFailureHandler);
    try {
      if (phoneNumber.isEmpty()) {
        onFailureHandler.accept("Phone number cannot be empty");
        return;
      }
      whatsAppOtpHandler.sendOtpIntentToWhatsApp(context);
      otpService.sendOtp(phoneNumber, onSuccessHandler, onFailureHandler);
    } catch (Exception e) {
      onFailureHandler.accept("Sorry. We were unable to send the one time password");
      WA_LOGGER.error("Unable to send otp through WhatsApp", e);
    }
  }
}
