/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.whatsapp.otp.sample.app.otp.service;

import dagger.BindsOptionalOf;
import dagger.Module;
import dagger.Provides;
import dagger.hilt.InstallIn;
import dagger.hilt.components.SingletonComponent;
import java.util.Optional;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import javax.inject.Named;
import org.apache.hc.client5.http.config.RequestConfig;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.apache.hc.core5.util.Timeout;

@InstallIn(SingletonComponent.class)
@Module
public abstract class OtpServiceModule {

  @BindsOptionalOf
  @Named("LocalOtpService")
  public abstract OtpServiceInterface localOtpService();

  @Provides
  public static OtpServiceInterface otpService(final SampleServerOtpService sampleServerOtpService,
      @Named("LocalOtpService") final
      Optional<OtpServiceInterface> localOtpService) {
    return localOtpService.orElse(sampleServerOtpService);
  }

  @Provides
  public static ExecutorService executorServiceForNetworkRequestProvider() {
    return Executors.newCachedThreadPool();
  }

  @Provides
  public static CloseableHttpClient httpClientProvider() {
    Timeout timeout = Timeout.of(5, TimeUnit.SECONDS);
    RequestConfig config = RequestConfig.custom()
        .setConnectTimeout(timeout)
        .setConnectionRequestTimeout(timeout)
        .setResponseTimeout(timeout).build();
    return HttpClients.custom()
        .setDefaultRequestConfig(config)
        .build();
  }
}
