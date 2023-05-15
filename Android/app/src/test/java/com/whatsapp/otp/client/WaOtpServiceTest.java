package com.whatsapp.otp.client;

import org.assertj.core.api.Assertions;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;

@RunWith(RobolectricTestRunner.class)
public class WaOtpServiceTest {

  private boolean changed = false;

  @Test
  public void test_sendOtp_succeeded() {
    WaOtpSender otpSender = new WaOtpSender();
    // test
    otpSender.runSendOtpRequest(() -> change());
    // Assertions
    Assertions.assertThat(changed).isTrue();
  }

  private void change() {
    changed = true;
  }
}
