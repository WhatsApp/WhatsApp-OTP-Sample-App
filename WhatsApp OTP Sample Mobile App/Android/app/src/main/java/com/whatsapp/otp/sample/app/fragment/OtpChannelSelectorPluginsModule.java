/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.whatsapp.otp.sample.app.fragment;

import android.content.Context;
import android.view.View;
import dagger.Module;
import dagger.Provides;
import dagger.hilt.InstallIn;
import dagger.hilt.components.SingletonComponent;
import dagger.multibindings.ElementsIntoSet;
import java.util.Collections;
import java.util.Set;
import java.util.function.Function;

@InstallIn(SingletonComponent.class)
@Module
public abstract class OtpChannelSelectorPluginsModule {
  @Provides
  @ElementsIntoSet
  public static Set<Function<Context, View>> channelSelectorPlugins() {
    return Collections.emptySet();
  }
}
