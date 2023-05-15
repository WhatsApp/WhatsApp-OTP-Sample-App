package com.whatsapp.otp.sample.app.otp;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

import androidx.annotation.NonNull;
import com.google.common.util.concurrent.MoreExecutors;
import com.whatsapp.otp.common.SampleServerProperties;
import com.whatsapp.otp.sample.app.otp.service.OtpServiceInterface;
import com.whatsapp.otp.sample.app.otp.service.SampleServerOtpService;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.URISyntaxException;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.function.Consumer;
import java.util.stream.Collectors;
import org.apache.hc.client5.http.classic.methods.HttpGet;
import org.apache.hc.client5.http.classic.methods.HttpPost;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.client5.http.impl.classic.CloseableHttpResponse;
import org.apache.hc.core5.http.HttpStatus;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.MockitoJUnit;
import org.mockito.junit.MockitoRule;
import org.robolectric.RobolectricTestRunner;

@RunWith(RobolectricTestRunner.class)
public class SampleServerOtpServiceTest {

  @Rule
  public MockitoRule rule = MockitoJUnit.rule();

  @Mock
  private CloseableHttpClient httpClient;
  @Mock
  private CloseableHttpResponse response;
  @Mock
  private SampleServerProperties sampleServerProperties;
  @Mock
  private Runnable onSuccessHandler;
  @Mock
  private Consumer<String> onRequestFailureHandler;
  @Mock
  private Consumer<OtpServiceInterface.OtpStatus> onRequestedCompletedConsumer;

  private ExecutorService executorService = MoreExecutors.newDirectExecutorService();

  @Before
  public void setup() {
    doReturn("https://domain").when(sampleServerProperties).getDomain();
  }

  @Test
  public void test_sendOtp_succeeds() throws IOException, URISyntaxException {
    // Setup
    doReturn(HttpStatus.SC_OK)
        .when(response)
        .getCode();
    doReturn(response)
        .when(httpClient)
        .execute(any(HttpGet.class));

    // Test
    assertThatCode(() -> createStandardOtpService().sendOtp("1234567890", onSuccessHandler,
        onRequestFailureHandler))
        .doesNotThrowAnyException();

    // Assertions
    ArgumentCaptor<HttpGet> argumentCaptorGet = ArgumentCaptor.forClass(HttpGet.class);
    verify(httpClient).execute(argumentCaptorGet.capture());
    final String uri = argumentCaptorGet.getValue().getUri().toASCIIString();
    assertThat(uri).isEqualTo("https://domain/OTP/1234567890");
    verify(onSuccessHandler).run();
    verifyNoInteractions(onRequestFailureHandler);
  }

  @Test
  public void test_sendOtpReturnsError_throwException() throws IOException, URISyntaxException {

    doReturn(HttpStatus.SC_BAD_REQUEST)
        .when(response)
        .getCode();
    doReturn(response)
        .when(httpClient)
        .execute(any(HttpGet.class));

    // Test
    assertThatCode(() -> createStandardOtpService()
        .sendOtp("1234567890", onSuccessHandler, onRequestFailureHandler))
        .doesNotThrowAnyException();

    // Assertions
    ArgumentCaptor<HttpGet> argumentCaptorGet = ArgumentCaptor.forClass(HttpGet.class);
    verify(httpClient).execute(argumentCaptorGet.capture());
    final String uri = argumentCaptorGet.getValue().getUri().toASCIIString();
    assertThat(uri).isEqualTo("https://domain/OTP/1234567890");
    verify(onRequestFailureHandler).accept("Unable to generate otp code.");
    verifyNoInteractions(onSuccessHandler);
  }

  @Test
  public void test_validateOtp_succeeds() throws IOException, URISyntaxException {
    // Setup
    doReturn(HttpStatus.SC_OK)
        .when(response)
        .getCode();
    doReturn(response)
        .when(httpClient)
        .execute(any(HttpPost.class));

    // Test
    createStandardOtpService().validateOtp("1234567890",
        "CODE",
        onRequestedCompletedConsumer, onRequestFailureHandler);

    verify(onRequestedCompletedConsumer).accept(OtpServiceInterface.OtpStatus.VALID);

    // Assertions
    ArgumentCaptor<HttpPost> argumentCaptorPost = ArgumentCaptor.forClass(HttpPost.class);
    verify(httpClient).execute(argumentCaptorPost.capture());
    final String uri = argumentCaptorPost.getValue().getUri().toASCIIString();
    assertThat(uri).isEqualTo("https://domain/OTP/1234567890");

    HttpPost httpPost = argumentCaptorPost.getValue();
    String body = getBody(httpPost);
    assertThat(body).isEqualTo("{\"code\":\"CODE\"}");

    verifyNoInteractions(onRequestFailureHandler);
  }


  @Test
  public void test_validateOtpReturnsError_succeeds() throws IOException {

    doReturn(HttpStatus.SC_BAD_REQUEST)
        .when(response)
        .getCode();
    doReturn(response)
        .when(httpClient)
        .execute(any(HttpPost.class));
    // Test
    createStandardOtpService().validateOtp("1234567890",
        "CODE",
        onRequestedCompletedConsumer,
        onRequestFailureHandler);
    // Assertions
    verify(onRequestedCompletedConsumer).accept(OtpServiceInterface.OtpStatus.INVALID);
    verifyNoInteractions(onRequestFailureHandler);
  }

  @Test
  public void test_validateOtpRequestFailure_failureHandled() throws IOException {

    Mockito.doThrow(new RuntimeException())
        .when(httpClient)
        .execute(any(HttpPost.class));
    // Test
    createStandardOtpService().validateOtp("1234567890",
        "CODE",
        onRequestedCompletedConsumer,
        onRequestFailureHandler);
    // Assertions
    verify(onRequestFailureHandler).accept("Unable to validate otp");
    verifyNoInteractions(onRequestedCompletedConsumer);
  }

  private SampleServerOtpService createStandardOtpService() {
    return new SampleServerOtpService(
        executorService,
        httpClient,
        sampleServerProperties);
  }

  @NonNull
  private String getBody(HttpPost value) throws IOException {
    String body = new BufferedReader(
        new InputStreamReader(value.getEntity().getContent(), StandardCharsets.UTF_8))
        .lines()
        .collect(Collectors.joining("\n"));
    return body;
  }
}
