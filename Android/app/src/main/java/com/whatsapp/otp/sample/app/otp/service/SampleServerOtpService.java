/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.whatsapp.otp.sample.app.otp.service;

import androidx.annotation.NonNull;
import com.google.gson.Gson;
import com.whatsapp.otp.common.SampleServerProperties;
import com.whatsapp.otp.common.WaLogger;
import java.io.IOException;
import java.io.InputStream;
import java.util.concurrent.ExecutorService;
import java.util.function.Consumer;
import javax.inject.Inject;
import javax.inject.Singleton;
import org.apache.commons.lang3.Validate;
import org.apache.hc.client5.http.classic.methods.HttpGet;
import org.apache.hc.client5.http.classic.methods.HttpPost;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.client5.http.impl.classic.CloseableHttpResponse;
import org.apache.hc.core5.http.HttpEntity;
import org.apache.hc.core5.http.HttpStatus;
import org.apache.hc.core5.http.io.entity.StringEntity;

@Singleton
public class SampleServerOtpService implements OtpServiceInterface {

  private static final WaLogger WA_LOGGER = WaLogger.getLogger(SampleServerOtpService.class);

  @NonNull
  private final String domain;

  @NonNull
  private final CloseableHttpClient httpClient;

  @NonNull
  private final ExecutorService executorServiceForNetworkRequest;

  @Inject
  public SampleServerOtpService(final @NonNull ExecutorService executorServiceForNetworkRequest,
      final @NonNull CloseableHttpClient httpClient,
      final @NonNull SampleServerProperties sampleServerProperties) {
    Validate.notNull(httpClient);
    Validate.notNull(executorServiceForNetworkRequest);
    Validate.notNull(sampleServerProperties);
    Validate.notEmpty(sampleServerProperties.getDomain(), "domain property is not defined");
    this.domain = sampleServerProperties.getDomain();
    this.httpClient = httpClient;
    this.executorServiceForNetworkRequest = executorServiceForNetworkRequest;
  }

  public void sendOtp(
      final @NonNull String phoneNumber,
      final @NonNull Runnable onSuccessHandler,
      final @NonNull Consumer<String> onRequestFailureHandler) {
    Validate.notNull(phoneNumber);
    Validate.notNull(onSuccessHandler);
    Validate.notNull(onRequestFailureHandler);
    executorServiceForNetworkRequest.submit(() -> {
      CloseableHttpResponse response = doGet(phoneNumber, onRequestFailureHandler);
      WA_LOGGER.info("OTP response code: " + response.getCode());
      int statusCode = response.getCode();
      if (statusCode != HttpStatus.SC_OK) {
        logError(response);
        onRequestFailureHandler.accept("Unable to generate otp code.");
        return;
      } else {
        onSuccessHandler.run();
      }
    });
  }

  private CloseableHttpResponse doGet(String phoneNumber, Consumer<String> onFailureHandler) {
    try {
      String otpEndpoint = getOtpEndpoint(phoneNumber);
      HttpGet httpGet = new HttpGet(otpEndpoint);
      CloseableHttpResponse response = httpClient.execute(httpGet);
      return response;
    } catch (Exception e) {
      onFailureHandler.accept("Unable to generate otp code.");
      WA_LOGGER.error("Unable to generate otp code", e);
      throw new OtpServiceException("Unable to generate otp", e);
    }
  }

  public void validateOtp(final @NonNull String phoneNumber,
      final @NonNull String code,
      final @NonNull Consumer<OtpServiceInterface.OtpStatus> onRequestCompletedHandler,
      final @NonNull Consumer<String> onRequestFailureHandler) {
    Validate.notNull(code);
    Validate.notNull(onRequestCompletedHandler);
    Validate.notNull(onRequestFailureHandler);
    executorServiceForNetworkRequest.submit(() -> {
      try {
        CloseableHttpResponse response = doPost(phoneNumber, code);
        int statusCode = response.getCode();
        if (statusCode == HttpStatus.SC_OK) {
          onRequestCompletedHandler.accept(OtpServiceInterface.OtpStatus.VALID);
        } else {
          logError(response);
          onRequestCompletedHandler.accept(OtpServiceInterface.OtpStatus.INVALID);
        }
      } catch (Exception e) {
        WA_LOGGER.error("Unable to validate otp code", e);
        onRequestFailureHandler.accept("Unable to validate otp");
      }
    });
  }

  private CloseableHttpResponse doPost(String phoneNumber, String code) throws IOException {
    String otpEndpoint = getOtpEndpoint(phoneNumber);
    HttpPost httpPost = new HttpPost(otpEndpoint);
    Gson gson = new Gson();
    ValidateOtpBody validateOtpBody = new ValidateOtpBody(code);
    StringEntity body = new StringEntity(gson.toJson(validateOtpBody));
    httpPost.setHeader("Content-type", "application/json");
    httpPost.setEntity(body);

    CloseableHttpResponse response = httpClient.execute(httpPost);
    return response;
  }

  private String getOtpEndpoint(String phoneNumber) {
    return domain + "/OTP/" + phoneNumber;
  }

  private void logError(CloseableHttpResponse response) {
    int statusCode = response.getCode();
    try {
      HttpEntity entity = response.getEntity();
      if (entity != null) {
        InputStream content = entity.getContent();
        WA_LOGGER.error("Unable to generate otp code. Status code: " + statusCode + "Message: "
            + content.toString());
      }
    } catch (Exception e) {
      // no action
    }
    WA_LOGGER.error("Unable to generate otp code. Status code: " + statusCode);
  }

  private static class ValidateOtpBody {

    private String code;

    ValidateOtpBody(final @NonNull String code) {
      Validate.notNull(code);
      this.code = code;
    }

    public String getCode() {
      return this.code;
    }
  }
}
