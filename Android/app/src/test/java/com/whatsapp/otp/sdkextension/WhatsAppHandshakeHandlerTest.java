package com.whatsapp.otp.sdkextension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.fail;
import static org.mockito.ArgumentMatchers.any;

import android.content.Context;
import com.whatsapp.otp.sdkoverride.SaWhatsAppOtpHandler;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.Mockito;
import org.robolectric.RobolectricTestRunner;

@RunWith(RobolectricTestRunner.class)
public class WhatsAppHandshakeHandlerTest {

  public static final int TIMEOUT_IN_SECONDS = 5;
  private SaWhatsAppOtpHandler mockedWhatsAppOtpHandler;

  private Context context;
  private ExecutorService executorService;

  private static void triggerReceivedHandshakeUuid(final UUID returnedUuid,
      final WhatsAppHandshakeHandler handler) {
    Executors.newCachedThreadPool().submit(() -> {
      // test handshake received
      boolean registered =
          handler.registerHandshakeReceived(returnedUuid.toString(), TIMEOUT_IN_SECONDS);
      assertThat(registered).isTrue();
    });
  }

  @Before
  public void setup() {
    context = Mockito.mock(Context.class);
    executorService = Executors.newCachedThreadPool();
    mockedWhatsAppOtpHandler = Mockito.mock(SaWhatsAppOtpHandler.class);
  }

  @Test
  public void testHandshakeWithWhatsAppAndWaitConfirmationSucceeds() {
    UUID returnedUuid = UUID.randomUUID();
    Mockito.doReturn(returnedUuid).when(mockedWhatsAppOtpHandler)
        .sendOtpIntentToWhatsAppWithRequestId(any(Context.class));

    // Test subject
    WhatsAppHandshakeHandler handler =
        createWhatsAppHandshakeHandlerWithTimeout(TIMEOUT_IN_SECONDS);
    final Result result = new Result();
    // Test
    handler.handshakeWithWhatsAppAndWaitConfirmation(context, (requestId) -> {
      result.success = true;
      result.requestId = requestId;
    }, (error) -> {
      fail("Handshake did not succeeded and was expected to succeed");
    });

    // receive handshake
    triggerReceivedHandshakeUuid(returnedUuid, handler);

    // Assertions
    shutdownExecutorService();
    assertThat(executorService.isTerminated()).isTrue();
    assertThat(result.success).isTrue();
    assertThat(result.requestId).isEqualTo(returnedUuid.toString());
  }

  @Test
  public void testHandshakeWithWhatsAppAndWaitConfirmationFails() {
    UUID uuid = UUID.randomUUID();
    Mockito.doReturn(uuid).when(mockedWhatsAppOtpHandler)
        .sendOtpIntentToWhatsAppWithRequestId(any(Context.class));
    WhatsAppHandshakeHandler handler =
        createWhatsAppHandshakeHandlerWithTimeout(TIMEOUT_IN_SECONDS);
    final Result result = new Result();

    handler.handshakeWithWhatsAppAndWaitConfirmation(context, (requestId) -> {
      fail("Handshake succeeded while it was expected to fail!");

      result.success = true;
      result.requestId = requestId;
    }, (error) -> {
      result.errorType = error.getErrorType();
    });

    shutdownExecutorService();

    // Assertions
    assertThat(executorService.isTerminated()).isTrue();
    assertThat(result.errorType).isNotNull();
    assertThat(WhatsAppHandshakeErrorType.HANDSHAKE_ID_NOT_RECEIVED_OR_TIMEOUT).isEqualTo(
        result.errorType);
  }

  @Test
  public void testRegisterHandshakeFails() {
    WhatsAppHandshakeHandler handler =
        createWhatsAppHandshakeHandlerWithTimeout(TIMEOUT_IN_SECONDS);
    UUID uuid = UUID.randomUUID();
    // test
    boolean registered = handler.registerHandshakeReceived(uuid.toString(), TIMEOUT_IN_SECONDS);
    // assertions
    assertThat(registered).isFalse();

  }

  @Test
  public void testHandshakeWithWhatsAppAndWaitConfirmationProvidingRequestIdSucceeds() {
    UUID requestUuid = UUID.randomUUID();
    Mockito.doReturn(requestUuid).when(mockedWhatsAppOtpHandler)
        .sendOtpIntentToWhatsAppWithRequestId(any(Context.class));

    // Test subject
    WhatsAppHandshakeHandler handler =
        createWhatsAppHandshakeHandlerWithTimeout(TIMEOUT_IN_SECONDS);
    final Result result = new Result();
    // Test
    handler.handshakeWithWhatsAppAndWaitConfirmation(context, requestUuid, (requestId) -> {
      result.success = true;
      result.requestId = requestId;
    }, (error) -> {
      fail("Handshake did not succeeded and was expected to succeed");
    });

    // receive handshake
    triggerReceivedHandshakeUuid(requestUuid, handler);

    // Assertions
    shutdownExecutorService();
    assertThat(executorService.isTerminated()).isTrue();
    assertThat(result.success).isTrue();
    assertThat(result.requestId).isEqualTo(requestUuid.toString());
  }

