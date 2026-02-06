/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.whatsapp.otp.sample.app.receiver;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import com.whatsapp.otp.android.sdk.WhatsAppOtpIncomingIntentHandler;
import com.whatsapp.otp.client.WaOtpUtils;
import com.whatsapp.otp.common.WaLogger;
import com.whatsapp.otp.sample.app.fragment.OtpValidatorFragment;
import dagger.hilt.android.AndroidEntryPoint;
import javax.inject.Inject;

@AndroidEntryPoint
public class OtpCodeReceiver extends BroadcastReceiver {

  private static final WaLogger WA_LOGGER = WaLogger.getLogger(OtpCodeReceiver.class);

  @Inject
  WhatsAppOtpIncomingIntentHandler incomingIntentHandler;

  @Override
  public void onReceive(Context context, Intent intent) {
    WA_LOGGER.info("Code received");
      incomingIntentHandler.processOtpCode(intent,
          code -> {
            Intent loginIntent = WaOtpUtils.createCodeBroadcasterIntent(code,
                OtpValidatorFragment.OTP_CODE_RECEIVER,
                context);
            context.sendBroadcast(loginIntent);
          },
          (whatsAppOtpError, e) -> WA_LOGGER.error("Failed to login. Reason:" +  whatsAppOtpError.name()));
  }
}
