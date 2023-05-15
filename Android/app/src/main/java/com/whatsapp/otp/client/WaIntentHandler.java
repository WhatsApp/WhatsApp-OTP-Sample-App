package com.whatsapp.otp.client;

import android.content.Context;
import androidx.annotation.NonNull;
import com.whatsapp.otp.client.enums.WaClientType;
import org.apache.commons.lang3.Validate;

public class WaIntentHandler {

  private static final WaOtpSender waOtpSender = new WaOtpSender();

  private WaIntentHandler() {
  }

  public static WaIntentHandler getNewInstance() {
    return new WaIntentHandler();
  }

  public WaOtpSender sendOtpIntentToWhatsApp(final @NonNull Context context) {
    Validate.notNull(context);
    sendOtpIntentToWhatsApp(WaClientType.CONSUMER, context);
    sendOtpIntentToWhatsApp(WaClientType.BUSINESS, context);
    return waOtpSender;
  }

  public WaIntent sendOtpIntentToWhatsApp(
      final @NonNull WaClientType type,
      final @NonNull Context context) {
    Validate.notNull(type);
    Validate.notNull(context);
    WaIntent waIntent = new WaIntent(type, context);
    waIntent.createOtpIntentToWa().broadCast();
    return waIntent;
  }
}
