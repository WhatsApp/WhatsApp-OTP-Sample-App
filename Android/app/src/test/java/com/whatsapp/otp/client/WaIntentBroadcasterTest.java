package com.whatsapp.otp.client;

import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.verify;

import android.content.Context;
import android.content.Intent;
import android.util.Log;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.MockitoJUnitRunner;

@RunWith(MockitoJUnitRunner.class)
public class WaIntentBroadcasterTest {

  @Mock
  private Context context;

  @Mock
  private WaIntent waIntent;

  @Mock
  private Intent intent;

  @Before
  public void setup() {
    Mockito.mockStatic(Log.class);
  }

  @Test
  public void test_broadcast_succeeds() {
    // Setup
    WaIntentBroadcaster broadcaster = new WaIntentBroadcaster(context, waIntent);
    doReturn(intent).when(waIntent).getAppIntent();
    // Test
    broadcaster.broadCast();
    // Assertions
    verify(context).sendBroadcast(waIntent.getAppIntent());
  }
}
