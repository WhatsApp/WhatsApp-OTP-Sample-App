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
import com.whatsapp.otp.sdkextension.WhatsAppHandshakeHandler;
import dagger.hilt.android.AndroidEntryPoint;
import javax.inject.Inject;

@AndroidEntryPoint
public class OtpCodeReceiver extends BroadcastReceiver {

  private static final WaLogger WA_LOGGER = WaLogger.getLogger(OtpCodeReceiver.class);
  private static final String REQUEST_ID_KEY = "request_id";

  @Inject
  WhatsAppOtpIncomingIntentHandler incomingIntentHandler;

  @Inject
  WhatsAppHandshakeHandler handshakeHandler;

  @Override
  public void onReceive(final Context context, final Intent intent) {
    WA_LOGGER.info("Code received");
    final String requestId = intent.getStringExtra(REQUEST_ID_KEY);
    WA_LOGGER.info("Handshake Request id: " + requestId);

    final String expectedHandshakeId = getExpectedHandshakeId(requestId);
    if (expectedHandshakeId == null) {
      WA_LOGGER.error("Failed to login. Reason: Handshake ID not expected");
      return;
    }

    incomingIntentHandler.processOtpCode(intent,
        expectedHandshakeId,
        (code) -> broadcastCodeToInternalComponents(context, code),
        (whatsAppOtpError, e) -> WA_LOGGER.error(
            "Failed to login. Reason:" + whatsAppOtpError.name()));
  }

  private String getExpectedHandshakeId(final String receivedHandshakeId) {
    if (receivedHandshakeId == null) {
      return null;
    }
    return handshakeHandler.getExpectedHandshakeId(receivedHandshakeId);
  }

  private static void broadcastCodeToInternalComponents(final Context context, final String code) {
    Intent loginIntent = WaOtpUtils.createInternalCodeBroadcasterIntent(code,
        OtpValidatorFragment.OTP_CODE_RECEIVER,
        context);
    context.sendBroadcast(loginIntent);
  }
}
