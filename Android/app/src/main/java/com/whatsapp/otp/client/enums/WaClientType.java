package com.whatsapp.otp.client.enums;

public enum WaClientType {

  CONSUMER("com.whatsapp"),
  BUSINESS("com.whatsapp.w4b");

  private String packageName;

  WaClientType(String packageName) {
    this.packageName = packageName;
  }

  public String getPackageName() {
    return this.packageName;
  }
}
