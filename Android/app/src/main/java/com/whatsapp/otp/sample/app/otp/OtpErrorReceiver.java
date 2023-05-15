package com.whatsapp.otp.sample.app.otp;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.BadParcelableException;
import android.util.Log;
import com.whatsapp.otp.client.WaOtpUtils;
import com.whatsapp.otp.common.WaLogger;
import com.whatsapp.otp.sample.app.activity.OtpFlowActivity;

public class OtpErrorReceiver extends BroadcastReceiver {

  private static final WaLogger WA_LOGGER = WaLogger.getLogger(OtpErrorReceiver.class);
  public static final String OTP_ERROR_KEY = "error";
  public static final String OTP_ERROR_MESSAGE_KEY = "error_message";

  @Override
  public void onReceive(Context context, Intent intent) {
    try {
      if (WaOtpUtils.isWhatsAppIntent(intent)) {
        String otpErrorKey = intent.getStringExtra(OTP_ERROR_KEY);
        String otpErrorMessage = intent.getStringExtra(OTP_ERROR_MESSAGE_KEY);
        String message = "otpErrorKey: " + otpErrorKey + " otpErrorMessage: " + otpErrorMessage;
        WA_LOGGER.debug(message);
        // Handling errors
        if (otpErrorKey != null && otpErrorMessage != null) {
          handleOtpError(context, otpErrorKey, otpErrorMessage);
        }
      }
    } catch (BadParcelableException e) {
      Log.e("OtpErrorReceiver", e.getLocalizedMessage());
    }
  }

  private void handleOtpError(Context context, String otpErrorKey, String otpErrorMessage) {
    Intent intentLoginActivity = new Intent(context, OtpFlowActivity.class);
    intentLoginActivity.putExtra(OTP_ERROR_KEY, otpErrorKey);
    intentLoginActivity.putExtra(OTP_ERROR_MESSAGE_KEY, otpErrorMessage);
    intentLoginActivity.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
    context.startActivity(intentLoginActivity);
  }
}
