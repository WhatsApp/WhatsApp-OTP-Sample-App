/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.whatsapp.otp.client;

import android.content.Context;
import android.content.Intent;
import androidx.annotation.NonNull;
import com.whatsapp.otp.common.WaLogger;
import com.whatsapp.otp.sample.app.activity.OtpFlowActivity;

public class WaOtpUtils {

  private static final WaLogger WA_LOGGER = WaLogger.getLogger(WaOtpUtils.class);


  private static final String CODE_KEY = "code";

  /**
   * Private since this is currently working as an utility class.
   */
  private WaOtpUtils() {

  }

  @NonNull
  public static Intent createInternalCodeBroadcasterIntent(final @NonNull String otpCode,
      final @NonNull String action,
      final @NonNull Context context) {
    WA_LOGGER.debug("Received code: " + otpCode);
    Intent local = new Intent();
    local.setAction(action);
    local.putExtra(CODE_KEY, otpCode);
    local.setPackage(context.getPackageName());
    return local;
  }

  @NonNull
  public static Intent createAutofillIntent(final @NonNull Context context,
      final @NonNull String otpCode, final int flag) {
    WA_LOGGER.debug("Received code: " + otpCode);
    Intent intentLoginActivity = new Intent(context, OtpFlowActivity.class);
    intentLoginActivity.putExtra(CODE_KEY, otpCode);
    intentLoginActivity.addFlags(flag);
    return intentLoginActivity;
  }
}
