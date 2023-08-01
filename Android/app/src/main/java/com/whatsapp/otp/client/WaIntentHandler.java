package com.whatsapp.otp.client;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInstaller;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import androidx.annotation.NonNull;
import com.whatsapp.otp.client.enums.WaClientType;
import java.util.List;
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

  public boolean isWhatsAppInstalled(final @NonNull Context context){
    return isWhatsAppInstalled(context, WaClientType.CONSUMER) || isWhatsAppInstalled(context, WaClientType.BUSINESS);
  }

  public boolean isWhatsAppInstalled(final @NonNull Context context,
      final @NonNull WaClientType type){
    final Intent intent = new Intent();
    intent.setPackage(type.getPackageName());
    intent.setAction("com.whatsapp.otp.OTP_REQUESTED");
    PackageManager packageManager = context.getPackageManager();
    List<ResolveInfo> receivers = packageManager.queryBroadcastReceivers(intent, 0);
    return !receivers.isEmpty();
  }
}
