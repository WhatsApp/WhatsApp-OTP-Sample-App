package com.whatsapp.otp.client;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doReturn;

import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import androidx.test.core.app.ApplicationProvider;
import com.whatsapp.otp.client.enums.WaClientType;
import com.whatsapp.otp.sample.app.otp.exceptions.InvalidWhatsAppOtpIntentException;
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
public class WaOtpUtilsTest {

  private static final String BROADCAST_ACTION_LEY = "otp.code.receiver";
  private static final String SAMPLE_CODE = "SAMPLE_CODE";

  private final Context context = ApplicationProvider.getApplicationContext();

  @Rule
  public MockitoRule rule = MockitoJUnit.rule();

  @Mock
  private Intent intent;

  @Mock
  private PendingIntent pendingIntent;

  @Before
  public void setup() {
    MockitoAnnotations.openMocks(this);
    doReturn(pendingIntent).when(intent).getParcelableExtra(WaIntent.CALLER_INFO);
  }


  @Test
  public void test_isWhatsAppIntentPackageIsConsumer_returnsTrue() {
    // Setup
    mockSourcePackageFromPendingIntent(WaClientType.CONSUMER.getPackageName());

    // Test
    boolean result = WaOtpUtils.isWhatsAppIntent(intent);

    // Test
    assertThat(result).isTrue();
  }

  @Test
  public void test_isWhatsAppIntentPackageIsBusiness_returnsTrue() {
    // Setup
    mockSourcePackageFromPendingIntent(WaClientType.BUSINESS.getPackageName());

    // Test
    boolean result = WaOtpUtils.isWhatsAppIntent(intent);

    // Test
    assertThat(result).isTrue();
  }

  @Test
  public void test_isWhatsAppIntentPackageIsSomethingElse_returnsTrue() {
    // Setup
    mockSourcePackageFromPendingIntent("something.else");

    // Test
    boolean result = WaOtpUtils.isWhatsAppIntent(intent);

    // Test
    assertThat(result).isFalse();
  }

  @Test
  public void test_isWhatsAppIntentHasNoPendingIntent_returnsFalse() {
    // Setup
    doReturn(null).when(intent).getParcelableExtra(WaIntent.CALLER_INFO);

    // Test
    boolean result = WaOtpUtils.isWhatsAppIntent(intent);

    // Test
    assertThat(result).isFalse();
  }

  @Test
  public void test_createFilledOtpIntentWithCodeFromConsumerWhatsApp_succeeds() {
    // Setup
    mockSourcePackageFromPendingIntent(WaClientType.CONSUMER.getPackageName());
    mockRetrunedCode(SAMPLE_CODE);
    // Test
    Intent filledOtpLoginIntent = WaOtpUtils.createFilledOtpIntent(context, intent, 0);
    // Assertions
    assertThat(filledOtpLoginIntent).isNotNull();
  }

  @Test
  public void test_createFilledOtpIntentWithCodeFromBusinessWhatsApp_succeeds() {
    // Setup
    mockSourcePackageFromPendingIntent(WaClientType.BUSINESS.getPackageName());
    mockRetrunedCode(SAMPLE_CODE);
    // Test
    Intent filledOtpLoginIntent = WaOtpUtils.createFilledOtpIntent(context, intent, 0);
    // Assertions
    assertThat(filledOtpLoginIntent).isNotNull();
  }

  @Test
  public void test_createFilledOtpIntentFromDifferentPackage_throwsException() {
    // Setup
    mockSourcePackageFromPendingIntent("other.app.package");
    mockRetrunedCode(SAMPLE_CODE);
    // Test
    assertThatThrownBy(() -> WaOtpUtils.createFilledOtpIntent(context, intent, 0))
        .isInstanceOf(InvalidWhatsAppOtpIntentException.class);
  }

  @Test
  public void test_createFilledOtpIntentWithNoCode_throwsException() {
    // Setup
    mockSourcePackageFromPendingIntent(WaClientType.CONSUMER.getPackageName());
    mockRetrunedCode(null);
    // Test
    assertThatThrownBy(() -> WaOtpUtils.createFilledOtpIntent(context, intent, 0))
        .isInstanceOf(InvalidWhatsAppOtpIntentException.class);
  }

  @Test
  public void test_createCodeBroadcasterIntentWithCodeFromConsumerWhatsApp_succeeds() {
    // Setup
    mockSourcePackageFromPendingIntent(WaClientType.CONSUMER.getPackageName());
    mockRetrunedCode(SAMPLE_CODE);
    // Test
    Intent filledOtpLoginIntent = WaOtpUtils.createCodeBroadcasterIntent(intent,
        BROADCAST_ACTION_LEY);
    // Assertions
    assertThat(filledOtpLoginIntent).isNotNull();
    assertThat(filledOtpLoginIntent.getAction()).isEqualTo(BROADCAST_ACTION_LEY);
  }

  @Test
  public void test_createCodeBroadcasterIntentWithCodeFromBusinessWhatsApp_succeeds() {
    // Setup
    mockSourcePackageFromPendingIntent(WaClientType.BUSINESS.getPackageName());
    mockRetrunedCode(SAMPLE_CODE);
    // Test
    Intent filledOtpLoginIntent = WaOtpUtils.createCodeBroadcasterIntent(intent,
        BROADCAST_ACTION_LEY);
    // Assertions
    assertThat(filledOtpLoginIntent).isNotNull();
    assertThat(filledOtpLoginIntent.getAction()).isEqualTo(BROADCAST_ACTION_LEY);
    assertThat(filledOtpLoginIntent.getStringExtra("code")).isEqualTo(SAMPLE_CODE);
  }

  @Test
  public void test_createCodeBroadcasterIntentFromDifferentPackage_throwsException() {
    // Setup
    mockSourcePackageFromPendingIntent("other.app.package");
    mockRetrunedCode(SAMPLE_CODE);
    // Test
    assertThatThrownBy(() -> WaOtpUtils.createCodeBroadcasterIntent(intent, BROADCAST_ACTION_LEY))
        .isInstanceOf(InvalidWhatsAppOtpIntentException.class);
  }

  @Test
  public void test_createCodeBroadcasterIntentWithNoCode_throwsException() {
    // Setup
    mockSourcePackageFromPendingIntent(WaClientType.CONSUMER.getPackageName());
    mockRetrunedCode(null);
    // Test
    assertThatThrownBy(() -> WaOtpUtils.createCodeBroadcasterIntent(intent, BROADCAST_ACTION_LEY))
        .isInstanceOf(InvalidWhatsAppOtpIntentException.class);
  }

  private void mockSourcePackageFromPendingIntent(String packageName) {
    doReturn(packageName)
        .when(pendingIntent)
        .getCreatorPackage();
  }

  private void mockRetrunedCode(String toBeReturnedCode) {
    doReturn(toBeReturnedCode)
        .when(intent)
        .getStringExtra("code");
  }
}
