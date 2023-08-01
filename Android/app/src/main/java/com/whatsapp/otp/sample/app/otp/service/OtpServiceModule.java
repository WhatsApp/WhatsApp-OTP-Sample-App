package com.whatsapp.otp.sample.app.otp.service;


import dagger.Binds;
import dagger.Module;
import dagger.Provides;
import dagger.hilt.InstallIn;
import dagger.hilt.components.SingletonComponent;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import javax.inject.Singleton;
import org.apache.hc.client5.http.config.RequestConfig;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.apache.hc.core5.util.Timeout;

@InstallIn(SingletonComponent.class)
@Module
public abstract class OtpServiceModule {

  @Singleton
  @Binds
  public abstract OtpServiceInterface otpService(SampleServerOtpService otpServiceImpl);

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
