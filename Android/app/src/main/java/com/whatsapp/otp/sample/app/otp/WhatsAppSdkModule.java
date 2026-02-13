/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.whatsapp.otp.sample.app.otp;

import com.whatsapp.otp.android.sdk.WhatsAppOtpIncomingIntentHandler;
import com.whatsapp.otp.android.sdk.WhatsAppOtpIntentBuilder;
import com.whatsapp.otp.sdkextension.WhatsAppHandshakeHandler;
import com.whatsapp.otp.sdkoverride.SaWhatsAppOtpHandler;
import dagger.Module;
import dagger.Provides;
import dagger.hilt.InstallIn;
import dagger.hilt.components.SingletonComponent;
import java.util.concurrent.Executors;
import javax.inject.Singleton;

@InstallIn(SingletonComponent.class)
@Module
public abstract class WhatsAppSdkModule {

  @Singleton
  @Provides
  public static SaWhatsAppOtpHandler whatsAppOtpHandler() {
    return new SaWhatsAppOtpHandler(new WhatsAppOtpIntentBuilder());
  }

  @Singleton
  @Provides
  public static WhatsAppOtpIncomingIntentHandler whatsAppOtpIncomingIntentHandler() {
    return new WhatsAppOtpIncomingIntentHandler();
  }

  @Singleton
  @Provides
  public static WhatsAppHandshakeHandler whatsAppHandshakeHandler(
      final SaWhatsAppOtpHandler saWhatsAppOtpHandler) {
    return new WhatsAppHandshakeHandler(saWhatsAppOtpHandler, Executors.newCachedThreadPool(), 10);
  }

}
