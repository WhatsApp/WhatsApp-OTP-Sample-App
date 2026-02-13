/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.whatsapp.otp.sdkextension;

public enum WhatsAppHandshakeErrorType {

  EXCEPTION("An exception occurred while waiting for the handshake"),
  HANDSHAKE_ID_MISMATCH("Received request id does not match the expected"),
  HANDSHAKE_ID_NOT_RECEIVED_OR_TIMEOUT("Handshake id not received");

  private final String errorDescription;

  WhatsAppHandshakeErrorType(final String description) {
    this.errorDescription = description;
  }

  public String getErrorDescription() {
    return this.errorDescription;
  }

}
