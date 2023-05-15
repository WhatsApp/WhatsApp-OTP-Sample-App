package com.whatsapp.otp.client;

import static org.assertj.core.api.Assertions.assertThat;

import android.content.Context;
import androidx.test.core.app.ApplicationProvider;
import com.whatsapp.otp.client.enums.WaClientType;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;

@RunWith(RobolectricTestRunner.class)
public class WaIntentHandlerTest {

  private final Context context = ApplicationProvider.getApplicationContext();

  @Test
  public void test_getInstance_succeeds() {
    WaIntentHandler waIntentHandler = WaIntentHandler.getNewInstance();
    assertThat(waIntentHandler).isNotNull();
    WaIntentHandler otherWaIntentHandler = WaIntentHandler.getNewInstance();
    assertThat(waIntentHandler).isNotSameAs(otherWaIntentHandler);
  }

  @Test
  public void test_sendOtpIntentToWhatsApp_succeeds() {
    WaIntentHandler waIntentHandler = WaIntentHandler.getNewInstance();
    WaIntent waIntent = waIntentHandler.sendOtpIntentToWhatsApp(WaClientType.CONSUMER, context);
    assertThat(waIntent).isNotNull();
    assertThat(waIntent.getAppIntent().getAction()).isEqualTo(
        "com.whatsapp.otp.OTP_REQUESTED");
    assertThat(waIntent.getAppIntent().getPackage()).isEqualTo("com.whatsapp");
  }

  @Test
  public void testSendOtpIntentToWhatsApp() {
    WaIntentHandler waIntentHandler = WaIntentHandler.getNewInstance();
    WaOtpSender waOtpSender = waIntentHandler.sendOtpIntentToWhatsApp(context);
    assertThat(waOtpSender).isNotNull();
  }
}
