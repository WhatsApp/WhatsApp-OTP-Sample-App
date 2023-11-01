package com.whatsapp.otp.sample.app.receiver;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import com.whatsapp.otp.client.WaOtpUtils;
import com.whatsapp.otp.common.WaLogger;
import com.whatsapp.otp.sample.app.fragment.OtpValidatorFragment;

public class OtpCodeReceiver extends BroadcastReceiver {

  private static final WaLogger WA_LOGGER = WaLogger.getLogger(OtpCodeReceiver.class);

  @Override
  public void onReceive(Context context, Intent intent) {
    WA_LOGGER.info("Code received");
    try {
      Intent loginIntent = WaOtpUtils.createCodeBroadcasterIntent(intent, OtpValidatorFragment.OTP_CODE_RECEIVER, context);
      context.sendBroadcast(loginIntent);
    } catch (Exception e) {
      WA_LOGGER.error("Failed to login", e);
    }
  }
}
