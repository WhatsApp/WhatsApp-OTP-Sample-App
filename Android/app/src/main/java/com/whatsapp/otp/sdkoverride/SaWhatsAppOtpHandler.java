/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.whatsapp.otp.sdkoverride;

import android.content.Context;
import android.content.Intent;
import androidx.annotation.NonNull;
import com.whatsapp.otp.android.sdk.WhatsAppOtpHandler;
import com.whatsapp.otp.android.sdk.WhatsAppOtpIntentBuilder;
import com.whatsapp.otp.android.sdk.enums.WhatsAppClientType;
import java.util.UUID;

public class SaWhatsAppOtpHandler extends WhatsAppOtpHandler {

  private static final String HANDSHAKE_ID = "request_id";

  private final WhatsAppOtpIntentBuilder whatsAppOtpIntentBuilder;

  public SaWhatsAppOtpHandler(final WhatsAppOtpIntentBuilder whatsAppOtpIntentBuilder) {
    super(whatsAppOtpIntentBuilder);
    this.whatsAppOtpIntentBuilder = whatsAppOtpIntentBuilder;
  }

  public UUID sendOtpIntentToWhatsAppWithRequestId(final @NonNull Context context) {
    if (context == null) {
      throw new NullPointerException("Context cannot be null");
    }
    UUID uuid = UUID.randomUUID();
    sendOtpIntentToWhatsAppWithRequestId(uuid, context, WhatsAppClientType.CONSUMER);
    sendOtpIntentToWhatsAppWithRequestId(uuid, context, WhatsAppClientType.BUSINESS);
    return uuid;
  }

  public UUID sendOtpIntentToWhatsAppWithRequestId(final @NonNull Context context,
      final @NonNull WhatsAppClientType type) {
    final UUID uuid = UUID.randomUUID();
    this.sendOtpIntentToWhatsAppWithRequestId(uuid, context, type);
    return uuid;
  }

  public UUID sendOtpIntentToWhatsAppWithRequestId(final @NonNull UUID uuid,
      final @NonNull Context context) {
    if (context == null) {
      throw new NullPointerException("Context cannot be null");
    }
    sendOtpIntentToWhatsAppWithRequestId(uuid, context, WhatsAppClientType.CONSUMER);
    sendOtpIntentToWhatsAppWithRequestId(uuid, context, WhatsAppClientType.BUSINESS);
    return uuid;
  }

  public Intent sendOtpIntentToWhatsAppWithRequestId(final @NonNull UUID uuid,
      final @NonNull Context context,
      final @NonNull WhatsAppClientType type) {
    Intent intent = this.whatsAppOtpIntentBuilder.create(context, type);
    String value = uuid.toString();
    intent.putExtra(HANDSHAKE_ID, value);
    context.sendBroadcast(intent);
    return intent;
  }
}