  @Test
  public void testGetExpectedHandshakeId_returnsIdIfValid() {
    UUID requestUuid = UUID.randomUUID();
    Mockito.doReturn(requestUuid).when(mockedWhatsAppOtpHandler)
        .sendOtpIntentToWhatsAppWithRequestId(any(Context.class));

    WhatsAppHandshakeHandler handler =
        createWhatsAppHandshakeHandlerWithTimeout(TIMEOUT_IN_SECONDS);

    // Initiate handshake to add the ID to the set
    handler.handshakeWithWhatsAppAndWaitConfirmation(context, (requestId) -> {}, (error) -> {});

    // Test
    String result = handler.getExpectedHandshakeId(requestUuid.toString());

    // Assertions
    assertThat(result).isEqualTo(requestUuid.toString());
    shutdownExecutorService();
  }

  @Test
  public void testGetExpectedHandshakeId_returnsNullIfNotValid() {
    UUID requestUuid = UUID.randomUUID();
    Mockito.doReturn(requestUuid).when(mockedWhatsAppOtpHandler)
        .sendOtpIntentToWhatsAppWithRequestId(any(Context.class));

    WhatsAppHandshakeHandler handler =
        createWhatsAppHandshakeHandlerWithTimeout(TIMEOUT_IN_SECONDS);

    // Initiate handshake to add the ID to the set
    handler.handshakeWithWhatsAppAndWaitConfirmation(context, (requestId) -> {}, (error) -> {});

    // Test with a different UUID
    UUID differentUuid = UUID.randomUUID();
    String result = handler.getExpectedHandshakeId(differentUuid.toString());

    // Assertions
    assertThat(result).isNull();
    shutdownExecutorService();
  }

  @Test
  public void testHandshakeMismatch_triggersErrorHandler() {
    UUID sentUuid = UUID.randomUUID();
    UUID receivedUuid = UUID.randomUUID(); // Different UUID simulating mismatch
    Mockito.doReturn(sentUuid).when(mockedWhatsAppOtpHandler)
        .sendOtpIntentToWhatsAppWithRequestId(any(Context.class));

    WhatsAppHandshakeHandler handler =
        createWhatsAppHandshakeHandlerWithTimeout(TIMEOUT_IN_SECONDS);
    final Result result = new Result();

    // Initiate handshake with one UUID
    handler.handshakeWithWhatsAppAndWaitConfirmation(context, (requestId) -> {
      fail("Handshake should not succeed with mismatched ID");
      result.success = true;
    }, (error) -> {
      result.errorType = error.getErrorType();
      result.requestId = error.getReceivedHandshakeId();
    });

    // Simulate receiving a different handshake ID (mismatch)
    Executors.newCachedThreadPool().submit(() -> {
      handler.registerHandshakeReceived(receivedUuid.toString(), TIMEOUT_IN_SECONDS);
    });

    shutdownExecutorService();

    // Assertions
    assertThat(result.errorType).isEqualTo(WhatsAppHandshakeErrorType.HANDSHAKE_ID_MISMATCH);
    assertThat(result.requestId).isEqualTo(receivedUuid.toString());
  }

  @Test
  public void testGetExpectedHandshakeId_returnsNullWhenNoHandshakeInitiated() {
    WhatsAppHandshakeHandler handler =
        createWhatsAppHandshakeHandlerWithTimeout(TIMEOUT_IN_SECONDS);

    // Test without initiating any handshake
    UUID randomUuid = UUID.randomUUID();
    String result = handler.getExpectedHandshakeId(randomUuid.toString());

    // Assertions - should return null since no handshake was initiated
    assertThat(result).isNull();
  }

  public WhatsAppHandshakeHandler createWhatsAppHandshakeHandlerWithTimeout(final int timeout) {
    return new WhatsAppHandshakeHandler(mockedWhatsAppOtpHandler, executorService, timeout);
  }

  private void shutdownExecutorService() {
    try {
      executorService.shutdown();
      boolean terminated = executorService.awaitTermination(15, TimeUnit.SECONDS);
      if (!terminated) {
        fail("Failed waiting for thread to terminate");
      }
    } catch (InterruptedException e) {
      fail("Failed waiting for thread to terminate");
    }
  }

  private class Result {
    boolean success = false;
    String requestId = null;
    WhatsAppHandshakeErrorType errorType = null;
  }
}
