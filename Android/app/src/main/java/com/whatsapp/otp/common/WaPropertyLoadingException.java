/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.whatsapp.otp.common;

public class WaPropertyLoadingException extends RuntimeException {

  public WaPropertyLoadingException(String message, Throwable exception) {
    super(message, exception);
  }
}
