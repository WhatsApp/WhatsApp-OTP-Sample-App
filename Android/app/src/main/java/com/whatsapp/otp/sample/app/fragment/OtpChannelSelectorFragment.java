package com.whatsapp.otp.sample.app.fragment;

import android.content.Context;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import androidx.annotation.NonNull;
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

  @Inject Set<Function<Context, View>> channelSelectorPlugins;

  private FragmentOtpSelectChannelBinding binding;

  @Override
  public View onCreateView(
      LayoutInflater inflater, ViewGroup container,
      Bundle savedInstanceState
  ) {
    binding = FragmentOtpSelectChannelBinding.inflate(inflater, container, false);
    return binding.getRoot();
  }

  public void onViewCreated(@NonNull View view, Bundle savedInstanceState) {
    super.onViewCreated(view, savedInstanceState);
    Runnable onSuccessHandler = () -> navigateToCodeInputScreen(savedInstanceState);
    binding.otpGenerateErrorMessageId.setVisibility(View.INVISIBLE);
    binding.requestOtpButtonId.setOnClickListener(currentView -> {
      sendOtp(onSuccessHandler,
          this::errorMessageConsumer);
    });
    channelSelectorPlugins.forEach(plugin -> binding.plugins.addView(plugin.apply(getContext())));
    String signatures = String.join("/", appSignatureRetriever.getAppSignatures());
    binding.hashSignatureValueId.setText(signatures);
  }

  private void navigateToCodeInputScreen(@androidx.annotation.Nullable Bundle savedInstanceState) {
    this.requireActivity().runOnUiThread(() -> {
      NavController navController = Navigation.findNavController(this.getActivity(),
          R.id.nav_host_fragment_content_main);
      navController.navigate(R.id.OtpCodeReceivedValidateActionId,
          savedInstanceState,
          new NavOptions.Builder()
              .setLaunchSingleTop(true)
              .build());
    });
  }

  private void errorMessageConsumer(String message) {
    requireActivity().runOnUiThread(() -> {
      binding.otpGenerateErrorMessageId.setText(message);
      binding.otpGenerateErrorMessageId.setVisibility(View.VISIBLE);
      binding.otpGenerateErrorMessageId.setEnabled(true);
    });
  }

  private void sendOtp(Runnable onSuccessHandler, Consumer<String> onRequestFailureHandler) {
    WA_LOGGER.info("Sending otp");
    binding.otpGenerateErrorMessageId.setVisibility(View.INVISIBLE);
    final String phoneNumber = getPhoneNumber();
    final Context context = requireActivity().getApplicationContext();
    this.whatsAppOtpIntentHandler.sendOtp(phoneNumber, context, onSuccessHandler,
        onRequestFailureHandler);
    savePhoneForValidation(phoneNumber);
  }

  private void savePhoneForValidation(String phoneNumber) {
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
