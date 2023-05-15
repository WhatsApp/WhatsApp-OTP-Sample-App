package com.whatsapp.otp.common;

import android.content.Context;
import android.content.res.AssetManager;
import androidx.annotation.NonNull;
import dagger.hilt.android.qualifiers.ApplicationContext;
import java.io.IOException;
import java.io.InputStream;
import java.util.Properties;
import javax.inject.Inject;
import javax.inject.Singleton;
import org.apache.commons.lang3.Validate;

@Singleton
public class WaPropertyUtils {

  private final Context context;

  @Inject
  public WaPropertyUtils(final @NonNull @ApplicationContext Context context) {
    Validate.notNull(context);
    this.context = context;
  }

  public String getProperty(final @NonNull String key, final @NonNull String filename) {
    Validate.notNull(key);
    Validate.notNull(filename);
    Properties properties = new Properties();
    AssetManager assetManager = context.getAssets();
    try {
      InputStream inputStream = assetManager.open(filename);
      properties.load(inputStream);
    } catch (IOException exception) {
      throw new WaPropertyLoadingException("Unable to read property " + key, exception);
    }
    return properties.getProperty(key);
  }
}
