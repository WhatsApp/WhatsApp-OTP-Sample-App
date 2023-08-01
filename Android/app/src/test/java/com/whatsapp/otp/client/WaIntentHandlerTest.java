package com.whatsapp.otp.client;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.doReturn;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import androidx.test.core.app.ApplicationProvider;
import com.whatsapp.otp.client.enums.WaClientType;
import java.util.ArrayList;
import java.util.List;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.Mockito;
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
  public void test_sendOtpIntentToWhatsApp() {
    WaIntentHandler waIntentHandler = WaIntentHandler.getNewInstance();
    WaOtpSender waOtpSender = waIntentHandler.sendOtpIntentToWhatsApp(context);
    assertThat(waOtpSender).isNotNull();
  }

  @Test
  public void test_isWhatsAppInstalled_notInstalled() {
    WaIntentHandler waIntentHandler = WaIntentHandler.getNewInstance();
    boolean installed = waIntentHandler.isWhatsAppInstalled(context);
    assertThat(installed).isFalse();
  }

  @Test
  public void test_isWhatsAppInstalled_installed() {
    Context mockedContext = Mockito.mock(Context.class);
    PackageManager mockedPackageManager = Mockito.mock(PackageManager.class);
    doReturn(mockedPackageManager).when(mockedContext).getPackageManager();
    List<ResolveInfo> resolveInfoList = new ArrayList<>();
    doReturn(resolveInfoList)
        .when(mockedPackageManager)
        .queryBroadcastReceivers(any(Intent.class), anyInt());
  }
}
