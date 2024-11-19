/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

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
