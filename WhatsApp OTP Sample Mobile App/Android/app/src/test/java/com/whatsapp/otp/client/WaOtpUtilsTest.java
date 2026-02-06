/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.whatsapp.otp.client;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doReturn;

import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import androidx.test.core.app.ApplicationProvider;
import com.whatsapp.otp.client.enums.WaClientType;
import com.whatsapp.otp.android.sdk.exceptions.InvalidWhatsAppOtpIntentException;
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

  private static final String CALLER_INFO = "_ci_";

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
    doReturn(pendingIntent).when(intent).getParcelableExtra(CALLER_INFO);
  }

  @Test
  public void test_createAutofillIntentWithCodeFromConsumerWhatsApp_succeeds() {
    // Test
    Intent filledOtpLoginIntent = WaOtpUtils.createAutofillIntent(context, SAMPLE_CODE, 0);
    // Assertions
    assertThat(filledOtpLoginIntent).isNotNull();
  }


  @Test
  public void test_createCodeBroadcasterIntentWithCodeFromConsumerWhatsApp_succeeds() {
    // Test
    Intent filledOtpLoginIntent = WaOtpUtils.createCodeBroadcasterIntent(SAMPLE_CODE,
        BROADCAST_ACTION_LEY, context);
    // Assertions
    assertThat(filledOtpLoginIntent).isNotNull();
    assertThat(filledOtpLoginIntent.getAction()).isEqualTo(BROADCAST_ACTION_LEY);
    assertThat(filledOtpLoginIntent.getPackage()).isEqualTo(context.getPackageName());
  }
}
