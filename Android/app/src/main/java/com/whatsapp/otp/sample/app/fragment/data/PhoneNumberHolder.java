/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.whatsapp.otp.sample.app.fragment.data;

import androidx.annotation.NonNull;

public class PhoneNumberHolder {

  private static String phoneNumber;

  public static String getPhoneNumber() {
    return phoneNumber;
  }

  public static void setPhoneNumber(final @NonNull String phoneNumber) {
    PhoneNumberHolder.phoneNumber = phoneNumber;
  }
}
