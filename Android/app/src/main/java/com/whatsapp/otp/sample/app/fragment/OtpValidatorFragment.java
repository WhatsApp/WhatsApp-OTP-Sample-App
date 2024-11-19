/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.whatsapp.otp.sample.app.fragment;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import androidx.annotation.MainThread;
import androidx.annotation.NonNull;
import androidx.fragment.app.Fragment;
import androidx.fragment.app.FragmentActivity;
import com.whatsapp.otp.common.WaLogger;
import com.whatsapp.otp.sample.R;
import com.whatsapp.otp.sample.app.activity.WhatsAppCodeReceiverActivity;
import com.whatsapp.otp.sample.app.fragment.data.PhoneNumberHolder;
import com.whatsapp.otp.sample.app.otp.OtpErrorReceiver;
import com.whatsapp.otp.sample.app.otp.service.OtpServiceInterface;
import com.whatsapp.otp.sample.databinding.FragmentOtpValidateBinding;
import dagger.hilt.android.AndroidEntryPoint;
import javax.inject.Inject;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

@AndroidEntryPoint
public class OtpValidatorFragment extends Fragment {

  public static final String OTP_CODE_RECEIVER = "otp.code.receiver";
  private static final WaLogger WA_LOGGER = WaLogger.getLogger(OtpValidatorFragment.class);

  @Inject
  OtpServiceInterface otpService;

  private FragmentOtpValidateBinding binding;
  private BroadcastReceiver otpCodeReceiver;

  public void onCreate(final @Nullable Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    listenForCodeToAutoSubmit();
  }

  public void onViewCreated(final @NonNull View view, final @Nullable Bundle savedInstanceState) {
    super.onViewCreated(view, savedInstanceState);
    binding.validateOtp.setOnClickListener(currentView -> {
      final String code = binding.otpCodeInputId.getText().toString();
      String phoneNumber = PhoneNumberHolder.getPhoneNumber();
      otpService.validateOtp(phoneNumber,
          code,
          this::showValidationMessage,
          this::showErrorMessage);
    });
    Bundle extras = requireActivity().getIntent().getExtras();
    fillCode(extras);
    showDebugMessages(extras);
    binding.validateOtp.setEnabled(true);
  }

  private void fillCode(Bundle extras) {
    if (extras != null) {
      final String code = extras.getString(WhatsAppCodeReceiverActivity.CODE_KEY);
      if (code != null) {
        WA_LOGGER.info("Code received");
        binding.otpCodeInputId.setText(code);
        binding.otpValidateErrorMessageId.setVisibility(View.INVISIBLE);
      }
    }
  }

  private void showDebugMessages(Bundle extras) {
    if (extras != null) {
      final String errorKey = extras.getString(OtpErrorReceiver.OTP_ERROR_KEY);
      final String errorMessage = extras.getString(OtpErrorReceiver.OTP_ERROR_MESSAGE_KEY);
      if (errorKey != null && !errorKey.isEmpty()) {
        String message = "OtpErrorKey: " + errorKey + "\n\nOtpErrorMessage: " + errorMessage;
        showDebugErrorMessage(message);
      }
    }
  }

  private void showValidationMessage(final @NonNull OtpServiceInterface.OtpStatus otpStatus) {
    requireActivity().runOnUiThread(() -> this.showMessage(otpStatus));
  }

  private void showMessage(final @NonNull OtpServiceInterface.OtpStatus otpStatus) {
    String message = otpStatus.equals(OtpServiceInterface.OtpStatus.VALID)
        ? "One-time-password is valid" :
        "One-time-password is invalid";
    if (otpStatus.equals(OtpServiceInterface.OtpStatus.INVALID)) {
      binding.otpValidOrNotMessageId.setTextColor(getResources().getColor(R.color.red, null));
    }
    binding.otpValidateErrorMessageId.setVisibility(View.INVISIBLE);
    binding.otpValidOrNotMessageId.setText(message);
    binding.otpValidOrNotMessageId.setVisibility(View.VISIBLE);
  }

  private void showErrorMessage(final @NonNull String message) {
    binding.otpValidOrNotMessageId.setVisibility(View.INVISIBLE);
    binding.otpValidateErrorMessageId.setText(message);
    binding.otpValidateErrorMessageId.setVisibility(View.VISIBLE);
  }

  private void showDebugErrorMessage(final @NonNull String message) {
    binding.otpDebugMessageId.setText(message);
    binding.otpDebugMessageId.setVisibility(View.VISIBLE);
  }


  @Nullable
  public View onCreateView(@NotNull LayoutInflater inflater,
      @Nullable ViewGroup container,
      @Nullable Bundle savedInstanceState) {
    binding = FragmentOtpValidateBinding.inflate(inflater, container, false);
    return binding.getRoot();
  }

  @MainThread
  public void onResume() {
    super.onResume();
    final Bundle extras = requireActivity().getIntent().getExtras();
    this.fillCode(extras);
    this.showDebugMessages(extras);
    String filledCode = binding.otpCodeInputId.getText().toString();
    if (filledCode.isEmpty()) {
      listenForCodeToAutoSubmit();
    }
  }

  private void listenForCodeToAutoSubmit() {
    this.otpCodeReceiver = new BroadcastReceiver() {
      @Override
      public void onReceive(Context context, Intent intent) {
        if (intent != null) {
          String code = intent.getStringExtra("code");
          OtpValidatorFragment.this.binding.otpCodeInputId.setText(code);
        }
      }
    };
    final IntentFilter filter = new IntentFilter();
    filter.addAction(OTP_CODE_RECEIVER);
    requireContext().registerReceiver(otpCodeReceiver, filter);
  }

  public void onPause() {
    super.onPause();
    binding.otpCodeInputId.setText("");
    if (otpCodeReceiver != null) {
      try {
        requireContext().unregisterReceiver(otpCodeReceiver);
      } catch (Exception e) {
        WA_LOGGER.info("Failed to unregister receiver", e);
      }
    }
  }

}
