package com.whatsapp.otp.reactnative.modules

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.whatsapp.otp.android.sdk.WhatsAppOtpHandler

class WhatsAppOtpModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var otpHandler: WhatsAppOtpHandler? = null
    private var otpReceiver: BroadcastReceiver? = null

    companion object {
        private const val OTP_RETRIEVED_ACTION = "com.whatsapp.otp.OTP_RETRIEVED"
        private const val OTP_CODE_KEY = "code"
        private const val OTP_ERROR_KEY = "error"
    }

    override fun getName(): String = "WhatsAppOtpModule"

    @ReactMethod
    fun initialize() {
        otpHandler = WhatsAppOtpHandler(reactContext)
        registerOtpReceiver()
    }

    @ReactMethod
    fun sendHandshakeToWhatsApp(promise: Promise) {
        try {
            val handler = otpHandler ?: run {
                promise.reject("NOT_INITIALIZED", "WhatsAppOtpModule not initialized")
                return
            }

            currentActivity?.let { activity ->
                handler.sendOtpIntentToWhatsApp(activity)
                promise.resolve(null)
            } ?: run {
                promise.reject("NO_ACTIVITY", "No activity available")
            }
        } catch (e: Exception) {
            promise.reject("HANDSHAKE_ERROR", e.message, e)
        }
    }

    private fun registerOtpReceiver() {
        if (otpReceiver != null) return

        otpReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) {
                if (intent?.action == OTP_RETRIEVED_ACTION) {
                    val code = intent.getStringExtra(OTP_CODE_KEY)
                    val error = intent.getStringExtra(OTP_ERROR_KEY)

                    if (code != null) {
                        sendEvent("onOtpReceived", Arguments.createMap().apply {
                            putString("code", code)
                        })
                    } else if (error != null) {
                        sendEvent("onOtpError", Arguments.createMap().apply {
                            putString("error", error)
                        })
                    }
                }
            }
        }

        val filter = IntentFilter(OTP_RETRIEVED_ACTION)
        reactContext.registerReceiver(otpReceiver, filter)
    }

    private fun sendEvent(eventName: String, params: WritableMap) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    override fun invalidate() {
        super.invalidate()
        otpReceiver?.let {
            reactContext.unregisterReceiver(it)
            otpReceiver = null
        }
        otpHandler = null
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Required for NativeEventEmitter
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Required for NativeEventEmitter
    }
}
