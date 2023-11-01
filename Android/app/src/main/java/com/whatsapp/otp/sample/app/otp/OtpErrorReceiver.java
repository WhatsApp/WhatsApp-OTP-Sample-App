package com.whatsapp.otp.sample.app.otp;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.BadParcelableException;
import android.util.Log;
import com.whatsapp.otp.android.sdk.WhatsAppOtpIncomingIntentHandler;
import com.whatsapp.otp.android.sdk.data.DebugSignal;
import com.whatsapp.otp.common.WaLogger;
import com.whatsapp.otp.sample.app.activity.OtpFlowActivity;
import com.whatsapp.otp.sample.app.otp.exceptions.InvalidWhatsAppOtpIntentException;
import dagger.hilt.android.AndroidEntryPoint;
import javax.inject.Inject;

@AndroidEntryPoint
public class OtpErrorReceiver extends BroadcastReceiver {

  private static final WaLogger WA_LOGGER = WaLogger.getLogger(OtpErrorReceiver.class);
  public static final String OTP_ERROR_KEY = "error";
  public static final String OTP_ERROR_MESSAGE_KEY = "error_message";

  @Inject
  WhatsAppOtpIncomingIntentHandler whatsAppOtpIncomingIntentHandler;

  @Override
  public void onReceive(Context context, Intent intent) {
    try {
      whatsAppOtpIncomingIntentHandler.processOtpDebugSignals(intent,
            debugSignal -> handleDebugSignal(context, debugSignal),
            (whatsAppOtpError, e) -> WA_LOGGER.error("Error: " + whatsAppOtpError.name() + "; Exception: " + e));

    } catch (BadParcelableException e) {
      Log.e("OtpErrorReceiver", e.getLocalizedMessage());
    } catch (InvalidWhatsAppOtpIntentException e) {
      Log.e("OtpErrorReceiver", e.getLocalizedMessage());
    }
  }

  private void handleDebugSignal(Context context, DebugSignal debugSignal) {
    String message = "otpErrorKey: " + debugSignal.otpErrorIdentifier + " otpErrorMessage: " + debugSignal.otpErrorMessage;
    WA_LOGGER.debug(message);
    // Handling errors
    if (debugSignal.otpErrorIdentifier != null && debugSignal.otpErrorMessage != null) {
      handleOtpError(context, debugSignal);
    }
  }

  private void handleOtpError(Context context, DebugSignal debugSignal) {
    Intent intentLoginActivity = new Intent(context, OtpFlowActivity.class);
    intentLoginActivity.putExtra(OTP_ERROR_KEY, debugSignal.otpErrorIdentifier);
    intentLoginActivity.putExtra(OTP_ERROR_MESSAGE_KEY, debugSignal.otpErrorMessage);
    intentLoginActivity.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
    context.startActivity(intentLoginActivity);
  }
}
