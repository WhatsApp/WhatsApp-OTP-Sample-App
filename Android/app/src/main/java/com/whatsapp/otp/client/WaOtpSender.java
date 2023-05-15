package com.whatsapp.otp.client;

import com.whatsapp.otp.common.WaLogger;

public class WaOtpSender {

  private static final WaLogger WA_LOGGER = WaLogger.getLogger(WaOtpSender.class);

  public void runSendOtpRequest(Runnable runnable) {
    WA_LOGGER.info("Sending otp request");
    runnable.run();
  }
}
