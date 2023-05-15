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
