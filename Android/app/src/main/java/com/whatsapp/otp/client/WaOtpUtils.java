package com.whatsapp.otp.client;

import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import com.whatsapp.otp.client.enums.WaClientType;
import com.whatsapp.otp.common.WaLogger;
import com.whatsapp.otp.sample.app.activity.OtpFlowActivity;
import com.whatsapp.otp.sample.app.otp.exceptions.InvalidWhatsAppOtpIntentException;
import java.util.List;

public class WaOtpUtils {

  private static final WaLogger WA_LOGGER = WaLogger.getLogger(WaOtpUtils.class);

  private static final List<String> WA_PACKAGES = List.of(
      WaClientType.CONSUMER.getPackageName(),
      WaClientType.BUSINESS.getPackageName());

  private static final String CODE_KEY = "code";

  /**
   * Private since this is currently working as an utility class.
   */
  private WaOtpUtils() {

  }

  @NonNull
  public static Intent createFilledOtpIntent(final @NonNull Context context,
      final @NonNull Intent intent, final int flag) {
    String otpCode = getWhatsAppCode(intent);
    if (otpCode != null) {
      return createAutofillIntent(context, otpCode, flag);
    }
    throw new InvalidWhatsAppOtpIntentException("No code provided");
  }

  @NonNull
  public static Intent createCodeBroadcasterIntent(final @NonNull Intent intent,
      final @NonNull String action, final @NonNull Context context) {
    String otpCode = getWhatsAppCode(intent);
    if (otpCode != null) {
      return createCodeBroadcasterIntent(otpCode, action, context);
    }
    throw new InvalidWhatsAppOtpIntentException("No code provided");
  }

  @NonNull
  private static Intent createCodeBroadcasterIntent(final @NonNull String otpCode,
      final @NonNull String action, final @NonNull Context context) {
    WA_LOGGER.debug("Received code: " + otpCode);
    Intent local = new Intent();
    local.setAction(action);
    local.putExtra(CODE_KEY, otpCode);
    local.setPackage(context.getPackageName());
    return local;
  }

  public static boolean isWhatsAppIntent(final @NonNull Intent intent) {
    PendingIntent pendingIntent = getWhatsAppPendingIntent(intent);
    if (pendingIntent == null) {
      return false;
    }
    return isWhatsAppPendingIntent(pendingIntent);
  }

  @Nullable
  private static String getWhatsAppCode(final @NonNull Intent intent) {
    // verify that it is whatsapp only that is sending the code.
    boolean whatsAppIntent = isWhatsAppIntent(intent);
    if (whatsAppIntent) {
      WA_LOGGER.info("Intent request coming from WhatsApp");
      return intent.getStringExtra(CODE_KEY);
    }
    throw new InvalidWhatsAppOtpIntentException("Invalid Intent");
  }

  private static boolean isWhatsAppPendingIntent(final @NonNull PendingIntent pendingIntent) {
    // verify source of the pendingIntent
    String pendingIntentCreatorPackage = pendingIntent.getCreatorPackage();

    // check if creatorPackage is "com.whatsapp" -> WA consumer app
    // or "com.whatsapp.w4b" -> WA business app
    return WA_PACKAGES.contains(pendingIntentCreatorPackage);
  }

  @Nullable
  private static PendingIntent getWhatsAppPendingIntent(final @NonNull Intent intent) {
    return intent.getParcelableExtra(WaIntent.CALLER_INFO);
  }

  @NonNull
  private static Intent createAutofillIntent(final @NonNull Context context,
      final @NonNull String otpCode, int flag) {
    WA_LOGGER.debug("Received code: " + otpCode);
    Intent intentLoginActivity = new Intent(context, OtpFlowActivity.class);
    intentLoginActivity.putExtra(CODE_KEY, otpCode);
    intentLoginActivity.addFlags(flag);
    return intentLoginActivity;
  }
}
