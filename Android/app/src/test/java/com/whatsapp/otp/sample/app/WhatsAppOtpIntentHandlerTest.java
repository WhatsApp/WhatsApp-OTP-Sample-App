package com.whatsapp.otp.sample.app;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.same;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.validateMockitoUsage;
import static org.mockito.Mockito.verify;

import android.content.Context;
import androidx.test.core.app.ApplicationProvider;
import com.whatsapp.otp.android.sdk.WhatsAppOtpHandler;
import com.whatsapp.otp.sample.app.otp.WhatsAppOtpIntentHandler;
import com.whatsapp.otp.sample.app.otp.service.OtpServiceInterface;
import java.util.function.Consumer;
import org.junit.After;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.mockito.junit.MockitoJUnit;
import org.mockito.junit.MockitoRule;
import org.robolectric.RobolectricTestRunner;

@RunWith(RobolectricTestRunner.class)
public class WhatsAppOtpIntentHandlerTest {

  private static final String SAMPLE_PHONE_NUMBER = "1122334455";

  @Rule
  public MockitoRule rule = MockitoJUnit.rule();

  private final Context context = ApplicationProvider.getApplicationContext();

  @Mock
  private OtpServiceInterface otpServiceInterface;

  private WhatsAppOtpHandler whatsAppOtpHandler = new WhatsAppOtpHandler();
  @Mock
  private Runnable mockedOnSuccessHandler;
  @Mock
  private Consumer<String> mockedOnFailureHandler;

  @Before
  public void setup() {
    MockitoAnnotations.openMocks(this);
  }

  @After
  public void tearDown() {
    validateMockitoUsage();
  }

  @Test
  public void test_builder_succeeds() {
    // Test
    WhatsAppOtpIntentHandler otpClientHandler = new WhatsAppOtpIntentHandler(
        otpServiceInterface, whatsAppOtpHandler);
    // Assertions
    assertThat(otpClientHandler).isNotNull();
  }

  @Test
  public void test_builderOtpServiceNotProvided_fails() {
    // Test
    assertThatThrownBy(() -> new WhatsAppOtpIntentHandler(null, whatsAppOtpHandler))
        .isExactlyInstanceOf(NullPointerException.class);
  }

  @Test
  public void test_builderWhatsAppOtpHandlerNotProvided_fails() {
    // Test
    assertThatThrownBy(() -> new WhatsAppOtpIntentHandler(otpServiceInterface, null))
        .isExactlyInstanceOf(NullPointerException.class);
  }

  @Test
  public void test_sendOtp_succeeds() {
    // Setup
    WhatsAppOtpIntentHandler otpIntentHandler = new WhatsAppOtpIntentHandler(
        otpServiceInterface, whatsAppOtpHandler);

    // Test
    otpIntentHandler.sendOtp(
        SAMPLE_PHONE_NUMBER,
        context,
        mockedOnSuccessHandler,
        mockedOnFailureHandler);

    // Assertion
    verify(otpServiceInterface)
        .sendOtp(eq(SAMPLE_PHONE_NUMBER),
            same(mockedOnSuccessHandler),
            same(mockedOnFailureHandler));
  }

  @Test
  public void test_sendOtpThrowsException_failureHandlerInvoked() {
    // Setup
    doThrow(new RuntimeException()).when(otpServiceInterface)
        .sendOtp(anyString(), any(Runnable.class), any(Consumer.class));
    WhatsAppOtpIntentHandler otpClientHandler = new WhatsAppOtpIntentHandler(
        otpServiceInterface, whatsAppOtpHandler);

    // Test
    otpClientHandler.sendOtp(
        SAMPLE_PHONE_NUMBER,
        context,
        mockedOnSuccessHandler,
        mockedOnFailureHandler);

    // Assertion
    verify(otpServiceInterface)
        .sendOtp(
            eq(SAMPLE_PHONE_NUMBER),
            same(mockedOnSuccessHandler),
            same(mockedOnFailureHandler));
    verify(mockedOnFailureHandler).accept("Sorry. We were unable to send the one time password");
  }
}