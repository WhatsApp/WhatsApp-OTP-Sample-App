/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.whatsapp.otp.common;

import static org.assertj.core.api.Assertions.assertThat;

import android.content.Context;
import androidx.test.core.app.ApplicationProvider;
import org.assertj.core.api.Assertions;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;

@RunWith(RobolectricTestRunner.class)
public class SampleServerPropertiesTest {

  private SampleServerProperties sampleServerProperties;
  private WaPropertyUtils waPropertyUtils;

  @Before
  public void setup() {
    waPropertyUtils = createWaPropertyUtils();
    sampleServerProperties = new SampleServerProperties(waPropertyUtils);
  }

  @Test
  public void test_getDomain() {
    // Test
    String domain = sampleServerProperties.getDomain();
    // Assertion
    assertThat(domain).isNotNull();
    assertThat(domain).hasSizeGreaterThan(4);
  }

  private WaPropertyUtils createWaPropertyUtils() {
    Context applicationContext = ApplicationProvider.getApplicationContext();
    WaPropertyUtils waPropertyUtils = new WaPropertyUtils(applicationContext);
    return waPropertyUtils;
  }
}