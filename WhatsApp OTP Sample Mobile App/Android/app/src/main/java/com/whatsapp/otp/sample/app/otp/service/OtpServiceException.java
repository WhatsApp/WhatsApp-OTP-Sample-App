/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.whatsapp.otp.sample.app.otp.service;

public class OtpServiceException extends RuntimeException {

  public OtpServiceException(String message) {
    super(message);
  }

  public OtpServiceException(String message, Exception e) {
    super(message, e);
  }
}
