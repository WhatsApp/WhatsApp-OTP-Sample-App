package com.whatsapp.otp.client;

import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import com.whatsapp.otp.android.sdk.WhatsAppOtpIncomingIntentHandler;
import com.whatsapp.otp.client.enums.WaClientType;
import com.whatsapp.otp.common.WaLogger;
import com.whatsapp.otp.sample.app.activity.OtpFlowActivity;
import com.whatsapp.otp.android.sdk.exceptions.InvalidWhatsAppOtpIntentException;
import java.util.List;

public class WaOtpUtils {

  private static final WaLogger WA_LOGGER = WaLogger.getLogger(WaOtpUtils.class);

  private static final WhatsAppOtpIncomingIntentHandler whatsAppOtpIncomingIntentHandler = new WhatsAppOtpIncomingIntentHandler();

  private static final String CODE_KEY = "code";

  /**
   * Private since this is currently working as an utility class.
   */
  private WaOtpUtils() {

  }

  @NonNull
  public static Intent createCodeBroadcasterIntent(final @NonNull String otpCode,
      final @NonNull String action, final @NonNull Context context) {
    WA_LOGGER.debug("Received code: " + otpCode);
    Intent local = new Intent();
    local.setAction(action);
    local.putExtra(CODE_KEY, otpCode);
    local.setPackage(context.getPackageName());
    return local;
  }

  @NonNull
  public static Intent createAutofillIntent(final @NonNull Context context,
      final @NonNull String otpCode, int flag) {
    WA_LOGGER.debug("Received code: " + otpCode);
    Intent intentLoginActivity = new Intent(context, OtpFlowActivity.class);
    intentLoginActivity.putExtra(CODE_KEY, otpCode);
    intentLoginActivity.addFlags(flag);
    return intentLoginActivity;
  }
}
