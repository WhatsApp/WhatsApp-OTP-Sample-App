/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.whatsapp.otp.sample.app.otp;

import com.whatsapp.otp.android.sdk.WhatsAppOtpHandler;
import com.whatsapp.otp.android.sdk.WhatsAppOtpIncomingIntentHandler;
import dagger.Module;
import dagger.Provides;
import dagger.hilt.InstallIn;
import dagger.hilt.components.SingletonComponent;
import javax.inject.Singleton;

@InstallIn(SingletonComponent.class)
@Module
public abstract class WhatsAppSdkModule {

  @Singleton
  @Provides
  public static WhatsAppOtpHandler whatsAppOtpHandler() {
    return new WhatsAppOtpHandler();
  }

  @Singleton
  @Provides
  public static WhatsAppOtpIncomingIntentHandler whatsAppOtpIncomingIntentHandler() {
    return new WhatsAppOtpIncomingIntentHandler();
  }
}
