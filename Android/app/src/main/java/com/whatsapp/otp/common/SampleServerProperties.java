package com.whatsapp.otp.common;

import androidx.annotation.NonNull;
import javax.inject.Inject;
import org.apache.commons.lang3.Validate;

public class SampleServerProperties {

  private static String CONFIG_FILE = "config.properties";

  private WaPropertyUtils waPropertyUtils;

  @Inject
  public SampleServerProperties(final @NonNull WaPropertyUtils waPropertyUtils) {
    Validate.notNull(waPropertyUtils);
    this.waPropertyUtils = waPropertyUtils;
  }

  public String getDomain() {
    return waPropertyUtils.getProperty("server_domain", CONFIG_FILE);
  }
}
