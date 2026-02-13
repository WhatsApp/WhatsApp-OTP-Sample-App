/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.whatsapp.otp.sample.app.fragment;

import android.content.Context;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import androidx.annotation.NonNull;
import androidx.annotation.StringRes;
import androidx.fragment.app.Fragment;
import androidx.navigation.NavController;
import androidx.navigation.NavOptions;
import androidx.navigation.Navigation;
import com.whatsapp.otp.common.WaLogger;
import com.whatsapp.otp.sample.R;
import com.whatsapp.otp.sample.app.fragment.data.PhoneNumberHolder;
import com.whatsapp.otp.sample.app.otp.WhatsAppOtpIntentHandler;
import com.whatsapp.otp.sample.app.signature.AppSignatureRetriever;
import com.whatsapp.otp.sample.databinding.FragmentOtpSelectChannelBinding;
import com.whatsapp.otp.sdkextension.WhatsAppHandshakeError;
import com.whatsapp.otp.sdkextension.WhatsAppHandshakeHandler;
import com.whatsapp.otp.sdkoverride.SaWhatsAppOtpHandler;
import dagger.hilt.android.AndroidEntryPoint;
import java.util.Set;
import java.util.function.Consumer;
import java.util.function.Function;
import javax.inject.Inject;

@AndroidEntryPoint
public class OtpChannelSelectorFragment extends Fragment {

  private static final WaLogger WA_LOGGER = WaLogger.getLogger(OtpChannelSelectorFragment.class);

  @Inject
  AppSignatureRetriever appSignatureRetriever;

  @Inject
  WhatsAppOtpIntentHandler whatsAppOtpIntentHandler;

  @Inject
  SaWhatsAppOtpHandler saWhatsAppOtpHandler;

  @Inject
  WhatsAppHandshakeHandler whatsAppHandshakeHandler;

  @Inject
  Set<Function<Context, View>> channelSelectorPlugins;

  private FragmentOtpSelectChannelBinding binding;

  @Override
  public View onCreateView(final LayoutInflater inflater, final ViewGroup container,
      final Bundle savedInstanceState) {
    binding = FragmentOtpSelectChannelBinding.inflate(inflater, container, false);
    return binding.getRoot();
  }

  public void onViewCreated(@NonNull final View view, final Bundle savedInstanceState) {
    super.onViewCreated(view, savedInstanceState);
    Runnable onSuccessHandler = () -> navigateToCodeInputScreen(savedInstanceState);
    binding.otpGenerateErrorMessageId.setVisibility(View.INVISIBLE);
    binding.requestOtpButtonId.setOnClickListener(currentView -> {
      sendOtp(onSuccessHandler, this::errorMessageConsumer);
    });
    channelSelectorPlugins.forEach(plugin -> binding.plugins.addView(plugin.apply(getContext())));
    String signatures = String.join("/", appSignatureRetriever.getAppSignatures());
    binding.hashSignatureValueId.setText(signatures);
  }

  @Override
  public void onResume() {
    super.onResume();
    binding.plugins.removeAllViews();
    channelSelectorPlugins.forEach(plugin -> binding.plugins.addView(plugin.apply(getContext())));


    displayWhatsAppOptionOnlyIfInstalled();
  }

  private void displayWhatsAppOptionOnlyIfInstalled() {
    boolean whatsAppInstalled = saWhatsAppOtpHandler.isWhatsAppInstalled(requireContext());
    if (!whatsAppInstalled) {
      hideWhatsAppOption(R.string.whatsapp_is_not_installed_on_this_device);
    } else {
      final Context context = requireActivity().getApplicationContext();
      whatsAppHandshakeHandler.handshakeWithWhatsAppAndWaitConfirmation(context,
          this::handleHandshakeSuccessful, this::handleHanshakeFailure);
    }
  }

  private void handleHandshakeSuccessful(final String handshakeRequestId) {
    WA_LOGGER.info("HandshakeRequestId: " + handshakeRequestId);
    showWhatsAppOption(R.string.whatsapp_autofill, R.string.whatsapp_handshake_successful);
  }

  private void handleHanshakeFailure(final WhatsAppHandshakeError handshakeError) {
    WA_LOGGER.error("Handshake failed with error: " + handshakeError.getErrorType());
    showWhatsAppOption(R.string.whatsapp_copy_code, R.string.whatsapp_handshake_unsuccessful);
  }

  private void showWhatsAppOption(@StringRes final int resourceExperienceProvided,
      @StringRes final int handshakeResultResource) {
    binding.whatsAppInstalledMessage.setText(resourceExperienceProvided);
    binding.handshakeResultMessage.setText(handshakeResultResource);
    binding.whatsAppInstalledMessage.setVisibility(View.VISIBLE);
    binding.WhatsAppSelectorId.setVisibility(View.VISIBLE);
    binding.requestOtpButtonId.setEnabled(true);
  }

  private void hideWhatsAppOption(@StringRes final int resource) {
    binding.whatsAppInstalledMessage.setText(resource);
    binding.whatsAppInstalledMessage.setVisibility(View.VISIBLE);
    binding.WhatsAppSelectorId.setVisibility(View.INVISIBLE);
    binding.requestOtpButtonId.setEnabled(false);
  }

  private void navigateToCodeInputScreen(
      @androidx.annotation.Nullable final Bundle savedInstanceState) {
    this.requireActivity().runOnUiThread(() -> {
      NavController navController =
          Navigation.findNavController(this.requireActivity(), R.id.nav_host_fragment_content_main);
      navController.navigate(R.id.OtpCodeReceivedValidateActionId, savedInstanceState,
          new NavOptions.Builder().setLaunchSingleTop(true).build());
    });
  }

  private void errorMessageConsumer(final String message) {
    requireActivity().runOnUiThread(() -> {
      binding.otpGenerateErrorMessageId.setText(message);
      binding.otpGenerateErrorMessageId.setVisibility(View.VISIBLE);
      binding.otpGenerateErrorMessageId.setEnabled(true);
    });
  }

  private void sendOtp(final Runnable onSuccessHandler,
      final Consumer<String> onRequestFailureHandler) {
    WA_LOGGER.info("Sending otp");
    binding.otpGenerateErrorMessageId.setVisibility(View.INVISIBLE);
    final String phoneNumber = getPhoneNumber();
    final Context context = requireActivity().getApplicationContext();
    this.whatsAppOtpIntentHandler.sendOtp(phoneNumber, context, onSuccessHandler,
        onRequestFailureHandler);
    savePhoneForValidation(phoneNumber);
  }

  private void savePhoneForValidation(final String phoneNumber) {
    PhoneNumberHolder.setPhoneNumber(phoneNumber);
  }

  @NonNull
  private String getPhoneNumber() {
    return binding.editTextPhoneId.getText().toString();
  }


  @Override
  public void onDestroyView() {
    super.onDestroyView();
    binding = null;
  }
}
