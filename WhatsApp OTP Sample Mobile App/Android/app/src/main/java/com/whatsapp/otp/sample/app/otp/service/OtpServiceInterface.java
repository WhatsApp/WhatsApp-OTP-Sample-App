/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.whatsapp.otp.sample.app.otp.service;

import java.util.function.Consumer;

public interface OtpServiceInterface {

  enum OtpStatus {
    VALID,
    INVALID
  }

  void sendOtp(String phoneNumber,
      Runnable onSuccessHandler,
      Consumer<String> onFailureHandler);

  void validateOtp(String phoneNumber,
      String code,
      Consumer<OtpStatus> onRequestCompleted,
      Consumer<String> onRequestFailureHandler);
}
