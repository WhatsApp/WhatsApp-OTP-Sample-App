package com.whatsapp.otp.sdkoverride;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;

import android.content.Context;
import android.content.Intent;
import com.whatsapp.otp.android.sdk.WhatsAppOtpIntentBuilder;
import com.whatsapp.otp.android.sdk.enums.WhatsAppClientType;
import java.util.List;
import java.util.UUID;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.robolectric.RobolectricTestRunner;

@RunWith(RobolectricTestRunner.class)
public class SaWhatsAppOtpHandlerTest {

  private final WhatsAppOtpIntentBuilder builder = Mockito.mock(WhatsAppOtpIntentBuilder.class);

  private final Context mockedContext = Mockito.mock(Context.class);

  private final Intent consumerMockedIntent = Mockito.mock(Intent.class);

  private final Intent businessMockedIntent = Mockito.mock(Intent.class);

  private final SaWhatsAppOtpHandler whatsAppOtpHandler = new SaWhatsAppOtpHandler(builder);


  @Test
  public void testSendOtpIntentToWhatsAppWithRequestId() {
    // Setup
    Mockito.doReturn(consumerMockedIntent)
        .when(builder)
        .create(Mockito.any(), eq(WhatsAppClientType.CONSUMER));

    Mockito.doReturn(businessMockedIntent)
        .when(builder)
        .create(Mockito.any(), eq(WhatsAppClientType.BUSINESS));

    // Test
    UUID uuid = whatsAppOtpHandler.sendOtpIntentToWhatsAppWithRequestId(mockedContext);

    // Assertions
    assertThat(uuid).isNotNull();
    ArgumentCaptor<Intent> argumentCaptor = ArgumentCaptor.forClass(Intent.class);
    verify(mockedContext, Mockito.times(2)).sendBroadcast(argumentCaptor.capture());
    List<Intent> allIntents = argumentCaptor.getAllValues();
    assertThat(allIntents).hasSize(2);
    assertThat(allIntents).containsExactly(consumerMockedIntent, businessMockedIntent);

    validateExtra(consumerMockedIntent, uuid);
    validateExtra(businessMockedIntent, uuid);
  }

  @Test
  public void testSendOtpIntentToWhatsAppWithRequestIdProvided() {
    // Setup
    Mockito.doReturn(consumerMockedIntent)
        .when(builder)
        .create(Mockito.any(), eq(WhatsAppClientType.CONSUMER));

    Mockito.doReturn(businessMockedIntent)
        .when(builder)
        .create(Mockito.any(), eq(WhatsAppClientType.BUSINESS));

    UUID requestUuid = UUID.randomUUID();

    // Test
    UUID responseUuid = whatsAppOtpHandler.sendOtpIntentToWhatsAppWithRequestId(requestUuid,
        mockedContext);

    // Assertions
    assertThat(responseUuid).isNotNull();
    assertThat(responseUuid).isSameAs(requestUuid);
    ArgumentCaptor<Intent> argumentCaptor = ArgumentCaptor.forClass(Intent.class);
    verify(mockedContext, Mockito.times(2)).sendBroadcast(argumentCaptor.capture());
    List<Intent> allIntents = argumentCaptor.getAllValues();
    assertThat(allIntents).hasSize(2);
    assertThat(allIntents).containsExactly(consumerMockedIntent, businessMockedIntent);

    validateExtra(consumerMockedIntent, responseUuid);
    validateExtra(businessMockedIntent, responseUuid);
  }

  @Test
  public void testSendOtpIntentToWhatsAppWithRequestIdForSpecificInstance() {
    // Setup
    Mockito.doReturn(consumerMockedIntent)
        .when(builder)
        .create(Mockito.any(), eq(WhatsAppClientType.CONSUMER));

    // Test
    UUID uuid = whatsAppOtpHandler.sendOtpIntentToWhatsAppWithRequestId(mockedContext,
        WhatsAppClientType.CONSUMER);

    // Assertions
    assertThat(uuid).isNotNull();
    ArgumentCaptor<Intent> argumentCaptor = ArgumentCaptor.forClass(Intent.class);
    verify(mockedContext, Mockito.times(1)).sendBroadcast(argumentCaptor.capture());
    List<Intent> allIntents = argumentCaptor.getAllValues();
    assertThat(allIntents).hasSize(1);
    assertThat(allIntents).containsExactly(consumerMockedIntent);

    validateExtra(consumerMockedIntent, uuid);
  }

  @Test
  public void testSendOtpIntentToWhatsAppWithRequestIdProvidedForSpecificInstance() {
    // Setup
    Mockito.doReturn(consumerMockedIntent)
        .when(builder)
        .create(Mockito.any(), eq(WhatsAppClientType.CONSUMER));

    UUID uuid = UUID.randomUUID();

    // Test
    Intent intent = whatsAppOtpHandler.sendOtpIntentToWhatsAppWithRequestId(uuid, mockedContext,
        WhatsAppClientType.CONSUMER);

    // Assertions
    assertThat(intent).isSameAs(consumerMockedIntent);
    ArgumentCaptor<Intent> argumentCaptor = ArgumentCaptor.forClass(Intent.class);
    verify(mockedContext, Mockito.times(1)).sendBroadcast(argumentCaptor.capture());
    List<Intent> allIntents = argumentCaptor.getAllValues();
    assertThat(allIntents).hasSize(1);
    assertThat(allIntents).containsExactly(consumerMockedIntent);

    validateExtra(consumerMockedIntent, uuid);
  }

  private static void validateExtra(final Intent intent, final UUID expectedUuid) {
    verify(intent).putExtra(eq("request_id"), eq(expectedUuid.toString()));
  }
}