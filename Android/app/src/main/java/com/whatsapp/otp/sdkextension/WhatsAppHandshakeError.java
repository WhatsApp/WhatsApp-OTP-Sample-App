/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.whatsapp.otp.sdkextension;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

public class WhatsAppHandshakeError {

  private final @NonNull WhatsAppHandshakeErrorType errorType;
  private @Nullable String receivedHandshakeId;
  private @Nullable Exception exception;

  public WhatsAppHandshakeError(final WhatsAppHandshakeErrorType type) {
    this.errorType = type;
  }

  public WhatsAppHandshakeError(final WhatsAppHandshakeErrorType type,
      final String receivedHandshakeId) {
    this.errorType = type;
    this.receivedHandshakeId = receivedHandshakeId;
  }

  public WhatsAppHandshakeError(final WhatsAppHandshakeErrorType type, final Exception e) {
    this.errorType = type;
    this.exception = e;
  }

  public String getReceivedHandshakeId() {
    return receivedHandshakeId;
  }

  public WhatsAppHandshakeErrorType getErrorType() {
    return this.errorType;
  }

  public Exception getException() {
    return this.exception;
  }

}
