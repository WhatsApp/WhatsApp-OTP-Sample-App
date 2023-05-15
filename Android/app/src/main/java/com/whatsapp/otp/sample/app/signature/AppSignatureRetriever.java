package com.whatsapp.otp.sample.app.signature;

import android.content.Context;
import android.content.ContextWrapper;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.util.Base64;
import com.whatsapp.otp.common.WaLogger;
import dagger.hilt.android.qualifiers.ActivityContext;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Arrays;
import java.util.Collection;
import java.util.stream.Collectors;
import javax.inject.Inject;

public class AppSignatureRetriever extends ContextWrapper {

  private static final WaLogger LOGGER = WaLogger.getLogger(AppSignatureRetriever.class);
  private static final String HASH_TYPE = "SHA-256";
  public static final int NUM_HASHED_BYTES = 9;
  public static final int NUM_BASE64_CHAR = 11;

  @Inject
  public AppSignatureRetriever(final @ActivityContext Context context) {
    super(context);
  }

  public void logSignatures() {
    Collection<String> appSignatures = getAppSignatures();
    LOGGER.info("============== SIGNATURES ==============");
    appSignatures.forEach(signature -> LOGGER.info("Signature: " + signature));
  }

  /**
   * Get all the app signatures for the current package.
   *
   * @return signatures for current app
   */
  public Collection<String> getAppSignatures() {
    try {
      // Get all package signatures for the current package
      String packageName = getPackageName();
      LOGGER.info("Package name: " + packageName);
      PackageManager packageManager = getPackageManager();
      Signature[] signatures = packageManager.getPackageInfo(packageName,
          PackageManager.GET_SIGNATURES).signatures;

      // For each signature create a compatible hash
      Collection<String> appCodes = Arrays.stream(signatures)
          .map(signature -> hash(packageName, signature.toCharsString()))
          .collect(Collectors.toList());
      return appCodes;
    } catch (PackageManager.NameNotFoundException e) {
      LOGGER.error("Unable to find package to obtain hash.", e);
      throw new RuntimeException("Unable to find package to obtain hash.", e);
    }

  }

  private String hash(String packageName, String signature) {
    String appInfo = packageName + " " + signature;
    try {
      MessageDigest messageDigest = MessageDigest.getInstance(HASH_TYPE);
      messageDigest.update(appInfo.getBytes(StandardCharsets.UTF_8));
      byte[] hashSignature = messageDigest.digest();

      // truncated into NUM_HASHED_BYTES
      hashSignature = Arrays.copyOfRange(hashSignature, 0, NUM_HASHED_BYTES);
      // encode into Base64
      String base64Hash = Base64.encodeToString(hashSignature, Base64.NO_PADDING | Base64.NO_WRAP);
      base64Hash = base64Hash.substring(0, NUM_BASE64_CHAR);

      LOGGER.debug(String.format("pkg: %s -- hash: %s", packageName, base64Hash));
      return base64Hash;
    } catch (NoSuchAlgorithmException e) {
      throw new RuntimeException("Unable to generate hash for application", e);
    }
  }
}
