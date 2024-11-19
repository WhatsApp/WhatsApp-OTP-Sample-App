/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.whatsapp.otp.common;

import android.util.Log;
import androidx.annotation.NonNull;
import com.whatsapp.otp.sample.BuildConfig;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

public class WaLogger {

  private static final String TAG = "OTPOWA-SampleApp";

  private final Class clazz;

  private WaLogger(Class clazz) {
    this.clazz = clazz;
  }

  public final void info(@NotNull String message) {
    Log.i(TAG, message);
  }

  public final void info(@NotNull String message, @NonNull Exception e) {
    Log.i(TAG, message, e);
  }


  public final void debug(@NotNull String message) {
    if (BuildConfig.DEBUG) {
      Log.d(TAG, message);
    }
  }

  public final void error(@Nullable String message) {
    Log.e(TAG, message);
  }

  public final void error(@Nullable String message, @NotNull Throwable throwable) {
    Log.e(TAG, message, throwable);
  }

  public static WaLogger getLogger(Class clazz) {
    return new WaLogger(clazz);
  }
}
