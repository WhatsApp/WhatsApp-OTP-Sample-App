package com.whatsapp.otp.client;

import android.content.Context;
import androidx.annotation.NonNull;
import com.whatsapp.otp.common.WaLogger;
import org.apache.commons.lang3.Validate;

public class WaIntentBroadcaster {

  private static final WaLogger WA_LOGGER = WaLogger.getLogger(WaIntentBroadcaster.class);

  private final Context context;

  private final WaIntent whatsAppIntent;

  public WaIntentBroadcaster(
      final @NonNull Context context,
      final @NonNull WaIntent whatsAppIntent) {
    Validate.notNull(context);
    Validate.notNull(whatsAppIntent);
    this.context = context;
    this.whatsAppIntent = whatsAppIntent;
  }

  public void broadCast() {
    WA_LOGGER.info("Broadcasting intent");
    context.sendBroadcast(this.whatsAppIntent.getAppIntent());
  }

  public WaIntent getWhatsAppIntent() {
    return this.whatsAppIntent;
  }
}
