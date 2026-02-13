/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.whatsapp.otp.idhash;

import android.content.Intent;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import com.whatsapp.otp.android.sdk.exceptions.InvalidWhatsAppOtpIntentException;

public class WaIdHashUtils {

  private static final String ID_HASH_KEY = "id_hash";

  @Nullable
  public static String getWhatsAppIdentityHash(final @NonNull Intent intent) {
    boolean hasValidRequestId = RequestIdUtil.validateAndClearRequestId(intent);
    if (hasValidRequestId) {
      return intent.getStringExtra(ID_HASH_KEY);
    }
    throw new InvalidWhatsAppOtpIntentException("Invalid Intent");
  }
}
