package com.whatsapp.otp.client;

import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.os.Build;
import android.os.Bundle;
import androidx.annotation.NonNull;
import com.whatsapp.otp.client.enums.WaClientType;
import com.whatsapp.otp.client.exceptions.WaMissingAttributeException;
import com.whatsapp.otp.common.WaLogger;
import com.whatsapp.otp.sample.BuildConfig;
import java.util.List;
import org.apache.commons.lang3.Validate;

public class WaIntent {

  private static final String BROADCASTER_NOT_SET_MESSAGE = "Broadcaster is not set. "
      + "Have you created it?";
  public static final String CALLER_INFO = "_ci_";

  private static final WaLogger WA_LOGGER = WaLogger.getLogger(WaIntent.class);

  private final WaClientType type;
  private final Context context;

  private boolean intentCreated = false;

  private Intent appIntent;
  private PendingIntent appPendingIntent;
  private Bundle extras;
  private WaIntentBroadcaster broadcaster;

  public WaIntent(
      final @NonNull WaClientType type,
      final @NonNull Context context) {
    Validate.notNull(type, "A client type must be provided");
    Validate.notNull(context, "The context must be provided");
    this.type = type;
    this.context = context;
  }

  @NonNull
  public synchronized WaIntentBroadcaster createOtpIntentToWa() {
    if (!intentCreated) {
      this.appIntent = createOtpRequestedIntentForWhatsApp(type.getPackageName());
      this.appPendingIntent = createPendingIntentForOtp(context, appIntent);
      this.broadcaster = new WaIntentBroadcaster(context, this);
      intentCreated = true;
    }
    return broadcaster;
  }

  public void sendBroadcast() {
    if (this.broadcaster == null) {
      throw new WaMissingAttributeException(BROADCASTER_NOT_SET_MESSAGE);
    }
    this.broadcaster.broadCast();
  }

  @NonNull
  private Intent createOtpRequestedIntentForWhatsApp(final @NonNull String waPackageName) {
    Validate.notNull(waPackageName);
    Intent listenIntent = new Intent();
    listenIntent.setPackage(waPackageName);
    listenIntent.setAction("com.whatsapp.otp.OTP_REQUESTED");
    if (BuildConfig.DEBUG) {
      try {
        PackageManager packageManager = context.getPackageManager();
        PackageInfo packageInfo = packageManager.getPackageInfo(waPackageName,
            PackageManager.GET_ACTIVITIES);
        WA_LOGGER.debug(packageInfo.toString());
        List<ResolveInfo> resolveInfoList = packageManager.queryBroadcastReceivers(listenIntent, 0);
        resolveInfoList.forEach(item -> WA_LOGGER.debug(item.toString()));
      } catch (PackageManager.NameNotFoundException exception) {
        WA_LOGGER.error("Package " + waPackageName
            + " not found. Did add it to <queries /> on the  manifest file?", exception);
      }
    }
    return listenIntent;
  }

  @NonNull
  public PendingIntent createPendingIntentForOtp(Context context, Intent intent) {
    int flag = Build.VERSION.SDK_INT >= Build.VERSION_CODES.S ? PendingIntent.FLAG_IMMUTABLE : 0;
    PendingIntent pendingIntent = PendingIntent.getBroadcast(context, 0, intent, flag);
    this.extras = addToWaIntentExtras(pendingIntent);
    return pendingIntent;
  }

  @NonNull
  private Bundle addToWaIntentExtras(final @NonNull PendingIntent pendingIntent) {
    Validate.notNull(pendingIntent);
    Bundle extras = appIntent.getExtras();
    if (extras == null) {
      extras = new Bundle();
    }

    extras.putParcelable(CALLER_INFO, pendingIntent);
    appIntent.putExtras(extras);
    return extras;
  }

  public Intent getAppIntent() {
    return this.appIntent;
  }

  public WaIntentBroadcaster getBroadcaster() {
    return this.broadcaster;
  }

  public PendingIntent getAppPendingIntent() {
    return this.appPendingIntent;
  }

  public Bundle getExtras() {
    return this.extras;
  }
}
