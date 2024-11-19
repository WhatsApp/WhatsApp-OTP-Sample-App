/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.whatsapp.otp.sample.app.activity;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import androidx.appcompat.app.AppCompatActivity;
import com.whatsapp.otp.android.sdk.WhatsAppOtpIncomingIntentHandler;
import com.whatsapp.otp.client.WaOtpUtils;
import com.whatsapp.otp.common.WaLogger;
import com.whatsapp.otp.sample.app.fragment.OtpValidatorFragment;
import dagger.hilt.android.AndroidEntryPoint;
import javax.inject.Inject;

@AndroidEntryPoint
public class WhatsAppCodeReceiverActivity extends AppCompatActivity {

  private static final WaLogger WA_LOGGER = WaLogger.getLogger(WhatsAppCodeReceiverActivity.class);
  public static final String CODE_KEY = "code";

  @Inject
  WhatsAppOtpIncomingIntentHandler incomingIntentHandler;

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    WA_LOGGER.info("Verifying code received");
    incomingIntentHandler.processOtpCode(getIntent(),
        code -> {
          final Context applicationContext = getApplicationContext();
          // broadcast code
          final Intent codeBroadcasterIntent = WaOtpUtils.createCodeBroadcasterIntent(code,
              OtpValidatorFragment.OTP_CODE_RECEIVER,
              applicationContext);
          applicationContext.sendBroadcast(codeBroadcasterIntent);
          // put activity to the front - required if the user leaves the app
          final Intent loginIntent = WaOtpUtils.createAutofillIntent(applicationContext,
              code,
              Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
          this.startActivity(loginIntent);
        },
        (whatsAppOtpError, e) -> {
          WA_LOGGER.error("Failed to login. Reason:" +  whatsAppOtpError.name());
        });
  }
}
