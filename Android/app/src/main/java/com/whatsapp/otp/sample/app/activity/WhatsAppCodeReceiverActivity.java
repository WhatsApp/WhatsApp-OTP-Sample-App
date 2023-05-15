package com.whatsapp.otp.sample.app.activity;

import android.content.Intent;
import android.os.Bundle;
import androidx.appcompat.app.AppCompatActivity;
import com.whatsapp.otp.client.WaOtpUtils;
import com.whatsapp.otp.common.WaLogger;
import com.whatsapp.otp.sample.app.fragment.OtpValidatorFragment;
import com.whatsapp.otp.sample.app.otp.exceptions.InvalidWhatsAppOtpIntentException;

public class WhatsAppCodeReceiverActivity extends AppCompatActivity {

  private static final WaLogger WA_LOGGER = WaLogger.getLogger(WhatsAppCodeReceiverActivity.class);
  public static final String CODE_KEY = "code";

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    WA_LOGGER.info("Verifying code received");
    try {
      Intent intent = getIntent();
      if (WaOtpUtils.isWhatsAppIntent(intent)) {
        final Intent codeBroadcasterIntent = WaOtpUtils.createCodeBroadcasterIntent(intent,
            OtpValidatorFragment.OTP_CODE_RECEIVER);
        this.getApplicationContext().sendBroadcast(codeBroadcasterIntent);
        Intent intentLoginActivity = WaOtpUtils.createFilledOtpIntent(getApplicationContext(),
            intent,
            Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
        this.startActivity(intentLoginActivity);
      } else {
        WA_LOGGER.info("Skipping code verification since intent is not from WhatsApp");
      }
    } catch (InvalidWhatsAppOtpIntentException e) {
      WA_LOGGER.error("Failed to send code to login activity since intent is not from WhatsApp", e);
    } catch (Exception e) {
      WA_LOGGER.error("Failed to send code to login activity", e);
    }
  }
}
