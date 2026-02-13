/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.whatsapp.otp.idhash;

import android.app.PendingIntent;
import android.content.Intent;
import androidx.annotation.NonNull;
import com.whatsapp.otp.android.sdk.WhatsAppOtpIncomingIntentHandler;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

public final class RequestIdUtil {

  private static final WhatsAppOtpIncomingIntentHandler whatsAppOtpIncomingIntentHandler =
          new WhatsAppOtpIncomingIntentHandler();

  private static final String REQUEST_ID_NAME = "request_id";

  private static final Map<String, String> storedRequestIds = new HashMap<>();

  public static Intent attachAndStoreRequestId(final @NonNull Intent intent) {
    String requestId = UUID.randomUUID().toString();
    String packageName = intent.getPackage();
    intent.putExtra(REQUEST_ID_NAME, requestId);
    storedRequestIds.put(packageName, requestId);
    return intent;
  }

  public static boolean validateAndClearRequestId(final @NonNull Intent intent) {
    String requestId = intent.getStringExtra(REQUEST_ID_NAME);
    PendingIntent pendingIntent = (PendingIntent) intent.getParcelableExtra("_ci_");
    String packageName = pendingIntent == null ? null : pendingIntent.getCreatorPackage();

    // Early exit if no stored request or not from WhatsApp
    if (packageName == null) {
      return false;
    }

    String expectedRequestId = storedRequestIds.get(packageName);
    if (expectedRequestId == null
            || !whatsAppOtpIncomingIntentHandler.isIntentFromWhatsApp(intent, expectedRequestId)) {
      return false;
    }

    if (requestId != null && requestId.equals(expectedRequestId)) {
      storedRequestIds.remove(packageName);
      return true;
    } else {
      return false;
    }
  }
}
