/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.whatsapp.otp.sdkextension;

import android.content.Context;
import androidx.annotation.NonNull;
import com.whatsapp.otp.common.WaLogger;
import com.whatsapp.otp.sample.app.fragment.OtpChannelSelectorFragment;
import com.whatsapp.otp.sdkoverride.SaWhatsAppOtpHandler;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.SynchronousQueue;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;

public class WhatsAppHandshakeHandler {

  private static final WaLogger WA_LOGGER = WaLogger.getLogger(OtpChannelSelectorFragment.class);

  private final ExecutorService executorServiceForNetworkRequest;

  private final SynchronousQueue<String> handshakeQueue = new SynchronousQueue<>();

  private final SaWhatsAppOtpHandler whatsAppOtpHandler;

  private final Set<String> handshakes = new HashSet<>();

  private final int timeoutInSeconds;

  /**
   * Returns the expected handshake ID if the provided ID is in the set of valid handshakes.
   *
   * @param receivedHandshakeId the handshake ID received from the intent
   * @return the handshake ID if valid, null otherwise
   */
  public String getExpectedHandshakeId(final @NonNull String receivedHandshakeId) {
    if (handshakes.contains(receivedHandshakeId)) {
      return receivedHandshakeId;
    }
    return null;
  }

  public WhatsAppHandshakeHandler(final @NonNull SaWhatsAppOtpHandler whatsAppOtpHandler,
      final @NonNull ExecutorService executor,
      final int timeoutInSeconds) {
    this.executorServiceForNetworkRequest = executor;
    this.whatsAppOtpHandler = whatsAppOtpHandler;
    this.timeoutInSeconds = timeoutInSeconds;
  }

  public boolean registerHandshakeReceived(final @NonNull String handshakeRequestId,
      final int timeoutInSeconds) {
    try {
      return handshakeQueue.offer(handshakeRequestId, timeoutInSeconds, TimeUnit.SECONDS);
    } catch (InterruptedException e) {
      throw new RuntimeException(e);
    }
  }

  public UUID handshakeWithWhatsAppAndWaitConfirmation(final @NonNull Context context,
      final @NonNull Consumer<String> onSuccessHandler,
      final @NonNull Consumer<WhatsAppHandshakeError> onFailureHandler) {
    final UUID uuid = whatsAppOtpHandler.sendOtpIntentToWhatsAppWithRequestId(context);
    final String requestUuid = uuid.toString();
    handshakes.add(requestUuid);
    triggerConfirmationWait(onSuccessHandler, onFailureHandler);
    return uuid;
  }

  public UUID handshakeWithWhatsAppAndWaitConfirmation(final @NonNull Context context,
      final @NonNull UUID uuid,
      final @NonNull Consumer<String> onSuccessHandler,
      final Consumer<WhatsAppHandshakeError> onFailureHandler) {
    whatsAppOtpHandler.sendOtpIntentToWhatsAppWithRequestId(uuid, context);
    final String requestUuid = uuid.toString();
    handshakes.add(requestUuid);
    triggerConfirmationWait(onSuccessHandler, onFailureHandler);
    return uuid;
  }

  protected void triggerConfirmationWait(final @NonNull Consumer<String> onSuccessHandler,
      final @NonNull Consumer<WhatsAppHandshakeError> onFailureHandler) {
    executorServiceForNetworkRequest.submit(() -> {
      waitHandshakeConfirmation(onSuccessHandler, onFailureHandler);
    });
  }

  protected void waitHandshakeConfirmation(final @NonNull Consumer<String> onSuccessHandler,
      final @NonNull Consumer<WhatsAppHandshakeError> onFailureHandler) {
    try {
      final String receivedRequestId = handshakeQueue.poll(timeoutInSeconds, TimeUnit.SECONDS);
      if (receivedRequestId == null) {
        WhatsAppHandshakeError handshakeError = new WhatsAppHandshakeError(
            WhatsAppHandshakeErrorType.HANDSHAKE_ID_NOT_RECEIVED_OR_TIMEOUT);
        onFailureHandler.accept(handshakeError);
      } else if (handshakes.contains(receivedRequestId)) {
        onSuccessHandler.accept(receivedRequestId);
      } else {
        WhatsAppHandshakeError handshakeError =
            new WhatsAppHandshakeError(WhatsAppHandshakeErrorType.HANDSHAKE_ID_MISMATCH,
                receivedRequestId);
        onFailureHandler.accept(handshakeError);
      }
    } catch (InterruptedException e) {
      WA_LOGGER.error("Failure when expecting handshake confirmation", e);
      final WhatsAppHandshakeError handshakeError =
          new WhatsAppHandshakeError(WhatsAppHandshakeErrorType.EXCEPTION, e);
      onFailureHandler.accept(handshakeError);
    }
  }
}
